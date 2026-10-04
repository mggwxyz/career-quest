import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { items } from '@/app/_data/items'
import { useWyrImagePreload } from '../useWyrImagePreload'

type IdleCallback = () => void

function Harness() {
  useWyrImagePreload()
  return null
}

describe('useWyrImagePreload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'requestIdleCallback')
  })

  it('preloads assessment option images in idle batches only once', () => {
    const idleCallbacks: IdleCallback[] = []
    const requestIdleCallback = vi.fn((cb: IdleCallback) => {
      idleCallbacks.push(cb)
      return idleCallbacks.length
    })
    ;(window as Window & { requestIdleCallback?: (cb: IdleCallback) => number }).requestIdleCallback = requestIdleCallback

    const createdImages: Array<{ decoding: string, fetchPriority: string, src: string }> = []
    class FakeImage {
      decoding = ''
      fetchPriority = ''
      src = ''

      constructor() {
        createdImages.push(this)
      }
    }
    vi.stubGlobal('Image', FakeImage)

    const expectedUrls = items.flatMap(item => [item.option1.imageUrl, item.option2.imageUrl])
    const { rerender } = render(
      <>
        <Harness />
        <Harness />
      </>,
    )

    expect(requestIdleCallback).toHaveBeenCalledTimes(1)
    expect(createdImages).toHaveLength(0)

    act(() => {
      idleCallbacks.shift()?.()
    })

    expect(createdImages.map(image => image.src)).toEqual(expectedUrls.slice(0, 4))
    expect(requestIdleCallback).toHaveBeenCalledTimes(2)

    while (idleCallbacks.length > 0) {
      act(() => {
        idleCallbacks.shift()?.()
      })
    }

    expect(createdImages).toHaveLength(expectedUrls.length)
    expect(createdImages.map(image => image.src)).toEqual(expectedUrls)
    expect(createdImages.every(image => image.decoding === 'async')).toBe(true)
    expect(createdImages.every(image => image.fetchPriority === 'low')).toBe(true)

    const scheduledBatches = Math.ceil(expectedUrls.length / 4)
    expect(requestIdleCallback).toHaveBeenCalledTimes(scheduledBatches + 1)

    rerender(
      <>
        <Harness />
        <Harness />
        <Harness />
      </>,
    )

    expect(createdImages).toHaveLength(expectedUrls.length)
    expect(requestIdleCallback).toHaveBeenCalledTimes(scheduledBatches + 1)
  })
})
