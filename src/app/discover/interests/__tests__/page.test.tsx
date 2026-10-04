import { render, screen } from '@testing-library/react'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import InterestsPage from '../page'
import { db } from '@/db'
import { getUserId } from '@/lib/auth/identity'
import { userInterests } from '@/db/schema'

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<object>()
  return {
    ...actual,
    eq: vi.fn(() => 'user-id-filter'),
  }
})

vi.mock('@/lib/auth/identity', () => ({
  getUserId: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('../_components/InterestsClient', () => ({
  default: ({ initialInterests }: { initialInterests: string[] }) => (
    <div data-testid="interests-client">{initialInterests.join('|')}</div>
  ),
}))

const selectMock = vi.mocked(db.select)
const getUserIdMock = vi.mocked(getUserId)
const eqMock = vi.mocked(eq)

function mockInterestRows(rows: Array<{ interest: string }>) {
  const orderBy = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where }))
  selectMock.mockReturnValue({ from } as unknown as ReturnType<typeof db.select>)
  return { from, where, orderBy }
}

describe('InterestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty initial interests without querying when no identity exists', async () => {
    getUserIdMock.mockResolvedValue(null)
    mockInterestRows([{ interest: 'Should not load' }])

    render(await InterestsPage())

    expect(screen.getByTestId('interests-client')).toBeEmptyDOMElement()
    expect(selectMock).not.toHaveBeenCalled()
  })

  it('hydrates saved interests for the resolved identity', async () => {
    getUserIdMock.mockResolvedValue({ id: 'guest_123', isGuest: true })
    const query = mockInterestRows([{ interest: 'Art' }, { interest: 'Robotics' }])

    render(await InterestsPage())

    expect(screen.getByTestId('interests-client')).toHaveTextContent('Art|Robotics')
    expect(eqMock).toHaveBeenCalledWith(userInterests.userId, 'guest_123')
    expect(query.from).toHaveBeenCalledWith(userInterests)
    expect(query.where).toHaveBeenCalledWith('user-id-filter')
    expect(query.orderBy).toHaveBeenCalledWith(userInterests.createdAt)
  })
})
