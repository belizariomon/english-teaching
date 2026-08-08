import { useEffect, useState } from 'react'
import { ConversationPanel } from './components/ConversationPanel'
import { checkBackendHealth } from './services/api'

function App() {
  const [backendStatus, setBackendStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('error'))
  }, [])

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">English AI Tutor</h1>
        <p className="mt-3 text-lg text-neutral-600">
          Practica inglés conversando por voz con una IA
        </p>
      </div>

      {backendStatus === 'loading' && (
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-neutral-500">Conectando con el servidor...</p>
        </div>
      )}

      {backendStatus === 'error' && (
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-red-600">
            No se pudo conectar al servidor. ¿Está corriendo el backend?
          </p>
        </div>
      )}

      {backendStatus === 'ok' && (
        <ConversationPanel backendReady={true} />
      )}
    </div>
  )
}

export default App
