export async function checkBackendHealth(): Promise<void> {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error('Backend no disponible')
  }
}
