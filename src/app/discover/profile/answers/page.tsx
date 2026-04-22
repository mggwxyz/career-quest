'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

type AnswerRow = {
  position: number
  choice: 1 | 2 | null
  item: {
    id: string
    option1: { id: string, text: string, imageUrl: string }
    option2: { id: string, text: string, imageUrl: string }
  }
}

export default function AnswersReviewPage() {
  const [rows, setRows] = useState<AnswerRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [retaking, setRetaking] = useState(false)
  const router = useRouter()
  const reset = useAppStore(s => s.reset)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/assessment/responses')
        const data = await res.json()
        if (!cancelled) setRows((data.responses ?? []) as AnswerRow[])
      }
      catch (err) {
        console.error('[answers] fetch failed:', err)
        if (!cancelled) setRows([])
      }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleRetake = async () => {
    if (retaking) return
    setRetaking(true)
    reset()
    router.push('/discover/would-you-rather')
  }

  if (loading) {
    return <div className="text-center pt-24 text-muted-foreground">Loading…</div>
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="text-center pt-16">
        <h1 className="font-serif text-2xl text-foreground mb-3">No Answers Yet</h1>
        <p className="text-muted-foreground mb-8">Complete the assessment first to review your picks.</p>
        <Link
          href="/discover/would-you-rather"
          className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline"
        >
          Start the Assessment
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Your Would You Rathers</h1>
        <Link href="/discover/profile" className="text-sm text-muted-foreground hover:text-foreground no-underline">← Back to results</Link>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        A recap of every pair you saw and which side you picked. To change anything, you&apos;ll need to retake the assessment.
      </p>

      <ol className="space-y-6">
        {rows.map(row => (
          <li key={row.position} className="rounded-2xl border border-border bg-surface/30 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                Question
                {' '}
                {row.position}
              </span>
              {row.choice === null && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">Skipped</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <AnswerOption option={row.item.option1} isChosen={row.choice === 1} />
              <AnswerOption option={row.item.option2} isChosen={row.choice === 2} />
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-center gap-3 mt-10">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="px-7 py-3 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all text-sm"
        >
          Retake Assessment
        </button>
        <p className="text-xs text-muted-foreground">Retaking starts over — these answers will be replaced.</p>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => !retaking && setConfirmOpen(false)}>
          <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-xl text-foreground mb-2">Start over?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your current answers will be replaced with a fresh assessment. This can&apos;t be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={retaking}
                className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetake}
                disabled={retaking}
                className="px-5 py-2 rounded-full text-sm bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] disabled:opacity-60"
              >
                {retaking ? 'Starting…' : 'Yes, start over'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnswerOption({
  option,
  isChosen,
}: {
  option: { id: string, text: string, imageUrl: string }
  isChosen: boolean
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden border transition-all ${
        isChosen
          ? 'border-primary/70 shadow-[0_0_30px_rgba(78,219,167,0.22)]'
          : 'border-border opacity-50'
      }`}
    >
      <div className="relative w-full">
        <Image
          src={option.imageUrl}
          alt={option.text}
          width={512}
          height={512}
          className="w-full h-auto block"
          sizes="(max-width: 640px) 45vw, 20vw"
        />
        {isChosen && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-[0_0_16px_rgba(78,219,167,0.6)]">
            ✓
          </div>
        )}
      </div>
      <div className="p-3">
        <p className={`text-[13px] leading-snug ${isChosen ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {option.text}
        </p>
      </div>
    </div>
  )
}
