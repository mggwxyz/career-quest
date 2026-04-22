'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAppStore } from '@/store/appStore'
import { useShallow } from 'zustand/react/shallow'
import OptionCard from './_components/OptionCard'
import IntroCard from './_components/IntroCard'
import ConfidenceMeter from './_components/ConfidenceMeter'
import PeekModal from './_components/PeekModal'
import InconsistencyModal from './_components/InconsistencyModal'
import { useWyrImagePreload } from './_hooks/useWyrImagePreload'
import { GradeBand, Item, Posterior, AssessmentResult } from '@/lib/assessment'

export default function PreferencesPage() {
  useWyrImagePreload()

  const {
    phase, sessionId, currentItem, itemsAnswered, posteriorSnapshot,
    result, inconsistencyDismissed,
    setPhase, startSession, receiveNext, receiveStop,
    dismissInconsistency, reset,
  } = useAppStore(useShallow(s => ({
    phase: s.phase, sessionId: s.sessionId,
    currentItem: s.currentItem, itemsAnswered: s.itemsAnswered,
    posteriorSnapshot: s.posteriorSnapshot, result: s.result,
    inconsistencyDismissed: s.inconsistencyDismissed,
    setPhase: s.setPhase,
    startSession: s.startSession, receiveNext: s.receiveNext,
    receiveStop: s.receiveStop, dismissInconsistency: s.dismissInconsistency,
    reset: s.reset,
  })))

  const [selectedOption, setSelectedOption] = useState<1 | 2 | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [peekOpen, setPeekOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const shownAtRef = useRef<number>(0)
  const pendingSubmitRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (pendingSubmitRef.current !== null) {
      window.clearTimeout(pendingSubmitRef.current)
    }
  }, [])

  // Covers client-side nav back into an in-flight session, where the Zustand
  // store retains phase='question' + currentItem but the ref re-initializes to 0.
  useEffect(() => {
    if (phase === 'question' && currentItem && shownAtRef.current === 0) {
      shownAtRef.current = Date.now()
    }
  }, [phase, currentItem])

  // Resume on first mount. Treat legacy persisted 'grade' phase as 'intro'.
  useEffect(() => {
    if (phase === 'grade') {
      setPhase('intro')
      return
    }
    if (phase !== 'intro') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/assessment/session')
        const data = await res.json()
        if (cancelled) return
        if (data.active) {
          if (data.active.stopped) {
            const rRes = await fetch('/api/assessment/result')
            const rData = await rRes.json()
            if (rData.result) receiveStop(rData.result as AssessmentResult)
          }
          else if (data.active.item) {
            startSession(data.active.sessionId, data.active.item as Item)
            useAppStore.setState({ itemsAnswered: data.active.itemsAnswered })
            shownAtRef.current = Date.now()
          }
        }
      }
      catch (err) {
        console.error('[preferences] resume fetch failed:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, receiveStop, startSession, setPhase])

  const beginNewSession = useCallback(async (band: GradeBand | null) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeBand: band ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start session')
      startSession(data.sessionId, data.item as Item)
      shownAtRef.current = Date.now()
    }
    catch (err) {
      console.error('[preferences] start failed:', err)
      setPhase('intro')
    }
  }, [setPhase, startSession])

  const submitChoice = useCallback(async (choice: 1 | 2 | null) => {
    if (!sessionId || !currentItem || submitting) return
    setSubmitting(true)
    const responseMs = Date.now() - shownAtRef.current
    try {
      const res = await fetch('/api/assessment/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, itemId: currentItem.id, choice, responseMs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      if (data.kind === 'stop') {
        receiveStop(data.result as AssessmentResult)
      }
      else {
        receiveNext(data.item as Item, data.itemsAnswered, data.posteriorSnapshot as Posterior)
        shownAtRef.current = Date.now()
      }
    }
    catch (err) {
      console.error('[preferences] submit failed:', err)
    }
    finally {
      setSelectedOption(null)
      setShowCheckmark(false)
      setSubmitting(false)
    }
  }, [sessionId, currentItem, submitting, receiveNext, receiveStop])

  const handleOptionSelect = (option: 1 | 2) => {
    if (selectedOption !== null || submitting) return
    setSelectedOption(option)
    setShowCheckmark(true)
    pendingSubmitRef.current = window.setTimeout(() => submitChoice(option), 220)
  }

  const handleSkip = () => {
    if (selectedOption !== null || submitting) return
    submitChoice(null)
  }

  const handleRetake = () => {
    reset()
    setPhase('intro')
  }

  if (phase === 'intro') {
    return <IntroCard onStart={() => beginNewSession(null)} />
  }
  if (phase === 'loading') {
    return <div className="text-center pt-24 text-muted-foreground">Starting…</div>
  }
  if (phase === 'complete' && result) {
    const showInconsistency = result.meta.inconsistencyFlag && !inconsistencyDismissed
    return (
      <>
        <div className="text-center pt-20">
          <h1 className="font-serif text-3xl text-foreground mb-4">Assessment Complete</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Your Holland code:
            {' '}
            <strong className="text-foreground">{result.hollandCode}</strong>
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link href="/discover/profile" className="px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold shadow-[var(--shadow-glow-sm)] no-underline">
              View Your Results
            </Link>
            <Link href="/discover/matches" className="px-8 py-3 rounded-full border border-border text-primary-soft font-medium hover:border-border-hover transition-all no-underline">
              Explore Career Matches
            </Link>
            <Link href="/discover/profile/answers" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2 no-underline">
              Review Your Answers
            </Link>
            <button type="button" onClick={handleRetake} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Start Over
            </button>
          </div>
        </div>
        {showInconsistency && <InconsistencyModal onDismiss={dismissInconsistency} onRetake={handleRetake} />}
      </>
    )
  }
  if (phase !== 'question' || !currentItem) return null

  return (
    <>
      <ConfidenceMeter itemsAnswered={itemsAnswered} />

      <div className="text-center mb-8 mt-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Would you rather...</h1>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="relative max-w-3xl mx-auto">
            <div className="block sm:hidden space-y-4">
              <OptionCard option={currentItem.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <OptionCard option={currentItem.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-6">
              <OptionCard option={currentItem.option1} isSelected={selectedOption === 1} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(1)} />
              <OptionCard option={currentItem.option2} isSelected={selectedOption === 2} showCheckmark={showCheckmark} onClick={() => handleOptionSelect(2)} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center gap-3 mt-6 flex-wrap">
        {itemsAnswered >= 13 && (
          <button type="button" onClick={() => setPeekOpen(true)} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all">
            Peek at profile
          </button>
        )}
        <button type="button" onClick={handleSkip} disabled={selectedOption !== null || submitting} className="px-5 py-2 rounded-full text-sm border border-border text-muted-foreground hover:border-border-hover hover:text-primary-soft transition-all disabled:opacity-30">
          Skip →
        </button>
      </div>

      {peekOpen && <PeekModal posterior={posteriorSnapshot} onClose={() => setPeekOpen(false)} />}
    </>
  )
}
