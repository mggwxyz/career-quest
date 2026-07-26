import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redirect } from 'next/navigation'
import { getUserId } from '@/lib/auth/identity'
import { getOccupationByCode } from '@/lib/onet/occupations'
import CareerDetailPage from '../page'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
}))

vi.mock('@/lib/auth/identity', () => ({
  getUserId: vi.fn(),
}))

vi.mock('@/lib/onet/occupations', () => ({
  resolveSlug: vi.fn(),
  getOccupationByCode: vi.fn(),
  getCareerDetail: vi.fn(),
  getSlugsByOnetCodes: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('../_components/CareerDetailsHeader', () => ({
  CareerDetailsHeader: () => null,
}))

vi.mock('../_components/CareerDetailsPanel', () => ({
  CareerDetailsPanel: () => null,
}))

vi.mock('../_components/CareerRolePlayChat', () => ({
  CareerRolePlayChat: () => null,
}))

vi.mock('@/lib/personas', () => ({
  getPersona: vi.fn(() => null),
}))

vi.mock('@/lib/onet/projectors', () => ({
  toCareerContext: vi.fn(),
}))

type Mock = ReturnType<typeof vi.fn>

describe('CareerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects legacy O*NET code URLs to the canonical slug before auth lookup', async () => {
    ;(getOccupationByCode as unknown as Mock).mockResolvedValue({
      slug: 'registered-nurses',
    })

    await expect(CareerDetailPage({
      params: Promise.resolve({ slug: '29-1141.00' }),
    })).rejects.toThrow('redirect:/careers/registered-nurses')

    expect(redirect).toHaveBeenCalledWith('/careers/registered-nurses')
    expect(getUserId).not.toHaveBeenCalled()
  })
})
