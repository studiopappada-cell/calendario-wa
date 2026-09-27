import React, { useState } from 'react'
import {
  MessageCircle,
  Calendar,
  Clock,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  CalendarPlus,
  Edit2,
  User,
  Sparkles,
  Bell,
  BellRing
} from 'lucide-react'
import { formatDateItalian } from '../utils/whatsapp'
import { getGoogleCalendarLink, downloadICalendar } from '../utils/storage'
import { isAppointmentAlertDue, ALERT_OPTIONS } from '../utils/notifications'

export default function CalendarAgendaView({
  appointments = [],
  onEditAppointment,
  onOpenWhatsApp,
  onUpdateStatus,
  onNewAppointment
}) {
  const [filterPeriod, setFilterPeriod] = useState('all') // all, today, tomorrow, week, upcoming
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  // Calcolo fine settimana (7 giorni da oggi)
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // Filtriamo gli appuntamenti
  const filteredAppointments = appointments
    .filter((app) => {
      // Filtro ricerca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (app.clientName || '').toLowerCase().includes(q)
        const matchPhone = (app.clientPhone || '').includes(q)
        const matchService = (app.service || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchService) return false
      }

      // Filtro stato
      if (filterStatus !== 'all' && app.status !== filterStatus) {
        return false
      }

      // Filtro periodo
      if (filterPeriod === 'alerts') return app.reminderAlert && app.reminderAlert !== 'none'
      if (filterPeriod === 'today') return app.date === todayStr
      if (filterPeriod === 'tomorrow') return app.date === tomorrowStr
      if (filterPeriod === 'week') return app.date >= todayStr && app.date <= next7DaysStr
      if (filterPeriod === 'upcoming') return app.date >= todayStr

      return true
    })
    .sort((a, b) => {
      // Ordina prima per data, poi per ora
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time || '').localeCompare(b.time || '')
    })

  return (
    <div className="space-y-4">
      {/* Barra di Ricerca e Filtri */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Campo di ricerca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cerca per cliente, telefono o servizio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro periodo pillole */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'alerts', label: '🔔 Con Alert' },
              { id: 'today', label: 'Oggi' },
              { id: 'tomorrow', label: 'Domani' },
              { id: 'week', label: '7 Giorni' },
              { id: 'upcoming', label: 'Futuri' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  filterPeriod === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtri rapidi per stato */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs pt-1">
          <span className="text-slate-400 font-medium">Stato:</span>
          {[
            { id: 'all', label: 'Tutti gli stati' },
            { id: 'confirmed', label: 'Confermati' },
            { id: 'pending', label: 'In Attesa' },
            { id: 'completed', label: 'Completati' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                filterStatus === st.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50 font-bold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Appuntamenti / Card */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nessun appuntamento trovato</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Non ci sono appuntamenti corrispondenti ai filtri attuali.
          </p>
          <button
            onClick={() => onNewAppointment(todayStr)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
          >
            + Aggiungi Appuntamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAppointments.map((app) => {
            const isToday = app.date === todayStr
            const isTomorrow = app.date === tomorrowStr

            let statusBadge = {
              text: 'Confermato',
              color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
            if (app.status === 'pending') {
              statusBadge = { text: 'In Attesa', color: 'bg-amber-50 text-amber-700 border-amber-200' }
            } else if (app.status === 'completed') {
              statusBadge = { text: 'Completato', color: 'bg-blue-50 text-blue-700 border-blue-200' }
            } else if (app.status === 'cancelled') {
              statusBadge = { text: 'Annullato', color: 'bg-rose-50 text-rose-700 border-rose-200' }
            }

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Data/Badge & Stato */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {app.time}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full animate-pulse">
                          OGGI
                        </span>
                      )}
                      {isTomorrow && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          DOMANI
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        {formatDateItalian(app.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {app.reminderAlert && app.reminderAlert !== 'none' && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isAppointmentAlertDue(app)
                              ? 'bg-amber-500 text-white animate-pulse shadow-xs'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                          title={`Avviso impostato: ${ALERT_OPTIONS.find((o) => o.id === app.reminderAlert)?.label || ''}`}
                        >
                          <Bell className="w-3 h-3" />
                          <span>{ALERT_OPTIONS.find((o) => o.id === app.reminderAlert)?.label || 'Alert'}</span>
                        </span>
                      )}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>

                  {/* Nome Cliente & Servizio */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center justify-between">
                      <span>{app.clientName}</span>
                      {app.price && (
                        <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          €{app.price}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <span className="text-blue-600">●</span> {app.service}
                      {app.duration && <span className="text-slate-400">({app.duration} min)</span>}
                    </p>

                    {/* Telefono */}
                    {app.clientPhone && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{app.clientPhone}</span>
                      </p>
                    )}

                    {/* Note se presenti */}
                    {app.notes && (
                      <div className="mt-2 text-xs bg-slate-50 p-2 rounded-xl text-slate-600 border border-slate-100 italic">
                        "{app.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Pulsanti Azione e Integrazione WhatsApp */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Tasto Modifica */}
                    <button
                      type="button"
                      onClick={() => onEditAppointment(app)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      title="Modifica appuntamento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Aggiungi a Google Calendar */}
                    <a
                      href={getGoogleCalendarLink(app)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                      title="Aggiungi a Google Calendar"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </a>

                    {/* Scarica iCal */}
                    <button
                      type="button"
                      onClick={() => downloadICalendar(app)}
                      className="text-[11px] px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Scarica file evento per calendario"
                    >
                      .ICS
                    </button>
                  </div>

                  {/* IL TASTO PRINCIPALE WHATSAPP */}
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(app)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-white/20" />
                    <span>Invia WhatsApp</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
