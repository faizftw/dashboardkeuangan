'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProgramWithRelations } from './actions'
import { calculateProgramHealth } from '@/lib/dashboard-calculator'
import { formatRupiah, cn, getPreviousPeriodLabel } from '@/lib/utils'
import { formatMetricValue } from '@/lib/formula-evaluator'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  ComposedChart, Legend, LineChart, Line
} from 'recharts'
import {
  HeartPulse, Layers, Target, CheckSquare,
  Search, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

import { DashboardSummary } from '@/lib/dashboard-service'

interface OverviewClientProps {
  programs: ProgramWithRelations[]
  profiles: { id: string; name: string }[]
  summary: DashboardSummary
  previousSummary?: DashboardSummary
  isCustomDateRange?: boolean
  startDate?: string
  endDate?: string
}

type TabType = 'overview' | 'target' | 'ads'

// ── Status helpers ───────────────────────────────────────────────────────────
function getStatusLabelAndColor(score: number): { label: string; dot: string; badge: string, accent: string } {
  if (score >= 100) return { label: 'Excellent', dot: 'bg-blue-500',   badge: 'text-blue-700 bg-blue-50 border-blue-200',   accent: '#FCD34D' } // Gold/Excellent
  if (score >= 80)  return { label: 'Baik',      dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200', accent: '#639922' } // Green
  if (score >= 60)  return { label: 'Cukup',     dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 border-amber-200',   accent: '#EAB308' } // Amber
  if (score >= 40)  return { label: 'Perlu perhatian', dot: 'bg-orange-500', badge: 'text-orange-700 bg-orange-50 border-orange-200', accent: '#378ADD' } // Blue/Info
  return { label: 'Kritis', dot: 'bg-red-500', badge: 'text-red-700 bg-red-50 border-red-200', accent: '#E24B4A' } // Red
}

function getProgressColor(score: number) {
  if (score >= 100) return 'bg-blue-500'
  if (score >= 80)  return 'bg-emerald-500'
  if (score >= 60)  return 'bg-amber-400'
  if (score >= 40)  return 'bg-orange-500'
  return 'bg-red-500'
}

function getBannerInfo(score: number) {
  if (score < 40)  return { text: 'Target jauh tertinggal — fokus dan kejar sekarang! 💪', bg: 'bg-[#FCEBEB]', border: 'border-[#F7C1C1]', textCol: 'text-[#791F1F]' }
  if (score < 60)  return { text: 'Masih ada waktu — tingkatkan intensitas! 🔥', bg: 'bg-orange-50', border: 'border-orange-200', textCol: 'text-orange-800' }
  if (score < 80)  return { text: 'Progres bagus — jangan kendur! 🎯', bg: 'bg-blue-50', border: 'border-blue-200', textCol: 'text-blue-800' }
  if (score < 100) return { text: 'Hampir sampai — satu langkah lagi! 🚀', bg: 'bg-indigo-50', border: 'border-[#EEEDFE]', textCol: 'text-[#534AB7]' }
  return { text: 'Target tercapai — luar biasa! 🏆', bg: 'bg-emerald-50', border: 'border-emerald-200', textCol: 'text-emerald-800' }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accentColor, comparison }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accentColor?: string
  comparison?: { value: number; label: string }
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between relative overflow-hidden">
      {/* 3px Vertical Accent */}
      {accentColor && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-[3px]" 
          style={{ backgroundColor: accentColor }}
        />
      )}
      
      <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
        <Icon className="w-16 h-16" />
      </div>

      <div>
        <p className="text-[10px] font-bold tracking-[0.05em] text-[#6B7280] uppercase mb-2 truncate" title={label}>{label}</p>
        <div className="flex items-baseline gap-2 w-full flex-wrap">
          <span className="text-2xl lg:text-[28px] font-semibold text-[#111827] leading-tight" title={String(value)}>
            {value}
          </span>
          {sub && <span className="text-[12px] text-[#6B7280] font-normal truncate">{sub}</span>}
        </div>
      </div>

      {comparison && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#E5E7EB]">
          <span className={cn(
            "text-[12px] font-medium flex items-center gap-0.5",
            comparison.value > 0 ? "text-emerald-600" : 
            comparison.value < 0 ? "text-rose-600" : "text-slate-500"
          )}>
            {comparison.value > 0 ? <ArrowUpRight className="h-3 w-3" /> : comparison.value < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
            {Math.abs(comparison.value).toFixed(1)}%
          </span>
          <span className="text-[12px] text-slate-400">{comparison.label}</span>
        </div>
      )}
    </div>
  )
}

