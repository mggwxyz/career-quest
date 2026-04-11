'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { WouldYouRatherQuestionOption } from '@/store/slices/wouldYouRatherSlice'

interface OptionCardProps {
  option: WouldYouRatherQuestionOption
  isSelected: boolean
  showCheckmark: boolean
  onClick: () => void
}

export default function OptionCard({ option, isSelected, showCheckmark, onClick }: OptionCardProps) {
  return (
    <motion.button
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
      {/* Image with cosmic overlay */}
      <figure className="relative w-full h-[200px] sm:h-[250px] overflow-hidden">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {/* Cosmic gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(180deg, rgba(10, 10, 26, 0) 40%, rgba(10, 10, 26, 0.85) 100%),
              linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Checkmark badge */}
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

      {/* Card body */}
      <div className="p-5 flex-none text-left">
        <h2 className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
