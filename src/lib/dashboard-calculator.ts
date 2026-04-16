import { Database } from '@/types/database'
import { evaluateAllMetrics, MetricForOrdering } from './formula-evaluator'

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
  calculatedMetrics?: Record<string, number | null> // Added to store all evaluated metrics
}

export function getHealthStatus(score: number): ProgramHealthResult['status'] {
  if (score < 40) return 'KRITIS'
  if (score < 60) return 'PERLU PERHATIAN'
  if (score < 80) return 'CUKUP'
  if (score < 100) return 'BAIK'
  return 'EXCELLENT'
}

/**
 * Calculates the overall health score and all metric values for a single program.
 */
export function calculateProgramHealth(
  program: ProgramWithRelations,
  metricValuesByProgram: Map<string, MetricValue[]>,
  dailyInputsByProgram: Map<string, DailyInput[]>,
  milestoneCompletionsByMilestone: Map<string, MilestoneCompletion>,
  prorationFactor: number,
  workingDaysInPeriod: number = 20
): ProgramHealthResult {
  const metrics = program.program_metric_definitions || []
  const hasCustomMetrics = metrics.length > 0
  const progMetricValues = metricValuesByProgram.get(program.id) || []

  // 1. Calculate All Metrics using evaluateAllMetrics pipeline
  const manualValues: Record<string, number | null> = {}
  
  // Aggregate manual values (SUM)
  metrics.filter(m => m.input_type === 'manual').forEach(m => {
    const vals = progMetricValues.filter(mv => mv.metric_definition_id === m.id)
    manualValues[m.metric_key] = vals.reduce((sum, v) => sum + (v.value || 0), 0)
  })

  // Fallback to legacy Rp/User if manual metrics are missing
  const inputs = dailyInputsByProgram.get(program.id) || []
  if (!('revenue' in manualValues)) {
    manualValues['revenue'] = inputs.reduce((sum, i) => sum + Number(i.achievement_rp || 0), 0)
  }
  if (!('user_count' in manualValues)) {
    manualValues['user_count'] = inputs.reduce((sum, i) => sum + Number(i.achievement_user || 0), 0)
  }

  // Pre-load baseline and target metrics for formulas
  metrics.forEach(m => {
    if (m.input_type === 'manual' && !(m.metric_key in manualValues)) {
      manualValues[m.metric_key] = manualValues[m.metric_key] ?? null
    }
  })

  const orderingMetrics: MetricForOrdering[] = metrics.map(m => ({
    metric_key: m.metric_key,
    input_type: m.input_type,
    formula: m.formula
  }))

  let evaluatedMetrics: Record<string, number | null> = {}
  try {
    evaluatedMetrics = evaluateAllMetrics(orderingMetrics, manualValues)
  } catch (e) {
    console.error(`Calculation error for program ${program.name}:`, e)
    evaluatedMetrics = { ...manualValues }
  }

  // ── Case 1 & 3: Program with custom metrics — use PRIMARY metrics for Health Score ──────
  if (hasCustomMetrics) {
    const primaryMetrics = metrics.filter(m => m.is_primary && m.is_target_metric)

    if (primaryMetrics.length > 0) {
      let sumPercentage = 0
      let validMetrics = 0

      primaryMetrics.forEach(m => {
        const sumActual = evaluatedMetrics[m.metric_key] || 0
        const vals = progMetricValues.filter(mv => mv.metric_definition_id === m.id)
        const sumCustomTarget = vals.reduce((sum, v) => sum + (v.target_value || 0), 0)

        let monthlyTarget = m.monthly_target || 0
        if (monthlyTarget === 0) {
          if (m.data_type === 'currency') monthlyTarget = program.monthly_target_rp || 0
          else if (m.data_type === 'integer') monthlyTarget = program.monthly_target_user || 0
        }

        const daysInSelection = prorationFactor * workingDaysInPeriod
        const manualDaily = m.metric_key === 'revenue' ? (program.daily_target_rp || 0) : 
                            m.metric_key === 'user_count' ? (program.daily_target_user || 0) : 0

        const effectiveTarget = sumCustomTarget > 0 ? sumCustomTarget : 
                                manualDaily > 0 ? (manualDaily * daysInSelection) : 
                                (monthlyTarget * prorationFactor)

        if (effectiveTarget > 0) {
          let pct = (sumActual / effectiveTarget) * 100
          if (m.target_direction === 'lower_is_better') {
            pct = sumActual > 0 ? (effectiveTarget / sumActual) * 100 : 0
          }
          sumPercentage += pct
          validMetrics++
        }
      })

      const healthScore = validMetrics > 0 ? sumPercentage / validMetrics : 0
      return {
        programId: program.id,
        healthScore,
        status: getHealthStatus(healthScore),
        totalTargetMetrics: validMetrics,
        isQualitativeOnly: false,
        calculatedMetrics: evaluatedMetrics
      }
    }
  }

  // ── Case 2: Qualitative only (milestone-based) ────────────────────────────
  const isExplicitlyQualitative = program.target_type === 'qualitative'
  const hasNoLegacyTargets = (program.monthly_target_rp || 0) === 0 && (program.monthly_target_user || 0) === 0

  if (isExplicitlyQualitative || (hasCustomMetrics && hasNoLegacyTargets) || (!hasCustomMetrics && hasNoLegacyTargets)) {
    const milestones = program.program_milestones || []
    if (milestones.length > 0) {
      const completed = milestones.filter(ms =>
        milestoneCompletionsByMilestone.get(ms.id)?.is_completed
      ).length

      const healthScore = (completed / milestones.length) * 100
      return {
        programId: program.id,
        healthScore,
        status: getHealthStatus(healthScore),
        totalTargetMetrics: milestones.length,
        isQualitativeOnly: true,
        calculatedMetrics: evaluatedMetrics
      }
    }
    return {
      programId: program.id,
      healthScore: 0,
      status: 'KRITIS',
      totalTargetMetrics: 0,
      isQualitativeOnly: true,
      calculatedMetrics: evaluatedMetrics
    }
  }

  // ── Legacy Fallback: program with no custom metrics, has Rp/User targets ──────────
  const cumulativeRp = evaluatedMetrics['revenue'] || 0
  const cumulativeUser = evaluatedMetrics['user_count'] || 0

  const daysInSelection = prorationFactor * workingDaysInPeriod
  const effectiveRp = program.daily_target_rp ? (program.daily_target_rp * daysInSelection) : (program.monthly_target_rp || 0) * prorationFactor
  const effectiveUser = program.daily_target_user ? (program.daily_target_user * daysInSelection) : (program.monthly_target_user || 0) * prorationFactor

  let scoreRp = 0, scoreUser = 0
  let totalValidMetrics = 0

  if (effectiveRp > 0) { scoreRp = (cumulativeRp / effectiveRp) * 100; totalValidMetrics++ }
  if (effectiveUser > 0) { scoreUser = (cumulativeUser / effectiveUser) * 100; totalValidMetrics++ }

  const healthScore = totalValidMetrics > 0 ? (scoreRp + scoreUser) / totalValidMetrics : 0

  return {
    programId: program.id,
    healthScore,
    status: getHealthStatus(healthScore),
    totalTargetMetrics: totalValidMetrics,
    isQualitativeOnly: false,
    calculatedMetrics: evaluatedMetrics
  }
}

