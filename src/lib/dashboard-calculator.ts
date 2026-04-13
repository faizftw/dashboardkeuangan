import { Database } from '@/types/database'

type Milestone = Database['public']['Tables']['program_milestones']['Row']
type MilestoneCompletion = Database['public']['Tables']['milestone_completions']['Row']
type MetricDefinition = Database['public']['Tables']['program_metric_definitions']['Row']
type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']
type DailyInput = Database['public']['Tables']['daily_inputs']['Row']

export type ProgramWithRelations = Database['public']['Tables']['programs']['Row'] & {
  program_pics?: { profile_id: string }[]
  program_milestones?: Milestone[]
  program_metric_definitions?: MetricDefinition[]
}

export interface ProgramHealthResult {
  programId: string
  healthScore: number
  status: 'KRITIS' | 'PERLU PERHATIAN' | 'CUKUP' | 'BAIK' | 'EXCELLENT'
  totalTargetMetrics: number
  isQualitativeOnly: boolean
}

export function getHealthStatus(score: number): ProgramHealthResult['status'] {
  if (score < 40) return 'KRITIS'
  if (score < 60) return 'PERLU PERHATIAN'
  if (score < 80) return 'CUKUP'
  if (score < 100) return 'BAIK'
  return 'EXCELLENT'
}

/**
 * Calculates the overall health score of a single program.
 */
export function calculateProgramHealth(
  program: ProgramWithRelations,
  metricValues: MetricValue[],
  dailyInputs: DailyInput[],
  milestoneCompletions: MilestoneCompletion[],
  prorationFactor: number // (daysInSelection / period.workingDays)
): ProgramHealthResult {
  const metrics = program.program_metric_definitions || []
  const hasCustomMetrics = metrics.length > 0
  let healthScore = 0
  let totalValidMetrics = 0

  // 1. Program Kualitatif (Milestone Only)
  if (program.target_type === 'qualitative' || (!hasCustomMetrics && program.monthly_target_rp === 0 && program.monthly_target_user === 0)) {
    const milestones = program.program_milestones || []
    if (milestones.length > 0) {
      const completed = milestones.filter(ms => 
        milestoneCompletions.find(c => c.milestone_id === ms.id && c.is_completed)
      ).length
      
      return {
        programId: program.id,
        healthScore: (completed / milestones.length) * 100,
        status: getHealthStatus((completed / milestones.length) * 100),
        totalTargetMetrics: milestones.length,
        isQualitativeOnly: true
      }
    }
  }

  // 2. Program dengan Custom Metrics
  if (hasCustomMetrics) {
    const targetMetrics = metrics.filter(m => m.is_target_metric)
    let sumPercentage = 0

    targetMetrics.forEach(m => {
      // Find values for this metric
      const vals = metricValues.filter(mv => mv.program_id === program.id && mv.metric_definition_id === m.id)
      const sumActual = vals.reduce((sum, v) => sum + (v.value || 0), 0)
      
      // Determine target (using definition monthly_target, fallback to program legacy fields based on type)
      let monthlyTarget = m.monthly_target || 0
      if (monthlyTarget === 0) {
        if (m.data_type === 'currency') monthlyTarget = program.monthly_target_rp || 0
        else if (m.data_type === 'integer') monthlyTarget = program.monthly_target_user || 0
      }

      const effectiveTarget = monthlyTarget * prorationFactor
      
      if (effectiveTarget > 0) {
        let pct = (sumActual / effectiveTarget) * 100
        if (m.target_direction === 'lower_is_better') {
           // For lower is better, being under is over 100%. E.g. actual 50 / target 100 = 200% health
           pct = (effectiveTarget / (sumActual || 1)) * 100 // Prevent infinity
        }
        sumPercentage += pct
        totalValidMetrics++
      }
    })

    if (totalValidMetrics > 0) {
      healthScore = sumPercentage / totalValidMetrics
    }
  } 
  // 3. Program Legacy (Hanya Rp dan User)
  else {
    const inputs = dailyInputs.filter(i => i.program_id === program.id)
    const cumulativeRp = inputs.reduce((sum, i) => sum + Number(i.achievement_rp || 0), 0)
    const cumulativeUser = inputs.reduce((sum, i) => sum + Number(i.achievement_user || 0), 0)

    const effectiveRp = (program.monthly_target_rp || 0) * prorationFactor
    const effectiveUser = (program.monthly_target_user || 0) * prorationFactor

    let scoreRp = 0, scoreUser = 0
    
    if (effectiveRp > 0) { scoreRp = (cumulativeRp / effectiveRp) * 100; totalValidMetrics++; }
    if (effectiveUser > 0) { scoreUser = (cumulativeUser / effectiveUser) * 100; totalValidMetrics++; }

    if (totalValidMetrics > 0) {
      healthScore = (scoreRp + scoreUser) / totalValidMetrics
    }
  }

  return {
    programId: program.id,
    healthScore,
    status: getHealthStatus(healthScore),
    totalTargetMetrics: totalValidMetrics,
    isQualitativeOnly: false
  }
}

