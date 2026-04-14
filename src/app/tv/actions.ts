'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { 
  calculateProgramHealth, 
  aggregateByMetricGroup, 
  ProgramWithRelations,
  ProgramHealthResult,
  getHealthStatus,
  getPerformanceGrade
} from '@/lib/dashboard-calculator'

export type Milestone = Database['public']['Tables']['program_milestones']['Row']
export type MilestoneCompletion = Database['public']['Tables']['milestone_completions']['Row']
export type MetricDefinition = Database['public']['Tables']['program_metric_definitions']['Row']
export type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']

export type Program = Database['public']['Tables']['programs']['Row'] & {
  program_pics: { profile_id: string }[]
  program_milestones: Milestone[]
  program_metric_definitions: MetricDefinition[]
}

export type DailyInput = Database['public']['Tables']['daily_inputs']['Row']
export type Period = Database['public']['Tables']['periods']['Row']

export type ProgramPerformance = ProgramWithRelations & {
  health: ProgramHealthResult
  achievementRp: number
  achievementUser: number
  percentageRp: number
  percentageUser: number
  qualitativePercentage: number
  totalMilestones: number
  completedMilestones: number
  team: { id: string, name: string }[]
}

export interface PICPerformance {
  picId: string
  picName: string
  programCount: number
  avgHealthScore: number
  status: ProgramHealthResult['status']
  grade: { label: string, color: string }
}

export interface TVDashboardData {
  activePeriod: Period | null
  aggregate: {
    healthScore: number
    metricGroups: Record<string, { actual: number, target: number, isComputed: boolean }>
    tercapai: number
    menujuTarget: number
    perluPerhatian: number
  }
  programs: ProgramPerformance[]
  pics: PICPerformance[]
  rawInputs: DailyInput[]
  metricDefinitions: MetricDefinition[]
  metricValues: MetricValue[]
}

