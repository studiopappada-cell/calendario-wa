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
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '400px' }}>
            L'applicazione ha riscontrato un errore temporaneo durante il caricamento della vista.
          </p>
          <button
            onClick={() => {
              window.location.reload()
            }}
            style={{ padding: '0.6rem 1.2rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Ricarica Calendario
          </button>
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

