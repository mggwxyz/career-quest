import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InterestsClient from '../InterestsClient'
import { useAppStore } from '@/store/appStore'
import { toast } from 'sonner'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

type FetchMock = ReturnType<typeof vi.fn>

let consoleError: ReturnType<typeof vi.spyOn> | undefined

function fetchMock() {
  return global.fetch as FetchMock
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({
    interests: [],
    itemsAnswered: 0,
    currentItem: null,
    posterior: null,
    traitScores: null,
    isComplete: false,
    inconsistencyWarning: null,
  })
  global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })) as typeof fetch
})

afterEach(() => {
  consoleError?.mockRestore()
  consoleError = undefined
})

describe('InterestsClient', () => {
  it('hydrates saved interests and submits trimmed custom additions', async () => {
    render(<InterestsClient initialInterests={['Music']} />)

    await waitFor(() => expect(useAppStore.getState().interests).toEqual(['Music']))

    fireEvent.change(screen.getByLabelText('Add a custom interest'), {
      target: { value: '  Robotics  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))

    await waitFor(() => expect(fetchMock()).toHaveBeenCalledWith(
      '/api/user/interests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ interests: ['Music', 'Robotics'] }),
      }),
    ))
    expect(push).toHaveBeenCalledWith('/discover/would-you-rather')
  })

  it('does not replace in-progress interests with initial server interests', async () => {
    useAppStore.getState().setInterests(['Local Choice'])

    render(<InterestsClient initialInterests={['Science']} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))

    await waitFor(() => expect(fetchMock()).toHaveBeenCalledWith(
      '/api/user/interests',
      expect.objectContaining({
        body: JSON.stringify({ interests: ['Local Choice'] }),
      }),
    ))
  })

  it('reports save failures without navigating away', async () => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'offline' }), { status: 503 }))
    render(<InterestsClient initialInterests={['Music']} />)

    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save interests. Please try again.'))
    expect(consoleError).toHaveBeenCalledWith('[InterestsClient] save failed:', expect.any(Error))
    expect(push).not.toHaveBeenCalled()
  })
})
