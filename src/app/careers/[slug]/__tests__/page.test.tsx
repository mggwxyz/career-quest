import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { OccupationRow } from '@/lib/onet/occupations'

const {
  getUserIdMock,
  getOccupationByCodeMock,
  resolveSlugMock,
  getCareerDetailMock,
  getSlugsByOnetCodesMock,
  redirectMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getUserIdMock: vi.fn(),
  getOccupationByCodeMock: vi.fn(),
  resolveSlugMock: vi.fn(),
  getCareerDetailMock: vi.fn(),
  getSlugsByOnetCodesMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

vi.mock('@/lib/auth/identity', () => ({
  getUserId: getUserIdMock,
}))

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('@/lib/onet/occupations', () => ({
  getOccupationByCode: getOccupationByCodeMock,
  resolveSlug: resolveSlugMock,
  getCareerDetail: getCareerDetailMock,
  getSlugsByOnetCodes: getSlugsByOnetCodesMock,
}))

vi.mock('@/lib/onet/projectors', () => ({
  toCareerContext: vi.fn(() => ({ title: 'Registered Nurses', onetCode: '29-1141.00' })),
}))

vi.mock('@/lib/personas', () => ({
  getPersona: vi.fn(() => null),
}))

vi.mock('../_components/CareerDetailsHeader', () => ({
  CareerDetailsHeader: () => <div data-testid="career-details-header" />,
}))

vi.mock('../_components/CareerDetailsPanel', () => ({
  CareerDetailsPanel: () => <div data-testid="career-details-panel" />,
}))

vi.mock('../_components/CareerRolePlayChat', () => ({
  CareerRolePlayChat: () => <div data-testid="career-role-play-chat" />,
}))

import CareerDetailPage from '../page'

const occupation = {
  code: '29-1141.00',
  slug: 'registered-nurses',
  title: 'Registered Nurses',
  shortTitle: null,
  description: 'Assess patient health problems and needs.',
  shortDescription: null,
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'S',
  riasecAll: ['S', 'I', 'R'],
  salaryAnnualMedian: 85000,
  salaryHourlyMedian: null,
  outlookCategory: null,
} satisfies OccupationRow

describe('CareerDetailPage routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdMock.mockResolvedValue(null)
    getOccupationByCodeMock.mockResolvedValue(occupation)
    resolveSlugMock.mockResolvedValue(occupation)
    getCareerDetailMock.mockResolvedValue(null)
    getSlugsByOnetCodesMock.mockResolvedValue(new Map())
  })

  it('redirects legacy O*NET-code URLs to the canonical career slug', async () => {
    await expect(CareerDetailPage({
      params: Promise.resolve({ slug: '29-1141.00' }),
    })).rejects.toThrow('NEXT_REDIRECT:/careers/registered-nurses')

    expect(getOccupationByCodeMock).toHaveBeenCalledWith('29-1141.00')
    expect(redirectMock).toHaveBeenCalledWith('/careers/registered-nurses')
    expect(resolveSlugMock).not.toHaveBeenCalled()
  })

  it('returns not found for a well-formed legacy O*NET code missing from the catalog', async () => {
    getOccupationByCodeMock.mockResolvedValue(null)

    await expect(CareerDetailPage({
      params: Promise.resolve({ slug: '00-0000.00' }),
    })).rejects.toThrow('NEXT_NOT_FOUND')

    expect(getOccupationByCodeMock).toHaveBeenCalledWith('00-0000.00')
    expect(notFoundMock).toHaveBeenCalledOnce()
    expect(resolveSlugMock).not.toHaveBeenCalled()
  })

  it('resolves normal slugs without querying the legacy O*NET-code lookup', async () => {
    await CareerDetailPage({
      params: Promise.resolve({ slug: 'registered-nurses' }),
    })

    expect(getOccupationByCodeMock).not.toHaveBeenCalled()
    expect(resolveSlugMock).toHaveBeenCalledWith('registered-nurses')
  })
})
