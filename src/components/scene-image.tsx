'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SceneImageProps {
  /** O*NET code, e.g. "29-1141.00". Resolves to /careers/scenes/{onetId}.webp */
  onetId: string
  alt: string
  /** Wrapper classes — set the aspect ratio / height and any rounding here. */
  className?: string
  sizes?: string
  priority?: boolean
}

/**
 * Candid 3:2 workplace scene for a career. Renders nothing if the image fails
 * to load (rare — every O*NET mirror code is seeded), so a career without a
 * scene degrades to a text-only card instead of showing a broken image.
 *
 * Path is built from the onetId directly so this stays a tiny client component
 * and never bundles the scene manifest.
 */
export function SceneImage({ onetId, alt, className, sizes, priority }: SceneImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className={`relative overflow-hidden bg-surface/60 ${className ?? ''}`}>
      <Image
        src={`/careers/scenes/${onetId}.webp`}
        alt={alt}
        fill
        sizes={sizes ?? '(min-width: 768px) 50vw, 100vw'}
        className="object-cover"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
