'use client'

import { ProgramPerformance, DailyInput } from '../actions'
import { formatRupiah, cn } from '@/lib/utils'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

interface SlideProgramDetailProps {
  program: ProgramPerformance
  inputs: DailyInput[]
}

export function SlideProgramDetail({ program, inputs }: SlideProgramDetailProps) {
  // 1. Process Trend Data
  // Group by date and calculate cumulative
  const sortedInputs = [...inputs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  let cumulativeRp = 0
  const chartData = sortedInputs.map(input => {
    cumulativeRp += (input.achievement_rp || 0)
    const dateObj = new Date(input.date)
    return {
      date: input.date,
      displayDate: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(dateObj),
      pencapaian: cumulativeRp,
    }
  })

  // Calculate Ideal Target Line (Linear growth towards monthly target)
  const targetPerDay = (program.monthly_target_rp || 0) / 30 // Rough approximation for 30 days
  const chartDataWithTarget = chartData.map((d, index) => ({
    ...d,
    targetIdeal: targetPerDay * (index + 1)
  }))

  const statusThemes = {
    'TERCAPAI': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    'MENUJU TARGET': 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    'PERLU PERHATIAN': 'text-rose-400 border-rose-500/30 bg-rose-500/5'
  }

  return (
    <div className="h-full flex flex-col p-12 text-slate-100">
      {/* Header with Title and PIC */}
      <div className="flex justify-between items-start mb-10">
        <div className="max-w-[70%]">
          <div className="flex items-center gap-4 mb-4">
             <span className={cn(
               "px-6 py-2 rounded-2xl border text-xl font-black uppercase tracking-tighter",
               statusThemes[program.status]
             )}>
               {program.status}
             </span>
             <span className="text-2xl font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-6 py-2 rounded-2xl border border-indigo-500/20">
               Detail Program
             </span>
          </div>
          <h1 className="text-7xl font-black text-slate-100 uppercase tracking-tighter leading-none mb-4">
             {program.name}
          </h1>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Penanggung Jawab (PIC)</span>
              <span className="text-3xl font-black text-slate-50 underline decoration-indigo-500 decoration-4 shadow-sm">{program.pic_name}</span>
            </div>
            <div className="w-px h-12 bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Tipe Target</span>
              <span className="text-3xl font-black text-slate-50 uppercase">{program.target_type}</span>
            </div>
          </div>
        </div>

        {/* Big Percentages */}
        <div className="flex flex-col items-end gap-2 text-slate-50">
           <div className="text-right">
              <div className="text-8xl font-black leading-none">
                {program.percentageRp.toFixed(1)}<span className="text-4xl text-slate-400">%</span>
              </div>
              <p className="text-sm font-bold text-slate-200 uppercase tracking-[0.3em] mt-2">Capaian Rupiah</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10 flex-grow overflow-hidden">
        {/* Left Side: Stats Cards */}
        <div className="col-span-4 space-y-6">
           {/* Rp Stats */}
           <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 shadow-xl overflow-hidden relative group">
              <div className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-4">Metrik Keuangan</div>
              <div className="space-y-6">
                 <div>
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Target</div>
                    <div className="text-4xl font-black text-slate-200">{formatRupiah(program.monthly_target_rp || 0)}</div>
                 </div>
                 <div>
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Capaian</div>
                    <div className="text-5xl font-black text-emerald-400">{formatRupiah(program.achievementRp)}</div>
                 </div>
              </div>
              <div className="mt-8">
                 <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      style={{ width: `${Math.min(program.percentageRp, 100)}%` }}
                    />
                 </div>
              </div>
           </div>

           {/* User Stats */}
           <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 shadow-xl">
              <div className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-4">Metrik Partisipan</div>
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Target</div>
                    <div className="text-4xl font-black text-slate-200">{program.monthly_target_user?.toLocaleString()}</div>
                 </div>
                 <div>
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">Capaian</div>
                    <div className="text-4xl font-black text-cyan-400">{program.achievementUser.toLocaleString()}</div>
                 </div>
              </div>
              <div className="mt-8 flex items-baseline gap-2">
                 <span className="text-4xl font-black text-slate-200">{program.percentageUser.toFixed(0)}%</span>
                 <span className="text-sm font-bold text-slate-300 uppercase">Growth</span>
              </div>
           </div>
        </div>

        {/* Right Side: Trend Chart */}
        <div className="col-span-8 bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 shadow-xl flex flex-col">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">Tren Akumulasi Pencapaian Harian</h3>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Realisasi</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-1 bg-slate-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ideal Path</span>
                 </div>
              </div>
           </div>

           <div className="flex-grow w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartDataWithTarget} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorAch" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="displayDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis 
                      hide 
                      domain={[0, (dataMax: number) => Math.max(dataMax, program.monthly_target_rp || 0)]}
                    />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                       itemStyle={{ color: '#f1f5f9', fontWeight: 700 }}
                       labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="pencapaian" 
                       stroke="#6366f1" 
                       strokeWidth={4} 
                       fillOpacity={1} 
                       fill="url(#colorAch)" 
                       animationDuration={2000}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="targetIdeal" 
                       stroke="#475569" 
                       strokeWidth={2} 
                       strokeDasharray="5 5" 
                       fill="transparent" 
                    />
                    <ReferenceLine 
                      y={program.monthly_target_rp || 0} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3"
                      label={{ position: 'right', value: 'TARGET', fill: '#ef4444', fontSize: 10, fontWeight: 900 }}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  )
}
