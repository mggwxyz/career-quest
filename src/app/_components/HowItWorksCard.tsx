'use client'

import { motion } from 'framer-motion'
import { Brain, CircleQuestionMark, MessageCircle, Target } from 'lucide-react'

type IconKey = 'question' | 'brain' | 'target' | 'chat'

export interface HowItWorksCardProps {
  icon: IconKey
  title: string
  desc: string
  index: number
}

export function HowItWorksCard({ icon, title, desc, index }: HowItWorksCardProps) {
  const iconMap = {
    question: CircleQuestionMark,
    brain: Brain,
    target: Target,
    chat: MessageCircle,
  } as const
  const Icon = iconMap[icon]

  return (
    <motion.div
      className="text-center p-5 bg-surface/50 border border-border rounded-2xl hover:border-border-hover hover:bg-surface/80 hover:shadow-[0_0_30px_rgba(78,219,167,0.1)] transition-all"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="mb-2 text-primary-soft flex items-center justify-center">
        <Icon size={24} strokeWidth={2.2} />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  )
}
