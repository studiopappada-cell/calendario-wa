import React, { useState } from 'react'
import { X, User, Phone, Plus, MessageCircle, Search, Trash2, Edit2, Calendar } from 'lucide-react'
import { getWhatsAppUrl } from '../utils/whatsapp'

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

  if (!isOpen) return null

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  )

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Rubrica Clienti</h2>
              <p className="text-xs text-slate-400">
                {clients.length} clienti salvati per autocompletamento rapido
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

        {/* Form Aggiunta / Modifica Cliente */}
        {isAddingNew ? (
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
                className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
              >
                Salva
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cerca cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              <span>Aggiungi</span>
            </button>
          </div>
        )}

        {/* Lista Clienti */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nessun cliente trovato.
            </div>
          ) : (
            filtered.map((client) => {
              const count = getClientAppCount(client.name)
              return (
                <div
                  key={client.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition flex items-center justify-between gap-2 group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{client.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {client.phone && <span>📞 {client.phone}</span>}
                      <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {count} {count === 1 ? 'appuntamento' : 'appuntamenti'}
                      </span>
                    </p>
                    {client.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">
                        {client.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Tasto rapido fissa appuntamento */}
                    <button
                      type="button"
                      onClick={() => {
                        onNewAppointmentWithClient(client)
                        onClose()
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Fissa nuovo appuntamento con questo cliente"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>

                    {/* Chat WhatsApp diretta */}
                    {client.phone && (
                      <a
                        href={getWhatsAppUrl(client.phone, `Gentile ${client.name}, le scriviamo per...`)}
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
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
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
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
