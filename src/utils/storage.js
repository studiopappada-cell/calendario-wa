/**
 * Utility per la persistenza dei dati e sincronizzazione
 */

const STORAGE_KEY_APPOINTMENTS = 'wa_calendar_appointments_v1'
const STORAGE_KEY_SETTINGS = 'wa_calendar_settings_v1'
const STORAGE_KEY_CLIENTS = 'wa_calendar_clients_v1'

// Dati iniziali di esempio se il calendario è vuoto
export const INITIAL_APPOINTMENTS = [
  {
    id: 'demo-1',
    clientName: 'Marco Rossi',
    clientPhone: '3471234567',
    service: 'Consulenza Strategica',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 60,
    status: 'confirmed',
    price: 80,
    notes: 'Primo incontro di presentazione progetto.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-2',
    clientName: 'Laura Bianchi',
    clientPhone: '3389876543',
    service: 'Trattamento / Servizio',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '15:30',
    duration: 45,
    status: 'pending',
    price: 50,
    notes: 'Richiesta conferma via WhatsApp.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-3',
    clientName: 'Giuseppe Verdi',
    clientPhone: '3201122334',
    service: 'Revisione Documenti',
    date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    time: '11:00',
    duration: 30,
    status: 'confirmed',
    price: 40,
    notes: 'Portare copia della documentazione cartacea.',
    createdAt: new Date().toISOString()
  }
]

export const INITIAL_SETTINGS = {
  businessName: 'Il Mio Studio',
  businessPhone: '',
  businessAddress: 'Via Roma, 1',
  defaultPrefix: '+39',
  defaultDuration: 60,
  templates: {
    reminder: `Gentile {nome}, Le ricordiamo il Suo appuntamento per *{servizio}* fissato per il giorno *{data}* alle ore *{ora}* presso {azienda}. Per qualsiasi necessità o variazione La preghiamo di avvisarci. Buona giornata!`,
    confirmation: `Gentile {nome}, Le chiediamo gentile conferma per il Suo appuntamento di *{servizio}* fissato per il giorno *{data}* alle ore *{ora}*. Può confermare semplicemente rispondendo a questo messaggio. A presto!`,
    thankyou: `Gentile {nome}, grazie per essere stato da noi oggi per *{servizio}*. Speriamo che l'esperienza sia stata di Suo gradimento. Buona continuazione!`,
    custom: `Gentile {nome}, Le scriviamo in merito all'appuntamento del {data} alle {ora} ({servizio}). Cordiali saluti.`
  },
  cloudSync: {
    enabled: false,
    syncCode: '', // Codice univoco per sincronizzare più PC e smartphone
    lastSync: null
  }
}

// Carica appuntamenti da LocalStorage
export function loadAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPOINTMENTS)
    if (!raw) return INITIAL_APPOINTMENTS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : INITIAL_APPOINTMENTS
  } catch (e) {
    console.error('Errore durante il caricamento degli appuntamenti:', e)
    return INITIAL_APPOINTMENTS
  }
}

// Salva appuntamenti in LocalStorage
export function saveAppointments(appointments) {
  try {
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(appointments))
  } catch (e) {
    console.error('Errore durante il salvataggio degli appuntamenti:', e)
  }
}

// Carica impostazioni
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS)
    if (!raw) return INITIAL_SETTINGS
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) }
  } catch (e) {
    return INITIAL_SETTINGS
  }
}

// Salva impostazioni
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
  } catch (e) {
    console.error('Errore salvataggio impostazioni:', e)
  }
}

// Carica rubrica clienti
export function loadClients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLIENTS)
    if (!raw) {
      // Estrae clienti iniziali dagli appuntamenti demo
      return [
        { id: 'c1', name: 'Marco Rossi', phone: '3471234567', notes: 'Cliente abituale' },
        { id: 'c2', name: 'Laura Bianchi', phone: '3389876543', notes: 'Preferisce il pomeriggio' },
        { id: 'c3', name: 'Giuseppe Verdi', phone: '3201122334', notes: '' }
      ]
    }
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

// Salva rubrica clienti
export function saveClients(clients) {
  try {
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients))
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

// Genera link Google Calendar diretto
export function getGoogleCalendarLink(appointment, businessName = '') {
  const [year, month, day] = appointment.date.split('-')
  const [hour, minute] = appointment.time.split(':')
  const start = new Date(year, month - 1, day, hour, minute)
  const end = new Date(start.getTime() + (appointment.duration || 60) * 60000)

  const formatGCal = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')

  const title = encodeURIComponent(`${appointment.service} - ${appointment.clientName}`)
  const details = encodeURIComponent(`Cliente: ${appointment.clientName}\nTelefono: ${appointment.clientPhone}\nNote: ${appointment.notes || 'Nessuna'}`)
  const location = encodeURIComponent(businessName)
  const dates = `${formatGCal(start)}/${formatGCal(end)}`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
}
