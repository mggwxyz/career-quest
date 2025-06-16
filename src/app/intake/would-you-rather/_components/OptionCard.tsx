import Image from 'next/image'
import { WouldYouRatherQuestionOption } from '@/store/slices/wouldYouRatherSlice'

interface OptionCardProps {
  option: WouldYouRatherQuestionOption
  isSelected: boolean
  showCheckmark: boolean
  onClick: () => void
}

export default function OptionCard({ option, isSelected, showCheckmark, onClick }: OptionCardProps) {
  return (
    <button
      className={`card-sm md:card  bg-base-100 rounded-md overflow-hidden shadow-xl cursor-pointer transition-all duration-300 flex flex-col ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <figure className="relative aspect-square">
        <Image
          src={option.imageUrl}
          alt={option.prompt}
          fill
          className="object-cover"
        />
        {showCheckmark && isSelected && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <div className="text-6xl text-green-500 bg-white rounded-full p-2 size-24 flex items-center justify-center">✓</div>
          </div>
        )}
      </figure>
      <div className="card-body flex-grow-1">
        <h2 className="card-title justify-center text-sm md:text-xl">
          {option.text}
        </h2>
      </div>
    </button>
  )
}
