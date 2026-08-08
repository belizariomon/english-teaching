import { useState } from 'react'
import { sendConversation } from '../services/api'
import { useRecorder } from '../hooks/useRecorder'
import type { ConversationResult } from '../types/conversation'

type PanelState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

type ConversationPanelProps = {
  backendReady: boolean
}

export function ConversationPanel({ backendReady }: ConversationPanelProps) {
  const { isRecording, startRecording, stopRecording, error: recorderError } = useRecorder()
  const [panelState, setPanelState] = useState<PanelState>('idle')
  const [result, setResult] = useState<ConversationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleButtonClick = async () => {
    if (panelState === 'processing') return

    if (isRecording) {
      setPanelState('processing')
      setErrorMessage(null)

      try {
        const audioBlob = await stopRecording()
        const conversationResult = await sendConversation(audioBlob)
        setResult(conversationResult)
        setPanelState('done')

        const audio = new Audio(`data:audio/mp3;base64,${conversationResult.audioBase64}`)
        audio.play()
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al procesar la conversación')
        setPanelState('error')
      }
      return
    }

    setResult(null)
    setErrorMessage(null)
    await startRecording()
    setPanelState('recording')
  }

  const handleRetry = () => {
    setResult(null)
    setErrorMessage(null)
    setPanelState('idle')
  }

  const displayError = errorMessage ?? recorderError
  const buttonLabel =
    panelState === 'processing'
      ? 'Procesando...'
      : isRecording
        ? 'Detener y enviar'
        : 'Hablar'

  const buttonDisabled = !backendReady || panelState === 'processing'

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={buttonDisabled}
        className={`rounded-2xl px-8 py-4 text-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isRecording
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-neutral-900 text-white hover:bg-neutral-800'
        }`}
      >
        {buttonLabel}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600">
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
          <span>Grabando...</span>
        </div>
      )}

      {panelState === 'processing' && (
        <p className="text-neutral-500">Procesando...</p>
      )}

      {panelState === 'error' && displayError && (
        <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="text-red-600">{displayError}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-xl bg-neutral-900 px-6 py-2 text-white hover:bg-neutral-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {panelState === 'done' && result && (
        <div className="w-full space-y-4 rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-neutral-500">Lo dijiste:</p>
            <p className="mt-1 text-lg">{result.transcript}</p>
          </div>

          {result.correction !== result.transcript && (
            <div>
              <p className="text-sm font-medium text-neutral-500">Corrección:</p>
              <p className="mt-1 text-lg text-amber-700">{result.correction}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-neutral-500">Explicación:</p>
            <p className="mt-1">{result.explanation}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-500">Respuesta:</p>
            <p className="mt-1 text-lg">{result.reply}</p>
          </div>
        </div>
      )}
    </div>
  )
}
