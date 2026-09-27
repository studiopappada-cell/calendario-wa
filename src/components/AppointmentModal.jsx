import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Briefcase,
  FileText,
  Tag,
  Trash2,
  Send,
  Check,
  Users,
  Search,
  CheckCircle2,
  UserPlus
} from 'lucide-react'

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

  // Modalità di selezione cliente: 'select' (da rubrica) o 'manual' (scrivi a mano)
  const [clientInputMode, setClientInputMode] = useState('select')
  const [searchClientQuery, setSearchClientQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')

  // Clienti ordinati alfabeticamente A-Z per il richiamo rapido
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) =>
      a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
    )
  }, [clients])

  const filteredClientsList = useMemo(() => {
    if (!searchClientQuery.trim()) return sortedClients
    const q = searchClientQuery.toLowerCase()
    return sortedClients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    )
  }, [sortedClients, searchClientQuery])

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
      setClientInputMode('manual')
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
      // Se ci sono clienti in rubrica, proponi subito la selezione da rubrica!
      setClientInputMode(clients.length > 0 ? 'select' : 'manual')
      setSelectedClientId('')
      setSearchClientQuery('')
    }
  }, [appointmentToEdit, initialDate, isOpen, clients])

  if (!isOpen) return null

  // Selezione di un cliente dalla rubrica
  const handleSelectClient = (client) => {
    if (!client) return
    setSelectedClientId(client.id)
    setFormData((prev) => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone || '',
      notes: client.notes ? (prev.notes ? `${prev.notes} | ${client.notes}` : client.notes) : prev.notes
    }))
  }

  const handleDropdownChange = (e) => {
    const id = e.target.value
    setSelectedClientId(id)
    if (!id) return
    const found = clients.find((c) => c.id === id)
    if (found) {
      handleSelectClient(found)
    }
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
      alert('Seleziona o inserisci il cliente, la data e l\'ora.')
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
        {/* Header Bianco Luminoso */}
        <div className="bg-white border-b border-slate-100 text-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {appointmentToEdit ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
              </h2>
              <p className="text-xs text-slate-500">
                Richiama un cliente dalla rubrica o inserisci un nuovo appuntamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* SEZIONE 1: RICHIAMO CLIENTE DALLA RUBRICA */}
          <div className="bg-blue-50/50 border border-blue-200/80 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Cliente dell'Appuntamento</span>
              </span>

              {/* Selettore modalità: Rubrica o Manuale */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setClientInputMode('select')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    clientInputMode === 'select'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dalla Rubrica ({clients.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientInputMode('manual')
                    setSelectedClientId('')
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    clientInputMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nuovo a Mano
                </button>
              </div>
            </div>

            {/* Opzione A: Menu e Ricerca da Rubrica */}
            {clientInputMode === 'select' ? (
              <div className="space-y-2">
                {clients.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                    Non hai ancora contatti in rubrica. Passa a "Nuovo a Mano" per inserirlo, verrà salvato automaticamente anche nella rubrica!
                  </p>
                ) : (
                  <>
                    {/* Menu a tendina diretto con tutti i contatti */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Scegli dalla Rubrica:
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={handleDropdownChange}
                        className="w-full text-sm font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Seleziona un cliente ({clients.length} in rubrica) --</option>
                        {sortedClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            👤 {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Badge di conferma selezione */}
                    {formData.clientName && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{formData.clientName}</span>
                            {formData.clientPhone && (
                              <span className="text-slate-600 ml-2">📞 {formData.clientPhone}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Selezionato
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Opzione B: Inserimento Manuale */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome e Cognome *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Es. Mario Rossi"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

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
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
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
                className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durata (Fine: {calculateEndTime()})
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
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
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
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
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              placeholder="Note particolari per il cliente..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
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
              className="px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl transition cursor-pointer"
            >
              Chiudi
            </button>

            {/* Salva & Invia subito WhatsApp */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition cursor-pointer"
              title="Salva l'appuntamento e apri la finestra WhatsApp"
            >
              <Send className="w-4 h-4" />
              <span>Salva & Invia WA</span>
            </button>

            {/* Salva standard */}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition cursor-pointer"
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
