/**
 * export-spreadsheet.ts
 * Generates a multi-sheet Excel report from dashboard data using SheetJS.
 */

import * as XLSX from 'xlsx'

// ── Types (local mirrors to avoid circular imports) ──────────────────────────
interface Program {
  id: string
  name: string
  department?: string | null
  target_type?: string | null
  program_milestones?: { id: string; title: string; display_order?: number | null }[]
  program_metric_definitions?: {
    id: string
    metric_key: string
    label: string
    data_type: string
    is_primary: boolean
    is_target_metric: boolean
    metric_group?: string | null
    unit_label?: string | null
  }[]
}

interface ProgramHealth {
  programId: string
  program: Program
  healthScore: number
  status: string
  isQualitativeOnly: boolean
  calculatedMetrics?: Record<string, number | null>
  absoluteTargets?: Record<string, number>
}

interface MetricValue {
  program_id: string
  date: string
  metric_definition_id: string
  value: number | null
}

interface DailyInput {
  program_id: string
  date: string
  achievement_rp?: number | null
  achievement_user?: number | null
  qualitative_status?: string | null
  notes?: string | null
}

interface MilestoneCompletion {
  milestone_id: string
  is_completed: boolean
  completed_at?: string | null
  notes?: string | null
}

interface ActivePeriod {
  month: number
  year: number
  working_days: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusLabel(score: number): string {
  if (score >= 100) return 'Excellent'
  if (score >= 80) return 'Baik'
  if (score >= 60) return 'Cukup'
  if (score >= 40) return 'Perlu Perhatian'
  return 'Kritis'
}

function formatPeriod(period: ActivePeriod): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  return `${months[period.month - 1]} ${period.year}`
}



// ── Sheet 1: Dashboard Summary ────────────────────────────────────────────────

function buildSummarySheet(
  programHealths: ProgramHealth[],
  milestoneCompletions: MilestoneCompletion[],
  activePeriod: ActivePeriod,
  globalHealth: number
): XLSX.WorkSheet {
  const title = `LAPORAN DASHBOARD KINERJA — ${formatPeriod(activePeriod)}`

  // Global summary block
  const summaryBlock = [
    [title],
    [],
    ['Health Score Global', `${Math.round(globalHealth)}%`, getStatusLabel(globalHealth)],
    ['Total Program Aktif', programHealths.length],
    ['Target Tercapai', programHealths.filter(ph => ph.healthScore >= 100).length],
    ['Perlu Perhatian', programHealths.filter(ph => ph.healthScore < 60).length],
    [],
  ]

  const headers = [
    'No',
    'Nama Program',
    'Departemen',
    'Tipe',
    'Health Score',
    'Status',
    'Omzet Aktual',
    'Omzet Target',
    'Omzet %',
    'User/Peserta Aktual',
    'User/Peserta Target',
    'User %',
    'Milestone Selesai',
    'Total Milestone',
    'Milestone %',
  ]

  const rows = programHealths.map((ph, idx) => {
    const p = ph.program
    const metrics = ph.calculatedMetrics || {}
    const targets = ph.absoluteTargets || {}

    const revActual = metrics.revenue ?? metrics.omzet ?? 0
    const revTarget = targets.revenue ?? targets.omzet ?? 0
    const revPct = revTarget > 0 ? (revActual / revTarget) : 0

    const userActual = metrics.user_count ?? metrics.closing ?? 0
    const userTarget = targets.user_count ?? targets.closing ?? 0
    const userPct = userTarget > 0 ? (userActual / userTarget) : 0

    const milestones = p.program_milestones || []
    const completedCount = milestones.filter(m =>
      milestoneCompletions.some(mc => mc.milestone_id === m.id && mc.is_completed)
    ).length
    const milestonePct = milestones.length > 0 ? (completedCount / milestones.length) : 0

    return [
      idx + 1,
      p.name,
      p.department || '-',
      ph.isQualitativeOnly ? 'Kualitatif' : 'Kuantitatif',
      ph.healthScore / 100,
      getStatusLabel(ph.healthScore),
      revActual || '',
      revTarget || '',
      revTarget > 0 ? revPct : '',
      userActual || '',
      userTarget || '',
      userTarget > 0 ? userPct : '',
      completedCount || '',
      milestones.length || '',
      milestones.length > 0 ? milestonePct : '',
    ]
  })

  const data = [...summaryBlock, headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 30 }, { wch: 20 }, { wch: 15 },
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
    { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
  ]

  // Merge title cell
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }]

  // Format percentage and currency cells
  const headerRowIdx = summaryBlock.length
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const r = rowIdx
    // Health Score col 4
    const healthCell = XLSX.utils.encode_cell({ r, c: 4 })
    if (ws[healthCell]) ws[healthCell].z = '0%'
    // Omzet cols 6-8
    const omzetActualCell = XLSX.utils.encode_cell({ r, c: 6 })
    if (ws[omzetActualCell] && typeof ws[omzetActualCell].v === 'number') ws[omzetActualCell].z = '#,##0'
    const omzetTargetCell = XLSX.utils.encode_cell({ r, c: 7 })
    if (ws[omzetTargetCell] && typeof ws[omzetTargetCell].v === 'number') ws[omzetTargetCell].z = '#,##0'
    const omzetPctCell = XLSX.utils.encode_cell({ r, c: 8 })
    if (ws[omzetPctCell] && typeof ws[omzetPctCell].v === 'number') ws[omzetPctCell].z = '0.0%'
    // User cols 9-11
    const userPctCell = XLSX.utils.encode_cell({ r, c: 11 })
    if (ws[userPctCell] && typeof ws[userPctCell].v === 'number') ws[userPctCell].z = '0.0%'
    // Milestone col 14
    const msPctCell = XLSX.utils.encode_cell({ r, c: 14 })
    if (ws[msPctCell] && typeof ws[msPctCell].v === 'number') ws[msPctCell].z = '0.0%'
  }

  return ws
}

