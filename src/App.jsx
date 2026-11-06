import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadAppointments,
  saveAppointments,
  loadSettings,
  saveSettings,
  loadClients,
  saveClients,
  loadDeletedAppIds,
  saveDeletedAppIds,
  loadDeletedClientIds,
  saveDeletedClientIds,
  loadServices,
  saveServices,
  toLocalDateString,
  restoreFromIndexedDBIfNeeded,
  getActiveRoomCode,
  DEFAULT_ROOM_CODE
} from './utils/storage'
import { fetchCloudData, pushCloudData, mergeItemsById } from './utils/githubSync'

// Componenti
import Navbar from './components/Navbar'
import BottomNavMobile from './components/BottomNavMobile'
import CalendarMonthView from './components/CalendarMonthView'
import CalendarWeekView from './components/CalendarWeekView'
import CalendarDayView from './components/CalendarDayView'
import CalendarAgendaView from './components/CalendarAgendaView'
import AppointmentModal from './components/AppointmentModal'
import WhatsAppModal from './components/WhatsAppModal'
import ClientDirectoryModal from './components/ClientDirectoryModal'
import StatsModal from './components/StatsModal'
import SettingsModal from './components/SettingsModal'
import ActiveAlertBanner from './components/ActiveAlertBanner'
import NotificationPermissionBanner from './components/NotificationPermissionBanner'
import {
  isAppointmentAlertDue,
  showPhoneNotification,
  requestNotificationPermission,
  getDaysUntilAppointment,
  getLocalTodayString,
  initAudioUnlock
} from './utils/notifications'

// Merge intelligente: unisce le liste di appuntamenti senza perdere quelli locali
// ed ESCLUDE categoricamente qualsiasi appuntamento precedentemente cancellato
function mergeAppointments(localList, incomingList, deletedIdsSet) {
  return mergeItemsById(incomingList, localList, deletedIdsSet)
}

// Merge clienti senza perdere quelli locali ed escludendo i cancellati
function mergeClients(localList, incomingList, deletedIdsSet) {
  return mergeItemsById(incomingList, localList, deletedIdsSet)
}

function hasNewOrUpdatedItems(mergedList, cloudList) {
  if (!Array.isArray(cloudList)) return mergedList.length > 0
  if (mergedList.length !== cloudList.length) return true
  const cloudMap = new Map(cloudList.map((i) => [i?.id, i]))
  for (const item of mergedList) {
    const cloudItem = cloudMap.get(item.id)
    if (!cloudItem) return true
    const mTs = item.updatedAt ? Date.parse(item.updatedAt) : 0
    const cTs = cloudItem.updatedAt ? Date.parse(cloudItem.updatedAt) : 0
    if (mTs > cTs) return true
  }
  return false
}

