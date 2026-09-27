import React, { useState, useRef, useMemo } from 'react'
import {
  X,
  User,
  Phone,
  Plus,
  MessageCircle,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Upload,
  Smartphone,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Check,
  RefreshCw
} from 'lucide-react'
import { getWhatsAppUrl } from '../utils/whatsapp'
import { parseGoogleContactsCSV, parseVCard, pickNativeContacts } from '../utils/googleContactsParser'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

export default function ClientDirectoryModal({
  isOpen,
  onClose,
  clients = [],
  appointments = [],
  onSaveClient,
  onBatchImportClients,
  onDeleteClient,
  onNewAppointmentWithClient,
  onTriggerSync,
  isSyncing = false
}) {
  const [search, setSearch] = useState('')
  const [editingClient, setEditingClient] = useState(null)
  const [clientForm, setClientForm] = useState({ name: '', phone: '', notes: '' })
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [importNotification, setImportNotification] = useState(null)
  const [activeLetterIndicator, setActiveLetterIndicator] = useState(null)

  const fileInputRef = useRef(null)
  const listContainerRef = useRef(null)

  // Calcolo sicuro e ordinato dei clienti (null-safe per prevenire qualsiasi schermata bianca)
  const safeClients = useMemo(() => {
    if (!Array.isArray(clients)) return []
    return clients.filter((c) => c && typeof c === 'object')
  }, [clients])

  // Filtra e ordina alfabeticamente A-Z senza possibilità di eccezioni
  const sortedAndFiltered = useMemo(() => {
    const q = (search || '').toLowerCase().trim()
    return safeClients
      .filter((c) => {
        if (!q) return true
        const name = String(c.name || '').toLowerCase()
        const phone = String(c.phone || '')
        const notes = String(c.notes || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || notes.includes(q)
      })
      .sort((a, b) => {
        const nameA = String(a.name || '').trim()
        const nameB = String(b.name || '').trim()
        return nameA.localeCompare(nameB, 'it', { sensitivity: 'base' })
      })
  }, [safeClients, search])

  // Raggruppa i clienti per lettera iniziale
  const groupedClients = useMemo(() => {
    const groups = {}
    sortedAndFiltered.forEach((client) => {
      const rawName = String(client.name || '').trim()
      const firstChar = rawName ? rawName[0].toUpperCase() : '#'
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#'
      if (!groups[key]) groups[key] = []
      groups[key].push(client)
    })
    return groups
  }, [sortedAndFiltered])

  // Lettere che hanno almeno un contatto
  const existingLetters = useMemo(() => {
    return new Set(Object.keys(groupedClients))
  }, [groupedClients])

  if (!isOpen) return null

  // Scorrimento veloce alla lettera selezionata
  const scrollToLetter = (letter) => {
    setActiveLetterIndicator(letter)
    setTimeout(() => setActiveLetterIndicator(null), 1000)

    const targetEl = document.getElementById(`section-letter-${letter}`)
    if (targetEl && listContainerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!clientForm.name.trim()) return

    onSaveClient({
      id: editingClient ? editingClient.id : 'c_' + Date.now(),
      name: clientForm.name.trim(),
      phone: clientForm.phone.trim(),
      notes: clientForm.notes.trim()
    })

    setIsAddingNew(false)
    setEditingClient(null)
    setClientForm({ name: '', phone: '', notes: '' })
  }

  const startEdit = (c) => {
    setEditingClient(c)
    setClientForm({ name: c.name || '', phone: c.phone || '', notes: c.notes || '' })
    setIsAddingNew(true)
  }

  const getClientAppCount = (clientName) => {
    if (!clientName || !Array.isArray(appointments)) return 0
    const target = String(clientName).toLowerCase().trim()
    return appointments.filter(
      (a) => String(a.clientName || '').toLowerCase().trim() === target
    ).length
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (typeof text !== 'string') return

      let parsedContacts = []
      if (file.name.toLowerCase().endsWith('.vcf')) {
        parsedContacts = parseVCard(text)
      } else {
        parsedContacts = parseGoogleContactsCSV(text)
      }

      if (parsedContacts.length === 0) {
        setImportNotification({
          type: 'error',
          text: 'Nessun contatto valido trovato nel file caricato.'
        })
        return
      }

      if (onBatchImportClients) {
        const addedCount = onBatchImportClients(parsedContacts)
        setImportNotification({
          type: 'success',
          text: `✅ Importati con successo ${addedCount} contatti contemporaneamente in rubrica!`
        })
      } else {
        parsedContacts.forEach((imported) => onSaveClient(imported))
        setImportNotification({
          type: 'success',
          text: `Importati con successo ${parsedContacts.length} contatti!`
        })
      }
      setTimeout(() => setImportNotification(null), 6000)
    }

    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNativeContactPicker = async () => {
    const picked = await pickNativeContacts()
    if (picked && picked.length > 0) {
      if (onBatchImportClients) {
        const added = onBatchImportClients(picked)
        setImportNotification({
          type: 'success',
          text: `✅ Importati con successo ${added} contatti dal telefono in rubrica!`
        })
      } else {
        picked.forEach((c) => onSaveClient(c))
        setImportNotification({
          type: 'success',
          text: `Importati ${picked.length} contatti dal telefono!`
        })
      }
      setTimeout(() => setImportNotification(null), 6000)
    }
  }

  const isContactPickerSupported = typeof navigator !== 'undefined' && 'contacts' in navigator

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 flex flex-col h-[92vh] max-h-[720px] overflow-hidden">
        {/* Header Bianco Luminoso */}
        <div className="bg-white border-b border-slate-100 text-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Rubrica Clienti</h2>
              <p className="text-xs text-slate-500">
                {safeClients.length} {safeClients.length === 1 ? 'cliente salvato' : 'clienti salvati'} • Clicca per selezionare
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onTriggerSync && (
              <button
                type="button"
                onClick={onTriggerSync}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                title="Sincronizza contatti dal Cloud"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifica di importazione */}
        {importNotification && (
          <div
            className={`p-2.5 px-4 text-xs font-semibold flex items-center justify-between border-b shrink-0 ${
              importNotification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{importNotification.text}</span>
            <button type="button" onClick={() => setImportNotification(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Indicatore visivo della lettera durante lo scorrimento */}
        {activeLetterIndicator && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="w-20 h-20 bg-blue-600/95 text-white font-black text-4xl rounded-2xl flex items-center justify-center shadow-2xl animate-in zoom-in duration-100">
              {activeLetterIndicator}
            </div>
          </div>
        )}

        {/* Barra Azioni: Importa Google + Nuovo Cliente */}
        <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.vcf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Importa tutti i contatti contemporaneamente da un file esportato dallo smartphone o da Google Contatti (.vcf o .csv)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Importa File (.vcf / .csv)</span>
            </button>

            {isContactPickerSupported && (
              <button
                type="button"
                onClick={handleNativeContactPicker}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Seleziona contatti direttamente dalla rubrica dello smartphone (anche selezione multipla)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rubrica Telefono</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true)
              setEditingClient(null)
              setClientForm({ name: '', phone: '', notes: '' })
            }}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo Cliente</span>
          </button>
        </div>

        {/* Form Aggiunta/Modifica */}
        {isAddingNew && (
          <form onSubmit={handleSubmit} className="p-3.5 bg-blue-50/60 border-b border-blue-100 space-y-2.5 shrink-0">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              {editingClient ? 'Modifica Scheda Cliente' : 'Nuovo Cliente'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Nome e Cognome *"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Numero Telefono WhatsApp"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Note o preferenze sul cliente..."
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false)
                  setEditingClient(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                Salva Cliente
              </button>
            </div>
          </form>
        )}

        {/* Barra di ricerca */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cerca cliente per nome o telefono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* CONTENITORE PRINCIPALE: LISTA CONTATTI + LINEA DI SCORRIMENTO ALFABETICO */}
        <div className="flex-1 min-h-0 flex overflow-hidden relative bg-white">
          {/* 1. Lista Clienti con Scrollbar visibile e fluida */}
          <div
            ref={listContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9'
            }}
          >
            {sortedAndFiltered.length === 0 ? (
              <div className="text-center py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                  <User className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  {search ? 'Nessun cliente corrisponde alla ricerca' : 'Nessun cliente in rubrica'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  {search
                    ? 'Prova a cercare un nome o numero diverso.'
                    : 'I clienti salvati sul PC o inseriti negli appuntamenti compaiono qui. Puoi anche importarli da Google o aggiungerli ora.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(true)
                      setEditingClient(null)
                      setClientForm({ name: '', phone: '', notes: '' })
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    ➕ Aggiungi Nuovo Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    📥 Importa da Google
                  </button>
                </div>
              </div>
            ) : (
              Object.keys(groupedClients)
                .sort()
                .map((letter) => (
                  <div key={letter} id={`section-letter-${letter}`} className="space-y-1.5">
                    {/* Header Lettera Alfabetica Sticky */}
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs py-1 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {letter}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {groupedClients[letter].length}{' '}
                        {groupedClients[letter].length === 1 ? 'contatto' : 'contatti'}
                      </span>
                    </div>

                    {/* Schede Clienti */}
                    <div className="space-y-1.5 pt-0.5">
                      {groupedClients[letter].map((client) => {
                        const count = getClientAppCount(client.name)
                        return (
                          <div
                            key={client.id || client.name}
                            onClick={() => {
                              if (onNewAppointmentWithClient) {
                                onNewAppointmentWithClient(client)
                                onClose()
                              }
                            }}
                            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                                  {client.name || 'Senza Nome'}
                                </h4>
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                  Seleziona ➜
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                {client.phone && <span>📞 {client.phone}</span>}
                                {count > 0 && (
                                  <span className="text-[11px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                    {count} {count === 1 ? 'appuntamento' : 'appuntamenti'}
                                  </span>
                                )}
                              </p>

                              {client.notes && (
                                <p className="text-[11px] text-slate-400 mt-1 italic truncate">
                                  {client.notes}
                                </p>
                              )}
                            </div>

                            {/* Azioni Rapide */}
                            <div
                              className="flex items-center gap-1 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Chat WhatsApp diretta */}
                              {client.phone && (
                                <a
                                  href={getWhatsAppUrl(
                                    client.phone,
                                    `Gentile ${client.name || 'Cliente'}, le scriviamo per...`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="Invia messaggio WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}

                              {/* Modifica */}
                              <button
                                type="button"
                                onClick={() => startEdit(client)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Modifica cliente"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Elimina */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Eliminare ${client.name || 'questo cliente'} dalla rubrica?`)) {
                                    onDeleteClient(client.id)
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Elimina cliente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* 2. LA LINEA DI SCORRIMENTO ALFABETICA LATERALE (A-Z Fast Index Slider) */}
          <div
            className="w-7 sm:w-8 py-2 bg-slate-50 border-l border-slate-100 flex flex-col items-center justify-between select-none shrink-0"
            style={{ touchAction: 'none' }}
          >
            {ALPHABET.map((char) => {
              const hasContacts = existingLetters.has(char)
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => hasContacts && scrollToLetter(char)}
                  disabled={!hasContacts}
                  className={`w-5 h-3.5 sm:w-6 sm:h-4 text-[10px] sm:text-[11px] font-bold rounded-sm flex items-center justify-center transition ${
                    hasContacts
                      ? 'text-blue-600 hover:bg-blue-600 hover:text-white active:scale-125 cursor-pointer font-black'
                      : 'text-slate-300 opacity-40 cursor-default'
                  }`}
                  title={hasContacts ? `Vai alla lettera ${char}` : `Nessun contatto con ${char}`}
                >
                  {char}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {sortedAndFiltered.length} {sortedAndFiltered.length === 1 ? 'contatto' : 'contatti'} • Seleziona una lettera a destra per saltare
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
