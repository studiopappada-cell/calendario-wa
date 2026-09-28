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
  saveDeletedClientIds
} from './utils/storage'
import { fetchCloudData, pushCloudData } from './utils/githubSync'

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
  const map = new Map()

  if (Array.isArray(incomingList)) {
    incomingList.forEach((item) => {
      if (item && item.id && !deletedIdsSet.has(item.id)) {
        map.set(item.id, item)
      }
    })
  }

  if (Array.isArray(localList)) {
    localList.forEach((item) => {
      if (item && item.id && !deletedIdsSet.has(item.id)) {
        map.set(item.id, item)
      }
    })
  }

  return Array.from(map.values())
}

// Merge clienti senza perdere quelli locali ed escludendo i cancellati
function mergeClients(localList, incomingList, deletedIdsSet) {
  const map = new Map()

  if (Array.isArray(incomingList)) {
    incomingList.forEach((item) => {
      if (item && item.id && !deletedIdsSet.has(item.id)) {
        map.set(item.id, item)
      }
    })
  }

  if (Array.isArray(localList)) {
    localList.forEach((item) => {
      if (item && item.id && !deletedIdsSet.has(item.id)) {
        map.set(item.id, item)
      }
    })
  }

  return Array.from(map.values())
}

export default function App() {
  const [appointments, setAppointments] = useState(() => loadAppointments())
  const [settings, setSettings] = useState(() => loadSettings())
  const [clients, setClients] = useState(() => loadClients())
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

  const isInitialMount = useRef(true)

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

  // 1. All'avvio dell'app: recupera i dati freschi dal cloud GitHub e sblocca l'audio
  useEffect(() => {
    // Inizializza lo sblocco dell'audio per suoni e campanella al primo tocco
    initAudioUnlock()

    const doInitialSync = async () => {
      setIsSyncing(true)
      setSyncStatus('syncing')
      try {
        const cloudRes = await fetchCloudData()
        if (cloudRes.success && cloudRes.data) {
          const cloudData = cloudRes.data

          // 1. Allinea gli ID eliminati (tombstones)
          let currentDelApps = loadDeletedAppIds()
          if (Array.isArray(cloudData.deletedAppIds)) {
            currentDelApps = Array.from(new Set([...currentDelApps, ...cloudData.deletedAppIds]))
            saveDeletedAppIds(currentDelApps)
            setDeletedAppIds(currentDelApps)
          }
          const delAppSet = new Set(currentDelApps)

          let currentDelClients = loadDeletedClientIds()
          if (Array.isArray(cloudData.deletedClientIds)) {
            currentDelClients = Array.from(new Set([...currentDelClients, ...cloudData.deletedClientIds]))
            saveDeletedClientIds(currentDelClients)
            setDeletedClientIds(currentDelClients)
          }
          const delClientSet = new Set(currentDelClients)

          // 2. Merge clienti escludendo eliminati
          if (Array.isArray(cloudData.clients)) {
            const currentClients = loadClients().filter((c) => c && !delClientSet.has(c.id))
            const mergedC = mergeClients(currentClients, cloudData.clients, delClientSet)
            setClients(mergedC)
            saveClients(mergedC)
          }

          // 3. Merge appuntamenti escludendo eliminati
          if (Array.isArray(cloudData.appointments)) {
            const currentApps = loadAppointments().filter((a) => a && !delAppSet.has(a.id))
            const mergedA = mergeAppointments(currentApps, cloudData.appointments, delAppSet)
            setAppointments(mergedA)
            saveAppointments(mergedA)

            // CONTROLLO IMMEDIATO DEGLI ALERT APPENA SCARICATI DAL CLOUD!
            checkAndTriggerAlerts(mergedA)

            if (mergedA.length > cloudData.appointments.length) {
              pushCloudData({
                appointments: mergedA,
                clients: loadClients(),
                settings,
                deletedAppIds: currentDelApps,
                deletedClientIds: currentDelClients
              })
            }
          }

          if (cloudData.settings) {
            setSettings(cloudData.settings)
            saveSettings(cloudData.settings)
          }

          setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          setSyncStatus('online')
        } else {
          // Se nel cloud non c'è ancora il file, carichiamo lo stato corrente locale
          await pushCloudData({
            appointments,
            clients,
            settings,
            deletedAppIds: loadDeletedAppIds(),
            deletedClientIds: loadDeletedClientIds()
          })
          setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          setSyncStatus('online')
          checkAndTriggerAlerts(appointments)
        }
      } catch (err) {
        console.error('Errore sincronizzazione iniziale:', err)
        setSyncStatus('error')
      } finally {
        setIsSyncing(false)
      }
    }

    doInitialSync()

    // Polling ogni 10 secondi e quando lo smartphone viene sbloccato o l'utente torna sull'app
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleTriggerSync(false)
      }
      checkAndTriggerAlerts(loadAppointments())
    }, 10000)

    const onWakeUp = () => {
      handleTriggerSync(false)
      checkAndTriggerAlerts(loadAppointments())
    }

    document.addEventListener('visibilitychange', onWakeUp)
    window.addEventListener('focus', onWakeUp)
    window.addEventListener('pageshow', onWakeUp)
    window.addEventListener('touchstart', onWakeUp, { once: true, passive: true })

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onWakeUp)
      window.removeEventListener('focus', onWakeUp)
      window.removeEventListener('pageshow', onWakeUp)
    }
  }, [checkAndTriggerAlerts])

  // Sincronizzazione non distruttiva dal Cloud (con filtro tombstones)
  const handleTriggerSync = async (forcePush = false) => {
    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      const delAppList = loadDeletedAppIds()
      const delAppSet = new Set(delAppList)
      const delClientList = loadDeletedClientIds()
      const delClientSet = new Set(delClientList)

      if (forcePush) {
        await pushCloudData({
          appointments: appointments.filter((a) => !delAppSet.has(a.id)),
          clients: clients.filter((c) => !delClientSet.has(c.id)),
          settings,
          deletedAppIds: delAppList,
          deletedClientIds: delClientList
        })
        setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
        setSyncStatus('online')
      } else {
        const res = await fetchCloudData()
        if (res.success && res.data) {
          // Allinea tombstones dal cloud se presenti
          let allDelApps = delAppList
          if (Array.isArray(res.data.deletedAppIds)) {
            allDelApps = Array.from(new Set([...delAppList, ...res.data.deletedAppIds]))
            saveDeletedAppIds(allDelApps)
            setDeletedAppIds(allDelApps)
          }
          const activeDelAppSet = new Set(allDelApps)

          let allDelClients = delClientList
          if (Array.isArray(res.data.deletedClientIds)) {
            allDelClients = Array.from(new Set([...delClientList, ...res.data.deletedClientIds]))
            saveDeletedClientIds(allDelClients)
            setDeletedClientIds(allDelClients)
          }
          const activeDelClientSet = new Set(allDelClients)

          if (Array.isArray(res.data.clients)) {
            const currentLocalClients = loadClients().filter((c) => c && !activeDelClientSet.has(c.id))
            const mergedClients = mergeClients(currentLocalClients, res.data.clients, activeDelClientSet)
            setClients(mergedClients)
            saveClients(mergedClients)
          }
          if (Array.isArray(res.data.appointments)) {
            const currentLocalApps = loadAppointments().filter((a) => a && !activeDelAppSet.has(a.id))
            const mergedApps = mergeAppointments(currentLocalApps, res.data.appointments, activeDelAppSet)
            setAppointments(mergedApps)
            saveAppointments(mergedApps)

            // Esegue subito il controllo allarmi al ricevimento dei dati cloud
            checkAndTriggerAlerts(mergedApps)

            if (mergedApps.length > (res.data.appointments?.length || 0)) {
              pushCloudData({
                appointments: mergedApps,
                clients: loadClients(),
                settings,
                deletedAppIds: allDelApps,
                deletedClientIds: allDelClients
              })
            }
          }
          if (res.data.settings) {
            setSettings(res.data.settings)
            saveSettings(res.data.settings)
          }
          setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          setSyncStatus('online')
        }
      }
    } catch (e) {
      console.warn('Errore sync:', e)
      setSyncStatus('error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Persistenza locale automatica
  useEffect(() => {
    saveAppointments(appointments)
  }, [appointments])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveClients(clients)
  }, [clients])

  // Controllo automatico continuo degli alert al variare degli appuntamenti
  useEffect(() => {
    checkAndTriggerAlerts(appointments)
  }, [appointments, checkAndTriggerAlerts])

  // Creazione o Salvataggio Appuntamento (immediato e a prova di errore)
  const handleSaveAppointment = (appData) => {
    try {
      const sanitizedApp = {
        ...appData,
        id: appData.id || 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        clientName: String(appData.clientName || '').trim(),
        clientPhone: String(appData.clientPhone || '').trim(),
        service: String(appData.service || 'Consulenza').trim(),
        date: String(appData.date || getLocalTodayString()),
        time: String(appData.time || '10:00'),
        duration: Number(appData.duration || 60),
        status: String(appData.status || 'confirmed'),
        reminderAlert: String(appData.reminderAlert || '1d'),
        notes: String(appData.notes || '').trim()
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

      // 1. Aggiorna lo stato React
      setAppointments(updatedApps)
      // 2. Salva immediatamente in LocalStorage del browser/telefono
      saveAppointments(updatedApps)

      // 3. Esegue subito il controllo alert per emettere suono, vibrazione o banner se dovuto oggi o imminente
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
            notes: ''
          }
          updatedClients = [...currentClients, newClient]
          setClients(updatedClients)
          saveClients(updatedClients)
        }
      }

      // 4. Salva immediatamente nel Cloud GitHub con il token integrato
      pushCloudData({ appointments: updatedApps, clients: updatedClients, settings })
        .then((res) => {
          if (res && res.success) {
            setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
            setSyncStatus('online')
          }
        })
        .catch((err) => console.warn('Errore push cloud:', err))

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

    const updated = appointments.filter((a) => a && a.id !== id)
    setAppointments(updated)
    saveAppointments(updated)

    pushCloudData({
      appointments: updated,
      clients,
      settings,
      deletedAppIds: updatedDeleted,
      deletedClientIds: loadDeletedClientIds()
    }).then((res) => {
      if (res && res.success) {
        setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
        setSyncStatus('online')
      }
    }).catch((err) => console.warn('Errore push delete app:', err))
  }

  // Aggiornamento Rapido Stato Appuntamento
  const handleUpdateStatus = (id, newStatus) => {
    const updated = appointments.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    setAppointments(updated)
    pushCloudData({ appointments: updated, clients, settings })
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
    setSelectedDateForNew(new Date().toISOString().split('T')[0])
    setEditingAppointment(null)
    setIsAppointmentModalOpen(true)
  }

  // Nuovo appuntamento partendo da un cliente in rubrica
  const handleNewAppointmentWithClient = (client) => {
    setEditingAppointment({
      id: 'app_' + Date.now(),
      clientName: client.name,
      clientPhone: client.phone || '',
      service: 'Consulenza',
      date: new Date().toISOString().split('T')[0],
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
      newClients.forEach((imported) => {
        if (!imported) return
        const cleanName = String(imported.name || '').trim()
        const cleanPhone = String(imported.phone || '').trim()
        if (!cleanName) return

        const nameKey = cleanName.toLowerCase()
        const isDuplicate = existingNames.has(nameKey) || (cleanPhone && existingPhones.has(cleanPhone))

        if (!isDuplicate && !delSet.has(imported.id)) {
          const clientObj = {
            id: imported.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: cleanName,
            phone: cleanPhone,
            notes: String(imported.notes || '').trim()
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
        appointments,
        clients: finalUpdated,
        settings,
        deletedAppIds: loadDeletedAppIds(),
        deletedClientIds: currentDel
      })
        .then((res) => {
          if (res && res.success) {
            setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
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
  }, [isClientsModalOpen, clients.length])

  const handleHardReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    const tokenPart = window.location.hash || ''
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now() + tokenPart
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
    <div className="min-h-screen bg-white flex flex-col text-slate-900 pb-16 md:pb-6" style={{ backgroundColor: '#ffffff' }}>
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
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="font-semibold text-slate-800">
              {isSyncing ? 'Sincronizzazione Cloud...' : `Cloud Attivo ${lastSyncTime ? `(${lastSyncTime})` : ''}`}
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
      />

      {/* 2. Modale WhatsApp (Il fulcro della richiesta) */}
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
          let updatedClients = []
          const exists = clients.some((c) => c.id === newClient.id)
          if (exists) {
            updatedClients = clients.map((c) => (c.id === newClient.id ? newClient : c))
          } else {
            updatedClients = [...clients, newClient]
          }
          setClients(updatedClients)
          saveClients(updatedClients)
          pushCloudData({ appointments, clients: updatedClients, settings }).then(() => {
            setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          })
        }}
        onDeleteClient={(id) => {
          if (!id) return
          const currentDel = loadDeletedClientIds()
          const updatedDeleted = Array.from(new Set([...currentDel, id]))
          saveDeletedClientIds(updatedDeleted)
          setDeletedClientIds(updatedDeleted)

          const updated = clients.filter((c) => c && c.id !== id)
          setClients(updated)
          saveClients(updated)

          pushCloudData({
            appointments,
            clients: updated,
            settings,
            deletedAppIds: loadDeletedAppIds(),
            deletedClientIds: updatedDeleted
          }).then((res) => {
            if (res && res.success) {
              setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
              setSyncStatus('online')
            }
          }).catch((err) => console.warn('Errore push delete client:', err))
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
          setSettings(newSettings)
          saveSettings(newSettings)
          pushCloudData({ appointments, clients, settings: newSettings }).then(() => {
            setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          })
        }}
        onTriggerSync={() => handleTriggerSync(true)}
        isSyncing={isSyncing}
      />
    </div>
  )
}
