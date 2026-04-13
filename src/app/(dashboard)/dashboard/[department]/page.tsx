import { createClient } from '@/lib/supabase/server'
import { DepartmentClient } from './department-client'
import { Database } from '@/types/database'
import { Suspense } from 'react'

type DailyInput = Database['public']['Tables']['daily_inputs']['Row']
type Milestone = Database['public']['Tables']['program_milestones']['Row']
type MetricDefinition = Database['public']['Tables']['program_metric_definitions']['Row']
type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']

type ProgramWithRelations = Database['public']['Tables']['programs']['Row'] & {
  program_pics: { profile_id: string }[]
  program_milestones: Milestone[]
  program_metric_definitions: MetricDefinition[]
}

export const dynamic = 'force-dynamic'

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: { department: string }
  searchParams: { startDate?: string; endDate?: string }
}) {
  const supabase = createClient()
  const { startDate, endDate } = searchParams
  const departmentKey = params.department
  
  // 1. Session and Profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // 2. Active Period
  const { data: activePeriod } = await supabase.from('periods').select('*').eq('is_active', true).single()

  if (!activePeriod) {
     return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-amber-800">
        <h3 className="font-bold text-lg mb-2">Belum Ada Periode Aktif</h3>
        <p>Admin harus mengatur periode aktif terlebih dahulu di Master Data agar dashboard dapat menampilkan kalkulasi.</p>
      </div>
     )
  }

  // 3. Programs and Team Access
  let programsQuery = supabase
    .from('programs')
    .select('*, program_pics(profile_id), program_milestones(*), program_metric_definitions(*)')
    .eq('is_active', true)
    .eq('department', departmentKey) // FILTER BERDASARKAN DEPARTEMEN

  if (!isAdmin && user) {
    const { data: myTeamPrograms } = await supabase
      .from('program_pics')
      .select('program_id')
      .eq('profile_id', user.id)
    
    const myProgramIds = myTeamPrograms?.map(tp => tp.program_id) || []
    programsQuery = programsQuery.in('id', myProgramIds)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: programs } = await (programsQuery as any) as { data: ProgramWithRelations[] | null }

  // 4. Milestone Completions
  const allMilestoneIds = programs?.flatMap(p => p.program_milestones?.map((m: Milestone) => m.id)) || []
  let milestoneCompletions: any = []
  if (allMilestoneIds.length > 0) {
    const { data } = await supabase
      .from('milestone_completions')
      .select('*')
      .in('milestone_id', allMilestoneIds)
    milestoneCompletions = data || []
  }

  // 5. PIC Profiles for display names
  // only fetch profiles that exist in these programs to save bandwidth
  const profileIds = new Set<string>()
  programs?.forEach(p => p.program_pics?.forEach(pic => profileIds.add(pic.profile_id)))
  
  let picProfiles: any = []
  if (profileIds.size > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', Array.from(profileIds))
    picProfiles = data || []
  }

  // 6. Daily Inputs
  let dailyInputs: DailyInput[] = []
  if (programs && programs.length > 0) {
    const programIds = programs.map(p => p.id)
    
    let query = supabase
      .from('daily_inputs')
      .select('*')
      .in('program_id', programIds)
    
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      query = query.eq('period_id', activePeriod.id)
    }

    const { data: inputs } = await query.order('date', { ascending: true })
    dailyInputs = inputs || []
  }

  // 7. Metric Values
  let metricValues: MetricValue[] = []
  if (programs && programs.length > 0) {
    const programIds = programs.map(p => p.id)
    const { data: mv } = await supabase
      .from('daily_metric_values')
      .select('*')
      .in('program_id', programIds)
      .eq('period_id', activePeriod.id)
    metricValues = mv || []
  }

  const filterStrings = {
    startDate: startDate || '',
    endDate: endDate || ''
  }

  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse bg-slate-100 rounded-xl" />}>
      <DepartmentClient 
        departmentKey={departmentKey}
        programs={programs || []} 
        dailyInputs={dailyInputs} 
        activePeriod={activePeriod}
        initialFilters={filterStrings}
        milestoneCompletions={milestoneCompletions}
        picProfiles={picProfiles}
        metricValues={metricValues}
      />
    </Suspense>
  )
}
