/**
 * Utility per la persistenza dei dati e sincronizzazione
 * Include doppio salvataggio automatico (LocalStorage + IndexedDB)
 */

const STORAGE_KEY_APPOINTMENTS = 'wa_calendar_appointments_v1'
const STORAGE_KEY_SETTINGS = 'wa_calendar_settings_v1'
const STORAGE_KEY_CLIENTS = 'wa_calendar_clients_v1'
const STORAGE_KEY_DELETED_APPS = 'wa_calendar_deleted_apps_v1'
const STORAGE_KEY_DELETED_CLIENTS = 'wa_calendar_deleted_clients_v1'
const STORAGE_KEY_SERVICES = 'wa_calendar_services_v1'

export const DEFAULT_ROOM_CODE = 'CAL-SEPUB'

const IDB_NAME = 'wa_calendar_backup_db'
const IDB_STORE = 'kv_store'

function openBackupDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null)
      return
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}

async function idbSet(key, value) {
  try {
    const db = await openBackupDB()
    if (!db) return
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
  } catch (e) {}
}

async function idbGet(key) {
  try {
    const db = await openBackupDB()
    if (!db) return null
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

/**
 * Ripristina automaticamente da IndexedDB se il LocalStorage è stato svuotato dal browser
 */
export async function restoreFromIndexedDBIfNeeded() {
  try {
    const restored = {}
    const rawApps = localStorage.getItem(STORAGE_KEY_APPOINTMENTS)
    if (!rawApps || rawApps === '[]') {
      const idbApps = await idbGet(STORAGE_KEY_APPOINTMENTS)
      if (Array.isArray(idbApps) && idbApps.length > 0) {
        localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(idbApps))
        restored.appointments = idbApps
      }
    }
    const rawClients = localStorage.getItem(STORAGE_KEY_CLIENTS)
    if (!rawClients || rawClients === '[]') {
      const idbClients = await idbGet(STORAGE_KEY_CLIENTS)
      if (Array.isArray(idbClients) && idbClients.length > 0) {
        localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(idbClients))
        restored.clients = idbClients
      }
    }
    const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
    if (!rawSettings) {
      const idbSettings = await idbGet(STORAGE_KEY_SETTINGS)
      if (idbSettings && typeof idbSettings === 'object') {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(idbSettings))
        restored.settings = idbSettings
      }
    }
    return restored
  } catch (e) {
    return {}
  }
}

export const DEFAULT_SERVICES = [
  'Consulenza Legale',
  'Consulenza Fiscale',
  'Appuntamento in Studio',
  'Udienza / Tribunale',
  'Firma Documenti',
  'Dichiarazione Redditi',
  'Ricorso / Pratica',
  'Riunione',
  'Appuntamento Generale'
]

