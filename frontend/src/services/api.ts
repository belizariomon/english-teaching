import type { ConversationResult } from '../types/conversation'

export async function checkBackendHealth(): Promise<void> {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error('Backend no disponible')
  }
}

export async function sendConversation(audioBlob: Blob): Promise<ConversationResult> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const response = await fetch('/api/conversation', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : 'Error al enviar la conversación'
    throw new Error(message)
  }

  return response.json()
}
