'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { Fragment } from 'react'

const STEPS = [
  { href: '/discover/interests', label: 'What Interests You?', short: 'Interests' },
  { href: '/discover/would-you-rather', label: 'Would You Rather?', short: 'WYR' },
  { href: '/discover/profile', label: 'Your Profile', short: 'Profile' },
  { href: '/discover/matches', label: 'Your Matches', short: 'Matches' },
] as const

function getCurrentIndex(pathname: string): number {
  if (pathname.startsWith('/discover/interests')) return 0
  if (pathname.startsWith('/discover/would-you-rather')) return 1
  if (pathname.startsWith('/discover/profile')) return 2
  if (pathname.startsWith('/discover/matches')) return 3
  return -1
}

export function FlowStepper() {
  const pathname = usePathname()
  const currentIndex = getCurrentIndex(pathname)
  if (currentIndex === -1) return null

  return (
    <nav
      aria-label="Progress"
      className="mb-10 w-full min-w-0 px-4 sm:px-6 md:px-8 lg:px-10"
    >
      <ol className="flex w-full min-w-0 items-start">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIndex
          const isActive = i === currentIndex
          const isClickable = isComplete || isActive

          const circleBase = 'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors'
          const circleClass = isActive
            ? 'border-primary bg-primary/15 text-foreground shadow-[var(--shadow-glow-sm)]'
            : isComplete
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface/50 text-muted-foreground'

          const labelClass = isActive
            ? 'text-foreground font-medium'
            : isComplete
              ? 'text-primary-soft'
              : 'text-muted-foreground/70'

          const node = (
            <div className="relative flex flex-col items-center">
              <div className={`${circleBase} ${circleClass}`} aria-current={isActive ? 'step' : undefined}>
                {isComplete ? <Check size={10} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`absolute left-1/2 top-full z-0 mt-1 -translate-x-1/2 text-center text-[10px] leading-tight ${labelClass}`}
              >
                <span className="whitespace-nowrap sm:hidden" title={step.label}>
                  {step.short}
                </span>
                <span className="hidden whitespace-nowrap sm:inline" title={step.label}>
                  {step.label}
                </span>
              </span>
            </div>
          )

          return (
            <Fragment key={step.href}>
              <li className="flex shrink-0 justify-center">
                {isClickable
                  ? (
                    <Link href={step.href} className="no-underline" title={step.label}>
                      {node}
                    </Link>
                  )
                  : <div className="opacity-80" title={step.label}>{node}</div>}
              </li>
              {i < STEPS.length - 1 && (
                <li
                  aria-hidden="true"
                  className={`flex-1 mt-2.5 h-px ${
                    i < currentIndex ? 'bg-primary/60' : 'bg-border'
                  }`}
                />
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
