'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function AnimatedHero() {
  return (
    <div className="relative z-10 max-w-2xl">
      <motion.div
        className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span aria-hidden="true">✦</span>
        {' '}
        Career Exploration Tool
      </motion.div>

      <motion.h1
        className="font-serif text-4xl sm:text-5xl md:text-[56px] leading-[1.15] text-foreground mb-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Find the Career You Were
        {' '}
        <em className="text-primary-soft">Made For</em>
      </motion.h1>

      <motion.p
        className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-9 leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Answer a few questions about your interests, values, and work style — then let AI match you with careers that actually fit.
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link
          href="/intake/interests"
          className="inline-flex items-center gap-2 px-9 py-3.5 bg-gradient-to-br from-primary to-secondary text-white font-semibold rounded-full shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all no-underline"
        >
          Get Started
          {' '}
          <span className="text-lg">→</span>
        </Link>
        <a
          href="#how-it-works"
          className="px-7 py-3.5 border border-border hover:border-border-hover hover:bg-primary/5 text-primary-soft font-medium rounded-full transition-all no-underline"
        >
          How It Works
        </a>
      </motion.div>
    </div>
  )
}
