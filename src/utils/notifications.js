/**
 * Utility per la gestione degli Alert / Notifiche Promemoria per lo smartphone
 */

export const ALERT_OPTIONS = [
  { id: 'none', label: 'Nessun avviso', days: -1 },
  { id: 'today', label: 'Il giorno stesso (Oggi)', days: 0 },
  { id: '1d', label: '1 Giorno prima', days: 1 },
  { id: '3d', label: '3 Giorni prima', days: 3 },
  { id: '5d', label: '5 Giorni prima', days: 5 },
  { id: '7d', label: '1 Settimana prima (7 gg)', days: 7 },
  { id: '10d', label: '10 Giorni prima', days: 10 }
]

// Ottiene la data locale odierna in formato YYYY-MM-DD
export function getLocalTodayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Contesto Audio riutilizzabile e sbloccabile
let sharedAudioContext = null

// Sblocca il sistema audio al primo tocco dell'utente sullo schermo
export function initAudioUnlock() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx && !sharedAudioContext) {
        sharedAudioContext = new AudioCtx()
      }
      if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume()
      }
    } catch (e) {
      console.warn('Inizializzazione audio:', e)
    }
  }

  window.addEventListener('touchstart', unlock, { once: true, passive: true })
  window.addEventListener('click', unlock, { once: true, passive: true })
}

// Riproduce un suono acustico squillante e gradevole di notifica campanella
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioCtx()
    }

    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }

    const ctx = sharedAudioContext
    const now = ctx.currentTime

    // Primo tono (Mi 659 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.35, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Secondo tono brillante (La 880 Hz) dopo 120ms
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.12)
    gain2.gain.setValueAtTime(0.4, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.6)
  } catch (e) {
    console.warn('Errore esecuzione suono notifica:', e)
  }
}

// Richiede il permesso per le notifiche native dello smartphone / browser
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (e) {
    console.warn('Errore richiesta permessi notifiche:', e)
    return 'denied'
  }
}

// Invia una notifica nativa sul cellulare con suono e vibrazione (100% sicura per Android e iOS)
export async function showPhoneNotification(title, body, url) {
  // Suono campana
  playNotificationSound()

  // Vibrazione del telefono
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([400, 200, 400, 200, 400])
    } catch (e) {}
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const options = {
    body,
    icon: './calendar-icon.svg',
    badge: './favicon.svg',
    vibrate: [400, 200, 400, 200, 400],
    tag: 'app-alert-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: { url: url || window.location.href }
  }

  // Tentativo primario sicuro tramite Service Worker (obbligatorio su Android Chrome per evitare Illegal Constructor)
  if ('serviceWorker' in navigator) {
    try {
      // Promise con timeout di 1 secondo per non bloccare l'esecuzione se il worker è in avvio
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1000))
      const reg = await Promise.race([navigator.serviceWorker.ready, timeoutPromise])

      if (reg && reg.showNotification) {
        await reg.showNotification(title, options)
        return
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options
        })
        return
      }
    } catch (swErr) {
      console.warn('Tentativo ServiceWorker notifica fallito:', swErr)
    }
  }

  // Fallback per browser desktop o browser che supportano il costruttore Notification
  try {
    const notif = new Notification(title, options)
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch (e) {
    // Su Android Chrome questo fallisce intenzionalmente per specifiche di sicurezza
    console.info('Notifica desktop fallback non applicabile su questo dispositivo:', e.message)
  }
}

// Esegue un test istantaneo dell'alert inviando vibrazione, suono e notifica
export async function triggerTestAlert() {
  playNotificationSound()
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([300, 150, 300])
    } catch (e) {}
  }

  const perm = await requestNotificationPermission()
  if (perm === 'granted') {
    await showPhoneNotification(
      '🔔 Test Alert Riuscito!',
      'Ottimo! Il promemoria sul tuo cellulare è attivo e funzionante per i tuoi appuntamenti.'
    )
    return {
      success: true,
      message: 'Campanella, vibrazione e notifica inviate con successo al tuo cellulare! 🔔'
    }
  } else if (perm === 'denied') {
    return {
      success: false,
      message:
        'Le notifiche sono bloccate dal browser del telefono. Tocca l\'icona del lucchetto (o impostazioni del sito) in alto e attiva "Notifiche".'
    }
  } else {
    return {
      success: false,
      message: 'Per ricevere gli avvisi devi premere "Consenti" quando il telefono ti chiede il permesso notifiche.'
    }
  }
}

