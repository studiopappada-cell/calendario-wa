import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Errore catturato da ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Si è verificato un imprevisto</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', maxWidth: '400px' }}>
            L'applicazione ha riscontrato un errore temporaneo durante il caricamento della vista.
          </p>
          <div style={{ color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: '500px', wordBreak: 'break-word', marginBottom: '1.5rem', textAlign: 'left' }}>
            {String(this.state.error?.message || this.state.error || 'Errore di inizializzazione')}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                window.location.reload()
              }}
              style={{ padding: '0.6rem 1.2rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Ricarica Calendario
            </button>
            <button
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then((names) => names.forEach((n) => caches.delete(n)))
                }
                const tokenPart = window.location.hash || ''
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now() + tokenPart
              }}
              style={{ padding: '0.6rem 1.2rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Aggiorna Cache
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Registrazione del Service Worker per notifiche smartphone e PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('Service Worker registrato con successo:', reg.scope)
      })
      .catch((err) => {
        console.warn('Registrazione Service Worker non riuscita:', err)
      })
  })
}

