'use client'
import { GradeBand } from '@/lib/assessment'

type Choice = { label: string, value: GradeBand | null }

const CHOICES: Choice[] = [
  { label: '6th–8th', value: 'middle' },
  { label: '9th–10th', value: 'early-hs' },
  { label: '11th–12th', value: 'late-hs' },
  { label: 'College+', value: 'college' },
  { label: 'Prefer not to say', value: null },
]

export default function GradeQuestion({ onContinue }: { onContinue: (band: GradeBand | null) => void }) {
  return (
    <div className="text-center pt-20 px-4">
      <h1 className="font-serif text-3xl text-foreground mb-3">What grade are you in?</h1>
      <p className="text-sm text-muted-foreground mb-8">This helps us tune your results.</p>
      <div className="flex flex-col gap-3 items-stretch max-w-xs mx-auto">
        {CHOICES.map(c => (
          <button
            key={c.label}
            onClick={() => onContinue(c.value)}
            className="px-6 py-3 rounded-full border border-border text-foreground hover:border-border-hover hover:text-primary-soft transition-all"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
