import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PreferencesPage from '../page'
import { items } from '@/app/_data/items'
import type { AssessmentResult, Posterior } from '@/lib/assessment'
import { useAppStore } from '@/store/appStore'
import { toast } from 'sonner'

vi.mock('../_hooks/useWyrImagePreload', () => ({
  useWyrImagePreload: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string, alt: string }) => (
    React.createElement('img', { src, alt, ...props })
  ),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    button: ({
      children,
      whileHover: _whileHover,
      whileTap: _whileTap,
      transition: _transition,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileHover?: unknown
      whileTap?: unknown
      transition?: unknown
    }) => <button {...props}>{children}</button>,
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
    span: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <span {...props}>{children}</span>,
  },
}))

const result: AssessmentResult = {
  hollandCode: 'SA',
  riasec: {
    R: { score: 10, rank: 6, confidence: 'low' },
    I: { score: 25, rank: 4, confidence: 'medium' },
    A: { score: 82, rank: 2, confidence: 'high' },
    S: { score: 90, rank: 1, confidence: 'high' },
    E: { score: 45, rank: 3, confidence: 'medium' },
    C: { score: 20, rank: 5, confidence: 'low' },
  },
  workValues: {
    top: ['REL'],
    all: {
      ACH: { score: 20, confidence: 'low' },
      IND: { score: 40, confidence: 'medium' },
      REC: { score: 30, confidence: 'low' },
      REL: { score: 90, confidence: 'high' },
      SUP: { score: 50, confidence: 'medium' },
      WC: { score: 60, confidence: 'medium' },
    },
  },
  workContext: {
    structureVariety: { lean: 'variety', strength: 70, confidence: 'high' },
    indoorOutdoor: { lean: 'indoor', strength: 55, confidence: 'medium' },
    soloTeam: { lean: 'team', strength: 65, confidence: 'medium' },
  },
  meta: {
    itemsAnswered: 30,
    itemsSkipped: 2,
    completedAt: '2026-08-29T10:00:00.000Z',
    engineVersion: 'v1.0.0',
    inconsistencyFlag: false,
  },
}

const posterior: Posterior = {
  riasec: {
    R: { mean: 0, variance: 1 },
    I: { mean: 0, variance: 1 },
    A: { mean: 0, variance: 1 },
    S: { mean: 0, variance: 1 },
    E: { mean: 0, variance: 1 },
    C: { mean: 0, variance: 1 },
  },
  workValues: {
    ACH: { mean: 0, variance: 1 },
    IND: { mean: 0, variance: 1 },
    REC: { mean: 0, variance: 1 },
    REL: { mean: 0, variance: 1 },
    SUP: { mean: 0, variance: 1 },
    WC: { mean: 0, variance: 1 },
  },
  workContext: {
    structureVariety: { mean: 0, variance: 1 },
    indoorOutdoor: { mean: 0, variance: 1 },
    soloTeam: { mean: 0, variance: 1 },
  },
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function deferredResponse() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function optionButtons(label: string) {
  return screen.getAllByRole('button', { name: new RegExp(label) })
}

describe('PreferencesPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useAppStore.getState().reset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useAppStore.getState().reset()
  })

  it('loads saved results when the active session has already stopped', async () => {
    const sessionResponse = deferredResponse()
    const resultResponse = deferredResponse()
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockReturnValueOnce(sessionResponse.promise)
      .mockReturnValueOnce(resultResponse.promise)
    vi.stubGlobal('fetch', fetchMock)

    render(<PreferencesPage />)

    await act(async () => {
      sessionResponse.resolve(jsonResponse({ active: { sessionId: 'sess-1', stopped: true } }))
      await Promise.resolve()
      resultResponse.resolve(jsonResponse({ result }))
      await Promise.resolve()
    })

    expect(await screen.findByRole('heading', { name: 'Assessment Complete' })).toBeInTheDocument()
    expect(screen.getByText('SA')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/assessment/session')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/assessment/result')
  })

  it('keeps the current question retryable when answer submission fails', async () => {
    vi.useFakeTimers()
    const item = items[0]
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockImplementation((input) => {
        if (input === '/api/assessment/response') {
          return Promise.resolve(jsonResponse({ error: 'database unavailable' }, { status: 500 }))
        }
        return Promise.resolve(jsonResponse({ active: null }))
      })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    act(() => {
      useAppStore.getState().startSession('sess-1', item)
      useAppStore.setState({ itemsAnswered: 5, posteriorSnapshot: posterior })
    })

    render(<PreferencesPage />)

    const firstChoice = optionButtons(item.option1.text)[0]
    fireEvent.click(firstChoice)

    expect(firstChoice).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Skip/ })).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(220)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(errorSpy).toHaveBeenCalledWith('[preferences] submit failed:', expect.any(Error))
    expect(toast.error).toHaveBeenCalledWith('That answer didn\u2019t save. Please try again.')

    expect(fetchMock).toHaveBeenCalledWith('/api/assessment/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"sessionId":"sess-1"'),
    })
    expect(screen.getByRole('progressbar', { name: 'Assessment progress' })).toHaveAttribute('aria-valuenow', '5')
    expect(optionButtons(item.option1.text)[0]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Skip/ })).toBeEnabled()
  })
})
