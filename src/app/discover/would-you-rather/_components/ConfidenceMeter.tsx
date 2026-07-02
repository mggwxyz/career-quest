'use client'
import { motion } from 'framer-motion'

const TOTAL_DOTS = 30

export default function ConfidenceMeter({ itemsAnswered }: { itemsAnswered: number }) {
  const filled = Math.min(TOTAL_DOTS, itemsAnswered)
  return (
    <div className="mx-auto mb-2 max-w-2xl px-4">
      <div
        className="flex items-center justify-center gap-1.5"
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={0}
        aria-valuemax={TOTAL_DOTS}
        aria-valuenow={filled}
      >
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
          const isFilled = i < filled
          return (
            <motion.span
              key={i}
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                isFilled
                  ? 'bg-gradient-to-br from-primary to-secondary'
                  : 'bg-primary/10'
              }`}
              initial={false}
              animate={{ scale: isFilled ? 1 : 0.8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          )
        })}
      </div>
    </div>
  )
}
