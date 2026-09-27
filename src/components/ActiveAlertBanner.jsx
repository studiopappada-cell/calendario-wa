import React from 'react'
import { BellRing, Volume2, X, Calendar, CheckCircle } from 'lucide-react'

/**
 * Banner / Finestra di Allarme Visivo e Sonoro in Primo Piano per Smartphone e Desktop
 * Si attiva quando scade un alert (oggi o per giorni di prenotazione)
 */
export default function ActiveAlertBanner({ alert, onDismiss, onViewAppointment }) {
  if (!alert) return null

  return (
    <div
      style={{ zIndex: 99999 }}
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md animate-in slide-in-from-top duration-300 shadow-2xl"
    >
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-300 ring-4 ring-amber-400/30 flex flex-col gap-3">
        {/* Intestazione Allarme con Campanella Animata */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 backdrop-blur-xs rounded-xl animate-bounce">
              <BellRing className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase bg-white/25 px-2 py-0.5 rounded-full text-white">
                Sveglia Promemoria
              </span>
              <h3 className="text-sm font-black text-white mt-0.5 leading-tight">
                {alert.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
            title="Chiudi avviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dettagli dell'avviso */}
        <div className="bg-black/15 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-xs">
          <p className="font-semibold text-white leading-relaxed">
            {alert.message}
          </p>
        </div>

        {/* Azioni Rapide */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {onViewAppointment && alert.appointmentId && (
            <button
              type="button"
              onClick={() => onViewAppointment(alert.appointmentId)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dettagli</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-amber-900 hover:bg-amber-50 active:scale-95 rounded-xl text-xs font-black shadow-md transition cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ho visto (OK)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
