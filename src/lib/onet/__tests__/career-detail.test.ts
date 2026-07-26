import { describe, it, expect, afterEach, vi } from 'vitest'
import { getCareerDetail } from '../occupations'
import { onetFetch } from '../client'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

vi.mock('../client', () => ({
  onetFetch: vi.fn(),
}))

type Mock = ReturnType<typeof vi.fn>

const CODE = '29-1141.00'
const EXPECTED_ENDPOINTS = [
  `/mnm/careers/${CODE}`,
  `/mnm/careers/${CODE}/knowledge`,
  `/mnm/careers/${CODE}/skills`,
  `/mnm/careers/${CODE}/technology`,
  `/mnm/careers/${CODE}/education`,
  `/mnm/careers/${CODE}/job_outlook`,
  `/mnm/careers/${CODE}/explore_more`,
  `/online/occupations/${CODE}/summary/interests`,
]

function mockOnetResponses(responses: Record<string, unknown>) {
  ;(onetFetch as unknown as Mock).mockImplementation((path: string) => {
    if (!(path in responses)) {
      throw new Error(`Unexpected O*NET path: ${path}`)
    }
    return Promise.resolve(responses[path])
  })
}

function baseResponses(overrides: Record<string, unknown> = {}) {
  return {
    [`/mnm/careers/${CODE}`]: {
      code: CODE,
      title: 'Registered Nurses',
      what_they_do: 'Assess patient health problems and needs.',
      tags: { bright_outlook: true },
      on_the_job: ['Record patient histories', 'Administer medicines'],
    },
    [`/mnm/careers/${CODE}/knowledge`]: [
      {
        id: '2.C',
        name: 'Knowledge',
        element: [
          { id: '2.C.1', name: 'Medicine and Dentistry' },
          { id: '2.C.2', name: 'Psychology' },
        ],
      },
    ],
    [`/mnm/careers/${CODE}/skills`]: [
      {
        id: '2.B',
        name: 'Skills',
        element: [
          { id: '2.B.1', name: 'Active Listening' },
          { id: '2.B.2', name: 'Critical Thinking' },
        ],
      },
    ],
    [`/mnm/careers/${CODE}/technology`]: [
      {
        title: 'Medical software',
        example: [
          { title: 'Electronic medical record EMR software' },
          { title: 'Scheduling software' },
        ],
      },
    ],
    [`/mnm/careers/${CODE}/education`]: {
      job_zone: { code: 3 },
    },
    [`/mnm/careers/${CODE}/job_outlook`]: {
      outlook: {
        category: 'Bright',
        description: 'Grow much faster than average',
      },
      salary: {
        annual_median: 86100,
        hourly_median: 41.39,
      },
    },
    [`/mnm/careers/${CODE}/explore_more`]: {
      careers: [
        { code: '29-1171.00', title: 'Nurse Practitioners' },
      ],
    },
    [`/online/occupations/${CODE}/summary/interests`]: {
      interest_code: 'SIC',
      element: [
        { id: 'S', name: 'Social' },
        { id: 'I', name: 'Investigative' },
        { id: 'C', name: 'Conventional' },
      ],
    },
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('getCareerDetail', () => {
  it('fetches each O*NET detail resource with a short timeout and maps the response contract', async () => {
    mockOnetResponses(baseResponses())

    const detail = await getCareerDetail(CODE)

    expect(onetFetch).toHaveBeenCalledTimes(EXPECTED_ENDPOINTS.length)
    EXPECTED_ENDPOINTS.forEach((path, index) => {
      expect(onetFetch).toHaveBeenNthCalledWith(index + 1, path, { timeoutMs: 4000 })
    })
    expect(detail).toEqual({
      code: CODE,
      title: 'Registered Nurses',
      description: 'Assess patient health problems and needs.',
      brightOutlook: true,
      tasks: ['Record patient histories', 'Administer medicines'],
      skills: ['Active Listening', 'Critical Thinking'],
      knowledge: ['Medicine and Dentistry', 'Psychology'],
      technology: ['Electronic medical record EMR software', 'Scheduling software'],
      jobZone: 3,
      riasecNames: ['Social', 'Investigative', 'Conventional'],
      salaryAnnualMedian: 86100,
      salaryHourlyMedian: 41.39,
      outlookCategory: 'Bright',
      outlookDescription: 'Grow much faster than average',
      relatedCareers: [
        { code: '29-1171.00', title: 'Nurse Practitioners' },
      ],
    })
  })

  it('normalizes omitted optional O*NET fields to empty arrays, false flags, and nullable display values', async () => {
    mockOnetResponses(baseResponses({
      [`/mnm/careers/${CODE}`]: {
        code: CODE,
        title: 'Registered Nurses',
      },
      [`/mnm/careers/${CODE}/knowledge`]: [{ id: '2.C', name: 'Knowledge' }],
      [`/mnm/careers/${CODE}/skills`]: [{ id: '2.B', name: 'Skills' }],
      [`/mnm/careers/${CODE}/technology`]: [{ title: 'Medical software' }],
      [`/mnm/careers/${CODE}/job_outlook`]: {
        outlook: {
          category: 'Average',
          description: 'Grow about as fast as average',
        },
      },
      [`/mnm/careers/${CODE}/explore_more`]: {},
      [`/online/occupations/${CODE}/summary/interests`]: {
        interest_code: '',
      },
    }))

    const detail = await getCareerDetail(CODE)

    expect(detail).toMatchObject({
      description: null,
      brightOutlook: false,
      tasks: [],
      skills: [],
      knowledge: [],
      technology: [],
      riasecNames: [],
      salaryAnnualMedian: null,
      salaryHourlyMedian: null,
      relatedCareers: [],
    })
  })
})
