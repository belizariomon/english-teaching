import type { ConversationResult } from '../types/conversation'

export async function checkBackendHealth(): Promise<void> {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error('Backend no disponible')
  }
}

function getAudioExtension(blob: Blob): string {
  const mimeType = blob.type.toLowerCase()

  if (mimeType.includes('webm')) {
    return 'webm'
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a'
  }

  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    return 'mp3'
  }

  if (mimeType.includes('wav')) {
    return 'wav'
  }

  return 'webm'
}

export async function sendConversation(
  audioBlob: Blob,
): Promise<ConversationResult> {
  const formData = new FormData()

  const extension = getAudioExtension(audioBlob)

  formData.append(
    'audio',
    audioBlob,
    `recording.${extension}`,
  )

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

  return response.json() as Promise<ConversationResult>
}