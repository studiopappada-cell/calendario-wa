import React from 'react'
import { ChevronLeft, ChevronRight, MessageCircle, Clock, Plus } from 'lucide-react'

const DAYS_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 08:00 - 20:00

export default function CalendarWeekView({
  currentDate,
  onDateChange,
  appointments = [],
  onSelectDate,
  onEditAppointment,
  onOpenWhatsApp
}) {
  // Calcolo del Lunedì della settimana corrente
  const getStartOfWeek = (d) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(date.setDate(diff))
  }

  const startOfWeek = getStartOfWeek(currentDate)

  // Genera i 7 giorni della settimana
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return {
      dateObj: d,
      dateStr: d.toISOString().split('T')[0],
      dayName: DAYS_NAMES[i],
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1
    }
  })

  const todayStr = new Date().toISOString().split('T')[0]

  const prevWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    onDateChange(d)
  }

  const nextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    onDateChange(d)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Mappa appuntamenti per data
  const appointmentsByDate = {}
  appointments.forEach((app) => {
    if (!appointmentsByDate[app.date]) {
      appointmentsByDate[app.date] = []
    }
    appointmentsByDate[app.date].push(app)
  })

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
      {/* Header settimana */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base md:text-lg font-bold text-slate-800">
            Settimana del {weekDays[0].dayNum}/{weekDays[0].monthNum} - {weekDays[6].dayNum}/{weekDays[6].monthNum}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-600 transition"
          >
            Oggi
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevWeek}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Settimana precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Settimana successiva"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Colonne giorni */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header 7 Colonne */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-center py-2.5">
            {weekDays.map((d) => {
              const isToday = d.dateStr === todayStr
              return (
                <div key={d.dateStr} className="px-1">
                  <span className="block text-xs font-semibold text-slate-500">{d.dayName}</span>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-0.5 ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                    }`}
                  >
                    {d.dayNum}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Griglia giorni e appuntamenti */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[480px]">
            {weekDays.map((d) => {
              const dayApps = appointmentsByDate[d.dateStr] || []
              return (
                <div
                  key={d.dateStr}
                  className="p-1.5 space-y-2 hover:bg-slate-50/40 transition flex flex-col group cursor-pointer"
                  onClick={() => onSelectDate(d.dateStr)}
                >
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[10px] text-blue-600 flex items-center gap-0.5 bg-blue-50 px-1 rounded">
                      <Plus className="w-3 h-3" /> Aggiungi
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {dayApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditAppointment(app)
                        }}
                        className={`p-2 rounded-xl border text-xs shadow-2xs hover:shadow-sm transition ${
                          app.status === 'confirmed'
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                            : app.status === 'pending'
                            ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                            : 'bg-blue-50/80 border-blue-300 text-blue-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                          <span>{app.time}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenWhatsApp(app)
                            }}
                            className="text-emerald-700 hover:text-emerald-900 p-0.5"
                            title="Invia WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600/20" />
                          </button>
                        </div>
                        <div className="font-semibold truncate">{app.clientName}</div>
                        <div className="text-[10px] opacity-80 truncate">{app.service}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
