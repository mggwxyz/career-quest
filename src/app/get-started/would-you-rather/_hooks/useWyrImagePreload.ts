'use client'

import { useEffect } from 'react'
import { items } from '@/app/_data/items'

let preloadStarted = false

export function useWyrImagePreload() {
  useEffect(() => {
    if (preloadStarted) return
    preloadStarted = true

    const urls = items.flatMap(it => [it.option1.imageUrl, it.option2.imageUrl])

    const schedule: (cb: () => void) => void = (cb) => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback
      if (typeof ric === 'function') ric(cb)
      else window.setTimeout(cb, 0)
    }

    let i = 0
    const pump = () => {
      if (i >= urls.length) return
      const batch = urls.slice(i, i + 4)
      i += batch.length
      for (const url of batch) {
        const img = new Image()
        img.decoding = 'async'
        if ('fetchPriority' in img) {
          (img as unknown as { fetchPriority: string }).fetchPriority = 'low'
        }
        img.src = url
      }
      schedule(pump)
    }

    schedule(pump)
  }, [])
}
