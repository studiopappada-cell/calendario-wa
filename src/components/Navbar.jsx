import React from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  BarChart3,
  Settings,
  Cloud,
  MessageCircle,
  Clock
} from 'lucide-react'

export default function Navbar({
  currentView,
  onViewChange,
  onNewAppointment,
  onOpenClients,
  onOpenStats,
  onOpenSettings,
  appointmentsCount,
  syncCode
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            {/* Pillola WhatsApp */}
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white">
              <MessageCircle className="w-2.5 h-2.5" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <span>Agenda</span>
              <span className="text-emerald-600 font-black">WhatsApp</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Calendario Cloud & Promemoria Clienti
            </p>
          </div>
        </div>

        {/* View Switcher per Desktop/Tablet */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          {[
            { id: 'agenda', label: 'Agenda Elenco' },
            { id: 'month', label: 'Mese' },
            { id: 'week', label: 'Settimana' },
            { id: 'day', label: 'Giorno' }
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentView === v.id
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Pulsanti Azione Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Indicatore Stanza Cloud se attiva */}
          {syncCode && (
            <button
              onClick={onOpenSettings}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-mono font-semibold border border-blue-200"
              title="Sincronizzazione Cloud attiva"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>{syncCode}</span>
            </button>
          )}

          {/* Rubrica */}
          <button
            onClick={onOpenClients}
            className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Rubrica Clienti"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Rubrica</span>
          </button>

          {/* Statistiche */}
          <button
            onClick={onOpenStats}
            className="p-2 sm:px-3 sm:py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Statistiche"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Impostazioni */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Impostazioni e Sincronizzazione"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Nuovo Appuntamento (Pulsante Principale) */}
          <button
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nuovo</span>
          </button>
        </div>
      </div>
    </header>
  )
}
