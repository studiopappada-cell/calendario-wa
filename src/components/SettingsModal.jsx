import React, { useState } from 'react'
import {
  X,
  Settings,
  Smartphone,
  Cloud,
  Download,
  Upload,
  MessageCircle,
  Building,
  RefreshCw,
  Check,
  Share2,
  Copy,
  Bell,
  Volume2
} from 'lucide-react'
import { exportDataAsJSON, importDataFromJSON, loadOwnerPhone, saveOwnerPhone } from '../utils/storage'
import { generateRoomCode } from '../utils/cloudSync'
import { triggerTestAlert } from '../utils/notifications'
import { buildTestAlertWhatsAppLink } from '../utils/whatsapp'

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTriggerSync,
  isSyncing
}) {
  const [formData, setFormData] = useState({ ...settings })
  const [activeTab, setActiveTab] = useState('templates') // templates, general, sync, backup, mobile
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false)
  const [importStatus, setImportStatus] = useState(null)
  const [testAlertResult, setTestAlertResult] = useState(null)
  const [isTestingAlert, setIsTestingAlert] = useState(false)

  const handleTestAlert = async () => {
    setIsTestingAlert(true)
    setTestAlertResult(null)
    try {
      const res = await triggerTestAlert()
      setTestAlertResult(res)
    } catch (e) {
      setTestAlertResult({ success: false, message: 'Errore durante l\'invio del test.' })
    } finally {
      setIsTestingAlert(false)
    }
  }

  if (!isOpen) return null

  const handleTemplateChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [key]: value
      }
    }))
  }

  const [ownerPhone, setOwnerPhone] = useState(() => loadOwnerPhone() || settings.ownerPhone || '')

  const handleOwnerPhoneChange = (val) => {
    setOwnerPhone(val)
    saveOwnerPhone(val)
    setFormData((prev) => ({ ...prev, ownerPhone: val }))
  }

  const handleTestOwnerWhatsApp = () => {
    const clean = ownerPhone.trim()
    if (!clean) {
      setTestAlertResult({
        success: false,
        message: 'Inserisci prima il tuo numero di cellulare per provare l\'alert su WhatsApp!'
      })
      return
    }
    const url = buildTestAlertWhatsAppLink(clean)
    window.open(url, '_blank')
  }

  const handleSave = () => {
    saveOwnerPhone(ownerPhone)
    onSaveSettings({ ...formData, ownerPhone })
    onClose()
  }

  const handleGenerateRoomCode = () => {
    const newCode = generateRoomCode()
    setFormData((prev) => ({
      ...prev,
      cloudSync: {
        ...prev.cloudSync,
        syncCode: newCode,
        enabled: true
      }
    }))
  }

  const copySyncLink = () => {
    const code = formData.cloudSync?.syncCode
    if (!code) return
    const currentUrl = window.location.origin + window.location.pathname + `?room=${code}`
    navigator.clipboard.writeText(currentUrl)
    setCopyCodeSuccess(true)
    setTimeout(() => setCopyCodeSuccess(false), 2500)
  }

  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const res = importDataFromJSON(event.target.result)
      if (res.success) {
        setImportStatus({ type: 'success', message: 'Dati ripristinati! Ricarica la pagina per vederli.' })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setImportStatus({ type: 'error', message: res.message })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header Bianco Luminoso */}
        <div className="bg-white border-b border-slate-100 text-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Impostazioni & Sincronizzazione</h2>
              <p className="text-xs text-slate-500">Personalizza WhatsApp, dispositivi e dati</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'templates', label: 'Modelli WhatsApp', icon: MessageCircle },
            { id: 'sync', label: 'PC & Smartphone Sync', icon: Cloud },
            { id: 'general', label: 'Studio & Prefisso', icon: Building },
            { id: 'mobile', label: 'Notifiche & Telefono', icon: Bell },
            { id: 'backup', label: 'Backup Dati', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenuto Tab */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Modelli WhatsApp */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <strong>💡 Segnaposto automatici utilizzabili:</strong>
                <div className="mt-1 flex flex-wrap gap-1">
                  {['{nome}', '{data}', '{ora}', '{servizio}', '{durata}', '{prezzo}', '{azienda}', '{indirizzo}'].map((tag) => (
                    <span key={tag} className="bg-emerald-200/60 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Modello Promemoria Appuntamento
                </label>
                <textarea
                  rows={3}
                  value={formData.templates?.reminder || ''}
                  onChange={(e) => handleTemplateChange('reminder', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Modello Richiesta Conferma
                </label>
                <textarea
                  rows={3}
                  value={formData.templates?.confirmation || ''}
                  onChange={(e) => handleTemplateChange('confirmation', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Modello Ringraziamento Post-Appuntamento
                </label>
                <textarea
                  rows={3}
                  value={formData.templates?.thankyou || ''}
                  onChange={(e) => handleTemplateChange('thankyou', e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Sync PC & Telefono */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-xs text-blue-900 space-y-1">
                <h4 className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Cloud className="w-4 h-4 text-blue-600" /> Sincronizzazione su Qualsiasi PC e Telefono
                </h4>
                <p>
                  Inserisci lo <strong>stesso codice stanza</strong> su tutti i tuoi dispositivi (PC ufficio, PC portatile, smartphone) per vedere e aggiornare gli stessi appuntamenti in tempo reale!
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Codice Stanza Cloud Condiviso
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Es. CAL-9824A"
                      value={formData.cloudSync?.syncCode || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cloudSync: { ...prev.cloudSync, syncCode: e.target.value.toUpperCase().trim() }
                        }))
                      }
                      className="flex-1 text-sm font-mono font-bold tracking-wider px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateRoomCode}
                      className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                    >
                      Genera Nuovo
                    </button>
                  </div>
                </div>

                {formData.cloudSync?.syncCode && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Condividi con il tuo Smartphone:
                    </span>
                    <button
                      type="button"
                      onClick={copySyncLink}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-xs font-semibold text-slate-800 transition"
                    >
                      {copyCodeSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Link Sincronizzazione Copiato! Invialo su WhatsApp a te stesso</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-blue-600" />
                          <span>Copia Link Rapido per Telefono</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onTriggerSync(formData.cloudSync?.syncCode)}
                    disabled={!formData.cloudSync?.syncCode || isSyncing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza Adesso con il Cloud'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Dati Studio */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Studio / Attività (appare nei messaggi)
                </label>
                <input
                  type="text"
                  placeholder="Es. Studio Dott. Rossi o Salone Bellezza"
                  value={formData.businessName || ''}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Indirizzo Studio (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="Es. Via Roma 15, Milano"
                  value={formData.businessAddress || ''}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prefisso Internazionale Predefinito
                </label>
                <input
                  type="text"
                  placeholder="+39"
                  value={formData.defaultPrefix || '+39'}
                  onChange={(e) => setFormData({ ...formData, defaultPrefix: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Guida Smartphone PWA */}
          {activeTab === 'mobile' && (
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-600" /> Come installare l'app sul tuo Smartphone
                </h4>
                <p className="mb-2">
                  Questa applicazione è una <strong>PWA (Progressive Web App)</strong>: puoi aggiungerla alla schermata principale del telefono e usarla esattamente come un'app nativa a schermo intero!
                </p>

                <div className="space-y-2 mt-3">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <strong className="text-blue-700 block mb-0.5">📱 Su iPhone / iPad (Safari):</strong>
                    <span>Tocca l'icona di condivisione in basso (quadrato con freccia verso l'alto ⎋) e scegli <strong>"Aggiungi a schermata Home"</strong>.</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <strong className="text-emerald-700 block mb-0.5">🤖 Su Android (Chrome):</strong>
                    <span>Tocca i tre puntini in alto a destra e seleziona <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong>.</span>
                  </div>
                </div>

                {/* Box Configurazione Numero Cellulare Alert WhatsApp */}
                <div className="mt-4 p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Il tuo Numero di Cellulare Personale</h4>
                      <p className="text-[11px] text-emerald-800">
                        Inserisci il tuo numero per ricevere gli alert promemoria sul tuo WhatsApp
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="Es. 3471234567"
                      value={ownerPhone}
                      onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                    />

                    <button
                      type="button"
                      onClick={handleTestOwnerWhatsApp}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Test WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Box Test Alert Smartphone */}
                <div className="mt-4 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">Test Notifiche & Promemoria Cellulare</h4>
                        <p className="text-[11px] text-amber-800">
                          Verifica subito se il tuo telefono riceve la notifica con suono e vibrazione
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAlert}
                      disabled={isTestingAlert}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isTestingAlert ? 'Invio test...' : '🧪 Prova Alert Ora'}</span>
                    </button>
                  </div>

                  {testAlertResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                        testAlertResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span className="text-sm shrink-0">{testAlertResult.success ? '✅' : '⚠️'}</span>
                      <span className="flex-1">{testAlertResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Backup Dati */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase">Esporta Backup Completo</h4>
                <p className="text-xs text-slate-500">
                  Salva tutti gli appuntamenti, la rubrica e le impostazioni in un file .json sul tuo computer.
                </p>
                <button
                  type="button"
                  onClick={exportDataAsJSON}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica Backup (.json)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase">Ripristina da Backup</h4>
                <p className="text-xs text-slate-500">
                  Carica un file .json precedentemente esportato.
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Seleziona File di Backup</span>
                  <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                </label>

                {importStatus && (
                  <p className={`text-xs mt-2 font-medium ${importStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {importStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs px-5 py-2.5 font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
          >
            Salva Modifiche
          </button>
        </div>
      </div>
    </div>
  )
}
