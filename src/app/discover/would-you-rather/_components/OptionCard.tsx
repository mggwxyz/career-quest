'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Option } from '@/lib/assessment'

interface OptionCardProps {
  option: Pick<Option, 'id' | 'text' | 'imageUrl' | 'prompt'>
  isSelected: boolean
  showCheckmark: boolean
  onClick: () => void
}

export default function OptionCard({ option, isSelected, showCheckmark, onClick }: OptionCardProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={isSelected}
      className={`w-full min-w-0 rounded-2xl overflow-hidden cursor-pointer flex flex-col border transition-all duration-150 ${
        isSelected
          ? 'border-primary/70'
          : 'border-border bg-surface/50 hover:border-border-hover focus-visible:border-primary/70'
      }`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      <figure className="relative w-full">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          width={1024}
          height={1024}
          className="w-full h-auto block"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {showCheckmark && isSelected && (
          <motion.div
            aria-hidden="true"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-sm z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, type: 'spring', stiffness: 400, damping: 18 }}
          >
            ✓
          </motion.div>
        )}
      </figure>
      <div className="p-5 flex-none text-left">
        <h2 className="break-words text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
