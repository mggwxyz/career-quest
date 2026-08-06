import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getUserIdMock,
  searchOccupationsMock,
  listPersonaOnetIdsMock,
} = vi.hoisted(() => ({
  getUserIdMock: vi.fn(),
  searchOccupationsMock: vi.fn(),
  listPersonaOnetIdsMock: vi.fn(),
}))

vi.mock('@/lib/auth/identity', () => ({
  getUserId: getUserIdMock,
}))

vi.mock('@/lib/onet/browse', () => ({
  searchOccupations: searchOccupationsMock,
}))

vi.mock('@/lib/personas', () => ({
  listPersonaOnetIds: listPersonaOnetIdsMock,
}))

vi.mock('@/lib/scenes', () => ({
  hasScene: vi.fn().mockReturnValue(false),
}))

vi.mock('@/components/guest-save-banner', () => ({
  GuestSaveBanner: () => null,
}))

vi.mock('../_components/ExploreFilters', () => ({
  ExploreFilters: () => null,
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

import ExplorePage from '../page'
import { db } from '@/db'

type Mock = ReturnType<typeof vi.fn>

function recommendationSelectChain(rows: Array<{ onetId: string }>) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  }
}

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdMock.mockResolvedValue(null)
    searchOccupationsMock.mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 30 })
    listPersonaOnetIdsMock.mockReturnValue(['15-1252.00', '29-1141.00'])
    ;(db.select as Mock).mockReturnValue(recommendationSelectChain([]))
  })

  it('normalizes an invalid page query to the first page before searching', async () => {
    await ExplorePage({
      searchParams: Promise.resolve({ page: 'not-a-number' }),
    })

    expect(searchOccupationsMock).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
    }))
  })

  it('uses an empty O*NET allowlist for matches-only browsing without an identity', async () => {
    await ExplorePage({
      searchParams: Promise.resolve({ matches: '1' }),
    })

    expect(db.select).not.toHaveBeenCalled()
    expect(searchOccupationsMock).toHaveBeenCalledWith(expect.objectContaining({
      matchesOnly: true,
      onetIds: [],
    }))
  })

  it('intersects matches-only browsing with chat-ready personas when both filters are active', async () => {
    getUserIdMock.mockResolvedValueOnce({ id: 'u1', isGuest: false })
    ;(db.select as Mock).mockReturnValueOnce(recommendationSelectChain([
      { onetId: '15-1252.00' },
      { onetId: '15-1252.00' },
      { onetId: '11-1011.00' },
    ]))

    await ExplorePage({
      searchParams: Promise.resolve({ matches: '1', chat: '1' }),
    })

    expect(searchOccupationsMock).toHaveBeenCalledWith(expect.objectContaining({
      chatReady: true,
      matchesOnly: true,
      onetIds: ['15-1252.00'],
    }))
  })
})
