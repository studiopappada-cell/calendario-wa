/**
 * Modulo di sincronizzazione Cloud bidirezionale tramite GitHub API
 * Permette la sincronizzazione trasparente e sicura tra PC e Smartphone
 */

const REPO_OWNER = 'studiopappada-cell'
const REPO_NAME = 'calendario-wa'
const FILE_PATH = 'data.json'
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`
const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`

export function getSavedToken() {
  try {
    // 1. Controlla l'hash URL (#token=...) per configurazione istantanea con link
    if (window.location.hash.includes('token=')) {
      const match = window.location.hash.match(/token=([a-zA-Z0-9_]+)/)
      if (match && match[1]) {
        const token = match[1]
        localStorage.setItem('gh_sync_token', token)
        window.history.replaceState(null, '', window.location.pathname)
        return token
      }
    }
    // 2. Controlla i parametri URL (?token=...)
    const params = new URLSearchParams(window.location.search)
    const paramToken = params.get('token')
    if (paramToken) {
      localStorage.setItem('gh_sync_token', paramToken)
      window.history.replaceState(null, '', window.location.pathname)
      return paramToken
    }
    const saved = localStorage.getItem('gh_sync_token')
    if (saved && saved.trim()) return saved.trim()
    return ''
  } catch (e) {
    return ''
  }
}

export function saveToken(t) {
  try {
    if (t) localStorage.setItem('gh_sync_token', t.trim())
    else localStorage.removeItem('gh_sync_token')
  } catch (e) {}
}

let lastFileSha = null

// Codifica UTF-8 in Base64 compatibile con caratteri accentati ed emoji
function utf8ToBase64(str) {
  return window.btoa(unescape(encodeURIComponent(str)))
}

// Decodifica Base64 in UTF-8
function base64ToUtf8(str) {
  return decodeURIComponent(escape(window.atob(str)))
}

/**
 * Scarica i dati aggiornati dal cloud GitHub
 */
export async function fetchCloudData(customToken) {
  const token = (customToken || getSavedToken()).trim()

  try {
    // Se c'è un token, usiamo l'API con etag e sha
    if (token) {
      const res = await fetch(`${API_URL}?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })

      if (res.ok) {
        const data = await res.json()
        lastFileSha = data.sha
        const contentStr = base64ToUtf8(data.content.replace(/\s/g, ''))
        return { success: true, sha: data.sha, data: JSON.parse(contentStr) }
      }
    }

    // Fallback: se non c'è token o l'API ha rate limit, leggi la copia raw pubblica!
    const rawRes = await fetch(`${RAW_URL}?t=${Date.now()}`)
    if (rawRes.ok) {
      const parsed = await rawRes.json()
      return { success: true, data: parsed }
    }

    return { success: false, message: 'Impossibile leggere i dati dal cloud' }
  } catch (error) {
    console.warn('Errore lettura da GitHub:', error)
    return { success: false, error }
  }
}

/**
 * Salva i dati correnti nel cloud GitHub
 */
export async function pushCloudData(payload, customToken) {
  const token = (customToken || getSavedToken()).trim()
  if (!token) return { success: false, message: 'Nessun token impostato per il salvataggio' }


  try {
    // Se non abbiamo l'ultimo SHA, recuperiamolo prima
    if (!lastFileSha) {
      const check = await fetchCloudData(token)
      if (check.sha) {
        lastFileSha = check.sha
      }
    }

    const jsonString = JSON.stringify(payload, null, 2)
    const base64Content = utf8ToBase64(jsonString)

    const body = {
      message: `Sync calendario ${new Date().toLocaleTimeString('it-IT')}`,
      content: base64Content,
      branch: 'main'
    }

    if (lastFileSha) {
      body.sha = lastFileSha
    }

    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      // In caso di conflitto SHA (409), riproviamo recuperando lo SHA fresco
      if (res.status === 409) {
        const fresh = await fetchCloudData(token)
        if (fresh.sha) {
          body.sha = fresh.sha
          const retryRes = await fetch(API_URL, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          })
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            lastFileSha = retryData.content.sha
            return { success: true, sha: lastFileSha }
          }
        }
      }
      return { success: false, status: res.status }
    }

    const data = await res.json()
    lastFileSha = data.content.sha
    return { success: true, sha: lastFileSha }
  } catch (error) {
    console.error('Errore salvataggio su GitHub:', error)
    return { success: false, error }
  }
}
