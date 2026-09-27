/**
 * Utility per la gestione dell'integrazione WhatsApp
 */

// Pulisce e formatta il numero di telefono per l'API di WhatsApp
export function formatPhoneNumber(phone, defaultPrefix = '+39') {
  if (!phone) return ''
  // Rimuove spazi, trattini, parentesi e punti
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')

  // Se inizia con '00', converti in '+'
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  // Se non inizia con '+', applica il prefisso predefinito
  if (!cleaned.startsWith('+')) {
    const prefix = defaultPrefix.startsWith('+') ? defaultPrefix : `+${defaultPrefix}`
    cleaned = `${prefix}${cleaned}`
  }

  // wa.me richiede solo cifre numeriche (senza il '+')
  return cleaned.replace('+', '')
}

// Formatta una data in formato leggibile italiano (es. "Lunedì 28 Settembre 2026")
export function formatDateItalian(dateString) {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return dateObj.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Compone il testo del messaggio sostituendo i segnaposto
export function buildMessageText(template, appointment, businessSettings = {}) {
  if (!template || !appointment) return ''

  const dateFormatted = formatDateItalian(appointment.date)
  const businessName = businessSettings.businessName || 'il nostro studio'
  const businessPhone = businessSettings.businessPhone || ''
  const businessAddress = businessSettings.businessAddress || ''

  let text = template
    .replace(/{nome}/gi, appointment.clientName || 'Gentile Cliente')
    .replace(/{data}/gi, dateFormatted || appointment.date)
    .replace(/{ora}/gi, appointment.time || '')
    .replace(/{servizio}/gi, appointment.service || 'appuntamento')
    .replace(/{durata}/gi, appointment.duration ? `${appointment.duration} min` : '')
    .replace(/{prezzo}/gi, appointment.price ? `€${appointment.price}` : '')
    .replace(/{note}/gi, appointment.notes ? `Note: ${appointment.notes}` : '')
    .replace(/{studio}/gi, businessName)
    .replace(/{azienda}/gi, businessName)
    .replace(/{indirizzo}/gi, businessAddress ? `Indirizzo: ${businessAddress}` : '')

  return text.trim()
}

// Genera l'URL diretto per WhatsApp
export function getWhatsAppUrl(phone, messageText, defaultPrefix = '+39') {
  const cleanPhone = formatPhoneNumber(phone, defaultPrefix)
  const encodedText = encodeURIComponent(messageText)
  
  if (!cleanPhone) {
    // Se non c'è numero, apre WhatsApp consentendo di scegliere il contatto
    return `https://wa.me/?text=${encodedText}`
  }
  
  return `https://wa.me/${cleanPhone}?text=${encodedText}`
}

// Modelli di messaggio predefiniti
export const DEFAULT_TEMPLATES = {
  reminder: `Gentile {nome}, Le ricordiamo il Suo appuntamento per *{servizio}* fissato per il giorno *{data}* alle ore *{ora}* presso {azienda}. Per qualsiasi necessità o variazione La preghiamo di avvisarci con anticipo. Buona giornata!`,
  
  confirmation: `Gentile {nome}, Le chiediamo gentile conferma per il Suo appuntamento di *{servizio}* previsto per il giorno *{data}* alle ore *{ora}*. Può confermare semplicemente rispondendo a questo messaggio. A presto!`,
  
  thankyou: `Gentile {nome}, grazie per essere stato da noi oggi per *{servizio}*. Speriamo che l'esperienza sia stata all'altezza delle Sue aspettative. Per qualsiasi feedback o per fissare il prossimo incontro siamo a Sua completa disposizione!`,
  
  custom: `Gentile {nome}, Le scriviamo in merito al Suo appuntamento del {data} alle {ora} ({servizio}). Restiamo a disposizione per qualsiasi chiarimento.`
}
