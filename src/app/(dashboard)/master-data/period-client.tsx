'use client'

import { useState } from 'react'
import { createPeriod, setActivePeriod } from './actions'
import { Database } from '@/types/database'
import { formatMonth } from '@/lib/utils'

type Period = Database['public']['Tables']['periods']['Row']

export function PeriodClient({ periods, isAdmin }: { periods: Period[], isAdmin: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreatePeriod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const month = parseInt(formData.get('month') as string, 10)
    const year = parseInt(formData.get('year') as string, 10)
    const workingDays = parseInt(formData.get('working_days') as string, 10)

    const res = await createPeriod({ month, year, working_days: workingDays })
    
    if ('error' in res && res.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      setIsModalOpen(false)
      setIsLoading(false)
    }
  }

  async function handleSetActive(id: string) {
    if (!isAdmin) return
    setIsLoading(true)
    const res = await setActivePeriod(id)
    if ('error' in res && res.error) alert(res.error)
    setIsLoading(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Daftar Periode</h3>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            + Tambah Periode
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Bulan / Tahun</th>
              <th className="px-6 py-4 text-center">Hari Kerja</th>
              <th className="px-6 py-4 text-center">Status</th>
              {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {periods.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data periode.
                </td>
              </tr>
            ) : (
              periods.map((period) => (
                <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {formatMonth(period.month)} {period.year}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {period.working_days} hari
                  </td>
                  <td className="px-6 py-4 text-center">
                    {period.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      {!period.is_active && (
                        <button
                          onClick={() => handleSetActive(period.id)}
                          disabled={isLoading}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Set Aktif
                        </button>
                      )}
                      {period.is_active && (
                        <span className="text-xs text-slate-400 border border-transparent px-3 py-1.5">Saat ini aktif</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tailwind Modal for Add Period */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Tambah Periode Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreatePeriod} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Bulan</label>
                  <select 
                    name="month" 
                    required 
                    defaultValue={new Date().getMonth() + 1}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{formatMonth(i+1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Tahun</label>
                  <input 
                    name="year" 
                    type="number" 
                    required 
                    defaultValue={new Date().getFullYear()}
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Hari Kerja Aktif</label>
                <input 
                  name="working_days" 
                  type="number" 
                  required 
                  min="1"
                  max="31"
                  defaultValue="20"
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500">Jumlah hari efektif setelah dikurangi libur/weekend.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Periode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
