'use client'

import { TVDashboardData } from '../actions'
import { formatRupiah } from '@/lib/utils'
import { DigitalClock } from './DigitalClock'
import { TrendingUp, Users, Target } from 'lucide-react'

interface Slide1Props {
  data: TVDashboardData
}

export function Slide1Total({ data }: Slide1Props) {
  const { aggregate, activePeriod } = data

  const getMonthName = (month: number) => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2024, month - 1, 1))
  }

  return (
    <div className="h-full flex flex-col p-12">
      {/* Header */}
      <div className="flex justify-between items-start mb-16">
        <div>
          <h1 className="text-6xl font-black text-slate-100 uppercase tracking-tighter mb-2">
            Ringkasan Performa
          </h1>
          <p className="text-2xl font-bold text-indigo-400 uppercase tracking-widest">
            Periode {activePeriod ? `${getMonthName(activePeriod.month)} ${activePeriod.year}` : '-'}
          </p>
        </div>
        <DigitalClock />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-10 flex-grow mb-12">
        {/* Total Target Rp */}
        <div className="bg-slate-900/50 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Target size={48} />
            </div>
            <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Total Target (Rp)</span>
          </div>
          <div className="text-7xl font-black text-slate-200">{formatRupiah(aggregate.totalTargetRp)}</div>
        </div>

        {/* Total Pencapaian Rp */}
        <div className="bg-slate-900/50 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <TrendingUp size={48} />
            </div>
            <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Total Pencapaian (Rp)</span>
          </div>
          <div className="text-7xl font-black text-emerald-400">{formatRupiah(aggregate.totalAchievementRp)}</div>
        </div>

        {/* Total Target User */}
        <div className="bg-slate-900/50 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-blue-500/10 rounded-2xl text-blue-400">
              <Users size={48} />
            </div>
            <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Total Target User</span>
          </div>
          <div className="text-7xl font-black text-slate-200">{aggregate.totalTargetUser.toLocaleString()}</div>
        </div>

        {/* Total Pencapaian User */}
        <div className="bg-slate-900/50 rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-cyan-500/10 rounded-2xl text-cyan-400">
              <Users size={48} />
            </div>
            <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Total Pencapaian User</span>
          </div>
          <div className="text-7xl font-black text-cyan-400">{aggregate.totalAchievementUser.toLocaleString()}</div>
        </div>
      </div>

      {/* Footer Progress & Status */}
      <div className="grid grid-cols-3 gap-12 items-end">
        <div className="col-span-2 space-y-8">
          {/* Progress Rp */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
               <span className="text-xl font-bold text-slate-400 uppercase tracking-widest">Akumulasi Kinerja (Rp)</span>
               <span className="text-4xl font-black text-indigo-400">{aggregate.percentageRp.toFixed(1)}%</span>
            </div>
            <div className="h-10 bg-slate-900 rounded-2xl border border-slate-800 p-1.5 overflow-hidden">
              <div 
                className="h-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                style={{ width: `${Math.min(aggregate.percentageRp, 100)}%` }}
              />
            </div>
          </div>

          {/* Progress User */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
               <span className="text-xl font-bold text-slate-400 uppercase tracking-widest">Akumulasi Kinerja (User)</span>
               <span className="text-4xl font-black text-cyan-400">{aggregate.percentageUser.toFixed(1)}%</span>
            </div>
            <div className="h-10 bg-slate-900 rounded-2xl border border-slate-800 p-1.5 overflow-hidden">
              <div 
                className="h-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                style={{ width: `${Math.min(aggregate.percentageUser, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-slate-900/80 rounded-3xl p-8 border border-slate-800 shadow-2xl h-full flex flex-col justify-center gap-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-lg font-bold text-slate-300 uppercase">Tercapai</span>
              </div>
              <span className="text-3xl font-black text-emerald-400">{aggregate.tercapai}</span>
           </div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                 <span className="text-lg font-bold text-slate-300 uppercase">Menuju Target</span>
              </div>
              <span className="text-3xl font-black text-amber-400">{aggregate.menujuTarget}</span>
           </div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-4 h-4 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                 <span className="text-lg font-bold text-slate-300 uppercase">Perlu Perhatian</span>
              </div>
              <span className="text-3xl font-black text-rose-400">{aggregate.perluPerhatian}</span>
           </div>
        </div>
      </div>
    </div>
  )
}