export function toLocalDateString(d = new Date()) {
  if (!d) return ''
  if (typeof d === 'string') {
    const match = d.match(/^\d{4}-\d{2}-\d{2}/)
    if (match) return match[0]
  }
  const dateObj = d instanceof Date ? d : new Date(d)
  if (isNaN(dateObj.getTime())) return ''
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const INITIAL_APPOINTMENTS = []

export const INITIAL_SETTINGS = {
  businessName: 'Studio Legale Pappadà',
  businessPhone: '',
  businessAddress: '',
  defaultPrefix: '+39',
  defaultDuration: 60,
  ownerPhone: '', // Numero di cellulare a cui inviare gli alert promemoria
  services: DEFAULT_SERVICES,
  templates: {
    reminder: `Gentile {nome}, Le ricordiamo il Suo appuntamento per *{servizio}* fissato per il giorno *{data}* alle ore *{ora}* presso {azienda}. Per qualsiasi necessità o variazione La preghiamo di avvisarci. Buona giornata!`,
    confirmation: `Gentile {nome}, Le chiediamo gentile conferma per il Suo appuntamento di *{servizio}* fissato per il giorno *{data}* alle ore *{ora}*. Può confermare semplicemente rispondendo a questo messaggio. A presto!`,
    thankyou: `Gentile {nome}, grazie per essere stato da noi oggi per *{servizio}*. Speriamo che l'esperienza sia stata di Suo gradimento. Buona continuazione!`,
    custom: `Gentile {nome}, Le scriviamo in merito all'appuntamento del {data} alle {ora} ({servizio}). Cordiali saluti.`
  },
  cloudSync: {
    enabled: true,
    syncCode: DEFAULT_ROOM_CODE,
    lastSync: null
  }
}

/**
 * Legge il codice stanza dall'URL (?room=...) se presente, altrimenti dalle impostazioni salvate
 */
export function getActiveRoomCode() {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlRoom = params.get('room')
      if (urlRoom && urlRoom.trim().length >= 3) {
        const cleanRoom = urlRoom.trim().toUpperCase()
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
        const parsed = raw ? JSON.parse(raw) : { ...INITIAL_SETTINGS }
        parsed.cloudSync = {
          ...(parsed.cloudSync || {}),
          enabled: true,
          syncCode: cleanRoom
        }
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(parsed))
        return cleanRoom
      }
    }
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.cloudSync?.syncCode && parsed.cloudSync.syncCode.trim()) {
        return parsed.cloudSync.syncCode.trim().toUpperCase()
      }
    }
    return DEFAULT_ROOM_CODE
  } catch (e) {
    return DEFAULT_ROOM_CODE
  }
}

// Recupera l'elenco dei servizi personalizzati o predefiniti
export function loadServices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SERVICES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((s) => typeof s === 'string' && s.trim().length > 0 && !s.toLowerCase().includes('taglio'))
      }
    }
    const settingsRaw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    if (settingsRaw) {
      const parsedSettings = JSON.parse(settingsRaw)
      if (Array.isArray(parsedSettings?.services) && parsedSettings.services.length > 0) {
        return parsedSettings.services.filter((s) => typeof s === 'string' && s.trim().length > 0 && !s.toLowerCase().includes('taglio'))
      }
    }
    return DEFAULT_SERVICES
  } catch (e) {
    return DEFAULT_SERVICES
  }
}

// Salva l'elenco dei servizi
export function saveServices(services) {
  try {
    const safe = Array.isArray(services)
      ? services.map((s) => String(s || '').trim()).filter((s) => s.length > 0 && !s.toLowerCase().includes('taglio'))
      : DEFAULT_SERVICES
    const finalServices = safe.length > 0 ? safe : DEFAULT_SERVICES
    localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(finalServices))
    idbSet(STORAGE_KEY_SERVICES, finalServices)
    try {
      const settingsRaw = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw)
        parsed.services = finalServices
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(parsed))
        idbSet(STORAGE_KEY_SETTINGS, parsed)
      }
    } catch (err) {}
    return finalServices
  } catch (e) {
    console.error('Errore salvataggio servizi:', e)
    return DEFAULT_SERVICES
  }
}

// Recupera il numero di cellulare per ricevere gli alert
export function loadOwnerPhone() {
  try {
    return localStorage.getItem('wa_owner_phone') || ''
  } catch (e) {
    return ''
  }
}

// Salva il numero di cellulare per ricevere gli alert
export function saveOwnerPhone(phone) {
  try {
    localStorage.setItem('wa_owner_phone', String(phone || '').trim())
  } catch (e) {}
}

// Recupera l'elenco degli ID appuntamenti eliminati
export function loadDeletedAppIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_APPS)
    if (!raw) return ['demo-1']
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? Array.from(new Set(['demo-1', ...parsed])) : ['demo-1']
  } catch (e) {
    return ['demo-1']
  }
}

