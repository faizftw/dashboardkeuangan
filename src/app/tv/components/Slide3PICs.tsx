'use client'

import { PICPerformance } from '../actions'
import { cn } from '@/lib/utils'

interface Slide3Props {
  pics: PICPerformance[]
  pagination?: {
    current: number
    total: number
  }
}

export function Slide3PICs({ pics, pagination }: Slide3Props) {
  return (
    <div className="h-full flex flex-col p-12">
      <div className="flex justify-between items-end mb-12">
         <div>
            <h1 className="text-5xl font-black text-slate-100 uppercase tracking-tighter">
               Performa Per PIC
            </h1>
            {pagination && pagination.total > 1 && (
               <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] mt-2">
                  Halaman {pagination.current} dari {pagination.total}
               </p>
            )}
         </div>
         <div className="px-6 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 font-bold text-xl uppercase tracking-widest">
            {pagination ? `Menampilkan ${pics.length} Personel` : `Total ${pics.length} Personel`}
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
  const statusColors: Record<string, string> = {
    'EXCELLENT': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    'BAIK': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'CUKUP': 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    'PERLU PERHATIAN': 'text-rose-400 bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    'KRITIS': 'text-rose-400 bg-rose-600/20 border-rose-600/50 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
  }

  const barColors: Record<string, string> = {
    'EXCELLENT': 'bg-emerald-500',
    'BAIK': 'bg-emerald-500',
    'CUKUP': 'bg-amber-500',
    'PERLU PERHATIAN': 'bg-rose-500',
    'KRITIS': 'bg-rose-600'
  }

  const grade = pic.grade.label
  const gradeColor = pic.grade.color

  return (
    <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800/80 flex flex-col justify-between shadow-xl backdrop-blur-sm group hover:bg-slate-900/60 transition-all duration-500 relative overflow-hidden h-full">
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-20 transition-all duration-700",
        pic.avgHealthScore >= 80 ? 'bg-emerald-500 group-hover:opacity-40' : 
        pic.avgHealthScore >= 60 ? 'bg-amber-500 group-hover:opacity-40' : 'bg-rose-500 group-hover:opacity-40'
      )} />

      <div className="flex justify-between items-start mb-4 relative z-10">
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

      {/* MINI GAUGE - Filling the middle space */}
      <div className="flex justify-center items-center py-6 relative z-10">
         <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
               {/* Background circle */}
               <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  className="text-slate-950"
               />
               {/* Progress circle */}
               <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - Math.min(pic.avgHealthScore, 100) / 100)}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-[2000ms] ease-out",
                    pic.avgHealthScore >= 80 ? 'text-emerald-500' : 
                    pic.avgHealthScore >= 60 ? 'text-amber-500' : 'text-rose-400'
                  )}
                  style={{ filter: `drop-shadow(0 0 8px currentColor)` }}
               />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className={cn("text-5xl font-black tracking-tighter leading-none mb-1", gradeColor)}>
                 {grade}
               </span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</span>
            </div>
         </div>
      </div>

       <div className="space-y-4 relative z-10 mt-auto">
        <div className="space-y-2">
           <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest text-opacity-60">Avg Health Score</span>
              <span className="text-3xl font-black text-slate-100">{pic.avgHealthScore.toFixed(1)}%</span>
           </div>
           <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
             <div 
               className={cn("h-full transition-all duration-1000 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", barColors[pic.status] || barColors['CUKUP'])}
               style={{ width: `${Math.min(pic.avgHealthScore, 100)}%` }}
             />
           </div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pt-2 border-t border-slate-800/50">
           <span>{pic.programCount} Programs Assigned</span>
           <span className={gradeColor}>Grade {grade}</span>
        </div>
      </div>
    </div>
  )
}
