import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecorder } from '../src/hooks/useRecorder'

class FakeRecorder extends EventTarget {
  static isTypeSupported = () => true
  static instances: FakeRecorder[] = []
  state = 'inactive'
  mimeType: string
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(_stream: MediaStream, options?: { mimeType: string }) {
    super()
    this.mimeType = options?.mimeType ?? 'audio/webm'
    FakeRecorder.instances.push(this)
  }

  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    queueMicrotask(() => this.dispatchEvent(new Event('stop')))
  }
}

const stopTrack = vi.fn()
const getUserMedia = vi.fn()

beforeEach(() => {
  FakeRecorder.instances = []
  getUserMedia.mockReset().mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  })
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('grabación: comportamiento base', () => {
  it('graba audio, conserva su formato y libera el micrófono', async () => {
    const { result } = renderHook(() => useRecorder())
    await act(() => result.current.startRecording())
    expect(result.current.isRecording).toBe(true)
    FakeRecorder.instances[0].ondataavailable?.({ data: new Blob(['audio']) })
    let audio: Blob | undefined
    await act(async () => { audio = await result.current.stopRecording() })
    expect(audio?.size).toBe(5)
    expect(audio?.type).toBe('audio/webm;codecs=opus')
    expect(stopTrack).toHaveBeenCalledTimes(1)
    expect(result.current.isRecording).toBe(false)
  })

  it('informa el rechazo del permiso de micrófono', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    const { result } = renderHook(() => useRecorder())
    await act(() => result.current.startRecording())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.error).toBeTruthy()
    expect(FakeRecorder.instances).toHaveLength(0)
  })

  it('rechaza detener cuando no existe una grabación', async () => {
    const { result } = renderHook(() => useRecorder())
    await expect(result.current.stopRecording()).rejects.toThrow()
  })

  it('rechaza audio vacío y libera el micrófono', async () => {
    const { result } = renderHook(() => useRecorder())
    await act(() => result.current.startRecording())
    await act(async () => {
      await expect(result.current.stopRecording()).rejects.toThrow()
    })
    expect(stopTrack).toHaveBeenCalledTimes(1)
    expect(result.current.isRecording).toBe(false)
  })
})
