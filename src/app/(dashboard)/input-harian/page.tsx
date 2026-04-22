import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { InputHarianContainer } from './input-harian-container'
import { formatMonth } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Milestone = Database['public']['Tables']['program_milestones']['Row']
type MetricDefinition = Database['public']['Tables']['program_metric_definitions']['Row']
type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']

type ProgramWithMilestones = Database['public']['Tables']['programs']['Row'] & {
  program_milestones: Milestone[]
  program_metric_definitions: MetricDefinition[]
}

type DailyInputWithDetails = Database['public']['Tables']['daily_inputs']['Row'] & {
  programs: {
    name: string;
    target_type: Database['public']['Enums']['target_type'];
  } | null;
  profiles: {
    name: string;
  } | null;
}

export default async function InputHarianPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // 1. Fetch Active Period
  const { data: activePeriod } = await supabase
    .from('periods')
    .select('*')
    .eq('is_active', true)
    .single()

  // 2. Fetch User Role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // 3. Fetch Active Programs with Milestones AND Metric Definitions
  let programsQuery = supabase
    .from('programs')
    .select('*, program_milestones(*), program_metric_definitions(*)')
    .eq('is_active', true)

  if (!isAdmin) {
    const { data: myAssignments } = await supabase
      .from('program_pics')
      .select('program_id')
      .eq('profile_id', user.id)
    const myIdList = myAssignments?.map(a => a.program_id) || []
    programsQuery = programsQuery.in('id', myIdList.length > 0 ? myIdList : ['none'])
  }

  const { data: activePrograms } = await programsQuery.order('name')

  const programsTyped = (activePrograms as unknown as ProgramWithMilestones[]) || []

  // 3. Fetch ALL Milestone Completions for active programs
  const allMilestoneIds = programsTyped.flatMap(p => p.program_milestones?.map((m: Milestone) => m.id)) || []
  const { data: milestoneCompletions } = await supabase
    .from('milestone_completions')
    .select('*')
    .in('milestone_id', allMilestoneIds.length > 0 ? allMilestoneIds : ['none'])

  // 4. Fetch today's existing metric values (for pre-filling the form)
  let existingMetricValues: MetricValue[] = []
  let allPeriodMetricValues: MetricValue[] = []
  const today = new Date().toISOString().split('T')[0]
  if (activePeriod) {
    const { data: mvAll } = await supabase
      .from('daily_metric_values')
      .select('*')
      .eq('period_id', activePeriod.id)
    
    allPeriodMetricValues = mvAll || []
    existingMetricValues = allPeriodMetricValues.filter(m => m.date === today)
  }


  // 6. Fetch Past Inputs for the Active Period
  let pastInputs: DailyInputWithDetails[] = []
  if (activePeriod) {
    let query = supabase
      .from('daily_inputs')
      .select(`
        *,
        programs (
          name,
          target_type
        ),
        profiles (
          name
        )
      `)
      .eq('period_id', activePeriod.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      
    if (!isAdmin) {
      query = query.eq('created_by', user.id)
    }
    
    const { data } = await query
    pastInputs = data || []
  }

  // 7. Fetch ALL historical data for MoU programs for cumulative validation
  const mouProgramIds = programsTyped.filter(p => p.target_type === 'mou').map(p => p.id)
  let historicalMoUStats: Record<string, { leads: number; ttd: number; drop: number }> = {}
  
  if (mouProgramIds.length > 0) {
    const { data: historicalInputs } = await supabase
      .from('daily_inputs')
      .select('program_id, achievement_user, prospek_drop')
      .in('program_id', mouProgramIds)
      // We need ALL inputs to get true cumulative
    
    const { data: historicalMetricValues } = await supabase
      .from('daily_metric_values')
      .select('program_id, value, metric_definition_id, program_metric_definitions(metric_key)')
      .in('program_id', mouProgramIds)

    mouProgramIds.forEach(pid => {
      const pInputs = historicalInputs?.filter(hi => hi.program_id === pid) || []
      const pMetrics = historicalMetricValues?.filter(hm => hm.program_id === pid) || []
      
      const leads = pMetrics.filter(m => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['leads', 'agreement_leads', 'prospek'].includes((m.program_metric_definitions as any)?.metric_key)
      ).reduce((s, m) => s + (Number(m.value) || 0), 0)
      
      const ttd = pInputs.reduce((s, hi) => s + (Number(hi.achievement_user) || 0), 0)
      const drop = pInputs.reduce((s, hi) => s + (Number(hi.prospek_drop) || 0), 0)
      
      historicalMoUStats[pid] = { leads, ttd, drop }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Pencapaian Harian</h2>
        <p className="text-slate-500">Catat dan pantau aktivitas harian Anda terhadap target program berjalan.</p>
      </div>

      {!activePeriod ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-red-800">Tidak Ada Periode Aktif</h3>
          <p className="text-red-600 mt-2 max-w-lg mx-auto">
            Input harian saat ini terkunci karena Admin belum mengaktifkan periode bulan ini di Master Data. Silakan hubungi Admin Anda.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Periode Aktif Saat Ini</span>
              <span className="text-lg font-semibold text-indigo-900">Bulan {formatMonth(activePeriod.month)} Tahun {activePeriod.year}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-slate-700 shadow-sm border border-slate-100">
              Total Hari Kerja: <span className="font-bold text-indigo-600">{activePeriod.working_days} Hari</span>
            </div>
          </div>

          {programsTyped && programsTyped.length > 0 ? (
            <InputHarianContainer 
              programs={programsTyped}
              pastInputs={pastInputs} 
              isAdmin={isAdmin}
              activePeriod={activePeriod}
              milestoneCompletions={milestoneCompletions || []}
              existingMetricValues={existingMetricValues}
              allPeriodMetricValues={allPeriodMetricValues}
              historicalMoUStats={historicalMoUStats}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center py-8">
              <p className="text-slate-500 font-medium">Belum ada satupun program aktif yang bisa diinput.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