// ── Sheet 2: Raw Daily Data ───────────────────────────────────────────────────

function buildDailyDataSheet(
  programHealths: ProgramHealth[],
  metricValues: MetricValue[],
  dailyInputs: DailyInput[],
): XLSX.WorkSheet {
  // Collect all unique metric keys across programs
  const allMetricKeys = new Set<string>()
  const metricLabelMap: Record<string, string> = {}
  programHealths.forEach(ph => {
    ph.program.program_metric_definitions?.forEach(def => {
      allMetricKeys.add(def.metric_key)
      metricLabelMap[def.metric_key] = def.label
    })
  })
  const metricKeysArr = Array.from(allMetricKeys).sort()

  const headers = [
    'Tanggal',
    'Program',
    'Departemen',
    // Legacy daily_input columns
    'Omzet (Legacy Rp)',
    'User (Legacy)',
    'Status Kualitatif',
    'Catatan',
    // Dynamic custom metrics
    ...metricKeysArr.map(k => metricLabelMap[k] || k),
  ]

  // Build lookup maps
  // metric_definition_id → metric_key (via program definitions)
  const defIdToKeyMap = new Map<string, string>()
  programHealths.forEach(ph => {
    ph.program.program_metric_definitions?.forEach(def => {
      defIdToKeyMap.set(def.id, def.metric_key)
    })
  })

  const metricValueMap = new Map<string, number | null>()
  metricValues.forEach(mv => {
    const metricKey = defIdToKeyMap.get(mv.metric_definition_id)
    if (!metricKey) return
    const key = `${mv.program_id}|${mv.date}|${metricKey}`
    metricValueMap.set(key, mv.value)
  })

  const programMap = new Map<string, Program>()
  programHealths.forEach(ph => programMap.set(ph.programId, ph.program))

  // Collect all dates from both legacy and custom metrics
  const entryKeys = new Set<string>()
  dailyInputs.forEach(di => entryKeys.add(`${di.program_id}|${di.date}`))
  metricValues.forEach(mv => entryKeys.add(`${mv.program_id}|${mv.date}`))

  const rows: (string | number | null)[][] = []

  Array.from(entryKeys)
    .sort()
    .forEach(key => {
      const [programId, date] = key.split('|')
      const program = programMap.get(programId)
      if (!program) return

      const legacyInput = dailyInputs.find(di => di.program_id === programId && di.date === date)

      const row: (string | number | null)[] = [
        date,
        program.name,
        program.department || '-',
        legacyInput?.achievement_rp ?? '',
        legacyInput?.achievement_user ?? '',
        legacyInput?.qualitative_status ?? '',
        legacyInput?.notes ?? '',
        ...metricKeysArr.map(k => metricValueMap.get(`${programId}|${date}|${k}`) ?? ''),
      ]
      rows.push(row)
    })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 20 },
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
    ...metricKeysArr.map(() => ({ wch: 16 }))
  ]

  // Format omzet column as currency
  for (let r = 1; r < rows.length + 1; r++) {
    const omzetCell = XLSX.utils.encode_cell({ r, c: 3 })
    if (ws[omzetCell] && typeof ws[omzetCell].v === 'number') {
      ws[omzetCell].z = '#,##0'
    }
  }

  return ws
}