// ── Individual Program Card ───────────────────────────────────────────────────
function ProgramCard({ program, health, profiles }: {
  program: ProgramWithRelations
  health: ReturnType<typeof calculateProgramHealth>
  profiles: { id: string; name: string }[]
}) {
  const { label, badge, accent } = getStatusLabelAndColor(health.healthScore)
  const isQualitative = health.isQualitativeOnly
  const evaluatedMetrics = health.calculatedMetrics || {}

  const defs = program.program_metric_definitions || []
  const primaryMetrics = defs.filter(m => m.is_primary && m.is_target_metric)
  const secondaryMetrics = defs.filter(m => !m.is_primary)

  // Milestone progress for qualitative/hybrid
  const milestones = program.program_milestones || []

  const pics = (program.program_pics || []).map(pic => profiles.find(pr => pr.id === pic.profile_id)).filter(Boolean)

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] transition-all duration-300 overflow-hidden group flex flex-col relative">
      {/* Vertical Accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: accent }} />
      
      <div className="p-4 flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pl-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {program.department && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-[#6B7280] rounded">
                  {program.department}
                </span>
              )}
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border", badge)}>
                {label}
              </span>
            </div>
            <h3 className="font-semibold text-[#111827] text-base leading-tight group-hover:text-[#534AB7] transition-colors line-clamp-2" title={program.name}>
              {program.name}
            </h3>
          </div>

          <div className="flex flex-col items-end shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-[#E5E7EB]">
            <span className="text-xl font-semibold text-[#111827] leading-none">{Math.round(health.healthScore)}%</span>
            <span className="text-[9px] font-bold text-[#6B7280] uppercase mt-1">Health</span>
          </div>
        </div>

        {/* PIC Avatars */}
        {pics.length > 0 && (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex -space-x-1.5">
              {pics.slice(0, 3).map((p) => (
                <div key={p?.id} className="h-6 w-6 rounded-full bg-[#EEEDFE] border-2 border-white flex items-center justify-center text-[9px] font-bold text-[#534AB7] uppercase" title={p?.name}>
                  {p?.name?.[0]}
                </div>
              ))}
              {pics.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">
                  +{pics.length - 3}
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-[#6B7280] truncate">
              {pics.map(p => p?.name).join(', ')}
            </span>
          </div>
        )}

        {/* Progress Section */}
        <div className="space-y-3 pl-1">
          {primaryMetrics.length > 0 ? (
            primaryMetrics.map(m => {
              const actual = evaluatedMetrics[m.metric_key] || 0
              const target = m.monthly_target || 0
              const pct = target > 0 ? (actual / target) * 100 : 0
              return (
                <div key={m.id} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-[#6B7280] uppercase tracking-wider">{m.label}</span>
                    <span className="font-semibold text-[#111827]">
                      {formatMetricValue(actual, m.data_type, m.unit_label)}
                      <span className="text-[#6B7280] font-normal ml-1">/ {formatMetricValue(target, m.data_type, m.unit_label)}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", getProgressColor(pct))}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })
          ) : isQualitative && milestones.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-medium text-[#6B7280] uppercase tracking-wider">Project Progress</span>
                <span className="font-semibold text-[#111827]">{Math.round(health.healthScore)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000", getProgressColor(health.healthScore))}
                  style={{ width: `${Math.min(health.healthScore, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="py-1 text-[11px] text-[#6B7280] font-normal italic">Tidak ada parameter target utama.</div>
          )}
        </div>

        {/* Secondary Metrics Grid */}
        {secondaryMetrics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#E5E7EB] pl-1">
            {secondaryMetrics.slice(0, 5).map(m => {
              const val = evaluatedMetrics[m.metric_key]
              if (val === undefined || val === null) return null
              return (
                <div key={m.id} className="bg-slate-50 px-2.5 py-1 rounded-lg border border-[#E5E7EB] flex items-baseline gap-1.5 transition-colors hover:bg-white min-w-0">
                  <span className="text-[10px] font-medium text-[#6B7280] truncate">{m.label}:</span>
                  <span className="text-[11px] font-semibold text-[#111827] whitespace-nowrap">
                    {formatMetricValue(val, m.data_type, m.unit_label)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function OverviewClient({
  programs,
  profiles,
  summary,
  previousSummary,
  isCustomDateRange,
  startDate,
  endDate
}: OverviewClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy] = useState<'health' | 'name'>('health')

  // Process data from summary
  const programHealths = summary.programHealths
  const globalKPIs = summary.globalKPIs

  const prevGlobalKPIs = previousSummary?.globalKPIs || null
  const healthGrowth = (prevGlobalKPIs && prevGlobalKPIs.avgHealth > 0)
    ? ((globalKPIs.avgHealth - prevGlobalKPIs.avgHealth) / prevGlobalKPIs.avgHealth) * 100
    : 0

  const targetGrowth = (prevGlobalKPIs && prevGlobalKPIs.targetsHit > 0)
    ? ((globalKPIs.targetsHit - prevGlobalKPIs.targetsHit) / prevGlobalKPIs.targetsHit) * 100
    : (prevGlobalKPIs?.targetsHit === 0 && globalKPIs.targetsHit > 0) ? 100 : 0

  const prevPeriodLabel = useMemo(() => getPreviousPeriodLabel(startDate, endDate), [startDate, endDate])

  const departments = useMemo(() => {
    const depts = Array.from(new Set(programs.map(p => p.department).filter(Boolean))) as string[]
    return depts.sort()
  }, [programs])

  const filteredPrograms = useMemo(() =>
    programHealths.filter(ph => {
      const matchesSearch = ph.program.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDept = filterDept === 'all' || ph.program.department === filterDept
      if (filterStatus === 'all') return matchesSearch && matchesDept
      const statusKey = ph.status.toLowerCase().replace(' ', '_')
      return statusKey === filterStatus && matchesSearch && matchesDept
    }).sort((a, b) => {
      if (sortBy === 'health') return b.healthScore - a.healthScore
      return a.program.name.localeCompare(b.program.name)
    }),
    [programHealths, searchQuery, filterDept, filterStatus, sortBy]
  )

  // ── Charts Data ────────────────────────────────────────────────────────────
  const trendData = useMemo(() => 
    summary.healthTrend.map(tp => ({
      day: tp.displayDate,
      health: tp.health
    })),
    [summary.healthTrend]
  )

  const barData = useMemo(() =>
    [...programHealths].sort((a, b) => b.healthScore - a.healthScore).slice(0, 10).map(ph => ({
      name: ph.program.name,
      healthScore: Math.min(Math.round(ph.healthScore), 150),
    })),
    [programHealths]
  )

  const banner = getBannerInfo(globalKPIs.avgHealth)

  return (
    <div className="space-y-6 pb-24">
      {/* ── Tab Switcher ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-[#E5E7EB] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
            activeTab === 'overview' ? "bg-white text-[#534AB7] border border-[#E5E7EB]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('target')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
            activeTab === 'target' ? "bg-white text-[#534AB7] border border-[#E5E7EB]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <Target className="h-3.5 w-3.5" />
          Target
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
            activeTab === 'ads' ? "bg-white text-[#534AB7] border border-[#E5E7EB]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Ads Perform
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              icon={HeartPulse} 
              label="Health Score" 
              value={`${Math.round(globalKPIs.avgHealth)}%`} 
              sub={globalKPIs.healthStatus} 
              accentColor={getStatusLabelAndColor(globalKPIs.avgHealth).accent}
              comparison={isCustomDateRange && prevGlobalKPIs ? { value: healthGrowth, label: prevPeriodLabel } : undefined} 
            />
            <KpiCard 
              icon={Layers} 
              label="Program aktif" 
              value={globalKPIs.activeProgramsCount} 
              sub={`dari ${globalKPIs.totalPrograms} total`} 
              accentColor="#378ADD"
            />
            <KpiCard 
              icon={Target} 
              label="Target tercapai" 
              value={globalKPIs.targetsHit} 
              sub={`program bulan ini`} 
              accentColor="#639922"
              comparison={isCustomDateRange && prevGlobalKPIs ? { value: targetGrowth, label: prevPeriodLabel } : undefined} 
            />
            <KpiCard 
              icon={CheckSquare} 
              label="Milestone done" 
              value={globalKPIs.completedMilestones} 
              sub={`dari ${globalKPIs.totalMilestones} total`} 
              accentColor="#534AB7"
            />
          </div>

          {/* Row 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
             <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-[#E5E7EB] relative overflow-hidden group">
                <h3 className="font-semibold text-[#111827] mb-6 text-sm flex items-center gap-3">
                  <div className="p-2 bg-[#EEEDFE] rounded-lg">
                    <HeartPulse className="h-4 w-4 text-[#534AB7]" />
                  </div>
                  Tren kesehatan bisnis global
                </h3>
                <div className="h-72">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#534AB7" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
                        <YAxis hide domain={[0, 120]} />
                        <Tooltip 
                          contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: 'none' }} 
                          itemStyle={{ fontWeight: 600, fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="health" stroke="#534AB7" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-[#E5E7EB]">
                <h3 className="font-semibold text-[#111827] mb-6 text-sm flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Target className="h-4 w-4 text-emerald-600" />
                  </div>
                  Top performers
                </h3>
                <div className="h-72">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: -20 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} width={100} tickFormatter={v => v.length > 12 ? v.slice(0, 10) + '...' : v} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
                        <Bar dataKey="healthScore" radius={[0, 4, 4, 0]} maxBarSize={20}>
                          {barData.map((e, i) => {
                            const opacities = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];
                            return <Cell key={i} fill={`rgba(83, 74, 183, ${opacities[i] || 0.1})`} />
                          })}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>

          {/* Motivational Banner redesigned as Alert Bar */}
          <div className={cn("px-4 py-2.5 rounded-lg border flex items-center gap-3 text-[13px] font-medium transition-all", banner.bg, banner.border, banner.textCol)}>
            <div className={cn("h-2 w-2 rounded-full", getStatusLabelAndColor(globalKPIs.avgHealth).dot)} />
            <span>{banner.text}</span>
          </div>

          {/* Search & Program Grid */}
          <div className="space-y-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" placeholder="Cari program..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 text-slate-700 font-bold transition-all placeholder:text-slate-300 shadow-sm" />
              </div>
              <div className="flex gap-2">
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-4 py-3 text-sm font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-600 shadow-sm">
                  <option value="all">Semua Dept</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-3 text-sm font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-600 shadow-sm">
                  <option value="all">Semua Status</option>
                  <option value="excellent">Excellent</option>
                  <option value="baik">Baik</option>
                  <option value="cukup">Cukup</option>
                  <option value="perlu_perhatian">Perlu Perhatian</option>
                  <option value="kritis">Kritis</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredPrograms.map(ph => (
                <ProgramCard key={ph.program.id} program={ph.program} health={ph} profiles={profiles} />
              ))}
            </div>
            
            {filteredPrograms.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold tracking-wide">Tidak ada program yang sesuai dengan kriteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'target' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Row 1: Target Aggregate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              icon={Target} 
              label="Total capaian Rp" 
              value={formatRupiah(summary.aggregates.revenue?.actual || 0)} 
              sub={`/ ${formatRupiah(summary.aggregates.revenue?.totalTarget || 0)}`} 
              accentColor="#639922"
            />
            <KpiCard 
              icon={HeartPulse} 
              label="Progres Rp" 
              value={`${Math.round((summary.aggregates.revenue?.actual / (summary.aggregates.revenue?.target || 1)) * 100)}%`} 
              sub="vs pro-rata"
              accentColor="#534AB7"
            />
            <KpiCard 
              icon={Layers} 
              label="Total capaian user" 
              value={summary.aggregates.user_acquisition?.actual || 0} 
              sub={`/ ${summary.aggregates.user_acquisition?.totalTarget || 0} user`} 
              accentColor="#639922"
            />
            <KpiCard 
              icon={CheckSquare} 
              label="Progres user" 
              value={`${Math.round((summary.aggregates.user_acquisition?.actual / (summary.aggregates.user_acquisition?.target || 1)) * 100)}%`} 
              sub="vs pro-rata"
              accentColor="#534AB7"
            />
          </div>

          {/* Revenue Bar Chart (Full Width) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Capaian Pendapatan per Program (Rp)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={programHealths.sort((a, b) => (b.calculatedMetrics?.revenue || 0) - (a.calculatedMetrics?.revenue || 0)).slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="program.name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.length > 12 ? v.substring(0, 10) + '...' : v} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `Rp${v/1000000}jt`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v) => [formatRupiah(Number(v)), 'Pendapatan']}
                  />
                  <Bar dataKey="calculatedMetrics.revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Row 1: Ads Aggregate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              icon={Layers} 
              label="Total ads spent" 
              value={formatRupiah(summary.adsMetrics.totalAdsSpent)} 
              accentColor="#378ADD" 
            />
            <KpiCard 
              icon={Target} 
              label="Total goals" 
              value={summary.adsMetrics.totalGoals} 
              sub="closing" 
              accentColor="#639922" 
            />
            <KpiCard 
              icon={HeartPulse} 
              label="Avg ROAS" 
              value={`${summary.adsMetrics.avgRoas.toFixed(2)}x`} 
              accentColor="#534AB7" 
            />
            <KpiCard 
              icon={CheckSquare} 
              label="Avg CPP" 
              value={formatRupiah(summary.adsMetrics.avgCpp)} 
              accentColor={summary.adsMetrics.avgCpp > 60000 ? "#E24B4A" : "#639922"} 
            />
          </div>

          {/* Dual Axis Ads Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-rose-500" />
                Ads Performance: Spent vs ROAS
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.adsDailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis hide yAxisId="left" />
                  <YAxis hide yAxisId="right" orientation="right" />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v, name) => [name === 'x' ? formatRupiah(Number(v)) : `${Number(v).toFixed(2)}x`, name === 'x' ? 'Spent' : 'ROAS']}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="x" name="Spent" stroke="#f43f5e" strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="y" name="ROAS" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ads Performance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="font-bold text-slate-800 text-sm">Detail Performa Ads per Program</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs">
                 <thead>
                   <tr className="bg-slate-100/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                     <th className="px-4 py-3">Program</th>
                     <th className="px-4 py-3 text-right">Ads Spent</th>
                     <th className="px-4 py-3 text-right">Goals</th>
                     <th className="px-4 py-3 text-right">ROAS</th>
                     <th className="px-4 py-3 text-right">CPP</th>
                     <th className="px-4 py-3 text-right">CR</th>
                     <th className="px-4 py-3 text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {programHealths
                    .filter(ph => (ph.program.program_metric_definitions || []).some(m => m.metric_group === 'ad_spend' || ['ads_spent', 'leads', 'roas'].includes(m.metric_key))) 
                    .map(ph => {
                      const m = ph.calculatedMetrics || {}
                      return (
                        <tr key={ph.program.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-700">{ph.program.name}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatRupiah(m.ads_spent || 0)}</td>
                          <td className="px-4 py-3 text-right font-medium">{m.user_count || 0}</td>
                          <td className="px-4 py-3 text-right font-black text-indigo-600">{(m.roas || 0).toFixed(2)}x</td>
                          <td className="px-4 py-3 text-right font-medium">{formatRupiah(m.cpp || 0)}</td>
                          <td className="px-4 py-3 text-right font-medium">{(m.conversion_rate || 0).toFixed(1)}%</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-full border",
                              getStatusLabelAndColor(ph.healthScore).badge
                            )}>
                              {getStatusLabelAndColor(ph.healthScore).label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
