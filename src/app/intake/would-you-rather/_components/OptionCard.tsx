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
      className={`card bg-base-100 rounded-lg overflow-hidden shadow-xl cursor-pointer flex flex-col min-h-[200px] sm:min-h-[300px] ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
      style={{ minHeight: '200px' }} // Ensure minimum tap target size
      whileHover={{
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
      whileTap={{ scale: 0.98 }}
      animate={isSelected
        ? {
          scale: 1.05,
          transition: { duration: 0.2 },
        }
        : { scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <figure className="relative aspect-square flex-1">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {showCheckmark && isSelected && (
          <motion.div
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <motion.div
              className="text-4xl sm:text-6xl text-green-500 bg-white rounded-full p-2 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center shadow-lg"
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200 }}
            >
              ✓
            </motion.div>
          </motion.div>
        )}
      </figure>
      <div className="card-body p-4 sm:p-6 flex-none">
        <h2 className="card-title justify-center text-base sm:text-lg md:text-xl text-center leading-tight">
          {option.text}
        </h2>
      </div>
    </motion.button>
  )
}