/**
 * Calculates average health across a set of programs.
 */
export function calculateDepartmentHealth(
  programs: ProgramWithRelations[],
  metricValuesByProgram: Map<string, MetricValue[]>,
  dailyInputsByProgram: Map<string, DailyInput[]>,
  milestoneCompletionsByMilestone: Map<string, MilestoneCompletion>,
  prorationFactor: number,
  workingDaysInPeriod: number
) {
  if (programs.length === 0) return { score: 0, status: 'KRITIS' as const }
  let sumHealth = 0

  programs.forEach(p => {
    const health = calculateProgramHealth(
      p, 
      metricValuesByProgram, 
      dailyInputsByProgram, 
      milestoneCompletionsByMilestone, 
      prorationFactor, 
      workingDaysInPeriod
    )
    sumHealth += health.healthScore
  })

  const avgHealth = sumHealth / programs.length
  return {
    score: avgHealth,
    status: getHealthStatus(avgHealth)
  }
}

/**
 * Aggregates all metrics grouped by metric_group across programs.
 */
export function aggregateByMetricGroup(
  programs: ProgramWithRelations[],
  metricValuesByProgram: Map<string, MetricValue[]>,
  dailyInputsByProgram: Map<string, DailyInput[]>,
  prorationFactor: number,
  workingDaysInPeriod: number
) {
  const groupRawTotals: Record<string, { actual: number, target: number, totalTarget: number }> = {
    revenue: { actual: 0, target: 0, totalTarget: 0 },
    user_acquisition: { actual: 0, target: 0, totalTarget: 0 },
    ad_spend: { actual: 0, target: 0, totalTarget: 0 },
    leads: { actual: 0, target: 0, totalTarget: 0 }
  }

  const existingGroups = new Set<string>()

  programs.forEach(prog => {
    const definitions = prog.program_metric_definitions || []
    const progMetricValues = metricValuesByProgram.get(prog.id) || []
    const progInputs = dailyInputsByProgram.get(prog.id) || []
    
    const hasPrimaryRevenue = definitions.some(m => m.metric_group === 'revenue' && m.is_primary)
    const hasPrimaryAcquisition = definitions.some(m => m.metric_group === 'user_acquisition' && m.is_primary)

    // 1. Process Custom Metrics
    definitions.forEach(m => {
      const g = m.metric_group
      if (g && (g === 'revenue' || g === 'user_acquisition' || g === 'ad_spend' || g === 'leads')) {
        existingGroups.add(g)

        const vals = progMetricValues.filter(mv => mv.metric_definition_id === m.id)
        const sumActual = vals.reduce((sum, v) => sum + (v.value || 0), 0)
        const sumCustomTarget = vals.reduce((sum, v) => sum + (v.target_value || 0), 0)
        
        groupRawTotals[g].actual += sumActual

        let monthlyTarget = m.monthly_target || 0
        if (monthlyTarget === 0) {
          if (m.data_type === 'currency') monthlyTarget = prog.monthly_target_rp || 0
          else if (m.data_type === 'integer') monthlyTarget = prog.monthly_target_user || 0
        }

        const daysInSelection = prorationFactor * workingDaysInPeriod
        const manualDaily = g === 'revenue' ? (prog.daily_target_rp || 0) : 
                            g === 'user_acquisition' ? (prog.daily_target_user || 0) : 0

        groupRawTotals[g].target += (sumCustomTarget > 0 ? sumCustomTarget : 
                                    manualDaily > 0 ? (manualDaily * daysInSelection) : 
                                    (monthlyTarget * prorationFactor))
        
        groupRawTotals[g].totalTarget += (sumCustomTarget > 0 ? sumCustomTarget : monthlyTarget)
      } else if (g === 'conversion' || g === 'efficiency') {
        existingGroups.add(g)
      }
    })

    // 2. Fallback to Legacy
    const daysInSelection = prorationFactor * workingDaysInPeriod

    if (!hasPrimaryRevenue && (prog.monthly_target_rp || 0) > 0) {
      existingGroups.add('revenue')
      const sumActual = progInputs.reduce((sum, i) => sum + (Number(i.achievement_rp) || 0), 0)
      const monthlyTarget = prog.monthly_target_rp || 0
      const manualDaily = prog.daily_target_rp || 0
      
      groupRawTotals.revenue.actual += sumActual
      groupRawTotals.revenue.target += manualDaily > 0 ? (manualDaily * daysInSelection) : (monthlyTarget * prorationFactor)
      groupRawTotals.revenue.totalTarget += monthlyTarget
    }

    if (!hasPrimaryAcquisition && (prog.monthly_target_user || 0) > 0) {
      existingGroups.add('user_acquisition')
      const sumActual = progInputs.reduce((sum, i) => sum + (Number(i.achievement_user) || 0), 0)
      const monthlyTarget = prog.monthly_target_user || 0
      const manualDaily = prog.daily_target_user || 0

      groupRawTotals.user_acquisition.actual += sumActual
      groupRawTotals.user_acquisition.target += manualDaily > 0 ? (manualDaily * daysInSelection) : (monthlyTarget * prorationFactor)
      groupRawTotals.user_acquisition.totalTarget += monthlyTarget
    }
  })

  const result: Record<string, { actual: number, target: number, totalTarget: number, isComputed: boolean }> = {}

  Object.keys(groupRawTotals).forEach(g => {
    if (existingGroups.has(g)) {
      result[g] = { ...groupRawTotals[g], isComputed: false }
    }
  })

  // Group by metric_group handled by aggregateByMetricGroup
  if (existingGroups.has('conversion')) {
    const acq = groupRawTotals['user_acquisition']?.actual || 0
    const lds = groupRawTotals['leads']?.actual || 0
    const actual = lds > 0 ? (acq / lds) * 100 : 0
    result['conversion'] = { actual, target: 0, totalTarget: 0, isComputed: true }
  }

  if (existingGroups.has('efficiency')) {
    const rev = groupRawTotals['revenue']?.actual || 0
    const spd = groupRawTotals['ad_spend']?.actual || 0
    const actual = spd > 0 ? (rev / spd) : 0
    result['efficiency'] = { actual, target: 0, totalTarget: 0, isComputed: true }
  }

  return result
}