// ── Sheet 3: Ads Performance ─────────────────────────────────────────────────

const ADS_KEYS = ['ads_spent', 'leads', 'user_count', 'cpm', 'cpc', 'roas', 'cpp', 'conversion_rate']
const ADS_LABELS: Record<string, string> = {
  ads_spent: 'Ads Spent (Rp)',
  leads: 'Leads',
  user_count: 'Goals/Closing',
  cpm: 'CPM (Rp)',
  cpc: 'CPC (Rp)',
  roas: 'ROAS',
  cpp: 'CPP/CPL (Rp)',
  conversion_rate: 'Conversion Rate',
}

function buildAdsSheet(
  programHealths: ProgramHealth[],
  metricValues: MetricValue[],
): XLSX.WorkSheet {
  const adsPrograms = programHealths.filter(ph =>
    ph.program.program_metric_definitions?.some(def =>
      def.metric_group === 'ad_spend' ||
      ADS_KEYS.includes(def.metric_key)
    )
  )

  if (adsPrograms.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Tidak ada program Ads di periode ini.']])
    return ws
  }

  const headers = [
    'Tanggal',
    'Program',
    'Departemen',
    ...ADS_KEYS.map(k => ADS_LABELS[k]),
  ]

  const defIdToKeyMap = new Map<string, string>()
  programHealths.forEach(ph => {
    ph.program.program_metric_definitions?.forEach(def => {
      defIdToKeyMap.set(def.id, def.metric_key)
    })
  })

  const metricValueMap = new Map<string, number | null>()
  metricValues.forEach(mv => {
    const metricKey = defIdToKeyMap.get(mv.metric_definition_id)
    if (!metricKey) return
    const key = `${mv.program_id}|${mv.date}|${metricKey}`
    metricValueMap.set(key, mv.value)
  })

  const dateSet = new Set<string>()
  metricValues
    .filter(mv => adsPrograms.some(ph => ph.programId === mv.program_id))
    .forEach(mv => dateSet.add(`${mv.program_id}|${mv.date}`))

  const rows: (string | number | null)[][] = Array.from(dateSet)
    .sort()
    .map(key => {
      const [programId, date] = key.split('|')
      const ph = adsPrograms.find(p => p.programId === programId)
      if (!ph) return null

      return [
        date,
        ph.program.name,
        ph.program.department || '-',
        ...ADS_KEYS.map(k => metricValueMap.get(`${programId}|${date}|${k}`) ?? ''),
      ]
    })
    .filter(Boolean) as (string | number | null)[][]

  // Totals row
  const totalsRow: (string | number | null)[] = ['TOTAL/RATA-RATA', '', '']
  ADS_KEYS.forEach((k, idx) => {
    if (['roas', 'cpp', 'conversion_rate', 'cpm', 'cpc'].includes(k)) {
      // Computed ratio — intentionally left blank in totals row
      totalsRow.push('-')
    } else {
      const sum = rows.reduce((acc, row) => acc + (typeof row[3 + idx] === 'number' ? (row[3 + idx] as number) : 0), 0)
      totalsRow.push(sum)
    }
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalsRow])

  ws['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 20 },
    ...ADS_KEYS.map(() => ({ wch: 18 }))
  ]

  // Format currency columns
  const currencyCols = [3, 6, 7, 8] // ads_spent, cpm, cpc, cpp
  for (let r = 1; r < rows.length + 2; r++) {
    currencyCols.forEach(c => {
      const cell = XLSX.utils.encode_cell({ r, c })
      if (ws[cell] && typeof ws[cell].v === 'number') ws[cell].z = '#,##0'
    })
    // ROAS col
    const roasCell = XLSX.utils.encode_cell({ r, c: 9 })
    if (ws[roasCell] && typeof ws[roasCell].v === 'number') ws[roasCell].z = '0.00"x"'
    // CR col
    const crCell = XLSX.utils.encode_cell({ r, c: 10 })
    if (ws[crCell] && typeof ws[crCell].v === 'number') ws[crCell].z = '0.0%'
  }

  return ws
}

