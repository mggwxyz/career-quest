import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CareerActionButtons } from '../career-action-buttons'
import { createEmptyCareerActionState } from '@/lib/career/action-types'
import { setCareerActionStateAction } from '@/app/careers/actions'

vi.mock('@/app/careers/actions', () => ({
  setCareerActionStateAction: vi.fn(),
}))

const actionMock = vi.mocked(setCareerActionStateAction)

describe('CareerActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves and unsaves a career optimistically', async () => {
    const empty = createEmptyCareerActionState()
    actionMock
      .mockResolvedValueOnce({ success: true, state: { ...empty, saved: true } })
      .mockResolvedValueOnce({ success: true, state: empty })

    render(
      <CareerActionButtons
        onetId="15-1252.00"
        title="Software Developers"
        slug="software-developers"
        state={empty}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /save software developers/i }))
    expect(screen.getByRole('button', { name: /unsave software developers/i })).toBeInTheDocument()
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith({
      onetId: '15-1252.00',
      toggle: 'save',
      active: true,
      slug: 'software-developers',
    }))

    fireEvent.click(screen.getByRole('button', { name: /unsave software developers/i }))
    expect(screen.getByRole('button', { name: /save software developers/i })).toBeInTheDocument()
    await waitFor(() => expect(actionMock).toHaveBeenLastCalledWith({
      onetId: '15-1252.00',
      toggle: 'save',
      active: false,
      slug: 'software-developers',
    }))
  })
})
