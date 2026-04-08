'use client'

import { TVDashboardData, ProgramPerformance } from '../actions'
import { formatRupiah, cn } from '@/lib/utils'

interface Slide2Props {
  data: TVDashboardData
}

export function Slide2Programs({ data }: Slide2Props) {
  const { programs } = data

  return (
    <div className="h-full flex flex-col p-12">
      <div className="flex justify-between items-end mb-12">
         <h1 className="text-5xl font-black text-slate-100 uppercase tracking-tighter">
            Performa Per Program
         </h1>
         <div className="px-6 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 font-bold text-xl uppercase tracking-widest">
            Total {programs.length} Program Aktif
         </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-10 flex-grow">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </div>
    </div>
  )
}

function ProgramCard({ program }: { program: ProgramPerformance }) {
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
    <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 flex flex-col justify-between shadow-xl backdrop-blur-sm">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-3xl font-extrabold text-slate-100 truncate mb-1 leading-tight">
             {program.name}
          </h3>
          <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">
             PIC: <span className="text-slate-300">{program.pic_name}</span>
          </p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-xl border text-sm font-black uppercase tracking-tighter whitespace-nowrap",
          statusColors[program.status]
        )}>
          {program.status}
        </div>
      </div>

      <div className="space-y-6">
        {/* Rp Metric */}
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pencapaian Rp</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-black text-slate-200">{formatRupiah(program.achievementRp)}</span>
                 <span className="text-xs font-bold text-slate-500">/ {formatRupiah(program.monthly_target_rp || 0)}</span>
              </div>
           </div>
           <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
             <div 
               className={cn("h-full transition-all duration-1000 rounded-full", barColors[program.status])}
               style={{ width: `${Math.min(program.percentageRp, 100)}%` }}
             />
           </div>
        </div>

        {/* User Metric */}
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pencapaian User</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-2xl font-black text-slate-200">{program.achievementUser.toLocaleString()}</span>
                 <span className="text-xs font-bold text-slate-500">/ {(program.monthly_target_user || 0).toLocaleString()}</span>
              </div>
           </div>
           <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
             <div 
               className="h-full bg-cyan-500 transition-all duration-1000 rounded-full"
               style={{ width: `${Math.min(program.percentageUser, 100)}%` }}
             />
           </div>
        </div>
      </div>
    </div>
  )
}