/**
 * Standard performance grading for TV Dashboard
 */
export function getPerformanceGrade(score: number): { label: string, color: string } {
  if (score >= 100) return { label: 'S', color: 'text-emerald-400' }
  if (score >= 90)  return { label: 'A', color: 'text-emerald-400' }
  if (score >= 80)  return { label: 'B', color: 'text-emerald-400' }
  if (score >= 60)  return { label: 'C', color: 'text-amber-400' }
  if (score >= 40)  return { label: 'D', color: 'text-rose-400' }
  return { label: 'E', color: 'text-rose-600' }
}

// ─── Ads Performance Utilities ────────────────────────────────────────────────


/**
 * Detects if a program is an "Ads Program"
 */
export function isAdsProgram(metricDefinitions: MetricDefinition[]): boolean {
  return metricDefinitions.some(
    m => m.metric_group === 'ad_spend' || m.metric_group === 'leads'
  )
}

export interface AdsAggregateResult {
  totalAdsSpent: number
  totalRevenue: number
  totalGoals: number
  totalLeads: number
  avgRoas: number   // total_revenue / total_ads_spent (weighted)
  avgCpp: number    // total_ads_spent / total_goals (weighted)
  avgCr: number     // total_goals / total_leads (weighted)
}

/**
 * Aggregates ads metrics across programs using weighted averages.
 */
