import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExploreFilters } from '../ExploreFilters'

const setFilters = vi.fn()

let currentFilters = {
  q: '',
  riasec: [] as string[],
  zone: [] as number[],
  bright: false,
  chat: false,
  matches: false,
  page: 3 as number | null,
}

vi.mock('nuqs', () => {
  const parser = {
    withDefault: () => parser,
  }

  return {
    createParser: () => parser,
    parseAsArrayOf: () => parser,
    parseAsInteger: parser,
    parseAsString: parser,
    useQueryStates: () => [currentFilters, setFilters],
  }
})

describe('ExploreFilters', () => {
  beforeEach(() => {
    setFilters.mockClear()
    currentFilters = {
      q: '',
      riasec: [],
      zone: [],
      bright: false,
      chat: false,
      matches: false,
      page: 3,
    }
  })

  it('keeps search as a native GET form for non-JS and pre-hydration submits', () => {
    render(<ExploreFilters />)

    const input = screen.getByPlaceholderText(/Search careers/)
    const form = input.closest('form')

    expect(form).toHaveAttribute('action', '/careers')
    expect(form).toHaveAttribute('method', 'get')
    expect(input).toHaveAttribute('name', 'q')
  })

  it('submits a trimmed search immediately and clears stale pagination', () => {
    render(<ExploreFilters />)

    const input = screen.getByPlaceholderText(/Search careers/)
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: '  welding  ' } })
    fireEvent.submit(form!)

    expect(setFilters).toHaveBeenCalledWith({ q: 'welding', page: null })
  })

  it('does not rewrite the URL when the submitted search is unchanged after trimming', () => {
    currentFilters = {
      ...currentFilters,
      q: 'nurse',
    }

    render(<ExploreFilters />)

    const input = screen.getByPlaceholderText(/Search careers/)
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: '  nurse  ' } })
    fireEvent.submit(form!)

    expect(setFilters).not.toHaveBeenCalled()
  })
})
