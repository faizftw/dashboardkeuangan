'use client'

import { useState } from 'react'
import { createProgram, toggleProgramStatus } from './actions'
import { Database } from '@/types/database'
import { formatRupiah } from '@/lib/utils'

type Program = Database['public']['Tables']['programs']['Row']
type TargetType = Database['public']['Enums']['target_type']

export function ProgramClient({ programs, isAdmin }: { programs: Program[], isAdmin: boolean }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTargetType, setSelectedTargetType] = useState<TargetType>('quantitative')

  async function handleCreateProgram(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    
    // Base data
    const payload: Parameters<typeof createProgram>[0] = {
      name: formData.get('name') as string,
      pic_name: formData.get('pic_name') as string,
      pic_whatsapp: formData.get('pic_whatsapp') as string,
      target_type: selectedTargetType,
    }

    // Quantitative payload (add if quantitative or hybrid)
    if (selectedTargetType === 'quantitative' || selectedTargetType === 'hybrid') {
      const rp = formData.get('monthly_target_rp')
      const user = formData.get('monthly_target_user')
      if (rp) payload.monthly_target_rp = Number(rp)
      if (user) payload.monthly_target_user = Number(user)
    }

    // Qualitative payload (add if qualitative or hybrid)
    if (selectedTargetType === 'qualitative' || selectedTargetType === 'hybrid') {
      const desc = formData.get('qualitative_description')
      if (desc) payload.qualitative_description = desc as string
    }

    const res = await createProgram(payload)
    
    if ('error' in res && res.error) {
      setError(res.error)
      setIsLoading(false)
    } else {
      setIsModalOpen(false)
      setIsLoading(false)
      // Reset form default
      setSelectedTargetType('quantitative')
    }
  }

  async function handleToggleStatus(id: string, currentStatus: boolean) {
    if (!isAdmin) return
    setIsLoading(true)
    const res = await toggleProgramStatus(id, currentStatus)
    if ('error' in res && res.error) alert(res.error)
    setIsLoading(false)
  }

  const renderTargetInfo = (program: Program) => {
    const isQuant = program.target_type === 'quantitative' || program.target_type === 'hybrid'
    const isQual = program.target_type === 'qualitative' || program.target_type === 'hybrid'

    return (
      <div className="space-y-1 text-xs">
        {isQuant && (
          <>
            <div><span className="font-semibold text-slate-800">Rp:</span> {formatRupiah(Number(program.monthly_target_rp || 0))}</div>
            <div><span className="font-semibold text-slate-800">User:</span> {program.monthly_target_user || 0}</div>
          </>
        )}
        {isQual && (
          <div className="truncate max-w-[200px]" title={program.qualitative_description || '-'}>
            <span className="font-semibold text-slate-800">Misi:</span> {program.qualitative_description || '-'}
          </div>
        )}
      </div>
    )
  }

  const getTypeLabel = (type: string) => {
    if (type === 'quantitative') return 'Kuantitatif'
    if (type === 'qualitative') return 'Kualitatif'
    return 'Hybrid'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Daftar Program</h3>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            + Tambah Program
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Nama Program</th>
              <th className="px-6 py-4">PIC / WhatsApp</th>
              <th className="px-6 py-4">Tipe</th>
              <th className="px-6 py-4">Detail Target (Bulanan)</th>
              <th className="px-6 py-4 text-center">Status</th>
              {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {programs.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data program {isAdmin ? '' : 'yang aktif'}.
                </td>
              </tr>
            ) : (
              programs.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 max-w-[250px] truncate" title={prog.name}>
                    {prog.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="font-medium text-slate-900">{prog.pic_name}</div>
                    <div className="text-xs">{prog.pic_whatsapp || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                      prog.target_type === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                      prog.target_type === 'quantitative' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {getTypeLabel(prog.target_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {renderTargetInfo(prog)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {prog.is_active ? (
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
                      <button
                        onClick={() => handleToggleStatus(prog.id, prog.is_active)}
                        disabled={isLoading}
                        className={`text-xs font-medium border px-3 py-1.5 rounded-md transition-colors ${
                          prog.is_active 
                            ? 'text-red-600 hover:text-red-800 border-red-200 hover:bg-red-50' 
                            : 'text-emerald-600 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {prog.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Tailwind Modal for Add Program */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-10 mb-10 shrink-0 transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 rounded-t-xl z-10">
              <h3 className="font-semibold text-slate-900">Tambah Program Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProgram} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nama Program</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  placeholder="Contoh: Kelas Pelatihan BNSP"
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Penanggung Jawab (PIC)</label>
                  <input 
                    name="pic_name" 
                    type="text" 
                    required 
                    placeholder="Nama PIC"
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">No. WhatsApp PIC</label>
                  <input 
                    name="pic_whatsapp" 
                    type="text" 
                    placeholder="081234..."
                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Tipe Target</label>
                <div className="flex gap-3">
                  {(['quantitative', 'qualitative', 'hybrid'] as const).map(type => (
                    <label key={type} className={`flex-1 flex justify-center cursor-pointer border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      selectedTargetType === type ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input 
                        type="radio" 
                        name="type_selector" 
                        className="hidden" 
                        checked={selectedTargetType === type}
                        onChange={() => setSelectedTargetType(type)}
                      />
                      {getTypeLabel(type)}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {selectedTargetType === 'quantitative' && 'Target berfokus pada pencapaian Rupiah dan jumlah User.'}
                  {selectedTargetType === 'qualitative' && 'Target berfokus pada pencapaian milestone pekerjaan/misi spesifik.'}
                  {selectedTargetType === 'hybrid' && 'Kombinasi antara target nominal (Kuantitatif) dan milestone khusus (Kualitatif).'}
                </p>
              </div>

              {/* Conditional Fields based on Target Type */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                {(selectedTargetType === 'quantitative' || selectedTargetType === 'hybrid') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-semibold text-slate-700">Target Bulanan (Rupiah)</label>
                      <input 
                        name="monthly_target_rp" 
                        type="number" 
                        min="0"
                        className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required={selectedTargetType === 'quantitative' || selectedTargetType === 'hybrid'}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-semibold text-slate-700">Target Bulanan (User)</label>
                      <input 
                        name="monthly_target_user" 
                        type="number" 
                        min="0"
                        className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        required={selectedTargetType === 'quantitative' || selectedTargetType === 'hybrid'}
                      />
                    </div>
                  </div>
                )}

                {(selectedTargetType === 'qualitative' || selectedTargetType === 'hybrid') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Deskripsi Target Kualitatif</label>
                    <textarea 
                      name="qualitative_description" 
                      rows={3}
                      placeholder="Gambarkan milestone yang harus dicapai bulan ini..."
                      className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                      required={selectedTargetType === 'qualitative' || selectedTargetType === 'hybrid'}
                    ></textarea>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-6">
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
                  {isLoading ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
