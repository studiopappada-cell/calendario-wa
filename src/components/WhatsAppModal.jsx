import React, { useState, useEffect } from 'react'
import { MessageCircle, Copy, Check, ExternalLink, X, Send, Sparkles } from 'lucide-react'
import { getWhatsAppUrl, buildMessageText, DEFAULT_TEMPLATES, formatPhoneNumber } from '../utils/whatsapp'

export default function WhatsAppModal({ appointment, settings, isOpen, onClose, onUpdateStatus }) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('reminder')
  const [messageText, setMessageText] = useState('')
  const [copied, setCopied] = useState(false)
  const [phone, setPhone] = useState('')

  useEffect(() => {
    if (appointment) {
      setPhone(appointment.clientPhone || '')
      const activeTemplates = settings?.templates || DEFAULT_TEMPLATES
      const initialTemplate = activeTemplates[selectedTemplateKey] || DEFAULT_TEMPLATES.reminder
      const generated = buildMessageText(initialTemplate, appointment, settings)
      setMessageText(generated)
    }
  }, [appointment, selectedTemplateKey, settings])

  if (!isOpen || !appointment) return null

  const handleTemplateChange = (key) => {
    setSelectedTemplateKey(key)
    const activeTemplates = settings?.templates || DEFAULT_TEMPLATES
    const tpl = activeTemplates[key] || DEFAULT_TEMPLATES[key] || ''
    setMessageText(buildMessageText(tpl, appointment, settings))
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenWhatsApp = () => {
    const url = getWhatsAppUrl(phone, messageText, settings?.defaultPrefix || '+39')
    window.open(url, '_blank')

    // Se l'appuntamento era in attesa, possiamo opzionalmente segnarlo come promemoria inviato
    if (onUpdateStatus && appointment.status === 'pending') {
      onUpdateStatus(appointment.id, 'pending')
    }
  }

  const cleanFormattedPhone = formatPhoneNumber(phone, settings?.defaultPrefix || '+39')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header con gradiente WhatsApp */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Invia Promemoria WhatsApp</h2>
              <p className="text-xs text-emerald-100">
                A {appointment.clientName} ({phone ? `+${cleanFormattedPhone}` : 'Nessun numero inserito'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Info rapida appuntamento */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">{appointment.service}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span>📅 {appointment.date}</span>
              <span>•</span>
              <span>⏰ {appointment.time}</span>
            </div>
          </div>

          {/* Selezione Modello di Messaggio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Seleziona Tipo di Messaggio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateChange('reminder')}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                  selectedTemplateKey === 'reminder'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>🔔</span>
                <span className="truncate">Promemoria Data/Ora</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTemplateChange('confirmation')}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                  selectedTemplateKey === 'confirmation'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>✅</span>
                <span className="truncate">Richiesta Conferma</span>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateChange('thankyou')}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                  selectedTemplateKey === 'thankyou'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>❤️</span>
                <span className="truncate">Ringraziamento Post</span>
              </button>

              <button
                type="button"
                onClick={() => handleTemplateChange('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition flex items-center gap-2 ${
                  selectedTemplateKey === 'custom'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>✏️</span>
                <span className="truncate">Messaggio Libero</span>
              </button>
            </div>
          </div>

          {/* Modifica Telefono se necessario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Numero di Telefono Destinatario
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Es. 3471234567"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Verrà inviato a: <strong className="text-slate-700">+{cleanFormattedPhone || '(inserisci numero)'}</strong>
            </p>
          </div>

          {/* Testo del Messaggio Modificabile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Anteprima e Modifica Messaggio
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-medium transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia testo</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="w-full text-sm p-3.5 rounded-xl border border-slate-200 bg-emerald-50/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans resize-none text-slate-800"
                placeholder="Scrivi qui il messaggio per il cliente..."
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Il testo supporta la formattazione WhatsApp (*grassetto*, _corsivo_).
            </p>
          </div>
        </div>

        {/* Footer con Azioni */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={!phone}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Apri WhatsApp & Invia</span>
          </button>
        </div>
      </div>
    </div>
  )
}
