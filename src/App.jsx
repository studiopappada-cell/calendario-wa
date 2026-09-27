import React, { useState, useEffect, useRef } from 'react'
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
import {
  isAppointmentAlertDue,
  showPhoneNotification,
  requestNotificationPermission,
  getDaysUntilAppointment
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

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncStatus, setSyncStatus] = useState('online') // 'online', 'syncing', 'error'

  const isInitialMount = useRef(true)

  // 1. All'avvio dell'app: recupera i dati freschi dal cloud GitHub
  useEffect(() => {
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
        }
      } catch (err) {
        console.error('Errore sincronizzazione iniziale:', err)
        setSyncStatus('error')
      } finally {
        setIsSyncing(false)
      }
    }

    doInitialSync()

    // Polling ogni 12 secondi e quando l'utente torna sulla finestra (focus o tab attiva)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleTriggerSync(false)
      }
    }, 12000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleTriggerSync(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

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
            const mergedClients = mergeClients(clients, res.data.clients, activeDelClientSet)
            setClients(mergedClients)
            saveClients(mergedClients)
          }
          if (Array.isArray(res.data.appointments)) {
            const mergedApps = mergeAppointments(appointments, res.data.appointments, activeDelAppSet)
            setAppointments(mergedApps)
            saveAppointments(mergedApps)
            if (mergedApps.length > (res.data.appointments?.length || 0)) {
              pushCloudData({
                appointments: mergedApps,
                clients,
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

  // Controllo automatico e invio delle notifiche promemoria sullo smartphone
  useEffect(() => {
    const checkAlerts = () => {
      if (!Array.isArray(appointments) || appointments.length === 0) return

      const todayStr = new Date().toISOString().split('T')[0]
      appointments.forEach((app) => {
        if (!app || !app.id || app.status === 'cancelled') return

        if (isAppointmentAlertDue(app)) {
          const notifiedKey = `alert_sent_${app.id}_${todayStr}`
          const alreadySent = localStorage.getItem(notifiedKey)
          if (!alreadySent) {
            const daysLeft = getDaysUntilAppointment(app.date)
            let alertMsg = ''
            if (daysLeft === 0) {
              alertMsg = `OGGI alle ${app.time}: appuntamento con ${app.clientName || 'Cliente'} (${app.service || 'Consulenza'})`
            } else if (daysLeft === 1) {
              alertMsg = `DOMANI alle ${app.time}: appuntamento con ${app.clientName || 'Cliente'} (${app.service || 'Consulenza'})`
            } else {
              alertMsg = `Mancano ${daysLeft} giorni: appuntamento il ${app.date} alle ${app.time} con ${app.clientName || 'Cliente'}`
            }

            showPhoneNotification(`🔔 Promemoria: ${app.clientName || 'Appuntamento'}`, alertMsg)
            try {
              localStorage.setItem(notifiedKey, 'true')
            } catch (e) {}
          }
        }
      })
    }

    // Controlla subito dopo 2 secondi dal montaggio, poi ripete ogni 15 minuti
    const timeout = setTimeout(checkAlerts, 2000)
    const alertInterval = setInterval(checkAlerts, 15 * 60 * 1000)

    return () => {
      clearTimeout(timeout)
      clearInterval(alertInterval)
    }
  }, [appointments])

  // Creazione o Salvataggio Appuntamento (immediato e a prova di errore)
  const handleSaveAppointment = (appData) => {
    try {
      const sanitizedApp = {
        ...appData,
        id: appData.id || 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        clientName: String(appData.clientName || '').trim(),
        clientPhone: String(appData.clientPhone || '').trim(),
        service: String(appData.service || 'Consulenza').trim(),
        date: String(appData.date || new Date().toISOString().split('T')[0]),
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

      let updatedApps = []
      const exists = appointments.some((a) => a.id === sanitizedApp.id)
      if (exists) {
        updatedApps = appointments.map((a) => (a.id === sanitizedApp.id ? sanitizedApp : a))
      } else {
        updatedApps = [...appointments, sanitizedApp]
      }

      // 1. Aggiorna lo stato React
      setAppointments(updatedApps)
      // 2. Salva immediatamente in LocalStorage del browser/telefono
      saveAppointments(updatedApps)

      // Se l'alert è impostato per oggi o imminente, mostra subito la notifica visiva sul telefono
      if (isAppointmentAlertDue(sanitizedApp)) {
        const daysLeft = getDaysUntilAppointment(sanitizedApp.date)
        let alertMsg = ''
        if (daysLeft === 0) {
          alertMsg = `OGGI alle ore ${sanitizedApp.time}: appuntamento con ${sanitizedApp.clientName} per ${sanitizedApp.service}`
        } else if (daysLeft === 1) {
          alertMsg = `DOMANI alle ore ${sanitizedApp.time}: appuntamento con ${sanitizedApp.clientName} per ${sanitizedApp.service}`
        } else {
          alertMsg = `Tra ${daysLeft} giorni (${sanitizedApp.date} ore ${sanitizedApp.time}): appuntamento con ${sanitizedApp.clientName}`
        }
        showPhoneNotification(`🔔 Promemoria: ${sanitizedApp.clientName}`, alertMsg)
      }

      let updatedClients = [...clients]
      // 3. Se il cliente non è ancora in rubrica, aggiungilo in rubrica
      if (sanitizedApp.clientName) {
        const targetName = sanitizedApp.clientName.toLowerCase()
        const clientExists = clients.some(
          (c) => String(c?.name || '').toLowerCase() === targetName
        )
        if (!clientExists) {
          const newClient = {
            id: 'c_' + Date.now(),
            name: sanitizedApp.clientName,
            phone: sanitizedApp.clientPhone || '',
            notes: ''
          }
          updatedClients = [...clients, newClient]
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
    (a) => a && a.status !== 'cancelled' && isAppointmentAlertDue(a)
  ).length

  const handleToggleAlerts = async () => {
    try {
      await requestNotificationPermission()
    } catch (e) {}
    setCurrentView('agenda')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col text-slate-900 pb-16 md:pb-6" style={{ backgroundColor: '#ffffff' }}>
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
