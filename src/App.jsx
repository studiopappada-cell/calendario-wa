import React, { useState, useEffect, useRef } from 'react'
import {
  loadAppointments,
  saveAppointments,
  loadSettings,
  saveSettings,
  loadClients,
  saveClients
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

export default function App() {
  const [appointments, setAppointments] = useState(() => loadAppointments())
  const [settings, setSettings] = useState(() => loadSettings())
  const [clients, setClients] = useState(() => loadClients())

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
          // Se il cloud ha clienti o appuntamenti, sincronizziamoli
          if (Array.isArray(cloudData.clients) && cloudData.clients.length > 0) {
            setClients(cloudData.clients)
            saveClients(cloudData.clients)
          } else if (clients.length > 0) {
            // Se il cloud non li ha ma noi li abbiamo in locale, inviamoli subito al cloud!
            await pushCloudData({ appointments, clients, settings })
          }

          if (Array.isArray(cloudData.appointments) && cloudData.appointments.length > 0) {
            setAppointments(cloudData.appointments)
            saveAppointments(cloudData.appointments)
          } else if (appointments.length > 0) {
            await pushCloudData({ appointments, clients, settings })
          }

          if (cloudData.settings) {
            setSettings(cloudData.settings)
            saveSettings(cloudData.settings)
          }

          setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          setSyncStatus('online')
        } else {
          // Se nel cloud non c'è ancora il file, carichiamo lo stato corrente locale
          await pushCloudData({ appointments, clients, settings })
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

  // Sincronizzazione automatica dal Cloud
  const handleTriggerSync = async (forcePush = false) => {
    setIsSyncing(true)
    setSyncStatus('syncing')
    try {
      if (forcePush) {
        await pushCloudData({ appointments, clients, settings })
        setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
        setSyncStatus('online')
      } else {
        const res = await fetchCloudData()
        if (res.success && res.data) {
          if (Array.isArray(res.data.clients)) {
            setClients(res.data.clients)
            saveClients(res.data.clients)
          }
          if (Array.isArray(res.data.appointments)) {
            setAppointments(res.data.appointments)
            saveAppointments(res.data.appointments)
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

  // Creazione o Salvataggio Appuntamento
  const handleSaveAppointment = (appData) => {
    let updatedApps = []
    const exists = appointments.some((a) => a.id === appData.id)

    if (exists) {
      updatedApps = appointments.map((a) => (a.id === appData.id ? appData : a))
    } else {
      updatedApps = [...appointments, appData]
    }
    setAppointments(updatedApps)

    let updatedClients = [...clients]
    // Se il cliente non è ancora in rubrica, aggiungilo automaticamente!
    if (appData.clientName) {
      const clientExists = clients.some(
        (c) => c.name.toLowerCase() === appData.clientName.toLowerCase()
      )
      if (!clientExists) {
        const newClient = {
          id: 'c_' + Date.now(),
          name: appData.clientName,
          phone: appData.clientPhone || '',
          notes: ''
        }
        updatedClients = [...clients, newClient]
        setClients(updatedClients)
      }
    }

    // Salva immediatamente nel Cloud GitHub!
    pushCloudData({ appointments: updatedApps, clients: updatedClients, settings }).then(() => {
      setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
    })

    return appData
  }

  // Eliminazione Appuntamento
  const handleDeleteAppointment = (id) => {
    const updated = appointments.filter((a) => a.id !== id)
    setAppointments(updated)
    pushCloudData({ appointments: updated, clients, settings }).then(() => {
      setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
    })
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

  const handleHardReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }
    const tokenPart = window.location.hash || ''
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now() + tokenPart
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
          const updated = clients.filter((c) => c.id !== id)
          setClients(updated)
          saveClients(updated)
          pushCloudData({ appointments, clients: updated, settings }).then(() => {
            setLastSyncTime(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }))
          })
        }}
        onNewAppointmentWithClient={handleNewAppointmentWithClient}
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
