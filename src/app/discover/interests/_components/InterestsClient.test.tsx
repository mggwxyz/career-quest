import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InterestsClient from './InterestsClient'
import { useAppStore } from '@/store/appStore'

const push = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('sonner', () => ({ toast }))

describe('InterestsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ interests: [] })
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'error').mockImplementation(() => {
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hydrates the store from initial interests when local interests are empty', async () => {
    render(<InterestsClient initialInterests={['Science', 'Robotics']} />)

    expect(await screen.findByRole('button', { name: 'Robotics ✕' })).toBeInTheDocument()
    expect(useAppStore.getState().interests).toEqual(['Science', 'Robotics'])
    expect(screen.getByRole('button', { name: 'Science' })).toHaveClass('border-primary/60')
  })

  it('posts selected interests and navigates to the assessment on save', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ interests: ['Science'] }), { status: 200 }))
    useAppStore.setState({ interests: ['Science'] })

    render(<InterestsClient initialInterests={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/user/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: ['Science'] }),
    }))
    expect(push).toHaveBeenCalledWith('/discover/would-you-rather')
  })

  it('shows an error toast and stays on the page when saving interests fails', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'nope' }), { status: 500 }))
    useAppStore.setState({ interests: ['Science'] })

    render(<InterestsClient initialInterests={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save interests. Please try again.'))
    expect(push).not.toHaveBeenCalled()
  })

  it('warns about duplicate custom interests without appending another store entry', () => {
    useAppStore.setState({ interests: ['Robotics'] })

    render(<InterestsClient initialInterests={[]} />)
    fireEvent.change(screen.getByLabelText('Add a custom interest'), { target: { value: 'Robotics' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(toast.info).toHaveBeenCalledWith('“Robotics” is already in your list')
    expect(screen.getAllByRole('button', { name: 'Robotics ✕' })).toHaveLength(1)
    expect(useAppStore.getState().interests).toEqual(['Robotics'])
  })
})
