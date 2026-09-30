import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '../page'
import AnswersReviewPage from '../answers/page'
import type { AssessmentResult } from '@/lib/assessment'

const routerPush = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string, alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

vi.mock('../_components/HollandCodeHero', () => ({
  default: ({ result, children }: React.PropsWithChildren<{ result: AssessmentResult }>) => (
    <section data-testid="holland-code-hero">
      {result.hollandCode}
      {children}
    </section>
  ),
}))

vi.mock('../_components/HollandCodeBanner', () => ({
  default: ({ code }: { code: string }) => <div data-testid="holland-code-banner">{code}</div>,
}))

vi.mock('../_components/ConfidenceLevelHint', () => ({
  ConfidenceDotsLegend: () => <div data-testid="confidence-legend" />,
}))

vi.mock('../_components/RiasecRadarChart', () => ({
  RiasecRadarChart: ({ profileInterests }: { profileInterests?: string[] }) => (
    <div data-testid="riasec-radar-chart">{profileInterests?.join(',')}</div>
  ),
}))

vi.mock('../_components/WorkValuesPills', () => ({
  default: () => <div data-testid="work-values-pills" />,
}))

vi.mock('../_components/WorkContextSliders', () => ({
  default: () => <div data-testid="work-context-sliders" />,
}))

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const assessmentResult: AssessmentResult = {
  hollandCode: 'SAE',
  riasec: {
    R: { score: 10, rank: 6, confidence: 'low' },
    I: { score: 30, rank: 4, confidence: 'medium' },
    A: { score: 60, rank: 2, confidence: 'high' },
    S: { score: 75, rank: 1, confidence: 'high' },
    E: { score: 50, rank: 3, confidence: 'medium' },
    C: { score: 20, rank: 5, confidence: 'low' },
  },
  workValues: { top: [], all: {} as AssessmentResult['workValues']['all'] },
  workContext: {} as AssessmentResult['workContext'],
  meta: {
    itemsAnswered: 14,
    itemsSkipped: 0,
    completedAt: '2026-09-29T00:00:00.000Z',
    engineVersion: 'v1.0.0',
    inconsistencyFlag: false,
  },
}

const answerRow = {
  position: 1,
  choice: 2 as const,
  item: {
    id: 'item-1',
    option1: { id: 'item-1-a', text: 'Analyze lab samples', imageUrl: '/a.webp' },
    option2: { id: 'item-1-b', text: 'Coach a youth team', imageUrl: '/b.webp' },
  },
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {
  })
  routerPush.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ProfilePage', () => {
  it('shows a retryable profile error instead of the no-results empty state and can recover', async () => {
    mockFetch(
      jsonResponse({ error: 'unavailable' }, { status: 500 }),
      jsonResponse({ interests: ['Healthcare'] }),
      jsonResponse({ result: assessmentResult }),
      jsonResponse({ interests: ['Healthcare', 'Mentoring'] }),
    )

    render(<ProfilePage />)

    expect(await screen.findByRole('heading', { name: /couldn.t load your profile/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /no results yet/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByTestId('holland-code-banner')).toHaveTextContent('SAE')
    expect(screen.getByTestId('riasec-radar-chart')).toHaveTextContent('Healthcare,Mentoring')
  })

  it('keeps the no-results empty state for a successful null result', async () => {
    mockFetch(
      jsonResponse({ result: null }),
      jsonResponse({ interests: [] }),
    )

    render(<ProfilePage />)

    expect(await screen.findByRole('heading', { name: /no results yet/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /couldn.t load your profile/i })).not.toBeInTheDocument()
  })
})

describe('AnswersReviewPage', () => {
  it('shows a retryable answers error instead of the no-answers empty state and can recover', async () => {
    mockFetch(
      jsonResponse({ error: 'unavailable' }, { status: 500 }),
      jsonResponse({ responses: [answerRow] }),
    )

    render(<AnswersReviewPage />)

    expect(await screen.findByRole('heading', { name: /couldn.t load your answers/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /no answers yet/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Coach a youth team')).toBeInTheDocument()
  })

  it('keeps the no-answers empty state for a successful empty response list', async () => {
    mockFetch(jsonResponse({ responses: [] }))

    render(<AnswersReviewPage />)

    expect(await screen.findByRole('heading', { name: /no answers yet/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /couldn.t load your answers/i })).not.toBeInTheDocument()
  })
})