export default function App() {
  const [appointments, setAppointments] = useState(() => loadAppointments())
  const [settings, setSettings] = useState(() => loadSettings())
  const [clients, setClients] = useState(() => loadClients())
  const [services, setServices] = useState(() => loadServices())
  const [deletedAppIds, setDeletedAppIds] = useState(() => loadDeletedAppIds())
  const [deletedClientIds, setDeletedClientIds] = useState(() => loadDeletedClientIds())

  const [currentView, setCurrentView] = useState(() => {
    return window.innerWidth < 768 ? 'agenda' : 'month'
  })
  const [currentDate, setCurrentDate] = useState(new Date())

  // Gestione Modali
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [selectedDateForNew, setSelectedDateForNew] = useState(null)
  const [editingAppointment, setEditingAppointment] = useState(null)

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppAppointment, setWhatsAppAppointment] = useState(null)

  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [activeInAppAlert, setActiveInAppAlert] = useState(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncStatus, setSyncStatus] = useState('online') // 'online', 'syncing', 'error'

  const isAnyModalOpenRef = useRef(false)
  isAnyModalOpenRef.current =
    isAppointmentModalOpen ||
    isClientsModalOpen ||
    isSettingsModalOpen ||
    isWhatsAppModalOpen ||
    isStatsModalOpen

  // Verifica ed esecuzione istantanea degli avvisi promemoria con suono, vibrazione e banner visivo
  const checkAndTriggerAlerts = useCallback((appsList) => {
    if (!Array.isArray(appsList) || appsList.length === 0) return

    const todayStr = getLocalTodayString()

    appsList.forEach((app) => {
      if (!app || !app.id || app.status === 'cancelled') return

      const dueInfo = isAppointmentAlertDue(app)
      if (dueInfo && dueInfo.isDue) {
        // Chiave univoca per dispositivo e per stato di notifica
        const ackKey = `alert_ack_${app.id}_${todayStr}_${dueInfo.type}_${dueInfo.daysLeft}`
        const alreadyAcked = localStorage.getItem(ackKey)

        if (!alreadyAcked) {
          // 1. Notifica nativa del cellulare con suono e vibrazione
          showPhoneNotification(dueInfo.title, dueInfo.message)

          // 2. Banner visivo in primo piano nell'app (visibile e sonoro su qualsiasi schermo)
          setActiveInAppAlert({
            appointmentId: app.id,
            title: dueInfo.title,
            message: dueInfo.message,
            app
          })

          try {
            localStorage.setItem(ackKey, 'true')
          } catch (e) {}
        }
      }
    })
  }, [])

  // Sincronizzazione bidirezionale sicura (unisci sempre prima dal Cloud, poi salva se necessario)
  const handleTriggerSync = useCallback(
    async (forcePush = false, customRoomCode = null) => {
      setIsSyncing(true)
      setSyncStatus('syncing')
      try {
        // Se viene passato un codice stanza (es. da SettingsModal), salvalo subito nelle impostazioni
        let currentSettings = loadSettings()
        if (customRoomCode && typeof customRoomCode === 'string' && customRoomCode.trim()) {
          const cleanCode = customRoomCode.trim().toUpperCase()
          currentSettings = {
            ...currentSettings,
            cloudSync: {
              ...(currentSettings.cloudSync || {}),
              enabled: true,
              syncCode: cleanCode,
              lastSync: new Date().toISOString()
            }
          }
          saveSettings(currentSettings)
          setSettings(currentSettings)
        }

        const delAppList = loadDeletedAppIds()
        const delClientList = loadDeletedClientIds()

        // 1. Scarica SEMPRE prima i dati dal Cloud per non sovrascrivere mai gli altri dispositivi
        const res = await fetchCloudData()
        if (res.success && res.data) {
          const cloudData = res.data

          const allDelApps = Array.from(
            new Set([
              'demo-1',
              ...delAppList,
              ...(Array.isArray(cloudData.deletedAppIds) ? cloudData.deletedAppIds : []),
              ...(Array.isArray(cloudData.deletedAppointments) ? cloudData.deletedAppointments : [])
            ])
          )
          saveDeletedAppIds(allDelApps)
          setDeletedAppIds(allDelApps)
          const activeDelAppSet = new Set(allDelApps)

          const allDelClients = Array.from(
            new Set([
              ...delClientList,
              ...(Array.isArray(cloudData.deletedClientIds) ? cloudData.deletedClientIds : []),
              ...(Array.isArray(cloudData.deletedClients) ? cloudData.deletedClients : [])
            ])
          )
          saveDeletedClientIds(allDelClients)
          setDeletedClientIds(allDelClients)
          const activeDelClientSet = new Set(allDelClients)

          const currentLocalClients = loadClients().filter((c) => c && !activeDelClientSet.has(c.id))
          const mergedClients = mergeClients(
            currentLocalClients,
            cloudData.clients || [],
            activeDelClientSet
          )
          setClients(mergedClients)
          saveClients(mergedClients)

          const currentLocalApps = loadAppointments().filter((a) => a && !activeDelAppSet.has(a.id))
          const mergedApps = mergeAppointments(
            currentLocalApps,
            cloudData.appointments || [],
            activeDelAppSet
          )
          setAppointments(mergedApps)
          saveAppointments(mergedApps)

          checkAndTriggerAlerts(mergedApps)

          if (cloudData.settings) {
            const activeCode =
              customRoomCode?.trim()?.toUpperCase() ||
              currentSettings?.cloudSync?.syncCode?.trim()?.toUpperCase() ||
              cloudData.settings?.cloudSync?.syncCode?.trim()?.toUpperCase() ||
              DEFAULT_ROOM_CODE
            const mergedSettings = {
              ...cloudData.settings,
              ...currentSettings,
              businessName:
                cloudData.settings.businessName || currentSettings.businessName || 'Studio Legale Pappadà',
              cloudSync: {
                ...(cloudData.settings.cloudSync || {}),
                ...(currentSettings.cloudSync || {}),
                enabled: true,
                syncCode: activeCode,
                lastSync: new Date().toISOString()
              }
            }
            setSettings(mergedSettings)
            saveSettings(mergedSettings)
            currentSettings = mergedSettings
          }

          if (Array.isArray(cloudData.services) && cloudData.services.length > 0) {
            const cleanSvc = cloudData.services.filter(
              (s) => typeof s === 'string' && !s.toLowerCase().includes('taglio')
            )
            if (cleanSvc.length > 0) {
              setServices(cleanSvc)
              saveServices(cleanSvc)
            }
          } else if (cloudData.settings?.services && Array.isArray(cloudData.settings.services)) {
            const cleanSvc = cloudData.settings.services.filter(
              (s) => typeof s === 'string' && !s.toLowerCase().includes('taglio')
            )
            if (cleanSvc.length > 0) {
              setServices(cleanSvc)
              saveServices(cleanSvc)
            }
          }

          // Se è richiesto un forcePush o ci sono modifiche locali non ancora presenti nel cloud, caricale
          const needsPush =
            forcePush ||
            hasNewOrUpdatedItems(mergedApps, cloudData.appointments || []) ||
            hasNewOrUpdatedItems(mergedClients, cloudData.clients || []) ||
            allDelApps.length > (cloudData.deletedAppIds?.length || 0)

          if (needsPush) {
            const pushRes = await pushCloudData({
              appointments: mergedApps,
              clients: mergedClients,
              settings: currentSettings,
              services: loadServices(),
              deletedAppIds: allDelApps,
              deletedClientIds: allDelClients
            })
            if (pushRes?.success) {
              setLastSyncTime(
                new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              )
              setSyncStatus('online')
            } else {
              setSyncStatus('error')
            }
          } else {
            setLastSyncTime(
              new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            )
            setSyncStatus('online')
          }
        } else if (forcePush) {
          const pushRes = await pushCloudData({
            appointments: loadAppointments(),
            clients: loadClients(),
            settings: currentSettings,
            services: loadServices(),
            deletedAppIds: delAppList,
            deletedClientIds: delClientList
          })
          if (pushRes?.success) {
            if (pushRes.data?.appointments) {
              setAppointments(pushRes.data.appointments)
              saveAppointments(pushRes.data.appointments)
            }
            if (pushRes.data?.clients) {
              setClients(pushRes.data.clients)
              saveClients(pushRes.data.clients)
            }
            setLastSyncTime(
              new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            )
            setSyncStatus('online')
          } else {
            setSyncStatus('error')
          }
        } else {
          setSyncStatus('error')
        }
      } catch (e) {
        console.warn('Errore sync:', e)
        setSyncStatus('error')
      } finally {
        setIsSyncing(false)
      }
    },
    [checkAndTriggerAlerts]
  )

  // 1. All'avvio dell'app: ripristina eventuale backup da IndexedDB, legge ?room= e sincronizza col Cloud
  useEffect(() => {
    initAudioUnlock()

    const initApp = async () => {
      // Ripristina da IndexedDB se il LocalStorage è vuoto
      const restored = await restoreFromIndexedDBIfNeeded()
      if (restored.appointments) setAppointments(restored.appointments)
      if (restored.clients) setClients(restored.clients)
      if (restored.settings) setSettings(restored.settings)

      // Legge eventuale parametro ?room=CAL-SEPUB dall'URL
      const activeRoom = getActiveRoomCode()
      await handleTriggerSync(false, activeRoom)
    }

    initApp()

    // Sincronizzazione istantanea tra schede aperte sullo stesso browser
    const onStorageChange = (e) => {
      if (!e.key) return
      if (e.key === 'wa_calendar_appointments_v1') {
        setAppointments(loadAppointments())
      } else if (e.key === 'wa_calendar_clients_v1') {
        setClients(loadClients())
      } else if (e.key === 'wa_calendar_settings_v1') {
        setSettings(loadSettings())
      }
    }
    window.addEventListener('storage', onStorageChange)

    // Polling ogni 10 secondi e quando lo smartphone viene sbloccato o l'utente torna sull'app
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isAnyModalOpenRef.current) {
        handleTriggerSync(false)
      }
      checkAndTriggerAlerts(loadAppointments())
    }, 10000)

    const onWakeUp = () => {
      if (!isAnyModalOpenRef.current) {
        handleTriggerSync(false)
      }
      checkAndTriggerAlerts(loadAppointments())
    }

    document.addEventListener('visibilitychange', onWakeUp)
    window.addEventListener('focus', onWakeUp)
    window.addEventListener('pageshow', onWakeUp)
    window.addEventListener('touchstart', onWakeUp, { once: true, passive: true })

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', onStorageChange)
      document.removeEventListener('visibilitychange', onWakeUp)
      window.removeEventListener('focus', onWakeUp)
      window.removeEventListener('pageshow', onWakeUp)
    }
  }, [checkAndTriggerAlerts, handleTriggerSync])

  const handleUpdateServices = (newServices) => {
    const saved = saveServices(newServices)
    setServices(saved)
    const updatedSettings = { ...loadSettings(), services: saved }
    setSettings(updatedSettings)
    saveSettings(updatedSettings)
    pushCloudData({
      appointments: loadAppointments(),
      clients: loadClients(),
      settings: updatedSettings,
      services: saved,
      deletedAppIds: loadDeletedAppIds(),
      deletedClientIds: loadDeletedClientIds()
    })
  }

  // Controllo automatico continuo degli alert al variare degli appuntamenti
  useEffect(() => {
    checkAndTriggerAlerts(appointments)
  }, [appointments, checkAndTriggerAlerts])

  // Creazione o Salvataggio Appuntamento (immediato e a prova di errore)
  const handleSaveAppointment = (appData) => {
    try {
      const nowIso = new Date().toISOString()
      const sanitizedApp = {
        ...appData,
        id: appData.id || 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        clientName: String(appData.clientName || '').trim(),
        clientPhone: String(appData.clientPhone || '').trim(),
        service: String(appData.service || services[0] || 'Consulenza Legale').trim(),
        date: String(appData.date || getLocalTodayString()),
        time: String(appData.time || '10:00'),
        duration: Number(appData.duration || 60),
        status: String(appData.status || 'confirmed'),
        reminderAlert: String(appData.reminderAlert || '1d'),
        notes: String(appData.notes || '').trim(),
        updatedAt: nowIso
      }

      // Se è impostato un avviso, richiediamo l'autorizzazione alle notifiche sullo smartphone
      if (sanitizedApp.reminderAlert && sanitizedApp.reminderAlert !== 'none') {
        requestNotificationPermission().catch(() => {})
      }

      const currentApps = loadAppointments()
      let updatedApps = []
      const exists = currentApps.some((a) => a.id === sanitizedApp.id)
      if (exists) {
        updatedApps = currentApps.map((a) => (a.id === sanitizedApp.id ? sanitizedApp : a))
      } else {
        updatedApps = [...currentApps, sanitizedApp]
      }

      // 1. Salva immediatamente in LocalStorage + IndexedDB e aggiorna lo stato React
      saveAppointments(updatedApps)
      setAppointments(updatedApps)

      // 2. Esegue subito il controllo alert per emettere suono, vibrazione o banner se dovuto oggi o imminente
      checkAndTriggerAlerts(updatedApps)

      const currentClients = loadClients()
      let updatedClients = [...currentClients]
      // 3. Se il cliente non è ancora in rubrica, aggiungilo in rubrica
      if (sanitizedApp.clientName) {
        const targetName = sanitizedApp.clientName.toLowerCase()
        const clientExists = currentClients.some(
          (c) => String(c?.name || '').toLowerCase() === targetName
        )
        if (!clientExists) {
          const newClient = {
            id: 'c_' + Date.now(),
            name: sanitizedApp.clientName,
            phone: sanitizedApp.clientPhone || '',
            notes: '',
            updatedAt: nowIso
          }
          updatedClients = [...currentClients, newClient]
          saveClients(updatedClients)
          setClients(updatedClients)
        }
      }

      // 4. Salva immediatamente nel Cloud GitHub unendo eventuali novità dagli altri dispositivi
      setIsSyncing(true)
      pushCloudData({
        appointments: updatedApps,
        clients: updatedClients,
        settings: loadSettings(),
        services: loadServices(),
        deletedAppIds: loadDeletedAppIds(),
        deletedClientIds: loadDeletedClientIds()
      })
        .then((res) => {
          if (res && res.success) {
            if (res.data?.appointments) {
              saveAppointments(res.data.appointments)
              setAppointments(res.data.appointments)
            }
            if (res.data?.clients) {
              saveClients(res.data.clients)
              setClients(res.data.clients)
            }
            setLastSyncTime(
              new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            )
            setSyncStatus('online')
          } else {
            setSyncStatus('error')
          }
        })
        .catch((err) => {
          console.warn('Errore push cloud:', err)
          setSyncStatus('error')
        })
        .finally(() => setIsSyncing(false))

      return sanitizedApp
    } catch (e) {
      console.error('Errore durante handleSaveAppointment:', e)
      return appData
    }
  }

  // Eliminazione Appuntamento (immediata, permanente e non ripristinabile dal sync)
  const handleDeleteAppointment = (id) => {
    if (!id) return
    const currentDel = loadDeletedAppIds()
    const updatedDeleted = Array.from(new Set([...currentDel, id]))
    saveDeletedAppIds(updatedDeleted)
    setDeletedAppIds(updatedDeleted)

    const updated = loadAppointments().filter((a) => a && a.id !== id)
    saveAppointments(updated)
    setAppointments(updated)

    setIsSyncing(true)
    pushCloudData({
      appointments: updated,
      clients: loadClients(),
      settings: loadSettings(),
      services: loadServices(),
      deletedAppIds: updatedDeleted,
      deletedClientIds: loadDeletedClientIds()
    })
      .then((res) => {
        if (res && res.success) {
          setLastSyncTime(
            new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          )
          setSyncStatus('online')
        } else {
          setSyncStatus('error')
        }
      })
      .catch((err) => {
        console.warn('Errore push delete app:', err)
        setSyncStatus('error')
      })
      .finally(() => setIsSyncing(false))
  }

  // Aggiornamento Rapido Stato Appuntamento
  const handleUpdateStatus = (id, newStatus) => {
    const nowIso = new Date().toISOString()
    const updated = loadAppointments().map((a) =>
      a.id === id ? { ...a, status: newStatus, updatedAt: nowIso } : a
    )
    saveAppointments(updated)
    setAppointments(updated)
    pushCloudData({
      appointments: updated,
      clients: loadClients(),
      settings: loadSettings(),
      services: loadServices(),
      deletedAppIds: loadDeletedAppIds(),
      deletedClientIds: loadDeletedClientIds()
    }).then((res) => {
      if (res && res.success) {
        setLastSyncTime(
          new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        )
        setSyncStatus('online')
      }
    })
  }

  // Apertura modale WhatsApp
  const handleOpenWhatsApp = (app) => {
    setWhatsAppAppointment(app)
    setIsWhatsAppModalOpen(true)
  }

  // Apertura nuovo appuntamento da giorno specifico
  const handleSelectDateForNew = (dateStr) => {
    setSelectedDateForNew(dateStr)
    setEditingAppointment(null)
    setIsAppointmentModalOpen(true)
  }

  // Modifica appuntamento esistente
  const handleEditAppointment = (app) => {
    setEditingAppointment(app)
    setSelectedDateForNew(app.date)
    setIsAppointmentModalOpen(true)
  }

  // Apertura nuovo appuntamento generico
  const handleNewGenericAppointment = () => {
    setSelectedDateForNew(toLocalDateString(new Date()))
    setEditingAppointment(null)
    setIsAppointmentModalOpen(true)
  }

  // Nuovo appuntamento partendo da un cliente in rubrica
  const handleNewAppointmentWithClient = (client) => {
    setEditingAppointment({
      id: 'app_' + Date.now(),
      clientName: client.name,
      clientPhone: client.phone || '',
      service: services[0] || 'Consulenza Legale',
      date: toLocalDateString(new Date()),
      time: '10:00',
      duration: 60,
      status: 'confirmed',
      notes: client.notes || ''
    })
    setIsAppointmentModalOpen(true)
  }

  // Importazione massiva e simultanea di tutti i contatti (file VCF, CSV o Rubrica Telefono) in un unico blocco
  const handleBatchImportClients = (newClients) => {
    if (!Array.isArray(newClients) || newClients.length === 0) return 0

    const currentDel = loadDeletedClientIds()
    const delSet = new Set(currentDel)

    let count = 0
    let finalUpdated = []

    setClients((prevClients) => {
      const existingNames = new Set(
        prevClients.map((c) => String(c?.name || '').toLowerCase().trim())
      )
      const existingPhones = new Set(
        prevClients.filter((c) => c?.phone).map((c) => String(c.phone).trim())
      )

      const toAdd = []
      const nowIso = new Date().toISOString()
      newClients.forEach((imported) => {
        if (!imported) return
        const cleanName = String(imported.name || '').trim()
        const cleanPhone = String(imported.phone || '').trim()
        if (!cleanName) return

        const nameKey = cleanName.toLowerCase()
        const isDuplicate =
          existingNames.has(nameKey) || (cleanPhone && existingPhones.has(cleanPhone))

        if (!isDuplicate && !delSet.has(imported.id)) {
          const clientObj = {
            id: imported.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cleanName,
            phone: cleanPhone,
            notes: String(imported.notes || '').trim(),
            updatedAt: nowIso
          }
          toAdd.push(clientObj)
          existingNames.add(nameKey)
          if (cleanPhone) existingPhones.add(cleanPhone)
          count++
        }
      })

      if (toAdd.length === 0) return prevClients

      finalUpdated = [...prevClients, ...toAdd]
      saveClients(finalUpdated)

      // Unico salvataggio cloud atomico per tutti i contatti insieme
      pushCloudData({
        appointments: loadAppointments(),
        clients: finalUpdated,
        settings: loadSettings(),
        services: loadServices(),
        deletedAppIds: loadDeletedAppIds(),
        deletedClientIds: currentDel
      })
        .then((res) => {
          if (res && res.success) {
            setLastSyncTime(
              new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            )
            setSyncStatus('online')
          }
        })
        .catch((err) => console.warn('Errore push batch clients:', err))

      return finalUpdated
    })

    return count
  }

  // Se l'utente apre la rubrica e la lista è vuota, sincronizza subito dal cloud
  useEffect(() => {
    if (isClientsModalOpen && clients.length === 0) {
      handleTriggerSync(false)
    }
  }, [isClientsModalOpen, clients.length, handleTriggerSync])

  const handleHardReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    const tokenPart = window.location.hash || ''
    window.location.href =
      window.location.origin + window.location.pathname + '?v=' + Date.now() + tokenPart
  }

  const dueAlertsCount = appointments.filter(
    (a) => a && a.status !== 'cancelled' && isAppointmentAlertDue(a)?.isDue
  ).length

  const handleToggleAlerts = async () => {
    try {
      await requestNotificationPermission()
    } catch (e) {}
    setCurrentView('agenda')
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col text-slate-900 pb-16 md:pb-6"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Banner per richiedere i permessi di notifica e sveglia sullo smartphone se non ancora attivi */}
      <NotificationPermissionBanner />

      {/* Finestra / Banner di Allarme Visivo e Sonoro in Primo Piano */}
      <ActiveAlertBanner
        alert={activeInAppAlert}
        onDismiss={() => setActiveInAppAlert(null)}
        onViewAppointment={(appId) => {
          const app = appointments.find((a) => a.id === appId)
          if (app) {
            setEditingAppointment(app)
            setIsAppointmentModalOpen(true)
          }
          setActiveInAppAlert(null)
        }}
      />

      {/* Barra Superiore */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewAppointment={handleNewGenericAppointment}
        onOpenClients={() => setIsClientsModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        appointmentsCount={appointments.length}
        dueAlertsCount={dueAlertsCount}
        onToggleAlerts={handleToggleAlerts}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onTriggerSync={() => handleTriggerSync(false)}
      />

      {/* Banner Sincronizzazione & Versione Attiva */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-3 sm:px-6 py-1.5 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing
                  ? 'bg-amber-500 animate-ping'
                  : syncStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
              }`}
            />
            <span className="font-semibold text-slate-800">
              {isSyncing
                ? 'Sincronizzazione Cloud...'
                : syncStatus === 'error'
                  ? 'Riconnessione Cloud...'
                  : `Cloud Attivo (${settings?.cloudSync?.syncCode || DEFAULT_ROOM_CODE}${
                      lastSyncTime ? ` • ${lastSyncTime}` : ''
                    })`}
            </span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline text-slate-500">
            {clients.length} clienti in rubrica
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTriggerSync(false)}
            className="font-bold text-blue-600 hover:text-blue-800 active:scale-95 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 transition cursor-pointer"
            title="Sincronizza subito i contatti e gli appuntamenti con il Cloud"
          >
            Sincronizza 🔄
          </button>
          <button
            onClick={handleHardReload}
            className="text-[10px] text-slate-400 hover:text-slate-700 underline"
            title="Ricarica forzata della pagina se vedi la vecchia versione"
          >
            Svuota Cache
          </button>
        </div>
      </div>

      {/* Contenitore Principale */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 flex-1">
        {currentView === 'agenda' && (
          <CalendarAgendaView
            appointments={appointments}
            onEditAppointment={handleEditAppointment}
            onOpenWhatsApp={handleOpenWhatsApp}
            onUpdateStatus={handleUpdateStatus}
            onNewAppointment={handleSelectDateForNew}
          />
        )}

        {currentView === 'month' && (
          <CalendarMonthView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            appointments={appointments}
            onSelectDate={handleSelectDateForNew}
            onEditAppointment={handleEditAppointment}
            onOpenWhatsApp={handleOpenWhatsApp}
          />
        )}

        {currentView === 'week' && (
          <CalendarWeekView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            appointments={appointments}
            onSelectDate={handleSelectDateForNew}
            onEditAppointment={handleEditAppointment}
            onOpenWhatsApp={handleOpenWhatsApp}
          />
        )}

        {currentView === 'day' && (
          <CalendarDayView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            appointments={appointments}
            onSelectDate={handleSelectDateForNew}
            onEditAppointment={handleEditAppointment}
            onOpenWhatsApp={handleOpenWhatsApp}
          />
        )}
      </main>

      {/* Barra Inferiore Mobile per Smartphone */}
      <BottomNavMobile
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewAppointment={handleNewGenericAppointment}
        onOpenClients={() => setIsClientsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        dueAlertsCount={dueAlertsCount}
      />

      {/* MODALI */}
      {/* 1. Modale Appuntamento */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialDate={selectedDateForNew}
        appointmentToEdit={editingAppointment}
        clients={clients}
        onOpenWhatsApp={handleOpenWhatsApp}
        services={services}
        onUpdateServices={handleUpdateServices}
      />

      {/* 2. Modale WhatsApp */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        appointment={whatsAppAppointment}
        settings={settings}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* 3. Modale Rubrica Clienti con Sync Cloud Istantaneo */}
      <ClientDirectoryModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        clients={clients}
        appointments={appointments}
        onBatchImportClients={handleBatchImportClients}
        onSaveClient={(newClient) => {
          const nowIso = new Date().toISOString()
          const stamped = { ...newClient, updatedAt: nowIso }
          const currentClients = loadClients()
          let updatedClients = []
          const exists = currentClients.some((c) => c.id === stamped.id)
          if (exists) {
            updatedClients = currentClients.map((c) => (c.id === stamped.id ? stamped : c))
          } else {
            updatedClients = [...currentClients, stamped]
          }
          saveClients(updatedClients)
          setClients(updatedClients)
          pushCloudData({
            appointments: loadAppointments(),
            clients: updatedClients,
            settings: loadSettings(),
            services: loadServices(),
            deletedAppIds: loadDeletedAppIds(),
            deletedClientIds: loadDeletedClientIds()
          }).then((res) => {
            if (res && res.success) {
              setLastSyncTime(
                new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              )
              setSyncStatus('online')
            }
          })
        }}
        onDeleteClient={(id) => {
          if (!id) return
          const currentDel = loadDeletedClientIds()
          const updatedDeleted = Array.from(new Set([...currentDel, id]))
          saveDeletedClientIds(updatedDeleted)
          setDeletedClientIds(updatedDeleted)

          const updated = loadClients().filter((c) => c && c.id !== id)
          saveClients(updated)
          setClients(updated)

          pushCloudData({
            appointments: loadAppointments(),
            clients: updated,
            settings: loadSettings(),
            services: loadServices(),
            deletedAppIds: loadDeletedAppIds(),
            deletedClientIds: updatedDeleted
          })
            .then((res) => {
              if (res && res.success) {
                setLastSyncTime(
                  new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                )
                setSyncStatus('online')
              }
            })
            .catch((err) => console.warn('Errore push delete client:', err))
        }}
        onNewAppointmentWithClient={handleNewAppointmentWithClient}
        onTriggerSync={() => handleTriggerSync(false)}
        isSyncing={isSyncing}
      />

      {/* 4. Modale Statistiche & Report */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        appointments={appointments}
      />

      {/* 5. Modale Impostazioni & Sincronizzazione */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          saveSettings(newSettings)
          setSettings(loadSettings())
          if (Array.isArray(newSettings.services)) {
            saveServices(newSettings.services)
            setServices(newSettings.services)
          }
          handleTriggerSync(true, newSettings?.cloudSync?.syncCode)
        }}
        onTriggerSync={(roomCode) => handleTriggerSync(true, roomCode)}
        isSyncing={isSyncing}
      />
    </div>
  )
}