export function aggregateAdsMetrics(
  programs: ProgramWithRelations[],
  metricValuesByProgram: Map<string, MetricValue[]>
): AdsAggregateResult {
  let totalAdsSpent = 0
  let totalRevenue = 0
  let totalGoals = 0
  let totalLeads = 0

  programs.forEach(prog => {
    const defs = prog.program_metric_definitions || []
    const progMetricValues = metricValuesByProgram.get(prog.id) || []

    defs.forEach(m => {
      const vals = progMetricValues.filter(mv => mv.metric_definition_id === m.id)
      const sum = vals.reduce((acc, v) => acc + (Number(v.value) || 0), 0)

      if (m.metric_group === 'ad_spend') {
        totalAdsSpent += sum
      } else if (m.metric_group === 'revenue') {
        totalRevenue += sum
      } else if (m.metric_group === 'user_acquisition' && m.is_primary) {
        totalGoals += sum
      } else if (m.metric_group === 'leads') {
        totalLeads += sum
      }
    })
  })

  return {
    totalAdsSpent,
    totalRevenue,
    totalGoals,
    totalLeads,
    avgRoas: totalAdsSpent > 0 ? totalRevenue / totalAdsSpent : 0,
    avgCpp: totalGoals > 0 ? totalAdsSpent / totalGoals : 0,
    avgCr: totalLeads > 0 ? (totalGoals / totalLeads) * 100 : 0,
  }
}