// Salva l'elenco degli ID appuntamenti eliminati
export function saveDeletedAppIds(ids) {
  try {
    const safeList = Array.isArray(ids) ? Array.from(new Set(['demo-1', ...ids])).slice(-300) : ['demo-1']
    localStorage.setItem(STORAGE_KEY_DELETED_APPS, JSON.stringify(safeList))
    idbSet(STORAGE_KEY_DELETED_APPS, safeList)
  } catch (e) {}
}

// Recupera l'elenco degli ID clienti eliminati
export function loadDeletedClientIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_CLIENTS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// Salva l'elenco degli ID clienti eliminati
export function saveDeletedClientIds(ids) {
  try {
    const safeList = Array.isArray(ids) ? ids.slice(-300) : []
    localStorage.setItem(STORAGE_KEY_DELETED_CLIENTS, JSON.stringify(safeList))
    idbSet(STORAGE_KEY_DELETED_CLIENTS, safeList)
  } catch (e) {}
}

// Carica appuntamenti da LocalStorage (escludendo gli ID cancellati)
export function loadAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPOINTMENTS)
    const deleted = new Set(loadDeletedAppIds())
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((a) => a && a.id && !deleted.has(a.id))
  } catch (e) {
    console.error('Errore durante il caricamento degli appuntamenti:', e)
    return []
  }
}

// Salva appuntamenti in LocalStorage + IndexedDB
export function saveAppointments(appointments) {
  try {
    const safe = Array.isArray(appointments) ? appointments.filter((a) => a && a.id && a.id !== 'demo-1') : []
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(safe))
    idbSet(STORAGE_KEY_APPOINTMENTS, safe)
  } catch (e) {
    console.error('Errore durante il salvataggio degli appuntamenti:', e)
  }
}

// Carica impostazioni (preservando sempre il codice stanza attivo)
export function loadSettings() {
  try {
    const activeRoom = getActiveRoomCode()
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    const currentServices = loadServices()
    const base = {
      ...INITIAL_SETTINGS,
      services: currentServices,
      cloudSync: {
        enabled: true,
        syncCode: activeRoom,
        lastSync: null
      }
    }
    if (!raw) return base
    const parsed = JSON.parse(raw)
    const validServices = Array.isArray(parsed?.services) && parsed.services.length > 0
      ? parsed.services.filter((s) => typeof s === 'string' && s.trim().length > 0 && !s.toLowerCase().includes('taglio'))
      : currentServices
    const syncCode = (parsed?.cloudSync?.syncCode && parsed.cloudSync.syncCode.trim())
      ? parsed.cloudSync.syncCode.trim().toUpperCase()
      : activeRoom
    return {
      ...base,
      ...parsed,
      services: validServices,
      cloudSync: {
        ...(parsed?.cloudSync || {}),
        enabled: true,
        syncCode
      }
    }
  } catch (e) {
    return { ...INITIAL_SETTINGS, services: loadServices() }
  }
}

// Salva impostazioni (non cancella mai il codice stanza esistente con una stringa vuota)
export function saveSettings(settings) {
  try {
    if (!settings || typeof settings !== 'object') return
    const existingRaw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    let existingCode = DEFAULT_ROOM_CODE
    if (existingRaw) {
      try {
        const existingParsed = JSON.parse(existingRaw)
        if (existingParsed?.cloudSync?.syncCode?.trim()) {
          existingCode = existingParsed.cloudSync.syncCode.trim().toUpperCase()
        }
      } catch (err) {}
    }
    const incomingCode = settings?.cloudSync?.syncCode?.trim()
      ? settings.cloudSync.syncCode.trim().toUpperCase()
      : existingCode

    const finalSettings = {
      ...settings,
      cloudSync: {
        ...(settings.cloudSync || {}),
        enabled: true,
        syncCode: incomingCode
      }
    }
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(finalSettings))
    idbSet(STORAGE_KEY_SETTINGS, finalSettings)
  } catch (e) {
    console.error('Errore salvataggio impostazioni:', e)
  }
}