export async function getTVDashboardData(): Promise<TVDashboardData> {
  const supabase = createClient()
  
  // 1. Fetch Active Period
  const { data: activePeriod } = await supabase
    .from('periods')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!activePeriod) {
    return {
      activePeriod: null,
      aggregate: {
        healthScore: 0,
        metricGroups: {},
        tercapai: 0,
        menujuTarget: 0,
        perluPerhatian: 0
      },
      programs: [],
      pics: [],
      rawInputs: [],
      metricDefinitions: [],
      metricValues: []
    }
  }

  // 2. Fetch All Active Programs with Teams, Milestones, and Metric Defs
  const { data: allPrograms } = await supabase
    .from('programs')
    .select('*, program_pics(profile_id), program_milestones(*), program_metric_definitions(*)')
    .eq('is_active', true)

  const rawPrograms = (allPrograms as Program[]) || []

  // 3. Fetch All Milestone Completions (Full persistence)
  const allMilestoneIds = rawPrograms.flatMap(p => p.program_milestones.map((m: Milestone) => m.id))
  const { data: milestoneCompletions } = await supabase
    .from('milestone_completions')
    .select('*')
    .in('milestone_id', allMilestoneIds)

  const completions = (milestoneCompletions as MilestoneCompletion[]) || []

  // 4. Fetch All Profiles
  const { data: profiles } = await supabase.from('profiles').select('id, name')
  const profileMap = new Map(profiles?.map(p => [p.id, p.name]))

  // 5. Fetch All Daily Inputs for this Period
  const { data: allInputs } = await supabase
    .from('daily_inputs')
    .select('*')
    .eq('period_id', activePeriod.id)

  const inputs = (allInputs as DailyInput[]) || []

  // 6. Fetch Metric Definitions + Values
  const programIds = rawPrograms.map(p => p.id)

  const { data: metricDefData } = await supabase
    .from('program_metric_definitions')
    .select('*')
    .in('program_id', programIds)

  const { data: metricValueData } = await supabase
    .from('daily_metric_values')
    .select('*')
    .in('program_id', programIds)
    .eq('period_id', activePeriod.id)

  const metricValues = (metricValueData as MetricValue[]) || []

  // 7. Calculate Health for each program
  // Calculate proration factor: today / total days in month
  const today = new Date().getDate()
  const totalDays = activePeriod.working_days || 30
  const prorationFactor = Math.min(today / totalDays, 1)

  const programPerformance: ProgramPerformance[] = rawPrograms.map(prog => {
    const health = calculateProgramHealth(
      prog as ProgramWithRelations, 
      metricValues, 
      inputs, 
      completions, 
      prorationFactor,
      totalDays
    )

    const progInputs = inputs.filter(i => i.program_id === prog.id)
    const achievementRp = progInputs.reduce((sum, i) => sum + (i.achievement_rp || 0), 0)
    const achievementUser = progInputs.reduce((sum, i) => sum + (i.achievement_user || 0), 0)
    
    // Qualitative Progress
    const totalMilestones = prog.program_milestones.length
    const completedMilestones = prog.program_milestones.filter((ms: Milestone) => 
      completions.find(c => c.milestone_id === ms.id && c.is_completed)
    ).length
    const qualitativePercentage = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

    const team = prog.program_pics.map(pp => ({
      id: pp.profile_id,
      name: profileMap.get(pp.profile_id) || '??'
    }))

    // Decorate metric definitions with their current achievement and percentage
    const decoratedMetrics = (prog.program_metric_definitions || []).map(m => {
      const vals = metricValues.filter(mv => mv.program_id === prog.id && mv.metric_definition_id === m.id)
      const achieved = vals.reduce((sum, v) => sum + (v.value || 0), 0)
      
      // Determine target for percentage (use absolute monthly target)
      let monthlyTarget = m.monthly_target || 0
      if (monthlyTarget === 0) {
         if (m.data_type === 'currency') monthlyTarget = prog.monthly_target_rp || 0
         else if (m.data_type === 'integer') monthlyTarget = prog.monthly_target_user || 0
      }
      
      const percentage = monthlyTarget > 0 ? (achieved / monthlyTarget) * 100 : 0
      return { ...m, achieved, percentage }
    })

    return {
      ...prog,
      program_metric_definitions: decoratedMetrics,
      health,
      achievementRp,
      achievementUser,
      percentageRp: prog.monthly_target_rp ? (achievementRp / prog.monthly_target_rp) * 100 : 0,
      percentageUser: prog.monthly_target_user ? (achievementUser / prog.monthly_target_user) * 100 : 0,
      qualitativePercentage,
      totalMilestones,
      completedMilestones,
      team
    }
  })

  // 8. Process PIC Performance
  const picMap = new Map<string, { picId: string, picName: string, healthSum: number, count: number }>()
  
  programPerformance.forEach(prog => {
    prog.team.forEach(member => {
      const existing = picMap.get(member.id) || {
        picId: member.id,
        picName: member.name,
        healthSum: 0,
        count: 0
      }
      existing.healthSum += prog.health.healthScore
      existing.count += 1
      picMap.set(member.id, existing)
    })
  })

  const picPerformance: PICPerformance[] = Array.from(picMap.values()).map(pic => {
    const avgHealth = pic.healthSum / pic.count
    return {
      picId: pic.picId,
      picName: pic.picName,
      programCount: pic.count,
      avgHealthScore: avgHealth,
      status: getHealthStatus(avgHealth),
      grade: getPerformanceGrade(avgHealth)
    }
  })

  // 9. Global Aggregates
  const totalHealth = programPerformance.reduce((sum, p) => sum + p.health.healthScore, 0)
  const avgHealth = programPerformance.length > 0 ? totalHealth / programPerformance.length : 0
  
  const metricGroups = aggregateByMetricGroup(
    rawPrograms as ProgramWithRelations[],
    metricValues,
    prorationFactor,
    totalDays
  )

  return {
    activePeriod,
    aggregate: {
      healthScore: avgHealth,
      metricGroups,
      tercapai: programPerformance.filter(p => p.health.healthScore >= 100).length,
      menujuTarget: programPerformance.filter(p => p.health.healthScore >= 60 && p.health.healthScore < 100).length,
      perluPerhatian: programPerformance.filter(p => p.health.healthScore < 60).length
    },
    programs: programPerformance,
    pics: picPerformance,
    rawInputs: inputs,
    metricDefinitions: (metricDefData as MetricDefinition[]) || [],
    metricValues: metricValues
  }
}
