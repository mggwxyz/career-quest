'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function AnimatedHero() {
  return (
    <div className="relative z-10 max-w-2xl mx-auto text-center">
      <motion.div
        className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span aria-hidden="true">✦</span>
        {' '}
        Career Quest
      </motion.div>

      <motion.h1
        className="font-serif text-4xl sm:text-5xl xl:text-[56px] leading-[1.1] text-foreground mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Find Work That
        {' '}
        <em className="text-primary-soft">Fits You.</em>
      </motion.h1>

      <motion.p
        className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-7 leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Answer a short set of questions, uncover your work profile, and get matched with careers that fit how you actually think and work.
      </motion.p>

      <motion.div
        className="flex items-center justify-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link
          href="/discover/interests"
          className="inline-flex items-center gap-2 px-9 py-3.5 bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold rounded-full shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)] hover:-translate-y-0.5 transition-all no-underline"
        >
          Start Questions
          {' '}
          <span className="text-lg">→</span>
        </Link>
      </motion.div>
    </div>
  )
}
