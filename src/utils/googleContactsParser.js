/**
 * Parser per contatti esportati da Google Contacts (CSV e vCard .vcf)
 * e integrazione con la Contact Picker API nativa per smartphone.
 */

// Pulisce e sanitizza numeri di telefono
function cleanPhone(raw) {
  if (!raw) return ''
  return raw.replace(/[^\d+]/g, '')
}

/**
 * Parsing di file CSV esportato da Google Contatti (formato Google CSV o Outlook CSV)
 */
export function parseGoogleContactsCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  // Estrazione header (gestisce virgole dentro virgolette)
  const parseCSVLine = (line) => {
    const result = []
    let cur = ''
    let insideQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        insideQuotes = !insideQuotes
      } else if (c === ',' && !insideQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase())

  // Individuiamo gli indici delle colonne rilevanti di Google
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'nome' || h === 'display name')
  const givenNameIdx = headers.findIndex((h) => h === 'given name' || h === 'first name' || h === 'nome')
  const familyNameIdx = headers.findIndex((h) => h === 'family name' || h === 'last name' || h === 'cognome')

  // Trova tutti gli indici di colonne telefono (Google Contacts spesso usa "Phone 1 - Value", "Phone 2 - Value", "Mobile", ecc.)
  const phoneIndices = []
  headers.forEach((h, idx) => {
    if (h.includes('phone') || h.includes('telefono') || h.includes('cellulare') || h.includes('mobile')) {
      if (h.includes('value') || !h.includes('type')) {
        phoneIndices.push(idx)
      }
    }
  })

  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('notes'))

  const importedClients = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (!row || row.length === 0) continue

    let name = ''
    if (nameIdx !== -1 && row[nameIdx]) {
      name = row[nameIdx]
    } else {
      const given = givenNameIdx !== -1 ? row[givenNameIdx] || '' : ''
      const family = familyNameIdx !== -1 ? row[familyNameIdx] || '' : ''
      name = `${given} ${family}`.trim()
    }

    if (!name) continue

    // Cerca il primo numero telefonico valido tra le colonne individuate
    let phone = ''
    for (const pIdx of phoneIndices) {
      if (row[pIdx] && row[pIdx].trim().length > 3) {
        phone = cleanPhone(row[pIdx])
        break
      }
    }

    const notes = notesIdx !== -1 ? (row[notesIdx] || '').trim() : ''

    importedClients.push({
      id: 'gcontact_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.replace(/^"|"$/g, '').trim(),
      phone: phone.replace(/^"|"$/g, '').trim(),
      notes: notes.replace(/^"|"$/g, '').trim()
    })
  }

  return importedClients
}

/**
 * Parsing di file vCard (.vcf) esportato da Google Contatti o smartphone
 */
export function parseVCard(vcfText) {
  const cards = vcfText.split(/BEGIN:VCARD/i).filter((c) => c.trim().length > 0)
  const importedClients = []

  cards.forEach((card) => {
    let name = ''
    let phone = ''
    let note = ''

    const lines = card.split(/\r?\n/)
    lines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('FN:') || trimmed.startsWith('FN;')) {
        name = trimmed.substring(trimmed.indexOf(':') + 1).trim()
      } else if (!name && (trimmed.startsWith('N:') || trimmed.startsWith('N;'))) {
        const parts = trimmed.substring(trimmed.indexOf(':') + 1).split(';')
        name = `${parts[1] || ''} ${parts[0] || ''}`.trim()
      }

      if (!phone && (trimmed.startsWith('TEL;') || trimmed.startsWith('TEL:'))) {
        const rawPhone = trimmed.substring(trimmed.indexOf(':') + 1).trim()
        phone = cleanPhone(rawPhone)
      }

      if (trimmed.startsWith('NOTE:') || trimmed.startsWith('NOTE;')) {
        note = trimmed.substring(trimmed.indexOf(':') + 1).trim()
      }
    })

    if (name) {
      importedClients.push({
        id: 'gcontact_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name,
        phone,
        notes: note
      })
    }
  })

  return importedClients
}

/**
 * Supporto per la Contact Picker API nativa dei browser smartphone (Chrome su Android)
 */
export async function pickNativeContacts() {
  if ('contacts' in navigator && 'ContactsManager' in window) {
    try {
      const props = ['name', 'tel']
      const contacts = await navigator.contacts.select(props, { multiple: true })
      if (!contacts || contacts.length === 0) return []

      return contacts.map((c) => ({
        id: 'native_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: (c.name && c.name[0]) || 'Contatto senza nome',
        phone: (c.tel && cleanPhone(c.tel[0])) || '',
        notes: 'Importato dalla rubrica del telefono'
      }))
    } catch (e) {
      console.warn('Selezione contatti annullata o non supportata:', e)
      return null
    }
  }
  return null
}
