'use client'

import { MotionConfig } from 'framer-motion'

/**
 * Wraps the app in a Framer Motion MotionConfig with reducedMotion="user".
 *
 * When the OS has "reduce motion" enabled, Framer Motion automatically
 * skips transform animations (x/y/z, scale, rotate) while preserving
 * opacity, color, and other non-vestibular animations — no per-component
 * gating required.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
