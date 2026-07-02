'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { COMMON_INTERESTS, COMMON_INTEREST_LABELS } from '@/lib/interestIcons'
import { Card, CardContent } from '@/components/ui/card'

interface InterestsClientProps {
  initialInterests: string[]
}

export default function InterestsClient({ initialInterests }: InterestsClientProps) {
  const router = useRouter()
  const [customInterest, setCustomInterest] = useState('')
  const [isPending, startTransition] = useTransition()
  const { interests, addInterest, removeInterest, setInterests } = useAppStore(
    useShallow(s => ({
      interests: s.interests,
      addInterest: s.addInterest,
      removeInterest: s.removeInterest,
      setInterests: s.setInterests,
    })),
  )

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
    const trimmed = customInterest.trim()
    if (!trimmed) return
    if (interests.includes(trimmed)) {
      toast.info(`“${trimmed}” is already in your list`)
      return
    }
    addInterest(trimmed)
    setCustomInterest('')
  }

  const handleContinue = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/user/interests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interests }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save interests')
        }
        router.push('/discover/would-you-rather')
      }
      catch (error) {
        console.error('[InterestsClient] save failed:', error)
        toast.error('Failed to save interests. Please try again.')
      }
    })
  }

  const customInterests = interests.filter(i => !COMMON_INTEREST_LABELS.has(i))

  return (
    <div>
      {/* Page header */}
      <div className="text-center mb-10 pt-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-2">What Interests You?</h1>
        <p className="text-sm text-muted-foreground">Pick as many as you like, or add your own</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardContent>
          {/* Interest chips */}
          <div className="flex flex-wrap gap-2.5 justify-center mb-8">
            {COMMON_INTERESTS.map(({ label, icon: Icon }) => {
              const selected = interests.includes(label)
              return (
                <button
                  key={label}
                  onClick={() => toggleInterest(label)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                    selected
                      ? 'border-primary/60 bg-primary/15 text-foreground'
                      : 'border-border bg-surface/60 text-muted-foreground hover:border-border-hover hover:text-primary-soft hover:bg-primary/5'
                  }`}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-md mx-auto mb-8">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or add your own</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Custom input */}
          <div className="flex gap-2.5 max-w-md mx-auto mb-4">
            <input
              type="text"
              value={customInterest}
              onChange={e => setCustomInterest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustomInterest()}
              placeholder="Add a custom interest..."
              aria-label="Add a custom interest"
              className="flex-1 px-5 py-2.5 rounded-full border border-border bg-surface/60 text-foreground text-sm placeholder:text-text-dim outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus:border-border-hover transition-colors"
            />
            <button
              onClick={handleAddCustomInterest}
              className="px-5 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow-sm)]"
            >
              Add
            </button>
          </div>

          {/* Custom interest pills */}
          {customInterests.length > 0 && (
            <div className="flex flex-wrap gap-2.5 justify-center max-w-md mx-auto mb-4">
              {customInterests.map(interest => (
                <button
                  key={interest}
                  onClick={() => removeInterest(interest)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border border-primary/60 bg-primary/15 text-foreground animate-in fade-in"
                >
                  {interest}
                  {' ✕'}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue */}
      <div className="text-center mt-10">
        <button
          onClick={handleContinue}
          disabled={isPending}
          className="px-10 py-3.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
