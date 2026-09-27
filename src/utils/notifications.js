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

// Riproduce un suono acustico di notifica campana
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
    osc.start(now)
    osc.stop(now + 0.5)
  } catch (e) {
    console.warn('Errore audio:', e)
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

// Invia una notifica nativa sul cellulare con suono e vibrazione
export function showPhoneNotification(title, body, url) {
  playNotificationSound()
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200])
    } catch (e) {}
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      const options = {
        body,
        icon: '/calendario-wa/favicon.svg',
        badge: '/calendario-wa/favicon.svg',
        vibrate: [200, 100, 200],
        tag: 'appointment-alert-' + Date.now(),
        renotify: true,
        data: { url: url || window.location.href }
      }

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options)
        })
      } else {
        const notif = new Notification(title, options)
        notif.onclick = () => {
          window.focus()
          notif.close()
        }
      }
    } catch (e) {
      console.warn('Errore visualizzazione notifica:', e)
    }
  }
}

// Esegue un test istantaneo dell'alert inviando vibrazione, suono e notifica
export async function triggerTestAlert() {
  playNotificationSound()
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200])
    } catch (e) {}
  }

  const perm = await requestNotificationPermission()
  if (perm === 'granted') {
    showPhoneNotification(
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
        'Le notifiche sono al momento bloccate dal browser del telefono. Tocca l\'icona del lucchetto (o impostazioni del sito) in alto a sinistra e attiva "Notifiche".'
    }
  } else {
    return {
      success: false,
      message: 'Per ricevere gli avvisi devi premere "Consenti" quando il telefono ti chiede il permesso notifiche.'
    }
  }
}

// Calcola quanti giorni mancano all'appuntamento
export function getDaysUntilAppointment(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('-').map(Number)
  const appDate = new Date(y, m - 1, d)
  appDate.setHours(0, 0, 0, 0)
  const diffTime = appDate.getTime() - now.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

// Verifica se un appuntamento deve emettere un alert oggi
export function isAppointmentAlertDue(appointment) {
  if (!appointment || !appointment.reminderAlert || appointment.reminderAlert === 'none') {
    return false
  }

  const option = ALERT_OPTIONS.find((o) => o.id === appointment.reminderAlert)
  if (!option || option.days < 0) return false

  const daysLeft = getDaysUntilAppointment(appointment.date)
  if (daysLeft === null || daysLeft < 0) return false

  // Se l'alert è per 'today' (giorno stesso)
  if (option.id === 'today') {
    return daysLeft === 0
  }

  // Se l'alert è con preavviso di N giorni
  return daysLeft <= option.days
}
