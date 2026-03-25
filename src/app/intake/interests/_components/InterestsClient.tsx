'use client'

import { useState, useEffect, useTransition } from 'react'
import { useAppStore } from '@/store/appStore'
import Image from 'next/image'
import { containerClassName } from '@/app/_styles/classes'
import { saveInterestsAndRedirect } from '../actions'
import { StepIndicator } from '@/components/step-indicator'
import { toast } from 'sonner'

const commonInterests = [
  '💻 Technology',
  '🔬 Science',
  '🎨 Art',
  '🎵 Music',
  '⚽ Sports',
  '📚 Reading',
  '✍️ Writing',
  '👨‍🍳 Cooking',
  '✈️ Travel',
  '🌿 Nature',
  '🐾 Animals',
  '👗 Fashion',
  '📸 Photography',
  '🎮 Gaming',
  '💪 Fitness',
  '💼 Business',
  '🎓 Education',
  '🏥 Healthcare',
  '⚙️ Engineering',
  '🎯 Design',
]

interface InterestsClientProps {
  initialInterests: string[]
}

export default function InterestsClient({ initialInterests }: InterestsClientProps) {
  const [customInterest, setCustomInterest] = useState('')
  const [isPending, startTransition] = useTransition()
  const { interests, addInterest, removeInterest, setInterests } = useAppStore()

  // Set initial interests from server data on mount
  useEffect(() => {
    if (initialInterests.length > 0 && interests.length === 0) {
      setInterests(initialInterests)
    }
  }, [initialInterests, interests.length, setInterests])

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      addInterest(customInterest.trim())
      setCustomInterest('')
    }
  }

  const handleContinue = () => {
    startTransition(async () => {
      try {
        await saveInterestsAndRedirect(interests)
      }
      catch {
        toast.error('Failed to save interests. Please try again.')
      }
    })
  }

  return (
    <div className={containerClassName}>
      <StepIndicator />
      <div className="flex items-center gap-4 mb-8">
        <Image
          src="/images/what-are-your-interests.png"
          alt="What are your interests?"
          width={80}
          height={60}
          className="rounded-lg"
          priority
        />
        <h1 className="text-3xl font-bold">What interests you?</h1>
      </div>

      {/* Common Interests Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Common Interests</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {commonInterests.map(interest => (
            <button
              key={interest}
              onClick={() => !interests.includes(interest) && addInterest(interest)}
              disabled={interests.includes(interest)}
              className="btn btn-primary btn-outline btn-sm w-full"
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Interest Input */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Add Your Own Interest</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInterest}
            onChange={e => setCustomInterest(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustomInterest()}
            placeholder="Type your interest (ex. 'Building blocks', 'TikTok', 'Basketball') and press Enter"
            className="input input-bordered flex-1"
          />
          <button
            onClick={handleAddCustomInterest}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected Interests */}
      <div className="border-2 border-primary rounded-md p-4">
        <h2 className="text-xl font-semibold mb-4">Your Selected Interests</h2>
        <div className="flex flex-wrap gap-2">
          {interests.map(interest => (
            <button
              key={interest}
              onClick={() => removeInterest(interest)}
              className="badge badge-primary gap badge-soft g-2 p-4 hover:cursor-pointer"
            >
              {interest}
              <span>✕</span>
            </button>
          ))}
          {interests.length === 0 && <p className="text-gray-500">No interests selected</p>}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={handleContinue}
          disabled={isPending}
          className="btn btn-primary"
        >
          {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
          Continue to &quot;Would Your Rather?&quot;
        </button>
      </div>
    </div>
  )
}
