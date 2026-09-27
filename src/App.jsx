import React, { useState, useEffect } from 'react'
import {
  loadAppointments,
  saveAppointments,
  loadSettings,
  saveSettings,
  loadClients,
  saveClients
} from './utils/storage'
import { pushToCloud, pullFromCloud } from './utils/cloudSync'

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
    // Se su schermo piccolo, apri direttamente in modalità Agenda per massima comodità
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

  // Controllo parametri URL (es. ?room=CAL-XXXX) per la sincronizzazione immediata tra PC e smartphone
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    if (roomParam) {
      setSettings((prev) => {
        const updated = {
          ...prev,
          cloudSync: { ...prev.cloudSync, syncCode: roomParam.toUpperCase(), enabled: true }
        }
        saveSettings(updated)
        return updated
      })
      // Prova a sincronizzare subito
      handleTriggerSync(roomParam.toUpperCase())
    }
  }, [])

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

  // Gestione sincronizzazione Cloud
  const handleTriggerSync = async (code) => {
    const targetCode = code || settings.cloudSync?.syncCode
    if (!targetCode) return

    setIsSyncing(true)
    try {
      // 1. Prova a caricare dal cloud
      const cloudRes = await pullFromCloud(targetCode)
      if (cloudRes.success && cloudRes.data) {
        if (cloudRes.data.appointments) setAppointments(cloudRes.data.appointments)
        if (cloudRes.data.clients) setClients(cloudRes.data.clients)
        if (cloudRes.data.settings) setSettings(cloudRes.data.settings)
      } else {
        // Se non esiste ancora sul cloud, invia i dati correnti
        await pushToCloud(targetCode, { appointments, clients, settings })
      }
    } catch (e) {
      console.warn('Errore sync:', e)
    } finally {
      setIsSyncing(false)
    }
  }

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

    // Se il cliente non è ancora in rubrica, aggiungilo automaticamente!
    if (appData.clientName) {
      const clientExists = clients.some(
        (c) => c.name.toLowerCase() === appData.clientName.toLowerCase()
      )
      if (!clientExists) {
        setClients((prev) => [
          ...prev,
          {
            id: 'c_' + Date.now(),
            name: appData.clientName,
            phone: appData.clientPhone || '',
            notes: ''
          }
        ])
      }
    }

    return appData
  }

  // Eliminazione Appuntamento
  const handleDeleteAppointment = (id) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id))
  }

  // Aggiornamento Rapido Stato Appuntamento
  const handleUpdateStatus = (id, newStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 pb-16 md:pb-6">
      {/* Barra Superiore */}
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onNewAppointment={handleNewGenericAppointment}
        onOpenClients={() => setIsClientsModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        appointmentsCount={appointments.length}
        syncCode={settings.cloudSync?.syncCode}
      />

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

      {/* 3. Modale Rubrica Clienti */}
      <ClientDirectoryModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        clients={clients}
        appointments={appointments}
        onSaveClient={(newClient) => {
          setClients((prev) => {
            const exists = prev.some((c) => c.id === newClient.id)
            if (exists) return prev.map((c) => (c.id === newClient.id ? newClient : c))
            return [...prev, newClient]
          })
        }}
        onDeleteClient={(id) => setClients((prev) => prev.filter((c) => c.id !== id))}
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
        onSaveSettings={setSettings}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
      />
    </div>
  )
}
