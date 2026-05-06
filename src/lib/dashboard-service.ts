import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
export { type ProgramWithRelations } from './dashboard-calculator'
import { 
  calculateProgramHealth, 
  aggregateByMetricGroup, 
  aggregateGlobalKPIs,
  aggregateAdsMetrics,
  buildAdsDailySeries,
  buildHealthTrendSeries,
  buildTargetTrendSeries,
  ProgramWithRelations,
  ProgramHealthResult,
  HealthTrendPoint,
  TargetTrendPoint,
  getRollingAverage,
  calculateGrowth
} from './dashboard-calculator'

type DailyInput = Database['public']['Tables']['daily_inputs']['Row']
type MilestoneCompletion = Database['public']['Tables']['milestone_completions']['Row']
type MetricValue = Database['public']['Tables']['daily_metric_values']['Row']
type Period = Database['public']['Tables']['periods']['Row']

export interface DashboardSummary {
  overallHealth: number
  statusCounts: {
    tercapai: number
    menujuTarget: number
    perluPerhatian: number
  }
  aggregates: ReturnType<typeof aggregateByMetricGroup>
  globalKPIs: ReturnType<typeof aggregateGlobalKPIs>
  adsMetrics: ReturnType<typeof aggregateAdsMetrics>
  adsDailySeries: ReturnType<typeof buildAdsDailySeries>
  healthTrend: HealthTrendPoint[]
  targetTrend: TargetTrendPoint[]
  programHealths: (ProgramHealthResult & { program: ProgramWithRelations })[]
}

export interface UnifiedDashboardData {
  programs: ProgramWithRelations[]
  dailyInputs: DailyInput[]
  milestoneCompletions: MilestoneCompletion[]
  metricValues: MetricValue[]
  activePeriod: Period | null
  prorationFactor: number
  summary: DashboardSummary
  previousData?: {
    dailyInputs: DailyInput[]
    metricValues: MetricValue[]
    summary: DashboardSummary
  }
}

/**
 * Core service to fetch and process dashboard data.
 * Used by main dashboard, target dashboard, and TV dashboard.
 */
