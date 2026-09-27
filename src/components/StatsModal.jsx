import React from 'react'
import { X, BarChart3, TrendingUp, CheckCircle, Clock, Calendar, Euro } from 'lucide-react'

export default function StatsModal({ isOpen, onClose, appointments = [] }) {
  if (!isOpen) return null

  const total = appointments.length
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length
  const pending = appointments.filter((a) => a.status === 'pending').length
  const completed = appointments.filter((a) => a.status === 'completed').length

  const totalRevenue = appointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0)

  // Servizi più richiesti
  const serviceCounts = {}
  appointments.forEach((a) => {
    const s = a.service || 'Generale'
    serviceCounts[s] = (serviceCounts[s] || 0) + 1
  })
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Riepilogo & Statistiche</h2>
              <p className="text-xs text-slate-400">Panoramica andamento appuntamenti</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenuto */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Card KPI */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                Totale Appuntamenti
              </span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {total}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Entrate Stimate
              </span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                €{totalRevenue}
              </span>
            </div>
          </div>

          {/* Dettaglio Stati */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stato Appuntamenti
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="text-base font-bold text-emerald-800">{confirmed}</span>
                <span className="text-[11px] block text-emerald-600 font-medium">Confermati</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <span className="text-base font-bold text-amber-800">{pending}</span>
                <span className="text-[11px] block text-amber-600 font-medium">In Attesa</span>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                <span className="text-base font-bold text-blue-800">{completed}</span>
                <span className="text-[11px] block text-blue-600 font-medium">Completati</span>
              </div>
            </div>
          </div>

          {/* Servizi più richiesti */}
          {topServices.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Servizi Più Richiesti
              </h3>
              <div className="space-y-1.5">
                {topServices.map(([serv, count]) => {
                  const pct = Math.round((count / total) * 100) || 0
                  return (
                    <div key={serv} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-700 font-medium">
                        <span>{serv}</span>
                        <span className="font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
