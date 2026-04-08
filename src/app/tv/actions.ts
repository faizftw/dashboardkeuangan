'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export type Program = Database['public']['Tables']['programs']['Row']
export type DailyInput = Database['public']['Tables']['daily_inputs']['Row']
export type Period = Database['public']['Tables']['periods']['Row']

export interface ProgramPerformance extends Program {
  achievementRp: number
  achievementUser: number
  percentageRp: number
  percentageUser: number
  status: 'TERCAPAI' | 'MENUJU TARGET' | 'PERLU PERHATIAN'
  latestQualitativeStatus: Database['public']['Enums']['qualitative_status'] | null
}

export interface PICPerformance {
  picName: string
  programCount: number
  totalTargetRp: number
  totalAchievementRp: number
  totalTargetUser: number
  totalAchievementUser: number
  percentageRp: number
  status: 'TERCAPAI' | 'MENUJU TARGET' | 'PERLU PERHATIAN'
}

export interface TVDashboardData {
  activePeriod: Period | null
  aggregate: {
    totalTargetRp: number
    totalAchievementRp: number
    totalTargetUser: number
    totalAchievementUser: number
    percentageRp: number
    percentageUser: number
    tercapai: number
    menujuTarget: number
    perluPerhatian: number
  }
  programs: ProgramPerformance[]
  pics: PICPerformance[]
  rawInputs: DailyInput[]
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
        totalTargetRp: 0,
        totalAchievementRp: 0,
        totalTargetUser: 0,
        totalAchievementUser: 0,
        percentageRp: 0,
        percentageUser: 0,
        tercapai: 0,
        menujuTarget: 0,
        perluPerhatian: 0
      },
      programs: [],
      pics: [],
      rawInputs: []
    }
  }

  // 2. Fetch All Active Programs
  const { data: allPrograms } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)

  const programs = allPrograms || []

  // 3. Fetch All Daily Inputs for this Period
  const { data: allInputs } = await supabase
    .from('daily_inputs')
    .select('*')
    .eq('period_id', activePeriod.id)

  const inputs = allInputs || []

  // 4. Process Program Performance
  const programPerformance: ProgramPerformance[] = programs.map(prog => {
    const progInputs = inputs.filter(i => i.program_id === prog.id)
    const achievementRp = progInputs.reduce((sum, i) => sum + (i.achievement_rp || 0), 0)
    const achievementUser = progInputs.reduce((sum, i) => sum + (i.achievement_user || 0), 0)
    
    const percentageRp = prog.monthly_target_rp && prog.monthly_target_rp > 0 
      ? (achievementRp / prog.monthly_target_rp) * 100 
      : 0
    
    const percentageUser = prog.monthly_target_user && prog.monthly_target_user > 0
      ? (achievementUser / prog.monthly_target_user) * 100
      : 0

    let status: ProgramPerformance['status'] = 'PERLU PERHATIAN'
    if (percentageRp >= 100) status = 'TERCAPAI'
    else if (percentageRp >= 50) status = 'MENUJU TARGET'

    const latestInputWithStatus = [...progInputs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .find(i => i.qualitative_status !== null)

    return {
      ...prog,
      achievementRp,
      achievementUser,
      percentageRp,
      percentageUser,
      status,
      latestQualitativeStatus: latestInputWithStatus?.qualitative_status || null
    }
  })

  // 5. Process PIC Performance
  const picMap = new Map<string, PICPerformance>()
  
  programPerformance.forEach(prog => {
    const picName = prog.pic_name
    const existing = picMap.get(picName) || {
      picName,
      programCount: 0,
      totalTargetRp: 0,
      totalAchievementRp: 0,
      totalTargetUser: 0,
      totalAchievementUser: 0,
      percentageRp: 0,
      status: 'PERLU PERHATIAN'
    }

    existing.programCount += 1
    existing.totalTargetRp += (prog.monthly_target_rp || 0)
    existing.totalAchievementRp += prog.achievementRp
    existing.totalTargetUser += (prog.monthly_target_user || 0)
    existing.totalAchievementUser += prog.achievementUser
    
    picMap.set(picName, existing)
  })

  const picPerformance: PICPerformance[] = Array.from(picMap.values()).map(pic => {
    const percentageRp = pic.totalTargetRp > 0 ? (pic.totalAchievementRp / pic.totalTargetRp) * 100 : 0
    let status: PICPerformance['status'] = 'PERLU PERHATIAN'
    if (percentageRp >= 100) status = 'TERCAPAI'
    else if (percentageRp >= 50) status = 'MENUJU TARGET'
    
    return { ...pic, percentageRp, status }
  })

  // 6. Global Aggregates
  const totalTargetRp = programPerformance.reduce((sum, p) => sum + (p.monthly_target_rp || 0), 0)
  const totalAchievementRp = programPerformance.reduce((sum, p) => sum + p.achievementRp, 0)
  const totalTargetUser = programPerformance.reduce((sum, p) => sum + (p.monthly_target_user || 0), 0)
  const totalAchievementUser = programPerformance.reduce((sum, p) => sum + p.achievementUser, 0)
  
  const aggPercentageRp = totalTargetRp > 0 ? (totalAchievementRp / totalTargetRp) * 100 : 0
  const aggPercentageUser = totalTargetUser > 0 ? (totalAchievementUser / totalTargetUser) * 100 : 0

  return {
    activePeriod,
    aggregate: {
      totalTargetRp,
      totalAchievementRp,
      totalTargetUser,
      totalAchievementUser,
      percentageRp: aggPercentageRp,
      percentageUser: aggPercentageUser,
      tercapai: programPerformance.filter(p => p.status === 'TERCAPAI').length,
      menujuTarget: programPerformance.filter(p => p.status === 'MENUJU TARGET').length,
      perluPerhatian: programPerformance.filter(p => p.status === 'PERLU PERHATIAN').length
    },
    programs: programPerformance,
    pics: picPerformance,
    rawInputs: inputs
  }
}