// Carica rubrica clienti
export function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLIENTS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const deleted = new Set(loadDeletedClientIds())
    return Array.isArray(parsed) ? parsed.filter((c) => c && c.id && !deleted.has(c.id)) : []
  } catch (e) {
    return []
  }
}

// Salva rubrica clienti
export function saveClients(clients) {
  try {
    const safe = Array.isArray(clients) ? clients.filter((c) => c && c.id) : []
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(safe))
    idbSet(STORAGE_KEY_CLIENTS, safe)
  } catch (e) {
    console.error('Errore salvataggio clienti:', e)
  }
}

// Esporta dati completi in JSON
export function exportDataAsJSON() {
  const data = {
    appointments: loadAppointments(),
    settings: loadSettings(),
    clients: loadClients(),
    services: loadServices(),
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_calendario_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Importa dati da JSON
export function importDataFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    if (data.appointments && Array.isArray(data.appointments)) {
      saveAppointments(data.appointments)
    }
    if (data.settings) {
      saveSettings(data.settings)
    }
    if (data.clients && Array.isArray(data.clients)) {
      saveClients(data.clients)
    }
    if (data.services && Array.isArray(data.services)) {
      saveServices(data.services)
    } else if (data.settings?.services && Array.isArray(data.settings.services)) {
      saveServices(data.settings.services)
    }
    return { success: true, message: 'Dati importati con successo!' }
  } catch (e) {
    return { success: false, message: 'File di backup non valido o danneggiato.' }
  }
}

// Genera e scarica file .ICS per Google/Apple/Outlook Calendar
export function downloadICalendar(appointment, businessName = '') {
  if (!appointment) return

  const [year, month, day] = appointment.date.split('-')
  const [hour, minute] = appointment.time.split(':')
  
  const startDate = new Date(year, month - 1, day, hour, minute)
  const durationMinutes = appointment.duration || 60
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

  const formatICSDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const alarmDaysMap = { '1d': 'P1D', '3d': 'P3D', '5d': 'P5D', '7d': 'P7D', '10d': 'P10D' }
  const triggerDuration = alarmDaysMap[appointment.reminderAlert]

  const alarmBlock = triggerDuration
    ? [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Promemoria Appuntamento: ${appointment.clientName} (${appointment.service})`,
        `TRIGGER:-${triggerDuration}`,
        'END:VALARM'
      ]
    : []

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendario WhatsApp//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@calendariowa.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${appointment.service} - ${appointment.clientName}`,
    `DESCRIPTION:Cliente: ${appointment.clientName}\\nTel: ${appointment.clientPhone}\\nNote: ${appointment.notes || 'Nessuna'}`,
    `LOCATION:${businessName}`,
    'STATUS:CONFIRMED',
    ...alarmBlock,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `appuntamento_${appointment.clientName.replace(/\s+/g, '_')}_${appointment.date}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// Genera link Google Calendar diretto con orario locale esatto italiano
export function getGoogleCalendarLink(appointment, businessName = '') {
  if (!appointment) return '#'
  const [year, month, day] = (appointment.date || '2026-01-01').split('-')
  const [hour, minute] = (appointment.time || '10:00').split(':')
  const start = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const end = new Date(start.getTime() + (Number(appointment.duration) || 60) * 60000)

  const pad = (n) => String(n).padStart(2, '0')
  const formatGCalLocal = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

  const title = encodeURIComponent(`${appointment.service || 'Consulenza'} - ${appointment.clientName || 'Cliente'}`)
  const details = encodeURIComponent(
    `🔔 SVEGLIA APPUNTAMENTO\nCliente: ${appointment.clientName || ''}\nTelefono: ${appointment.clientPhone || ''}\nServizio: ${appointment.service || ''}\nNote: ${appointment.notes || 'Nessuna'}`
  )
  const location = encodeURIComponent(businessName || 'Studio')
  const dates = `${formatGCalLocal(start)}/${formatGCalLocal(end)}`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&ctz=Europe/Rome`
}
