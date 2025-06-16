'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import Link from 'next/link'
import { containerClassName } from '@/app/_styles/classes'

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

export default function Intake() {
  const [customInterest, setCustomInterest] = useState('')
  const { interests, addInterest, removeInterest } = useAppStore()

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      addInterest(customInterest.trim())
      setCustomInterest('')
    }
  }

  return (
    <div className={containerClassName}>
      <h1 className="text-3xl font-bold mb-8">What interests you?</h1>

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
            placeholder="Type your interest (ex. 'Legos', 'TikTok', 'Basketball') and press Enter"
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
        <Link href="/intake/would-you-rather" className="btn btn-primary">Continue to &quot;Would Your Rather?&quot;</Link>
      </div>
    </div>
  )
}
