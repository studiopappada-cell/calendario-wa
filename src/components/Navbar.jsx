import React from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  BarChart3,
  Settings,
  Cloud,
  MessageCircle,
  Clock,
  Bell
} from 'lucide-react'

export default function Navbar({
  currentView,
  onViewChange,
  onNewAppointment,
  onOpenClients,
  onOpenStats,
  onOpenSettings,
  appointmentsCount,
  dueAlertsCount = 0,
  onToggleAlerts,
  isSyncing,
  lastSyncTime,
  onTriggerSync
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
          {/* Indicatore Stato Sincronizzazione Cloud GitHub */}
          <button
            onClick={() => onTriggerSync && onTriggerSync(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isSyncing
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Clicca per sincronizzare subito tra PC e Smartphone"
          >
            <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Sincronizzo...' : lastSyncTime ? `Sincronizzato (${lastSyncTime})` : 'Sincronizzato 🟢'}
            </span>
          </button>

          {/* Campanella Promemoria & Alert */}
          <button
            onClick={onToggleAlerts}
            className={`relative p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              dueAlertsCount > 0
                ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'text-slate-600 hover:text-amber-600 hover:bg-slate-100'
            }`}
            title={dueAlertsCount > 0 ? `${dueAlertsCount} promemoria / avvisi in scadenza` : 'Avvisi e Promemoria Cellulare'}
          >
            <div className="relative">
              <Bell className={`w-4 h-4 ${dueAlertsCount > 0 ? 'text-amber-600 animate-bounce' : 'text-slate-500'}`} />
              {dueAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                  {dueAlertsCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">
              {dueAlertsCount > 0 ? `Avvisi (${dueAlertsCount})` : 'Avvisi'}
            </span>
          </button>


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