export async function getUnifiedDashboardData(options: {
  profileId?: string
  isAdmin?: boolean
  startDate?: string
  endDate?: string
  periodId?: string
  includePrevious?: boolean
}): Promise<UnifiedDashboardData> {
  const supabase = createClient()
  
  // 1 & 2. Fetch Active Period, matching date-range period, and Programs in parallel
  const [periodResult, dateRangePeriodResult, programsResult] = await Promise.all([
    // Always fetch the currently active period for context
    (async () => {
      let q = supabase.from('periods').select('*')
      if (options.periodId) {
        q = q.eq('id', options.periodId)
      } else {
        q = q.eq('is_active', true)
      }
      return q.single()
    })(),
    // When a custom date range is applied, also fetch the period that matches
    // startDate's month/year so we use that period's working_days & targets
    (async () => {
      if (options.startDate && !options.periodId) {
        const d = new Date(options.startDate)
        const month = d.getUTCMonth() + 1
        const year = d.getUTCFullYear()
        return supabase
          .from('periods')
          .select('*')
          .eq('month', month)
          .eq('year', year)
          .maybeSingle()
      }
      return { data: null }
    })(),
    (async () => {
      let q = supabase
        .from('programs')
        .select('*, program_pics(profile_id), program_milestones(*), program_metric_definitions(*)')
        .eq('is_active', true)

      if (options.profileId && !options.isAdmin) {
        const { data: myTeamPrograms } = await supabase
          .from('program_pics')
          .select('program_id')
          .eq('profile_id', options.profileId)
        const myProgramIds = myTeamPrograms?.map(tp => tp.program_id) || []
        q = q.in('id', myProgramIds)
      }
      return q.order('name') as unknown as Promise<{ data: ProgramWithRelations[] | null }>
    })()
  ])

  const activePeriod = periodResult.data
  // Use the date-range period (e.g. April) when a date filter is applied,
  // falling back to the active period (e.g. May) if no matching period found
  const dateRangePeriod = dateRangePeriodResult?.data ?? null
  // This is the period whose working_days and metadata we use for calculations
  const calculationPeriod = (options.startDate && dateRangePeriod) ? dateRangePeriod : activePeriod
  
  // Filter out programs that were created AFTER the selected period or date range
  let validPrograms = (programsResult.data || []) as ProgramWithRelations[]
  
  if (options.endDate) {
    const endFilterDate = new Date(options.endDate)
    endFilterDate.setUTCHours(23, 59, 59, 999)
    validPrograms = validPrograms.filter(p => {
      if (!p.created_at) return true
      return new Date(p.created_at) <= endFilterDate
    })
  } else if (calculationPeriod) {
    // End of the month for the calculation period
    const endOfCalcPeriod = new Date(Date.UTC(calculationPeriod.year, calculationPeriod.month, 0, 23, 59, 59, 999))
    validPrograms = validPrograms.filter(p => {
      if (!p.created_at) return true
      return new Date(p.created_at) <= endOfCalcPeriod
    })
  }

  const programs = validPrograms
  const programIds = programs.map(p => p.id)

  if (!activePeriod || programs.length === 0) {
    return {
      programs: programs,
      dailyInputs: [],
      milestoneCompletions: [],
      metricValues: [],
      activePeriod: activePeriod || null,
      prorationFactor: 1,
      summary: {
        overallHealth: 0,
        statusCounts: { tercapai: 0, menujuTarget: 0, perluPerhatian: 0 },
        aggregates: {},
        globalKPIs: {
          avgHealth: 0,
          activeProgramsCount: 0,
          totalPrograms: 0,
          targetsHit: 0,
          totalMilestones: 0,
          completedMilestones: 0,
          healthStatus: 'KRITIS'
        },
        adsMetrics: {
          totalAdsSpent: 0,
          totalRevenue: 0,
          totalGoals: 0,
          totalLeads: 0,
          avgRoas: 0,
          avgCpp: 0,
          avgCr: 0
        },
        adsDailySeries: [],
        healthTrend: [],
        targetTrend: [],
        programHealths: []
      }
    }
  }

  // Compute a hard date-range for queries to prevent data from adjacent months leaking in.
  // - If startDate+endDate given: use them directly.
  // - If periodId given (Laporan Periode button): derive the exact month boundary from the fetched period.
  // - Otherwise (active period, no filter): derive from the active period's month.
  const milestoneIds = programs.flatMap(p => p.program_milestones?.map(m => m.id) || [])
  const queryPeriod = calculationPeriod ?? activePeriod
  const queryStartDate = options.startDate ?? 
    (queryPeriod ? `${queryPeriod.year}-${String(queryPeriod.month).padStart(2, '0')}-01` : undefined)
  const queryEndDate = options.endDate ?? 
    (queryPeriod ? (() => {
      const lastDay = new Date(queryPeriod.year, queryPeriod.month, 0).getDate()
      return `${queryPeriod.year}-${String(queryPeriod.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    })() : undefined)

  const [inputsResult, metricsResult, milestoneResult] = await Promise.all([
    // Daily Inputs
    (async () => {
      let q = supabase.from('daily_inputs').select('*').in('program_id', programIds)
      if (queryStartDate && queryEndDate) {
        q = q.gte('date', queryStartDate).lte('date', queryEndDate)
      } else {
        q = q.eq('period_id', activePeriod.id)
      }
      return q
    })(),
    // Metric Values
    (async () => {
      let q = supabase.from('daily_metric_values').select('*').in('program_id', programIds)
      if (queryStartDate && queryEndDate) {
        q = q.gte('date', queryStartDate).lte('date', queryEndDate)
      } else {
        q = q.eq('period_id', activePeriod.id)
      }
      return q
    })(),
    // Milestone Completions
    (async () => {
      if (milestoneIds.length === 0) return { data: [] }
      let q = supabase.from('milestone_completions').select('*').in('milestone_id', milestoneIds)
      if (queryStartDate && queryEndDate) {
        q = q.gte('completed_at', queryStartDate).lte('completed_at', queryEndDate + 'T23:59:59')
      } else {
        q = q.eq('period_id', activePeriod.id)
      }
      return q
    })()
  ])

  const dailyInputs = inputsResult.data || []
  const metricValues = metricsResult.data || []
  const milestoneCompletions = milestoneResult.data || []

  // 6b. Check for carry-over settings and per-period target snapshots
  let allDailyInputs = dailyInputs
  let allMetricValues = metricValues

  // periodToQuery: when date range filter is active, look up settings for the
  // matching period (e.g. April), not the currently active period (May).
  const periodToQuery = calculationPeriod ?? activePeriod

  if (programIds.length > 0) {
    // Ambil semua snapshot target untuk program-program ini
    // Kemudian pilih snapshot yang paling cocok (exact match dengan periode filter,
    // atau terdekat/terbaru sebelum periode tersebut sebagai fallback)
    const { data: allPeriodSettings } = await supabase
      .from('program_period_settings')
      .select('program_id, period_id, carry_over_from_period_id, monthly_target_rp, monthly_target_user, daily_target_rp, daily_target_user, custom_targets')
      .in('program_id', programIds)

    // Ambil semua periode yang relevan sekaligus untuk mendapatkan urutan bulan/tahunnya
    const allPeriodIds = Array.from(new Set((allPeriodSettings || []).map(s => s.period_id)))
    const periodOrderMap = new Map<string, { month: number; year: number }>()
    
    if (allPeriodIds.length > 0) {
      const { data: allPeriods } = await supabase
        .from('periods')
        .select('id, month, year')
        .in('id', allPeriodIds)
      
      allPeriods?.forEach(p => periodOrderMap.set(p.id, { month: p.month, year: p.year }))
    }

    // Tambahkan periodToQuery ke map jika belum ada
    if (!periodOrderMap.has(periodToQuery.id)) {
      periodOrderMap.set(periodToQuery.id, { month: periodToQuery.month, year: periodToQuery.year })
    }

    // Fungsi untuk mengkonversi period ke nilai numerik untuk perbandingan
    const periodToNum = (month: number, year: number) => year * 12 + month
    const targetNum = periodToNum(periodToQuery.month, periodToQuery.year)

    // Build map override per-program: pilih snapshot terbaik
    const periodTargetOverrides = new Map<string, {
      monthly_target_rp: number | null
      monthly_target_user: number | null
      daily_target_rp: number | null
      daily_target_user: number | null
      custom_targets: Record<string, number> | null
    }>()

    // Kelompokkan snapshot per program_id
    const settingsByProgram = new Map<string, typeof allPeriodSettings>() 
    ;(allPeriodSettings || []).forEach(s => {
      const list = settingsByProgram.get(s.program_id) || []
      list.push(s)
      settingsByProgram.set(s.program_id, list)
    })

    programIds.forEach(programId => {
      const snapshots = settingsByProgram.get(programId) || []
      if (snapshots.length === 0) return

      // 1. Cari exact match dulu
      const exactMatch = snapshots.find(s => s.period_id === periodToQuery.id)
      if (exactMatch && (exactMatch.monthly_target_rp != null || exactMatch.monthly_target_user != null || exactMatch.custom_targets != null)) {
        periodTargetOverrides.set(programId, {
          monthly_target_rp: exactMatch.monthly_target_rp,
          monthly_target_user: exactMatch.monthly_target_user,
          daily_target_rp: exactMatch.daily_target_rp,
          daily_target_user: exactMatch.daily_target_user,
          custom_targets: exactMatch.custom_targets as Record<string, number> | null
        })
        return
      }

      // 2. Jika tidak ada exact match, cari snapshot terbaru yang masih <= periode filter
      // (fallback untuk program yang belum di-snapshot sebelum fitur ini dibuat)
      const snapshotsWithOrder = snapshots
        .filter(s => {
          const info = periodOrderMap.get(s.period_id)
          if (!info) return false
          return periodToNum(info.month, info.year) <= targetNum
        })
        .map(s => {
          const info = periodOrderMap.get(s.period_id)!
          return { ...s, periodNum: periodToNum(info.month, info.year) }
        })
        .sort((a, b) => b.periodNum - a.periodNum) // sort terbaru dulu

      const bestFallback = snapshotsWithOrder.find(
        s => s.monthly_target_rp != null || s.monthly_target_user != null || s.custom_targets != null
      )
      if (bestFallback) {
        periodTargetOverrides.set(programId, {
          monthly_target_rp: bestFallback.monthly_target_rp,
          monthly_target_user: bestFallback.monthly_target_user,
          daily_target_rp: bestFallback.daily_target_rp,
          daily_target_user: bestFallback.daily_target_user,
          custom_targets: bestFallback.custom_targets as Record<string, number> | null
        })
      }
    })

    // Terapkan override ke objek program
    if (periodTargetOverrides.size > 0) {
      programs.forEach((p, idx) => {
        const override = periodTargetOverrides.get(p.id)
        if (override) {
          programs[idx] = {
            ...p,
            monthly_target_rp: override.monthly_target_rp ?? p.monthly_target_rp,
            monthly_target_user: override.monthly_target_user ?? p.monthly_target_user,
            daily_target_rp: override.daily_target_rp ?? p.daily_target_rp,
            daily_target_user: override.daily_target_user ?? p.daily_target_user,
            program_metric_definitions: p.program_metric_definitions?.map(m => {
              if (override.custom_targets && override.custom_targets[m.metric_key] !== undefined) {
                return { ...m, monthly_target: override.custom_targets[m.metric_key] }
              }
              return m
            })
          }
        }
      })
    }

    // Ambil data carry-over dari allPeriodSettings (hanya yang punya carry_over)
    const periodSettings = (allPeriodSettings || []).filter(s => s.period_id === periodToQuery.id)
    const carrySettings = periodSettings.filter(s => s.carry_over_from_period_id != null)

    if (carrySettings && carrySettings.length > 0) {
      // Group by from_period_id to batch-fetch efficiently
      const fromPeriodGroups = new Map<string, string[]>()
      carrySettings.forEach(s => {
        if (!s.carry_over_from_period_id) return
        const list = fromPeriodGroups.get(s.carry_over_from_period_id) || []
        list.push(s.program_id)
        fromPeriodGroups.set(s.carry_over_from_period_id, list)
      })

      // Collect all milestone IDs for carry-over programs (for qualitative programs)
      const carryProgramIds = carrySettings.map(s => s.program_id)
      const carryMilestoneIds = programs
        .filter(p => carryProgramIds.includes(p.id))
        .flatMap(p => p.program_milestones?.map(m => m.id) || [])

      const historicalFetches = Array.from(fromPeriodGroups.entries()).map(
        async ([fromPeriodId, progIds]) => {
          const [histInputs, histMetrics, histMilestones] = await Promise.all([
            supabase.from('daily_inputs').select('*')
              .eq('period_id', fromPeriodId)
              .in('program_id', progIds),
            supabase.from('daily_metric_values').select('*')
              .eq('period_id', fromPeriodId)
              .in('program_id', progIds),
            // Milestone completions for qualitative carry-over programs
            carryMilestoneIds.length > 0
              ? supabase.from('milestone_completions').select('*')
                  .eq('period_id', fromPeriodId)
                  .in('milestone_id', carryMilestoneIds)
              : Promise.resolve({ data: [] }),
          ])
          return {
            inputs: histInputs.data || [],
            metrics: histMetrics.data || [],
            milestones: histMilestones.data || [],
          }
        }
      )

      const historicalResults = await Promise.all(historicalFetches)
      const extraInputs = historicalResults.flatMap(r => r.inputs)
      const extraMetrics = historicalResults.flatMap(r => r.metrics)
      const extraMilestones = historicalResults.flatMap(r => r.milestones)

      // Merge — remap period_id to the calculation period for calculator consistency
      const mergedInputs = extraInputs.map(i => ({ ...i, period_id: periodToQuery.id }))
      const mergedMetrics = extraMetrics.map(m => ({ ...m, period_id: periodToQuery.id }))
      // For milestones: only include completions not already present in the current period
      const currentMilestoneIds = new Set(milestoneCompletions.map(mc => mc.milestone_id))
      const mergedMilestones = extraMilestones
        .filter(mc => mc.is_completed && !currentMilestoneIds.has(mc.milestone_id))
        .map(mc => ({ ...mc, period_id: periodToQuery.id }))

      allDailyInputs = [...dailyInputs, ...mergedInputs as typeof dailyInputs]
      allMetricValues = [...metricValues, ...mergedMetrics as typeof metricValues]
      // Extend milestoneCompletions with carry-over completions
      ;(milestoneCompletions as typeof milestoneCompletions).push(...mergedMilestones as typeof milestoneCompletions)
    }
  }

  // 6. Indexing for O(1) Lookups in Calculator
  const metricValuesByProgram = new Map<string, MetricValue[]>()
  allMetricValues.forEach(mv => {
    const list = metricValuesByProgram.get(mv.program_id) || []
    list.push(mv)
    metricValuesByProgram.set(mv.program_id, list)
  })

  const dailyInputsByProgram = new Map<string, DailyInput[]>()
  allDailyInputs.forEach(di => {
    const list = dailyInputsByProgram.get(di.program_id) || []
    list.push(di)
    dailyInputsByProgram.set(di.program_id, list)
  })

  const milestoneCompletionsByMilestone = new Map<string, MilestoneCompletion>()
  milestoneCompletions.forEach(mc => {
    milestoneCompletionsByMilestone.set(mc.milestone_id, mc as MilestoneCompletion)
  })

  // 7. Proration Factor & Summary
  // IMPORTANT: Use the period that matches the filtered date range (e.g. April)
  // to get correct working_days. Falls back to active period if no match found.
  const workingDays = (calculationPeriod?.working_days) || 30
  const today = new Date().getDate()
  const todayIso = new Date().toISOString().split('T')[0]
  
  // Preliminary max date check for pro-rata adjustment
  const maxMetricDate = allMetricValues.reduce((max, v) => (max === '' || v.date > max ? v.date : max), '')
  const maxInputDate = allDailyInputs.reduce((max, i) => (max === '' || i.date > max ? i.date : max), '')
  const maxAchievementDate = maxMetricDate > maxInputDate ? maxMetricDate : maxInputDate
  const isTodayDone = maxAchievementDate === todayIso

  const now = new Date()
  const isPastPeriod = calculationPeriod && (
    calculationPeriod.year < now.getUTCFullYear() ||
    (calculationPeriod.year === now.getUTCFullYear() && calculationPeriod.month < (now.getUTCMonth() + 1))
  )

  let prorationFactor = 1
  if (options.startDate && options.endDate) {
    const start = new Date(options.startDate)
    const end = new Date(options.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const daysInSelection = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    // Use workingDays from the FILTERED period (e.g. April = 30), not active (May = 31)
    prorationFactor = daysInSelection / workingDays
  } else if (isPastPeriod) {
    // Jika melihat laporan periode lalu, periodenya sudah lewat jadi dianggap 100% (1.0)
    prorationFactor = 1
  } else {
    // If today is not input yet, we only expect progress up to yesterday
    const effectiveDay = isTodayDone ? today : Math.max(0, today - 1)
    prorationFactor = Math.min(effectiveDay / workingDays, 1)
  }

  const processSummary = (
    valsByProg: Map<string, MetricValue[]>, 
    inputsByProg: Map<string, DailyInput[]>,
    compsByMilestone: Map<string, MilestoneCompletion>
  ) => {
    const programHealths = programs.map(p => {
      const health = calculateProgramHealth(
        p, 
        valsByProg, 
        inputsByProg, 
        compsByMilestone, 
        prorationFactor,
        workingDays
      )
      return { ...health, program: p }
    })

    const overallHealth = programHealths.length > 0
      ? programHealths.reduce((sum, ph) => sum + ph.healthScore, 0) / programHealths.length
      : 0

    const statusCounts = {
      tercapai: programHealths.filter(ph => ph.healthScore >= 100).length,
      menujuTarget: programHealths.filter(ph => ph.healthScore >= 60 && ph.healthScore < 100).length,
      perluPerhatian: programHealths.filter(ph => ph.healthScore < 60).length
    }

    const aggregates = aggregateByMetricGroup(programs, valsByProg, inputsByProg, prorationFactor)

    // ─── 8. ENHANCED KPI COMPARISON LOGIC ──────────────────────────────────────
    const allVals = Array.from(valsByProg.values()).flat()
    const allInputs = Array.from(inputsByProg.values()).flat()
    const maxValDate = allVals.reduce((max, v) => (max === '' || v.date > max ? v.date : max), '')
    const maxInputDate = allInputs.reduce((max, i) => (max === '' || i.date > max ? i.date : max), '')
    
    let lastDate = options.endDate || (maxValDate > maxInputDate ? maxValDate : maxInputDate) || new Date().toISOString().split('T')[0]
    
    // Safety check: if lastDate is from a different month/year than activePeriod, 
    // it's likely very old data. Default to today for a meaningful "rolling average" attempt.
    if (activePeriod && !options.endDate) {
      const activeMonthStr = `${activePeriod.year}-${String(activePeriod.month).padStart(2, '0')}`
      if (!lastDate.startsWith(activeMonthStr)) {
        lastDate = new Date().toISOString().split('T')[0]
      }
    }

    const getDailySeries = (group: string, synonyms: string[]) => {
      const dailyMap = new Map<string, number>()
      
      // 1. Data from modern daily_metric_values
      programs.forEach(p => {
        const defs = p.program_metric_definitions || []
        const pVals = valsByProg.get(p.id) || []
        defs.forEach(m => {
          if (m.metric_group === group || synonyms.includes(m.metric_key?.toLowerCase())) {
            const mVals = pVals.filter(mv => mv.metric_definition_id === m.id)
            mVals.forEach(mv => {
              dailyMap.set(mv.date, (dailyMap.get(mv.date) || 0) + (mv.value || 0))
            })
          }
        })
      })

      // 2. Data from legacy daily_inputs (if group matches)
      if (group === 'revenue' || group === 'user_acquisition') {
        programs.forEach(p => {
          const pInps = inputsByProg.get(p.id) || []
          pInps.forEach(i => {
            const val = group === 'revenue' ? Number(i.achievement_rp || 0) : Number(i.achievement_user || 0)
            // Only add if we don't already have modern data for this specific program+date? 
            // Actually, in dashboard aggregation, we should probably be careful about double counting.
            // But if a program has defs, it USUALLY won't have legacy achievement_rp filled UNLESS it's a legacy program.
            // For safety, we only add legacy value if the map for this date doesn't exist, OR we just add it?
            // Standardizing on "add it" because legacy programs won't have modern MVals.
            if (val > 0) {
              dailyMap.set(i.date, (dailyMap.get(i.date) || 0) + val)
            }
          })
        })
      }
      return Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value }))
    }

    // FLOW METRICS: 3-day average comparison
    const flowGroups = [
      { key: 'ad_spend', syn: ['ads_spent', 'ad_spend', 'budget_iklan'], label: 'ads spent' },
      { key: 'leads', syn: ['leads', 'lead_masuk'], label: 'leads' }
    ]

    flowGroups.forEach(g => {
      if (aggregates[g.key]) {
        const series = getDailySeries(g.key, g.syn)
        const last3 = getRollingAverage(series, lastDate, 3)
        const prev3 = getRollingAverage(series, new Date(new Date(lastDate).getTime() - 3*24*60*60*1000).toISOString().split('T')[0], 3)
        const change = calculateGrowth(last3, prev3)

        aggregates[g.key].comparison = {
          value: last3,
          percentage: change,
          status: change === null ? undefined : change >= 0 ? 'improving' : 'declining',
          label: 'vs avg previous 3 days',
          type: 'flow'
        }
      }
    })

    // TARGET METRICS SPECIFIC ADDITIONS (Required Daily)
    if (aggregates.revenue) {
      // If today is not done, today is a remaining day
      const effectiveElapsed = isTodayDone ? today : Math.max(0, today - 1)
      const remainingDays = Math.max(1, workingDays - effectiveElapsed)
      const remainingTarget = Math.max(0, aggregates.revenue.totalTarget - aggregates.revenue.actual)
      aggregates.revenue.requiredDaily = remainingTarget / remainingDays
    }

    // RATIO METRICS: Ads Metrics (weighted average windows)
    const adsMetrics = aggregateAdsMetrics(programs, valsByProg, inputsByProg)
    
    // We compute RATIO comparison for ROAS and CPP manually using weighted values from windows
    const adsSpendSeries = getDailySeries('ad_spend', ['ads_spent', 'ad_spend', 'budget_iklan'])
    const adsRevSeries = getDailySeries('revenue', ['revenue', 'omzet', 'revenue_from_paid_traffic'])
    const adsGoalSeries = getDailySeries('user_acquisition', ['user_count', 'closing'])

    const calculateWeightedRatio = (numSeries: {date:string,value:number}[], denSeries: {date:string,value:number}[], date: string, window: number) => {
      const start = new Date(date); start.setDate(start.getDate() - window + 1)
      const startStr = start.toISOString().split('T')[0]
      
      const numSum = numSeries.filter(s => s.date >= startStr && s.date <= date).reduce((sum, s) => sum + s.value, 0)
      const denSum = denSeries.filter(s => s.date >= startStr && s.date <= date).reduce((sum, s) => sum + s.value, 0)
      
      return denSum > 0 ? numSum / denSum : 0
    }

    const prevDate = new Date(new Date(lastDate).getTime() - 3*24*60*60*1000).toISOString().split('T')[0]
    
    // ROAS comparison
    const curRoas = calculateWeightedRatio(adsRevSeries, adsSpendSeries, lastDate, 3)
    const oldRoas = calculateWeightedRatio(adsRevSeries, adsSpendSeries, prevDate, 3)
    const roasChange = calculateGrowth(curRoas, oldRoas)
    
    // CPP comparison
    const curCpp = calculateWeightedRatio(adsSpendSeries, adsGoalSeries, lastDate, 3)
    const oldCpp = calculateWeightedRatio(adsSpendSeries, adsGoalSeries, prevDate, 3)
    const cppChange = calculateGrowth(curCpp, oldCpp)

    // Goals comparison (flow type)
    const curGoalsAvg = getRollingAverage(adsGoalSeries, lastDate, 3)
    const oldGoalsAvg = getRollingAverage(adsGoalSeries, prevDate, 3)
    const goalsChange = calculateGrowth(curGoalsAvg, oldGoalsAvg)

    adsMetrics.comparisons = {
      totalGoals: {
        value: curGoalsAvg,
        percentage: goalsChange,
        status: goalsChange === null ? undefined : goalsChange >= 0 ? 'improving' : 'declining',
        label: 'vs avg previous 3 days',
        type: 'flow'
      },
      roas: {
        value: curRoas,
        percentage: roasChange,
        status: roasChange === null ? undefined : roasChange >= 0 ? 'improving' : 'declining',
        label: 'rolling 3-day avg',
        type: 'ratio'
      },
      cpp: {
        value: curCpp,
        percentage: cppChange,
        status: cppChange === null ? undefined : cppChange <= 0 ? 'improving' : 'declining', // CPP lower is better
        label: 'rolling 3-day avg',
        type: 'ratio'
      }
    }

    // Calculate Global KPIs for Overview Tab
    const globalKPIs = aggregateGlobalKPIs(
      programHealths,
      programs,
      Array.from(compsByMilestone.values())
    )

    // Calculate Ads Daily Series for Ads Tab Chart
    // Default chart: spend vs roas
    const adsDailySeries = buildAdsDailySeries(programs, valsByProg, 'ads_spent', 'roas')

    // Calculate Global Health Trend for Overview Tab
    const healthTrend = buildHealthTrendSeries(
      programs,
      Array.from(valsByProg.values()).flat(),
      Array.from(inputsByProg.values()).flat(),
      Array.from(compsByMilestone.values()),
      activePeriod,
      options.startDate,
      options.endDate
    )

    return {
      overallHealth,
      statusCounts,
      aggregates,
      globalKPIs,
      adsMetrics,
      adsDailySeries,
      healthTrend,
      targetTrend: buildTargetTrendSeries(
        programs,
        Array.from(valsByProg.values()).flat(),
        Array.from(inputsByProg.values()).flat(),
        activePeriod,
        undefined,
        undefined,
        options.startDate,
        options.endDate
      ),
      programHealths
    }
  }

  const summary = processSummary(metricValuesByProgram, dailyInputsByProgram, milestoneCompletionsByMilestone)

  let previousData: UnifiedDashboardData['previousData'] = undefined
  if (options.includePrevious) {
    let prevStartStr: string = ''
    let prevEndStr: string = ''


    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate)
      const end = new Date(options.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const daysInSelection = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - daysInSelection + 1)
      
      prevStartStr = prevStart.toISOString().split('T')[0]
      prevEndStr = prevEnd.toISOString().split('T')[0]
    } else if (activePeriod) {
      // DEFAULT VIEW (Active Period): Compare vs Snapshot from 3 days ago

      const today = new Date()
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(today.getDate() - 3)

      // Start of current period
      prevStartStr = `${activePeriod.year}-${String(activePeriod.month).padStart(2, '0')}-01`
      prevEndStr = threeDaysAgo.toISOString().split('T')[0]

      // Cap at period start to avoid crossing months
      if (prevEndStr < prevStartStr) {
        prevEndStr = prevStartStr
      }
    }

    if (prevStartStr && prevEndStr) {
      // Fetch previous data in parallel
      const [prevInpRes, prevMVRes] = await Promise.all([
        supabase.from('daily_inputs').select('*').in('program_id', programIds).gte('date', prevStartStr).lte('date', prevEndStr),
        supabase.from('daily_metric_values').select('*').in('program_id', programIds).gte('date', prevStartStr).lte('date', prevEndStr)
      ])

      const pDailyInputs = prevInpRes.data || []
      const pMetricValues = prevMVRes.data || []

      // Index previous data
      const pMVByProg = new Map<string, MetricValue[]>()
      pMetricValues.forEach(mv => {
        const list = pMVByProg.get(mv.program_id) || []
        list.push(mv)
        pMVByProg.set(mv.program_id, list)
      })

      const pInpByProg = new Map<string, DailyInput[]>()
      pDailyInputs.forEach(di => {
        const list = pInpByProg.get(di.program_id) || []
        list.push(di)
        pInpByProg.set(di.program_id, list)
      })

      // For 3-day comparison, we use the SAME proration as today (or 1 if snapshotting end of month)
      // Actually, processSummary uses current-day-of-month based proration if no dates provided.
      // We want to calculate previous summary based on its OWN proration (snapshot cumulative)

      previousData = {
        dailyInputs: pDailyInputs,
        metricValues: pMetricValues,
        summary: processSummary(pMVByProg, pInpByProg, milestoneCompletionsByMilestone)
      }
    }
  }

  return {
    programs,
    dailyInputs,
    metricValues,
    milestoneCompletions: (milestoneCompletions || []) as MilestoneCompletion[],
    activePeriod,
    prorationFactor,
    summary,
    previousData
  }
}
