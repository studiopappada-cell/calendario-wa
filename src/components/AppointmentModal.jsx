import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Phone, Briefcase, FileText, Tag, Trash2, Send, Check } from 'lucide-react'

// Categorie predefinite di suggerimento
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
    notes: ''
  })

  const [filteredClients, setFilteredClients] = useState([])
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)

  useEffect(() => {
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
        price: appointmentToEdit.price !== undefined ? appointmentToEdit.price : '',
        notes: appointmentToEdit.notes || ''
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
        notes: ''
      })
    }
  }, [appointmentToEdit, initialDate, isOpen])

  if (!isOpen) return null

  const handleNameChange = (e) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, clientName: value }))

    if (value.trim().length > 1) {
      const matches = clients.filter((c) =>
        c.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredClients(matches)
      setShowClientSuggestions(matches.length > 0)
    } else {
      setShowClientSuggestions(false)
    }
  }

  const handleSelectClient = (client) => {
    setFormData((prev) => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone || prev.clientPhone,
      notes: client.notes ? (prev.notes ? `${prev.notes} | ${client.notes}` : client.notes) : prev.notes
    }))
    setShowClientSuggestions(false)
  }

  const calculateEndTime = () => {
    if (!formData.time) return ''
    const [h, m] = formData.time.split(':').map(Number)
    const totalMinutes = h * 60 + m + Number(formData.duration || 60)
    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  const handleSubmit = (e, andSendWhatsApp = false) => {
    if (e) e.preventDefault()
    if (!formData.clientName.trim() || !formData.date || !formData.time) {
      alert('Compila il nome del cliente, la data e l\'ora.')
      return
    }

    const savedApp = onSave({
      ...formData,
      id: formData.id || 'app_' + Date.now()
    })

    if (andSendWhatsApp && onOpenWhatsApp) {
      onOpenWhatsApp(savedApp || formData)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {appointmentToEdit ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
              </h2>
              <p className="text-xs text-slate-400">
                Inserisci i dati e programma il promemoria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Sezione Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nome Cliente con autocompletamento rubrica */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Cliente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Es. Mario Rossi"
                  value={formData.clientName}
                  onChange={handleNameChange}
                  onFocus={() => {
                    if (formData.clientName.trim().length > 1 && filteredClients.length > 0) {
                      setShowClientSuggestions(true)
                    }
                  }}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Suggerimenti rubrica */}
              {showClientSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800">{client.name}</span>
                      <span className="text-slate-400 text-[11px]">{client.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Telefono per WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Telefono (per WhatsApp) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="Es. 3471234567"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Servizio / Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Servizio o Motivo Appuntamento
            </label>
            <div className="relative mb-2">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Es. Consulenza, Visita, Trattamento..."
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Tag rapidi servizio */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, service: s })}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    formData.service === s
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Data, Ora e Durata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durata (Fine: {calculateEndTime()})
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={15}>15 minuti</option>
                <option value={30}>30 minuti</option>
                <option value={45}>45 minuti</option>
                <option value={60}>1 ora (60 min)</option>
                <option value={90}>1 ora e 30 min</option>
                <option value={120}>2 ore (120 min)</option>
                <option value={180}>3 ore</option>
              </select>
            </div>
          </div>

          {/* Stato & Prezzo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                      formData.status === st.id
                        ? `${st.color} font-bold shadow-xs ring-1 ring-inset ring-current`
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
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note aggiuntive
            </label>
            <textarea
              rows={2}
              placeholder="Note interne o dettagli particolari per il cliente..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </form>

        {/* Footer con pulsanti azione */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {appointmentToEdit && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Vuoi davvero eliminare questo appuntamento?')) {
                  onDelete(appointmentToEdit.id)
                  onClose()
                }
              }}
              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
              className="px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl transition"
            >
              Chiudi
            </button>

            {/* Tasto principale WhatsApp: Salva & Invia subito */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition"
              title="Salva l'appuntamento e apri la finestra WhatsApp"
            >
              <Send className="w-4 h-4" />
              <span>Salva & Invia WA</span>
            </button>

            {/* Salva standard */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>Salva</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
