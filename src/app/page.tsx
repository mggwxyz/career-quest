'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { StarField } from '@/components/star-field'

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Nebula gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: `
              radial-gradient(ellipse 600px 400px at 25% 20%, rgba(88, 28, 135, 0.35) 0%, transparent 70%),
              radial-gradient(ellipse 500px 350px at 75% 70%, rgba(30, 58, 138, 0.25) 0%, transparent 70%),
              radial-gradient(ellipse 300px 300px at 60% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)
            `,
            }}
          />
        </div>

        <StarField count={55} />

        <div className="relative z-10 max-w-2xl">
          <motion.div
            className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            ✦ Career Exploration Tool
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
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative max-w-4xl mx-auto px-6 pb-20">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-16" />

        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-text-dim">Three steps to find careers that fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { num: '1', icon: '🎯', title: 'Pick Your Interests', desc: 'Select topics that excite you or add your own — this sets the foundation for your profile.' },
            { num: '2', icon: '⚖️', title: 'Answer Quick Questions', desc: 'Choose between scenarios in a "would you rather" format that reveals your work personality.' },
            { num: '3', icon: '🌟', title: 'See Your Matches', desc: 'Get personalized career recommendations powered by AI, ranked by how well they fit you.' },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              className="text-center p-8 bg-surface/50 border border-border rounded-2xl hover:border-border-hover hover:bg-surface/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.2)] inline-flex items-center justify-center font-serif text-lg text-primary-soft mb-4">
                {step.num}
              </div>
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
