import React, { useState, useEffect } from 'react'
import { Bell, BellRing, X, Check } from 'lucide-react'
import { requestNotificationPermission, playNotificationSound } from '../utils/notifications'

/**
 * Banner informativo per l'attivazione dei permessi notifiche e sblocco audio sullo smartphone
 */
export default function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle', 'granted', 'denied'

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    // Non mostrare se già autorizzato o se l'utente ha scelto di ignorare per oggi
    if (Notification.permission === 'granted') return

    const dismissed = localStorage.getItem('hide_notif_banner_' + new Date().toISOString().split('T')[0])
    if (dismissed) return

    setShowBanner(true)
  }, [])

  const handleEnable = async () => {
    playNotificationSound()
    const perm = await requestNotificationPermission()
    if (perm === 'granted') {
      setStatus('granted')
      setTimeout(() => setShowBanner(false), 2000)
    } else if (perm === 'denied') {
      setStatus('denied')
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem('hide_notif_banner_' + new Date().toISOString().split('T')[0], 'true')
    } catch (e) {}
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="bg-amber-500 text-white px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-sm shrink-0 border-b border-amber-600/30">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <BellRing className="w-4 h-4 shrink-0 animate-pulse text-amber-100" />
        <span className="truncate font-medium">
          {status === 'granted'
            ? '✅ Notifiche e suoneria promemoria attivate con successo sul tuo smartphone!'
            : status === 'denied'
            ? '⚠️ Notifiche bloccate dal browser. Tocca il lucchetto del sito per consentirle.'
            : 'Ricevi allarmi con suono e vibrazione per i tuoi appuntamenti anche sul cellulare:'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {status !== 'granted' && status !== 'denied' && (
          <button
            type="button"
            onClick={handleEnable}
            className="px-2.5 py-1 bg-white text-amber-950 hover:bg-amber-50 rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer"
          >
            Attiva Sveglie
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-white/80 hover:text-white rounded-md transition cursor-pointer"
          title="Chiudi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