/**
 * Recalculates department health (average of its programs' health scores)
 */
export function calculateDepartmentHealth(
  programs: ProgramWithRelations[],
  metricValues: MetricValue[],
  dailyInputs: DailyInput[],
  milestoneCompletions: MilestoneCompletion[],
  prorationFactor: number
) {
  if (programs.length === 0) return { score: 0, status: 'KRITIS' }
  let sumHealth = 0
  
  programs.forEach(p => {
    const health = calculateProgramHealth(p, metricValues, dailyInputs, milestoneCompletions, prorationFactor)
    sumHealth += health.healthScore
  })

  const avgHealth = sumHealth / programs.length
  return {
    score: avgHealth,
    status: getHealthStatus(avgHealth)
  }
}

/**
 * Aggregates all metrics in a given program array grouped by metric_group.
 * Supports special formulas:
 * - conversion = user_acquisition / leads
 * - efficiency = revenue / ad_spend
 */
export function aggregateByMetricGroup(
  programs: ProgramWithRelations[],
  metricValues: MetricValue[],
  prorationFactor: number
) {
  // 1. First, we need to collect all custom metric definitions that belong to these programs
  const groupRawTotals: Record<string, { actual: number, target: number }> = {
    revenue: { actual: 0, target: 0 },
    user_acquisition: { actual: 0, target: 0 },
    ad_spend: { actual: 0, target: 0 },
    leads: { actual: 0, target: 0 }
  }

  // To know if a group exists in the department
  const existingGroups = new Set<string>()

  programs.forEach(prog => {
    const definitions = prog.program_metric_definitions || []
    
    definitions.forEach(m => {
      const g = m.metric_group
      if (g && (g === 'revenue' || g === 'user_acquisition' || g === 'ad_spend' || g === 'leads')) {
        existingGroups.add(g)
        
        // Sum Actuals
        const vals = metricValues.filter(mv => mv.program_id === prog.id && mv.metric_definition_id === m.id)
        const sumActual = vals.reduce((sum, v) => sum + (v.value || 0), 0)
        groupRawTotals[g].actual += sumActual

        // Sum Targets
        let monthlyTarget = m.monthly_target || 0
        if (monthlyTarget === 0) {
          if (m.data_type === 'currency') monthlyTarget = prog.monthly_target_rp || 0
          else if (m.data_type === 'integer') monthlyTarget = prog.monthly_target_user || 0
        }
        
        groupRawTotals[g].target += (monthlyTarget * prorationFactor)
      } else if (g === 'conversion' || g === 'efficiency') {
        // Just flag that it exists so we yield the computed result later
        existingGroups.add(g)
      }
    })
  });

  // Calculate generic return payload
  const result: Record<string, { actual: number, target: number, isComputed: boolean }> = {}

  // Push raw sums
  Object.keys(groupRawTotals).forEach(g => {
    if (existingGroups.has(g)) {
      result[g] = { ...groupRawTotals[g], isComputed: false }
    }
  })

  // Push computed weighted averages (Conversion and Efficiency)
  if (existingGroups.has('conversion')) {
    // Conversion = user_acquisition / leads
    const acq = groupRawTotals['user_acquisition']?.actual || 0
    const lds = groupRawTotals['leads']?.actual || 0
    const actual = lds > 0 ? (acq / lds) * 100 : 0
    
    // We don't really have a global "target conversion", so we can just leave target as 0
    result['conversion'] = { actual, target: 0, isComputed: true }
  }

  if (existingGroups.has('efficiency')) {
    // Efficiency (ROAS) = revenue / ad_spend
    const rev = groupRawTotals['revenue']?.actual || 0
    const spd = groupRawTotals['ad_spend']?.actual || 0
    const actual = spd > 0 ? (rev / spd) : 0
    
    result['efficiency'] = { actual, target: 0, isComputed: true }
  }

  return result
}

/**
 * Standard performance grading for TV Dashboard
 * Returns label and color mapping
 */
export function getPerformanceGrade(score: number): { label: string, color: string } {
  if (score >= 100) return { label: 'S', color: 'text-emerald-400' }
  if (score >= 90)  return { label: 'A', color: 'text-emerald-400' }
  if (score >= 80)  return { label: 'B', color: 'text-emerald-400' }
  if (score >= 60)  return { label: 'C', color: 'text-amber-400' }
  if (score >= 40)  return { label: 'D', color: 'text-rose-400' }
  return { label: 'E', color: 'text-rose-600' }
}
