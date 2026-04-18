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
      className={`rounded-2xl overflow-hidden cursor-pointer flex flex-col border transition-all duration-300 ${
        isSelected
          ? 'border-primary/70 shadow-[0_0_50px_rgba(124,58,237,0.25),0_0_100px_rgba(124,58,237,0.1)]'
          : 'border-border bg-surface/50 hover:border-border-hover hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] focus-visible:border-primary/70 focus-visible:shadow-[0_0_40px_rgba(124,58,237,0.2)]'
      }`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
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
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.5)] z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 15 }}
          >
            ✓
          </motion.div>
        )}
      </figure>
      <div className="p-5 flex-none text-left">
        <h2 className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
