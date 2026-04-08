'use client'

import { TVDashboardData, PICPerformance } from '../actions'
import { formatRupiah, cn } from '@/lib/utils'

interface Slide3Props {
  data: TVDashboardData
}

export function Slide3PICs({ data }: Slide3Props) {
  const { pics } = data

  return (
    <div className="h-full flex flex-col p-12">
      <div className="flex justify-between items-end mb-12">
         <h1 className="text-5xl font-black text-slate-100 uppercase tracking-tighter">
            Performa Per PIC
         </h1>
         <div className="px-6 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 font-bold text-xl uppercase tracking-widest">
            Total {pics.length} Personel
         </div>
      </div>

      <div className="grid grid-cols-3 gap-8 flex-grow">
        {pics.map((pic) => (
          <PICCard key={pic.picName} pic={pic} />
        ))}
      </div>
    </div>
  )
}

function PICCard({ pic }: { pic: PICPerformance }) {
  const statusColors = {
    'TERCAPAI': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    'MENUJU TARGET': 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    'PERLU PERHATIAN': 'text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
  }

  const barColors = {
    'TERCAPAI': 'bg-emerald-500',
    'MENUJU TARGET': 'bg-amber-500',
    'PERLU PERHATIAN': 'bg-rose-500'
  }

  return (
    <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 flex flex-col justify-between shadow-xl backdrop-blur-sm group hover:bg-slate-900/60 transition-colors">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-4xl font-black text-slate-100 uppercase tracking-tighter mb-1 leading-tight group-hover:text-indigo-400 transition-colors">
             {pic.picName}
          </h3>
          <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 inline-block px-3 py-1 rounded-lg border border-indigo-500/20">
             {pic.programCount} Program
          </p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-tighter whitespace-nowrap",
          statusColors[pic.status]
        )}>
          {pic.status}
        </div>
      </div>

      <div className="space-y-8">
        {/* Rp Metric */}
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Tanggung Jawab Rp</span>
              <span className="text-3xl font-black text-indigo-400">{pic.percentageRp.toFixed(1)}%</span>
           </div>
           <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-slate-100">{formatRupiah(pic.totalAchievementRp)}</span>
              <span className="text-[10px] font-bold text-slate-300">of {formatRupiah(pic.totalTargetRp)}</span>
           </div>
           <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
             <div 
               className={cn("h-full transition-all duration-1000 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", barColors[pic.status])}
               style={{ width: `${Math.min(pic.percentageRp, 100)}%` }}
             />
           </div>
        </div>

        {/* User Metric */}
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Tanggung Jawab User</span>
              <span className="text-xl font-black text-cyan-400">
                {pic.totalTargetUser > 0 ? ((pic.totalAchievementUser / pic.totalTargetUser) * 100).toFixed(0) : 0}%
              </span>
           </div>
           <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold text-slate-100">{pic.totalAchievementUser.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-300">of {pic.totalTargetUser.toLocaleString()}</span>
           </div>
           <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
             <div 
               className="h-full bg-cyan-500 transition-all duration-1000 rounded-full overflow-hidden"
               style={{ width: `${Math.min(pic.totalTargetUser > 0 ? (pic.totalAchievementUser / pic.totalTargetUser) * 100 : 0, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  )
}
