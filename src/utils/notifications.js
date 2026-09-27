/**
 * Utility per la gestione degli Alert / Notifiche Promemoria per lo smartphone
 */

export const ALERT_OPTIONS = [
  { id: 'none', label: 'Nessun avviso', days: 0 },
  { id: '1d', label: '1 Giorno prima', days: 1 },
  { id: '3d', label: '3 Giorni prima', days: 3 },
  { id: '5d', label: '5 Giorni prima', days: 5 },
  { id: '7d', label: '1 Settimana prima (7 gg)', days: 7 },
  { id: '10d', label: '10 Giorni prima', days: 10 }
]

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

// Invia una notifica nativa sul cellulare
export function showPhoneNotification(title, body, url) {
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
  if (!option || option.days === 0) return false

  const daysLeft = getDaysUntilAppointment(appointment.date)
  // L'alert scatta se siamo esattamente nei giorni di preavviso oppure meno (e l'appuntamento è futuro o di oggi)
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= option.days
}
