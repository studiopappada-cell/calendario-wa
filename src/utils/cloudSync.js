/**
 * Modulo di sincronizzazione cloud multi-dispositivo (PC, Smartphone, Tablet)
 * Unificato con il backend GitHub Cloud per garantire che il Codice Stanza (es. CAL-SEPUB)
 * sincronizzi realmente i dati su tutti i dispositivi.
 */

import { fetchCloudData, pushCloudData } from './githubSync'
import { DEFAULT_ROOM_CODE } from './storage'

// Genera un codice stanza casuale a 6 cifre/lettere
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'CAL-'
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Salva lo stato completo nel cloud con la chiave della stanza
export async function pushToCloud(roomCode, data) {
  const cleanRoom = (roomCode || DEFAULT_ROOM_CODE).trim().toUpperCase()
  const updatedSettings = {
    ...(data?.settings || {}),
    cloudSync: {
      ...(data?.settings?.cloudSync || {}),
      enabled: true,
      syncCode: cleanRoom,
      lastSync: new Date().toISOString()
    }
  }
  const res = await pushCloudData({
    ...data,
    settings: updatedSettings
  })
  return {
    success: Boolean(res?.success),
    timestamp: updatedSettings.cloudSync.lastSync,
    data: res?.data
  }
}

// Carica lo stato dal cloud
export async function pullFromCloud(roomCode) {
  const res = await fetchCloudData()
  if (res?.success && res.data) {
    return {
      success: true,
      data: res.data,
      updatedAt: res.data.updatedAt || new Date().toISOString()
    }
  }
  return { success: false, message: 'Impossibile scaricare i dati dal cloud' }
}
