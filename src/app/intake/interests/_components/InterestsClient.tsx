'use client'

import { useState, useTransition } from 'react'
import { useAppStore } from '@/store/appStore'
import { saveInterestsAndRedirect } from '../actions'
import { toast } from 'sonner'
import { StarField } from '@/components/star-field'
import { useEffect } from 'react'

const commonInterests = [
  '🎨 Art & Design', '🔬 Science', '💻 Technology', '📊 Business',
  '🎵 Music', '✍️ Writing', '🏥 Healthcare', '📐 Engineering',
  '🌍 Environment', '🧠 Psychology', '⚖️ Law', '🎓 Education',
  '🏗️ Architecture', '📸 Photography', '🍳 Culinary', '🏋️ Fitness',
  '✈️ Travel', '🎮 Gaming', '📱 Social Media', '🌱 Sustainability',
]

interface InterestsClientProps {
  initialInterests: string[]
}

export default function InterestsClient({ initialInterests }: InterestsClientProps) {
  const [customInterest, setCustomInterest] = useState('')
  const [isPending, startTransition] = useTransition()
  const { interests, addInterest, removeInterest, setInterests } = useAppStore()

  useEffect(() => {
    if (initialInterests.length > 0 && interests.length === 0) {
      setInterests(initialInterests)
    }
  }, [initialInterests, interests.length, setInterests])

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      removeInterest(interest)
    }
    else {
      addInterest(interest)
    }
  }

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
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-4xl relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
            radial-gradient(ellipse 500px 350px at 20% 30%, rgba(88, 28, 135, 0.2) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 70%, rgba(30, 58, 138, 0.15) 0%, transparent 70%)
          `,
          }}
        />
        <StarField count={40} />
      </div>

      {/* Page header */}
      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">What Interests You?</h1>
        <p className="text-sm text-muted-foreground">Pick as many as you like, or add your own</p>
      </div>

      {/* Interest chips */}
      <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto mb-8">
        {commonInterests.map(interest => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
              interests.includes(interest)
                ? 'border-primary/60 bg-primary/15 text-foreground shadow-[0_0_16px_rgba(124,58,237,0.15)]'
                : 'border-border bg-surface/60 text-muted-foreground hover:border-border-hover hover:text-primary-soft hover:bg-primary/5'
            }`}
          >
            {interest}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2.5 max-w-md mx-auto mb-10">
        <input
          type="text"
          value={customInterest}
          onChange={e => setCustomInterest(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCustomInterest()}
          placeholder="Add a custom interest..."
          className="flex-1 px-5 py-2.5 rounded-full border border-border bg-surface/60 text-foreground text-sm placeholder:text-text-dim outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors"
        />
        <button
          onClick={handleAddCustomInterest}
          className="px-5 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold shadow-[0_2px_8px_rgba(124,58,237,0.2)]"
        >
          Add
        </button>
      </div>

      {/* Continue */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          disabled={isPending}
          className="px-10 py-3.5 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