export interface AdsDailyPoint {
  date: string
  displayDate: string
  x: number   // metric for bar (e.g. ads_spent)
  y: number   // metric for line overlay (recalculated daily)
}

/**
 * Builds daily time series for dual-axis ads chart.
 */
export function buildAdsDailySeries(
  programs: ProgramWithRelations[],
  metricValuesByProgram: Map<string, MetricValue[]>,
  metricX: string,
  metricY: string
): AdsDailyPoint[] {
  const byDate = new Map<string, { xSum: number; revSum: number; spendSum: number; goalsSum: number; leadsSum: number }>()

  programs.forEach(prog => {
    const defs = prog.program_metric_definitions || []
    const progValues = metricValuesByProgram.get(prog.id) || []

    progValues.forEach(mv => {
      const d = mv.date
      const entry = byDate.get(d) || { xSum: 0, revSum: 0, spendSum: 0, goalsSum: 0, leadsSum: 0 }
      const val = Number(mv.value) || 0

      const def = defs.find(m => m.id === mv.metric_definition_id)
      if (!def) return

      if (def.metric_key === metricX) entry.xSum += val
      if (def.metric_group === 'revenue') entry.revSum += val
      if (def.metric_group === 'ad_spend') entry.spendSum += val
      if (def.metric_group === 'user_acquisition' && def.is_primary) entry.goalsSum += val
      if (def.metric_group === 'leads') entry.leadsSum += val

      byDate.set(d, entry)
    })
  })

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entry]) => {
      let yVal = 0
      if (metricY === 'roas') yVal = entry.spendSum > 0 ? entry.revSum / entry.spendSum : 0
      else if (metricY === 'cpp' || metricY === 'cost_per_goal') yVal = entry.goalsSum > 0 ? entry.spendSum / entry.goalsSum : 0
      else if (metricY === 'conversion_rate') yVal = entry.leadsSum > 0 ? (entry.goalsSum / entry.leadsSum) * 100 : 0
      else if (metricY === 'goals') yVal = entry.goalsSum
      else if (metricY === 'leads') yVal = entry.leadsSum

      return {
        date,
        displayDate: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(date)),
        x: entry.xSum,
        y: yVal,
      }
    })
}

/**
 * Universal KPI aggregation for Overview Tab
 */
export function aggregateGlobalKPIs(
  programResults: ProgramHealthResult[],
  programs: ProgramWithRelations[],
  milestoneCompletions: MilestoneCompletion[]
) {
  const totalPrograms = programs.length
  const activeProgramsCount = programs.filter(p => 
    (p.program_metric_definitions?.length || 0) > 0 || 
    (p.program_milestones?.length || 0) > 0 ||
    (Number(p.monthly_target_rp) || 0) > 0 ||
    (Number(p.monthly_target_user) || 0) > 0
  ).length
  
  const avgHealth = programResults.length > 0 
    ? programResults.reduce((sum, r) => sum + r.healthScore, 0) / programResults.length 
    : 0

  const targetsHit = programResults.filter(r => r.healthScore >= 100).length
  
  const totalMilestones = programs.reduce((sum, p) => sum + (p.program_milestones?.length || 0), 0)
  const completedMilestones = milestoneCompletions.filter(c => c.is_completed).length

  return {
    avgHealth,
    activeProgramsCount,
    totalPrograms,
    targetsHit,
    totalMilestones,
    completedMilestones,
    healthStatus: getHealthStatus(avgHealth)
  }
}

