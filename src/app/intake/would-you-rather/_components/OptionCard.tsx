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
      className={`card-sm md:card bg-base-100 rounded-md overflow-hidden shadow-xl cursor-pointer transition-all duration-250 ease-out flex flex-col hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] ${
        isSelected ? 'ring-3 ring-primary scale-[1.02] shadow-2xl' : ''
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
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white rounded-full p-3 size-20 md:size-24 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <svg className="w-10 h-10 md:w-14 md:h-14 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
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
