'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { RIASEC_THEME } from '@/app/_data/riasecTheme'

function formatDescription(d: string | undefined): string {
  if (!d) return ''
  const capped = d[0].toUpperCase() + d.slice(1)
  return capped.endsWith('.') ? capped : `${capped}.`
}

const STAR_SM = 'M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z'
const STAR_LG = 'M0 -16 L4.2 -4.2 L16 0 L4.2 4.2 L0 16 L-4.2 4.2 L-16 0 L-4.2 -4.2 Z'

const NODES = [
  { x: 30, y: 66, halo: 12, path: STAR_SM, className: 'text-primary-soft', delay: 0.1 },
  { x: 130, y: 22, halo: 18, path: STAR_LG, className: 'text-primary', delay: 0.7 },
  { x: 230, y: 58, halo: 12, path: STAR_SM, className: 'text-primary-soft', delay: 1.3 },
]

const LINES = [
  { d: 'M30 66 L130 22', delay: 0.35 },
  { d: 'M130 22 L230 58', delay: 0.95 },
]

interface CompleteCardProps {
  hollandCode: string
  onRetake: () => void
}

export default function CompleteCard({ hollandCode, onRetake }: CompleteCardProps) {
  const reduceMotion = useReducedMotion()
  const letters = hollandCode.split('')

  const rise = (delay: number) => reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, ease: 'easeOut' as const, delay },
    }

  return (
    <div className="flex flex-col items-center text-center gap-7 pt-6 pb-10">
      <svg width="260" height="96" viewBox="0 0 260 96" fill="none" aria-hidden="true">
        {LINES.map(line => (
          <motion.path
            key={line.d}
            d={line.d}
            className="text-primary"
            stroke="currentColor"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: line.delay }}
          />
        ))}
        {NODES.map(node => (
          <g key={node.x} transform={`translate(${node.x} ${node.y})`} className={node.className}>
            <motion.g
              initial={reduceMotion ? false : { opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14, delay: node.delay }}
            >
              <circle r={node.halo} fill="currentColor" fillOpacity={0.13} />
              <path d={node.path} fill="currentColor" />
            </motion.g>
          </g>
        ))}
      </svg>

      <motion.div className="flex flex-col items-center gap-3" {...rise(0.2)}>
        <p className="text-xs uppercase tracking-[2px] text-primary-soft">Assessment complete</p>
        <h1 className="font-serif text-4xl sm:text-6xl leading-[1.05] text-foreground">Your stars have aligned</h1>
        <p className="max-w-md text-[17px] text-muted-foreground">
          Every choice you made lit up a point. Together they form your Holland code:
        </p>
      </motion.div>

      <ul
        aria-label={`Your Holland code: ${hollandCode}`}
        data-testid="holland-code"
        className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-left list-none p-0 m-0"
      >
        {letters.map((code, i) => {
          const theme = RIASEC_THEME[code]
          const isTop = i === 0
          return (
            <motion.li key={`${code}-${i}`} className="h-full" {...rise(1.5 + i * 0.25)}>
              <div
                className={`h-full rounded-2xl border p-5 flex flex-col gap-1.5 transition-all duration-150 hover:-translate-y-1 hover:border-border-hover ${
                  isTop ? 'border-border-hover bg-primary/5' : 'border-border bg-surface/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`font-serif text-[88px] leading-[0.9] ${isTop ? 'text-primary' : 'text-foreground'}`}>
                    {code}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{`#${i + 1}`}</span>
                </div>
                <div className="mt-2 text-[15px] font-semibold text-foreground">{theme?.label ?? code}</div>
                <div className="text-[13px] leading-snug text-muted-foreground">
                  {formatDescription(theme?.description)}
                </div>
              </div>
            </motion.li>
          )
        })}
      </ul>

      <motion.div className="flex flex-col items-center gap-5 mt-3" {...rise(1.5 + letters.length * 0.25 + 0.05)}>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/discover/profile"
            className="inline-flex items-center gap-2 min-h-12 px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline transition-transform hover:-translate-y-0.5"
          >
            View your profile
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </Link>
          <Link
            href="/discover/matches"
            className="inline-flex items-center min-h-12 px-8 py-3 rounded-full border border-border text-primary-soft font-medium hover:border-border-hover transition-all hover:-translate-y-0.5 no-underline"
          >
            Explore career matches
          </Link>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/discover/profile/answers"
            className="inline-flex items-center min-h-11 text-muted-foreground hover:text-foreground transition-colors no-underline"
          >
            Review your answers
          </Link>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-1.5 min-h-11 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Start over
          </button>
        </div>
      </motion.div>
    </div>
  )
}