// ── Sheet 4: Milestones ───────────────────────────────────────────────────────

function buildMilestoneSheet(
  programHealths: ProgramHealth[],
  milestoneCompletions: MilestoneCompletion[],
): XLSX.WorkSheet {
  const qualitativePrograms = programHealths.filter(ph =>
    (ph.program.program_milestones?.length ?? 0) > 0
  )

  if (qualitativePrograms.length === 0) {
    return XLSX.utils.aoa_to_sheet([['Tidak ada program dengan milestone di periode ini.']])
  }

  const headers = [
    'Program',
    'Departemen',
    'Milestone',
    'Urutan',
    'Status',
    'Tanggal Selesai',
    'Catatan',
  ]

  const rows: (string | number | null)[][] = []
  qualitativePrograms.forEach(ph => {
    const milestones = (ph.program.program_milestones || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    milestones.forEach(ms => {
      const completion = milestoneCompletions.find(mc => mc.milestone_id === ms.id)
      rows.push([
        ph.program.name,
        ph.program.department || '-',
        ms.title,
        ms.display_order ?? '',
        completion?.is_completed ? '✓ Selesai' : '○ Belum Selesai',
        completion?.completed_at ? new Date(completion.completed_at).toLocaleDateString('id-ID') : '-',
        completion?.notes || '-',
      ])
    })
    // Blank row between programs
    rows.push(['', '', '', '', '', '', ''])
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 30 },
  ]

  return ws
}

// ── Master Export Function ────────────────────────────────────────────────────

export interface ExportParams {
  programHealths: ProgramHealth[]
  metricValues: MetricValue[]
  dailyInputs: DailyInput[]
  milestoneCompletions: MilestoneCompletion[]
  activePeriod: ActivePeriod
  globalHealth: number
}

export function exportDashboardToExcel(params: ExportParams): void {
  const { programHealths, metricValues, dailyInputs, milestoneCompletions, activePeriod, globalHealth } = params

  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summarySheet = buildSummarySheet(programHealths, milestoneCompletions, activePeriod, globalHealth)
  XLSX.utils.book_append_sheet(wb, summarySheet, '📊 Ringkasan Dashboard')

  // Sheet 2: Raw Daily Data
  const dailySheet = buildDailyDataSheet(programHealths, metricValues, dailyInputs)
  XLSX.utils.book_append_sheet(wb, dailySheet, '📋 Data Harian')

  // Sheet 3: Ads Performance
  const adsSheet = buildAdsSheet(programHealths, metricValues)
  XLSX.utils.book_append_sheet(wb, adsSheet, '📈 Ads Performance')

  // Sheet 4: Milestones
  const milestoneSheet = buildMilestoneSheet(programHealths, milestoneCompletions)
  XLSX.utils.book_append_sheet(wb, milestoneSheet, '✅ Milestone')

  // Generate filename with period info
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const periodStr = `${months[activePeriod.month - 1]}_${activePeriod.year}`
  const filename = `Dashboard_Kinerja_${periodStr}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`

  XLSX.writeFile(wb, filename)
}
