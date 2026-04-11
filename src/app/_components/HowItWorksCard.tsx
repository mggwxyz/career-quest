'use client'

import { motion } from 'framer-motion'

interface HowItWorksCardProps {
  num: string
  icon: string
  title: string
  desc: string
  index: number
}

export function HowItWorksCard({ num, icon, title, desc, index }: HowItWorksCardProps) {
  return (
    <motion.div
      className="text-center p-8 bg-surface/50 border border-border rounded-2xl hover:border-border-hover hover:bg-surface/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.2)] inline-flex items-center justify-center font-serif text-lg text-primary-soft mb-4">
        {num}
      </div>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  )
}
