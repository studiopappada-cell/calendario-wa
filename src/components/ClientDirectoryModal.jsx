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
  Check
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
  onDeleteClient,
  onNewAppointmentWithClient
}) {
  const [search, setSearch] = useState('')
  const [editingClient, setEditingClient] = useState(null)
  const [clientForm, setClientForm] = useState({ name: '', phone: '', notes: '' })
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [showGoogleGuide, setShowGoogleGuide] = useState(false)
  const [importNotification, setImportNotification] = useState(null)
  const [activeLetterIndicator, setActiveLetterIndicator] = useState(null)

  const fileInputRef = useRef(null)
  const listContainerRef = useRef(null)

  if (!isOpen) return null

  // Filtra e ordina alfabeticamente A-Z
  const sortedAndFiltered = useMemo(() => {
    return clients
      .filter((c) => {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }))
  }, [clients, search])

  // Raggruppa i clienti per lettera iniziale
  const groupedClients = useMemo(() => {
    const groups = {}
    sortedAndFiltered.forEach((client) => {
      const firstChar = (client.name[0] || '#').toUpperCase()
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

  // Scorrimento veloce alla lettera selezionata
  const scrollToLetter = (letter) => {
    setActiveLetterIndicator(letter)
    setTimeout(() => setActiveLetterIndicator(null), 1200)

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
    setClientForm({ name: c.name, phone: c.phone || '', notes: c.notes || '' })
    setIsAddingNew(true)
  }

  const getClientAppCount = (clientName) => {
    return appointments.filter(
      (a) => (a.clientName || '').toLowerCase() === clientName.toLowerCase()
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
      if (file.name.endsWith('.vcf')) {
        parsedContacts = parseVCard(text)
      } else {
        parsedContacts = parseGoogleContactsCSV(text)
      }

      if (parsedContacts.length === 0) {
        setImportNotification({
          type: 'error',
          text: 'Nessun contatto trovato nel file Google.'
        })
        return
      }

      let addedCount = 0
      parsedContacts.forEach((imported) => {
        const alreadyExists = clients.some(
          (c) =>
            c.name.toLowerCase() === imported.name.toLowerCase() ||
            (imported.phone && c.phone && c.phone === imported.phone)
        )
        if (!alreadyExists) {
          onSaveClient(imported)
          addedCount++
        }
      })

      setImportNotification({
        type: 'success',
        text: `Importati con successo ${addedCount} contatti da Google!`
      })
      setTimeout(() => setImportNotification(null), 5000)
    }

    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNativeContactPicker = async () => {
    const picked = await pickNativeContacts()
    if (picked && picked.length > 0) {
      let added = 0
      picked.forEach((c) => {
        onSaveClient(c)
        added++
      })
      setImportNotification({
        type: 'success',
        text: `Importati ${added} contatti dal telefono!`
      })
      setTimeout(() => setImportNotification(null), 5000)
    }
  }

  const isContactPickerSupported = typeof navigator !== 'undefined' && 'contacts' in navigator

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header Bianco Luminoso */}
        <div className="bg-white border-b border-slate-100 text-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Rubrica Clienti</h2>
              <p className="text-xs text-slate-500">
                {clients.length} contatti • Clicca su un cliente per selezionarlo
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

        {/* Notifica */}
        {importNotification && (
          <div
            className={`p-3 text-xs font-semibold flex items-center justify-between border-b ${
              importNotification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{importNotification.text}</span>
            <button onClick={() => setImportNotification(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Indicatore visivo grande della lettera durante lo scorrimento veloce */}
        {activeLetterIndicator && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
            <div className="w-20 h-20 bg-blue-600/90 text-white font-black text-4xl rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xs animate-in zoom-in duration-150">
              {activeLetterIndicator}
            </div>
          </div>
        )}

        {/* Barra Azioni: Importa Google + Nuovo Cliente */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Importa da Google Contacts"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Importa Google</span>
            </button>

            {isContactPickerSupported && (
              <button
                type="button"
                onClick={handleNativeContactPicker}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Seleziona dalla rubrica del telefono"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rubrica Telefono</span>
              </button>
            )}
          </div>

          <button
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
          <form onSubmit={handleSubmit} className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
            <h3 className="text-xs font-bold text-blue-900 uppercase">
              {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Nome e Cognome *"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Telefono WhatsApp"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Note sul cliente (es. preferenze orari)..."
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false)
                  setEditingClient(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                Salva
              </button>
            </div>
          </form>
        )}

        {/* Barra di ricerca */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cerca cliente per nome o numero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* CONTENITORE PRINCIPALE: LISTA CONTATTI + LINEA DI SCORRIMENTO ALFABETICO */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 1. Lista Clienti con Scrollbar visibile */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-scroll p-4 space-y-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9'
            }}
          >
            {sortedAndFiltered.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Nessun cliente trovato. Usa <strong>"Importa Google"</strong> per caricare la tua rubrica!
              </div>
            ) : (
              Object.keys(groupedClients)
                .sort()
                .map((letter) => (
                  <div key={letter} id={`section-letter-${letter}`} className="space-y-1.5">
                    {/* Header Lettera Alfabetica Sticky */}
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs py-1 border-b border-slate-200/80 flex items-center justify-between">
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
                            key={client.id}
                            onClick={() => {
                              onNewAppointmentWithClient(client)
                              onClose()
                            }}
                            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 bg-white transition flex items-center justify-between gap-2 group cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                                  {client.name}
                                </h4>
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                                  Seleziona ➜
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
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
                                    `Gentile ${client.name}, le scriviamo per...`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="Invia WhatsApp"
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
                                  if (confirm(`Eliminare ${client.name} dalla rubrica?`)) {
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
            className="w-7 sm:w-8 py-2 bg-slate-50/80 border-l border-slate-100 flex flex-col items-center justify-between select-none shrink-0"
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
                  className={`w-5 h-4 sm:w-6 sm:h-4 text-[10px] sm:text-[11px] font-bold rounded-sm flex items-center justify-center transition cursor-pointer ${
                    hasContacts
                      ? 'text-blue-600 hover:bg-blue-600 hover:text-white active:scale-125'
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
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {sortedAndFiltered.length} contatti • Tocca una lettera a destra per saltare
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
