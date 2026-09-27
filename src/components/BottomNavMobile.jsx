import React from 'react'
import { Calendar, ListOrdered, Plus, Users, Settings } from 'lucide-react'

export default function BottomNavMobile({
  currentView,
  onViewChange,
  onNewAppointment,
  onOpenClients,
  onOpenSettings,
  dueAlertsCount = 0
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-1.5 flex items-center justify-around safe-area-bottom">
      {/* Agenda */}
      <button
        type="button"
        onClick={() => onViewChange('agenda')}
        className={`relative flex flex-col items-center py-1 px-2 rounded-xl transition ${
          currentView === 'agenda' ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <div className="relative">
          <ListOrdered className="w-5 h-5" />
          {dueAlertsCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-1 ring-white">
              {dueAlertsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5">Agenda</span>
      </button>

      {/* Mese */}
      <button
        type="button"
        onClick={() => onViewChange('month')}
        className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
          currentView === 'month' ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Mese</span>
      </button>

      {/* Pulsante Centrale Nuovo Appuntamento (+) */}
      <button
        type="button"
        onClick={onNewAppointment}
        className="-mt-5 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/40 ring-4 ring-white active:scale-95 transition"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Rubrica */}
      <button
        type="button"
        onClick={onOpenClients}
        className="flex flex-col items-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-900 transition"
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Rubrica</span>
      </button>

      {/* Impostazioni */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex flex-col items-center py-1 px-2 rounded-xl text-slate-500 hover:text-slate-900 transition"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Opzioni</span>
      </button>
    </nav>
  )
}