export interface HealthTrendPoint {
  date: string
  displayDate: string
  health: number
}

/**
 * Builds daily health trend series for the main global chart.
 * Replaces the static overallHealth average with a real daily progression.
 */
export function buildHealthTrendSeries(
  programs: ProgramWithRelations[],
  metricValues: MetricValue[],
  dailyInputs: DailyInput[],
  milestoneCompletions: MilestoneCompletion[],
  activePeriod: Database['public']['Tables']['periods']['Row'],
  startDate?: string,
  endDate?: string
): HealthTrendPoint[] {
  const dateRange: string[] = []
  const workingDays = activePeriod.working_days || 30

  if (startDate && endDate) {
    const start = new Date(startDate); const end = new Date(endDate); const cur = new Date(start)
    while (cur <= end) { dateRange.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  } else {
    // Current month view: from day 1 to today (capped at 31)
    const today = new Date().getDate()
    for (let i = 1; i <= Math.min(today, 31); i++) {
      dateRange.push(`${activePeriod.year}-${String(activePeriod.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
    }
  }

  // To optimize, we group data by date once
  const metricsByProgram = new Map<string, MetricValue[]>()
  metricValues.forEach(mv => {
    const list = metricsByProgram.get(mv.program_id) || []
    list.push(mv)
    metricsByProgram.set(mv.program_id, list)
  })

  const inputsByProgram = new Map<string, DailyInput[]>()
  dailyInputs.forEach(di => {
    const list = inputsByProgram.get(di.program_id) || []
    list.push(di)
    inputsByProgram.set(di.program_id, list)
  })

  const completionsByMilestone = new Map<string, MilestoneCompletion>()
  milestoneCompletions.forEach(mc => {
    completionsByMilestone.set(mc.milestone_id, mc)
  })

  return dateRange.map(d => {
    const dayOfMonth = new Date(d).getDate()
    const prorationFactor = Math.min(dayOfMonth / workingDays, 1)

    // Filter values up to this date
    const dailyMetricValuesByProgram = new Map<string, MetricValue[]>()
    metricsByProgram.forEach((vals, pid) => {
      dailyMetricValuesByProgram.set(pid, vals.filter(v => v.date <= d))
    })

    const dailyInputsSliceByProgram = new Map<string, DailyInput[]>()
    inputsByProgram.forEach((vals, pid) => {
      dailyInputsSliceByProgram.set(pid, vals.filter(v => v.date <= d))
    })

    const dailyCompletionsByMilestone = new Map<string, MilestoneCompletion>()
    completionsByMilestone.forEach((val, mid) => {
      // Completed_at is ISO string or null
      if (val.completed_at && val.completed_at.split('T')[0] <= d) {
        dailyCompletionsByMilestone.set(mid, val)
      }
    })

    // Calculate health for all programs at this point in time
    const programHealths = programs.map(p => 
      calculateProgramHealth(
        p, 
        dailyMetricValuesByProgram, 
        dailyInputsSliceByProgram, 
        dailyCompletionsByMilestone, 
        prorationFactor, 
        workingDays
      )
    )

    const avgHealth = programHealths.length > 0
      ? programHealths.reduce((sum, ph) => sum + ph.healthScore, 0) / programHealths.length
      : 0

    return {
      date: d,
      displayDate: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d)),
      health: Math.round(avgHealth)
    }
  })
}

export interface TargetTrendPoint {
  date: string
  displayDate: string
  actualRevenue: number
  targetRevenue: number
  actualUser: number
  targetUser: number
}

/**
 * Builds daily cumulative target versus actual series for Revenue and User count.
 */
export function buildTargetTrendSeries(
  programs: ProgramWithRelations[],
  metricValues: MetricValue[],
  dailyInputs: DailyInput[],
  activePeriod: Database['public']['Tables']['periods']['Row'],
  startDate?: string,
  endDate?: string
): TargetTrendPoint[] {
  const dateRange: string[] = []
  const workingDays = activePeriod.working_days || 30

  if (startDate && endDate) {
    const start = new Date(startDate); const end = new Date(endDate); const cur = new Date(start)
    while (cur <= end) { dateRange.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  } else {
    const today = new Date().getDate()
    for (let i = 1; i <= Math.min(today, 31); i++) {
      dateRange.push(`${activePeriod.year}-${String(activePeriod.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`)
    }
  }

  // Pre-calculate total targets for all active programs
  let totalMonthlyTargetRevenue = 0
  let totalMonthlyTargetUser = 0

  programs.forEach(p => {
    const metrics = p.program_metric_definitions || []
    const revMetric = metrics.find(m => m.metric_key === 'revenue')
    const userMetric = metrics.find(m => m.metric_key === 'user_count')

    totalMonthlyTargetRevenue += (revMetric?.monthly_target || p.monthly_target_rp || 0)
    totalMonthlyTargetUser += (userMetric?.monthly_target || p.monthly_target_user || 0)
  })

  // Group data by program to avoid quadratic lookups
  const metricsByProgram = new Map<string, MetricValue[]>()
  metricValues.forEach(mv => {
    const list = metricsByProgram.get(mv.program_id) || []
    list.push(mv)
    metricsByProgram.set(mv.program_id, list)
  })

  const inputsByProgram = new Map<string, DailyInput[]>()
  dailyInputs.forEach(di => {
    const list = inputsByProgram.get(di.program_id) || []
    list.push(di)
    inputsByProgram.set(di.program_id, list)
  })

  return dateRange.map(d => {
    const dayOfMonth = new Date(d).getDate()
    const prorationFactor = Math.min(dayOfMonth / workingDays, 1)

    let dailyActualRevenue = 0
    let dailyActualUser = 0

    programs.forEach(p => {
      const metrics = p.program_metric_definitions || []
      const revMetricId = metrics.find(m => m.metric_key === 'revenue')?.id
      const userMetricId = metrics.find(m => m.metric_key === 'user_count')?.id

      // 1. Check metric values (new system)
      const progMetrics = metricsByProgram.get(p.id) || []
      const dayMetrics = progMetrics.filter(mv => mv.date <= d)
      
      const revVal = revMetricId ? dayMetrics.filter(mv => mv.metric_definition_id === revMetricId).reduce((s, v) => s + (v.value || 0), 0) : 0
      const userVal = userMetricId ? dayMetrics.filter(mv => mv.metric_definition_id === userMetricId).reduce((s, v) => s + (v.value || 0), 0) : 0

      // 2. Fallback to daily inputs (legacy system)
      const progInputs = inputsByProgram.get(p.id) || []
      const dayInputs = progInputs.filter(di => di.date <= d)

      const legacyRev = dayInputs.reduce((s, i) => s + Number(i.achievement_rp || 0), 0)
      const legacyUser = dayInputs.reduce((s, i) => s + Number(i.achievement_user || 0), 0)

      dailyActualRevenue += (revVal || legacyRev || 0)
      dailyActualUser += (userVal || legacyUser || 0)
    })

    return {
      date: d,
      displayDate: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(d)),
      actualRevenue: Math.round(dailyActualRevenue),
      targetRevenue: Math.round(totalMonthlyTargetRevenue * prorationFactor),
      actualUser: Math.round(dailyActualUser),
      targetUser: Math.round(totalMonthlyTargetUser * prorationFactor)
    }
  })
}
