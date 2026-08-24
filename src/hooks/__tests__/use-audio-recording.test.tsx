import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAudioRecording } from '../use-audio-recording'

const { recordAudioMock } = vi.hoisted(() => ({
  recordAudioMock: Object.assign(vi.fn(), { stop: vi.fn() }),
}))

vi.mock('@/lib/audio-utils', () => ({
  recordAudio: recordAudioMock,
}))

describe('useAudioRecording', () => {
  let getUserMediaMock: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    getUserMediaMock = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: getUserMediaMock,
      },
    })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Expected when the mocked recorder setup fails.
    })
    recordAudioMock.mockReset()
    recordAudioMock.stop.mockReset()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('stops granted microphone tracks when recorder setup fails', async () => {
    const stopTrack = vi.fn()
    const getTracks = vi.fn(() => [
      { stop: stopTrack } as unknown as MediaStreamTrack,
    ])
    const stream = { getTracks } as unknown as MediaStream
    getUserMediaMock.mockResolvedValue(stream)
    recordAudioMock.mockImplementation(() => {
      throw new Error('recorder unavailable')
    })

    const { result } = renderHook(() =>
      useAudioRecording({
        transcribeAudio: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.toggleListening()
    })

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true })
    expect(getTracks).toHaveBeenCalledTimes(1)
    expect(stopTrack).toHaveBeenCalledTimes(1)
    expect(result.current.audioStream).toBeNull()
    expect(result.current.isListening).toBe(false)
    expect(result.current.isRecording).toBe(false)
  })
})
