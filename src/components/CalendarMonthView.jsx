import React from 'react'
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Calendar as CalendarIcon, Clock } from 'lucide-react'

const DAYS_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

export default function CalendarMonthView({
  currentDate,
  onDateChange,
  appointments = [],
  onSelectDate,
  onEditAppointment,
  onOpenWhatsApp
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Primo giorno del mese
  const firstDayOfMonth = new Date(year, month, 1)
  // Calcolo offset lunedì (0 = Lunedì, 6 = Domenica)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  // Giorni nel mese corrente
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Giorni nel mese precedente
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const todayStr = new Date().toISOString().split('T')[0]

  // Navigazione mese
  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1))
  }
  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1))
  }
  const goToToday = () => {
    onDateChange(new Date())
  }

  // Costruiamo la matrice delle celle dei giorni (totale celle tipicamente 35 o 42)
  const calendarCells = []

  // Giorni del mese precedente
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const prevDate = new Date(year, month - 1, dayNum)
    const dateStr = prevDate.toISOString().split('T')[0]
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      dateObj: prevDate
    })
  }

  // Giorni del mese corrente
  for (let i = 1; i <= daysInMonth; i++) {
    const currentCellDate = new Date(year, month, i)
    // Formattazione data locale YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    calendarCells.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true,
      dateObj: currentCellDate
    })
  }

  // Giorni del mese successivo per completare la griglia
  const remainingCells = 42 - calendarCells.length
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i)
    const dateStr = nextDate.toISOString().split('T')[0]
    calendarCells.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false,
      dateObj: nextDate
    })
  }

  // Mappa degli appuntamenti per data
  const appointmentsByDate = {}
  appointments.forEach((app) => {
    if (!appointmentsByDate[app.date]) {
      appointmentsByDate[app.date] = []
    }
    appointmentsByDate[app.date].push(app)
  })

  // Ordina per orario
  Object.keys(appointmentsByDate).forEach((d) => {
    appointmentsByDate[d].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  })

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
      {/* Header navigazione Mese */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 capitalize">
            {MONTH_NAMES[month]} <span className="text-blue-600">{year}</span>
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
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            title="Mese successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Intestazione giorni della settimana */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-xs font-semibold text-slate-500 py-2.5">
        {DAYS_NAMES.map((d, index) => (
          <div key={d} className={index >= 5 ? 'text-rose-500' : ''}>
            {d}
          </div>
        ))}
      </div>

      {/* Griglia giorni del calendario */}
      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr
          const dayApps = appointmentsByDate[cell.dateStr] || []

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[105px] md:min-h-[125px] p-1.5 md:p-2 bg-white transition hover:bg-blue-50/30 flex flex-col justify-between group cursor-pointer ${
                !cell.isCurrentMonth ? 'bg-slate-50/60 opacity-60' : ''
              }`}
            >
              {/* Header Giorno con Numero e Tasto Aggiungi */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs md:text-sm font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {/* Tasto rapido aggiungi che appare al passaggio */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectDate(cell.dateStr)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-blue-100 text-blue-600 rounded-lg hidden md:block"
                  title="Nuovo appuntamento questo giorno"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista appuntamenti del giorno (pillole) */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayApps.slice(0, 3).map((app) => {
                  const isConfirmed = app.status === 'confirmed'
                  const isPending = app.status === 'pending'
                  const isCompleted = app.status === 'completed'

                  let badgeColor = 'bg-slate-100 border-slate-300 text-slate-700'
                  if (isConfirmed) badgeColor = 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  if (isPending) badgeColor = 'bg-amber-50 border-amber-300 text-amber-800'
                  if (isCompleted) badgeColor = 'bg-blue-50 border-blue-300 text-blue-800'

                  return (
                    <div
                      key={app.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditAppointment(app)
                      }}
                      className={`text-[10px] md:text-[11px] p-1 rounded-md border flex items-center justify-between gap-1 shadow-2xs hover:scale-[1.02] transition cursor-pointer ${badgeColor}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold shrink-0">{app.time}</span>
                        <span className="truncate font-medium">{app.clientName}</span>
                      </div>

                      {/* Icona WhatsApp rapida */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenWhatsApp(app)
                        }}
                        className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-white/80 shrink-0 transition"
                        title="Invia WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 fill-emerald-500/20" />
                      </button>
                    </div>
                  )
                })}

                {/* Se ci sono più di 3 appuntamenti */}
                {dayApps.length > 3 && (
                  <div className="text-[10px] text-slate-500 font-medium px-1 text-center">
                    +{dayApps.length - 3} altri
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
