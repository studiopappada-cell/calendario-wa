import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Briefcase,
  FileText,
  Trash2,
  Send,
  Check,
  Users,
  AlertCircle,
  Bell,
  BellRing
} from 'lucide-react'
import { ALERT_OPTIONS, requestNotificationPermission } from '../utils/notifications'

const COMMON_SERVICES = [
  'Consulenza',
  'Appuntamento Generale',
  'Visita',
  'Trattamento',
  'Controllo',
  'Riunione',
  'Taglio & Piega',
  'Manutenzione'
]

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  appointmentToEdit,
  clients = [],
  onOpenWhatsApp
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    service: 'Consulenza',
    date: initialDate || new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 60,
    status: 'confirmed',
    price: '',
    notes: '',
    reminderAlert: '1d'
  })

  const [formError, setFormError] = useState('')
  const [selectedRubricaId, setSelectedRubricaId] = useState('')

  // Clienti ordinati alfabeticamente A-Z per il richiamo rapido (null-safe)
  const safeClients = useMemo(() => {
    if (!Array.isArray(clients)) return []
    return clients
      .filter((c) => c && typeof c === 'object')
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'it', { sensitivity: 'base' })
      )
  }, [clients])

  // Inizializza il form SOLO quando il modale viene aperto o cambia l'appuntamento da modificare
  useEffect(() => {
    if (!isOpen) return

    setFormError('')
    setSelectedRubricaId('')

    if (appointmentToEdit) {
      setFormData({
        id: appointmentToEdit.id,
        clientName: appointmentToEdit.clientName || '',
        clientPhone: appointmentToEdit.clientPhone || '',
        service: appointmentToEdit.service || 'Consulenza',
        date: appointmentToEdit.date || new Date().toISOString().split('T')[0],
        time: appointmentToEdit.time || '10:00',
        duration: appointmentToEdit.duration || 60,
        status: appointmentToEdit.status || 'confirmed',
        price: appointmentToEdit.price !== undefined && appointmentToEdit.price !== null ? appointmentToEdit.price : '',
        notes: appointmentToEdit.notes || '',
        reminderAlert: appointmentToEdit.reminderAlert || 'none'
      })
    } else {
      setFormData({
        clientName: '',
        clientPhone: '',
        service: 'Consulenza',
        date: initialDate || new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 60,
        status: 'confirmed',
        price: '',
        notes: '',
        reminderAlert: '1d'
      })
    }
  }, [isOpen, appointmentToEdit, initialDate])

  if (!isOpen) return null

  // Seleziona un cliente esistente dalla rubrica e popola i campi
  const handleSelectFromRubrica = (clientId) => {
    setSelectedRubricaId(clientId)
    setFormError('')
    if (!clientId) return

    const client = safeClients.find((c) => c.id === clientId)
    if (client) {
      setFormData((prev) => ({
        ...prev,
        clientName: client.name || '',
        clientPhone: client.phone || '',
        notes: client.notes ? (prev.notes ? `${prev.notes} | ${client.notes}` : client.notes) : prev.notes
      }))
    }
  }

  const calculateEndTime = () => {
    if (!formData.time) return ''
    const parts = formData.time.split(':').map(Number)
    const h = parts[0] || 0
    const m = parts[1] || 0
    const totalMinutes = h * 60 + m + Number(formData.duration || 60)
    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  const handleSubmit = (e, andSendWhatsApp = false) => {
    if (e && e.preventDefault) e.preventDefault()
    setFormError('')

    const name = String(formData.clientName || '').trim()
    const date = String(formData.date || '').trim()
    const time = String(formData.time || '').trim()

    if (!name) {
      setFormError('Inserisci o seleziona il nome del cliente prima di salvare.')
      return
    }

    if (!date) {
      setFormError('Seleziona la data dell\'appuntamento.')
      return
    }

    if (!time) {
      setFormError('Seleziona l\'ora dell\'appuntamento.')
      return
    }

    const payload = {
      ...formData,
      id: formData.id || 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      clientName: name,
      clientPhone: String(formData.clientPhone || '').trim(),
      service: String(formData.service || 'Consulenza').trim(),
      date,
      time,
      duration: Number(formData.duration || 60),
      status: formData.status || 'confirmed',
      notes: String(formData.notes || '').trim(),
      reminderAlert: formData.reminderAlert || 'none'
    }

    const saved = onSave(payload)

    if (andSendWhatsApp && onOpenWhatsApp) {
      onOpenWhatsApp(saved || payload)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header Modale */}
        <div className="bg-white border-b border-slate-100 text-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {appointmentToEdit ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
              </h2>
              <p className="text-xs text-slate-500">
                {formData.date ? `${formData.date} • Ore ${formData.time}` : 'Compila i dettagli dell\'appuntamento'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Scrollabile */}
        <form
          id="appointment-form"
          onSubmit={(e) => handleSubmit(e, false)}
          className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-800 min-h-0"
        >
          {/* Box Errore Visibile */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SEZIONE CLIENTE */}
          <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 space-y-3">
            {/* Opzione Rapida: Seleziona da Rubrica */}
            {safeClients.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Richiama da Rubrica ({safeClients.length} contatti):</span>
                </label>
                <select
                  value={selectedRubricaId}
                  onChange={(e) => handleSelectFromRubrica(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Seleziona un cliente per compilare in automatico --</option>
                  {safeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Inserimento o Modifica Nome e Telefono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome e Cognome Cliente *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Es. Mario Rossi"
                    value={formData.clientName}
                    onChange={(e) => {
                      setFormData({ ...formData, clientName: e.target.value })
                      if (formError) setFormError('')
                    }}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefono WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="Es. 3471234567"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Servizio / Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Servizio o Prestazione
            </label>
            <div className="relative mb-2">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Es. Consulenza, Visita, Trattamento..."
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, service: s })}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    formData.service === s
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Data, Ora e Durata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value })
                  if (formError) setFormError('')
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ora Inizio *
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => {
                  setFormData({ ...formData, time: e.target.value })
                  if (formError) setFormError('')
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durata (Minuti)
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (1h)</option>
                <option value={90}>90 min (1h 30m)</option>
                <option value={120}>120 min (2h)</option>
              </select>
            </div>
          </div>

          {/* Calcolo Orario Fine */}
          <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Orario Completo:</span>
            </span>
            <span className="font-bold text-slate-800">
              dalle {formData.time} alle {calculateEndTime()} ({formData.duration} min)
            </span>
          </div>

          {/* Stato e Prezzo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stato Appuntamento
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'confirmed', label: 'Confermato', color: 'text-emerald-700 border-emerald-300 bg-emerald-50' },
                  { id: 'pending', label: 'In Attesa', color: 'text-amber-700 border-amber-300 bg-amber-50' },
                  { id: 'completed', label: 'Completato', color: 'text-blue-700 border-blue-300 bg-blue-50' },
                  { id: 'cancelled', label: 'Annullato', color: 'text-rose-700 border-rose-300 bg-rose-50' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: st.id })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                      formData.status === st.id
                        ? `${st.color} font-bold ring-1 ring-inset ring-current`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tariffa / Prezzo (€ opzionale)
              </label>
              <input
                type="number"
                placeholder="Es. 50"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* SEZIONE PROMEMORIA ALERT PER IL CELLULARE */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-600" />
                <span>Promemoria Alert Cellulare</span>
              </label>
              <button
                type="button"
                onClick={async () => {
                  const perm = await requestNotificationPermission()
                  if (perm === 'granted') {
                    alert('Notifiche attivate con successo sul tuo dispositivo! 🔔')
                  }
                }}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
              >
                Abilita su smartphone
              </button>
            </div>
            <p className="text-[11px] text-amber-800/80">
              Scegli quando far squillare o ricevere l'avviso promemoria sul tuo cellulare per questo appuntamento:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {ALERT_OPTIONS.map((opt) => {
                const isSelected = formData.reminderAlert === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, reminderAlert: opt.id })
                      if (opt.id !== 'none') {
                        requestNotificationPermission()
                      }
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300 font-bold scale-[1.02]'
                        : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <span>{opt.id === 'none' ? '🔕' : '🔔'}</span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note aggiuntive
            </label>
            <textarea
              rows={2}
              placeholder="Note sul cliente o sulla prestazione..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            />
          </div>
        </form>

        {/* Footer con pulsanti azione */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {appointmentToEdit && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Vuoi davvero eliminare questo appuntamento?')) {
                  onDelete(appointmentToEdit.id)
                  onClose()
                }
              }}
              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Elimina appuntamento"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition cursor-pointer"
            >
              Annulla
            </button>

            {/* Salva & Invia subito WhatsApp */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer"
              title="Salva l'appuntamento e invia il promemoria su WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Salva & WA</span>
            </button>

            {/* Salva standard */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salva Appuntamento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