// Calcola quanti giorni mancano all'appuntamento rispetto alla data locale reale (null-safe al 100%)
export function getDaysUntilAppointment(dateStr) {
  if (!dateStr) return null
  try {
    let cleanStr = ''
    if (typeof dateStr === 'string') {
      cleanStr = dateStr.trim()
    } else if (dateStr instanceof Date) {
      cleanStr = dateStr.toISOString().split('T')[0]
    } else {
      cleanStr = String(dateStr || '').trim()
    }

    if (!cleanStr.includes('-')) return null

    const parts = cleanStr.split('T')[0].split('-').map(Number)
    if (parts.length < 3) return null
    const [y, m, d] = parts
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null

    const now = new Date()
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const appDate = new Date(y, m - 1, d)
    if (isNaN(appDate.getTime())) return null

    const diffTime = appDate.getTime() - todayDate.getTime()
    return Math.round(diffTime / (1000 * 60 * 60 * 24))
  } catch (e) {
    return null
  }
}

// Verifica dettagliata se un appuntamento deve emettere un alert oggi (null-safe al 100%)
export function isAppointmentAlertDue(appointment) {
  if (!appointment || typeof appointment !== 'object') return null
  try {
    if (!appointment.reminderAlert || appointment.reminderAlert === 'none') {
      return null
    }

    const option = ALERT_OPTIONS.find((o) => o.id === appointment.reminderAlert)
    if (!option || option.days < 0) return null

    const daysLeft = getDaysUntilAppointment(appointment.date)
    if (daysLeft === null || daysLeft < 0) {
      // Appuntamento già passato nei giorni precedenti
      return null
    }

    // 1. Se l'alert è impostato per 'today' (il giorno stesso)
    if (option.id === 'today') {
      if (daysLeft === 0) {
        return {
          isDue: true,
          daysLeft: 0,
          type: 'today',
          title: `🔔 Appuntamento OGGI alle ${appointment.time || '10:00'}!`,
          message: `OGGI alle ore ${appointment.time || '10:00'}: appuntamento con ${appointment.clientName || 'Cliente'} (${appointment.service || 'Consulenza'})`
        }
      }
      return null
    }

    // 2. Se l'alert è con preavviso di N giorni (es. 1d, 3d, 5d, 7d, 10d)
    if (daysLeft === option.days) {
      const daysLabel = daysLeft === 1 ? 'DOMANI' : `tra ${daysLeft} giorni`
      return {
        isDue: true,
        daysLeft,
        type: 'advance',
        title: `🔔 Promemoria: Appuntamento ${daysLabel}!`,
        message: `Appuntamento ${daysLabel} (${appointment.date} alle ore ${appointment.time || '10:00'}) con ${appointment.clientName || 'Cliente'} (${appointment.service || 'Consulenza'})`
      }
    }

    // 3. Se mancano meno giorni del preavviso impostato (es. l'utente ha impostato 3 giorni prima ma oggi è già il giorno stesso)
    if (daysLeft === 0) {
      return {
        isDue: true,
        daysLeft: 0,
        type: 'today',
        title: `🔔 Appuntamento OGGI alle ${appointment.time || '10:00'}!`,
        message: `OGGI alle ore ${appointment.time || '10:00'}: appuntamento con ${appointment.clientName || 'Cliente'} (${appointment.service || 'Consulenza'})`
      }
    }

    // 4. Se mancano meno giorni del preavviso (es. creato con anticipo già scaduto ma non passato)
    if (daysLeft < option.days && daysLeft > 0) {
      const daysLabel = daysLeft === 1 ? 'DOMANI' : `tra ${daysLeft} giorni`
      return {
        isDue: true,
        daysLeft,
        type: 'advance',
        title: `🔔 Promemoria Imminente: Appuntamento ${daysLabel}!`,
        message: `Appuntamento ${daysLabel} (${appointment.date} alle ore ${appointment.time || '10:00'}) con ${appointment.clientName || 'Cliente'} (${appointment.service || 'Consulenza'})`
      }
    }

    return null
  } catch (err) {
    console.warn('Errore in isAppointmentAlertDue:', err)
    return null
  }
}
