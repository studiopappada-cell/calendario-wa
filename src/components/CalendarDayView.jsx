import React from 'react'
import { ChevronLeft, ChevronRight, MessageCircle, Clock, Plus, Phone, Calendar } from 'lucide-react'
import { formatDateItalian } from '../utils/whatsapp'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 08:00 - 21:00

export default function CalendarDayView({
  currentDate,
  onDateChange,
  appointments = [],
  onSelectDate,
  onEditAppointment,
  onOpenWhatsApp
}) {
  const dateStr = currentDate.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = dateStr === todayStr

  const prevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    onDateChange(d)
  }

  const nextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    onDateChange(d)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Appuntamenti per questo specifico giorno ordinati per orario
  const dayAppointments = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
      {/* Header Giorno */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
              <span>{formatDateItalian(dateStr)}</span>
              {isToday && (
                <span className="text-xs bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                  OGGI
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {dayAppointments.length} {dayAppointments.length === 1 ? 'appuntamento' : 'appuntamenti'} previsti
            </p>
          </div>
          <button
            onClick={goToToday}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-600 transition"
          >
            Oggi
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevDay}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextDay}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline oraria */}
      <div className="p-4 space-y-3">
        {HOURS.map((hour) => {
          const hourStr = `${String(hour).padStart(2, '0')}:00`
          const nextHourStr = `${String(hour + 1).padStart(2, '0')}:00`

          // Trova appuntamenti che cadono in questa fascia oraria
          const matchingApps = dayAppointments.filter((app) => {
            const appH = parseInt((app.time || '').split(':')[0], 10)
            return appH === hour
          })

          return (
            <div key={hour} className="flex gap-3 items-start border-b border-slate-100 pb-2.5 last:border-0">
              <span className="text-xs font-bold text-slate-400 w-12 pt-1">{hourStr}</span>

              <div className="flex-1">
                {matchingApps.length > 0 ? (
                  <div className="space-y-2">
                    {matchingApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => onEditAppointment(app)}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:shadow-sm transition cursor-pointer ${
                          app.status === 'confirmed'
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : app.status === 'pending'
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-blue-50/70 border-blue-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                              {app.time} ({app.duration || 60}m)
                            </span>
                            <span className="font-bold text-sm text-slate-900">{app.clientName}</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                            <span>{app.service}</span>
                            {app.clientPhone && <span>📞 {app.clientPhone}</span>}
                            {app.price && <span className="font-semibold text-emerald-700">€{app.price}</span>}
                          </div>
                        </div>

                        {/* Tasto rapido WhatsApp */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenWhatsApp(app)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition self-start sm:self-auto cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectDate(dateStr)}
                    className="w-full text-left py-1 text-xs text-slate-300 hover:text-blue-600 hover:bg-blue-50/40 rounded-lg px-2 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Libero - Clicca per fissare appuntamento
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
