import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '../page'
import AnswersReviewPage from '../answers/page'

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  reset: vi.fn(),
}))

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { toString(): string }
  children: ReactNode
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: LinkProps) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('@/store/appStore', () => ({
  useAppStore: (selector: (state: { reset: () => void }) => unknown) =>
    selector({ reset: mocks.reset }),
}))

beforeEach(() => {
  mocks.routerPush.mockReset()
  mocks.reset.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ProfilePage fetch recovery', () => {
  it('shows a retry state when result fetch fails instead of the empty profile state', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: 'boom' }, { status: 500 }),
      jsonResponse({ interests: ['Robotics'] }),
      jsonResponse({ result: null }),
      jsonResponse({ interests: [] }),
    )

    render(<ProfilePage />)

    expect(await screen.findByText(/Couldn.t load your profile/)).toBeInTheDocument()
    expect(screen.queryByText('No Results Yet')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('No Results Yet')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})

describe('AnswersReviewPage fetch recovery', () => {
  it('shows a retry state when answers fetch fails instead of the empty answers state', async () => {
    const fetchMock = mockFetch(
      jsonResponse({ error: 'boom' }, { status: 500 }),
      jsonResponse({ responses: [] }),
    )

    render(<AnswersReviewPage />)

    expect(await screen.findByText(/Couldn.t load your answers/)).toBeInTheDocument()
    expect(screen.queryByText('No Answers Yet')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('No Answers Yet')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}
