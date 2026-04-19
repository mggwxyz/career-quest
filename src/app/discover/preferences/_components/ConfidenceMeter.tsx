'use client'
import { motion } from 'framer-motion'
import { CAP_ITEMS } from '@/lib/assessment/engine'

function stageFor(itemsAnswered: number): string {
  if (itemsAnswered < 8) return 'Getting clearer'
  if (itemsAnswered < 15) return 'Almost there'
  return 'Got it — just a few more'
}

export default function ConfidenceMeter({ itemsAnswered }: { itemsAnswered: number }) {
  const pct = Math.min(100, (itemsAnswered / CAP_ITEMS) * 100)
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex-1 h-1 rounded-full bg-primary/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-text-dim whitespace-nowrap">{stageFor(itemsAnswered)}</span>
    </div>
  )
}
