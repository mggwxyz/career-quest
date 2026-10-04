'use client'

import { useState, useTransition } from 'react'
import { Bookmark, RotateCcw, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { setCareerActionStateAction } from '@/app/careers/actions'
import type { CareerActionState, CareerActionToggle } from '@/lib/career/action-types'

interface Props {
  onetId: string
  title: string
  state: CareerActionState
  slug?: string | null
  compact?: boolean
  showDismiss?: boolean
}

function optimisticState(
  state: CareerActionState,
  toggle: CareerActionToggle,
  active: boolean,
): CareerActionState {
  if (toggle === 'save') return { ...state, saved: active, dismissed: active ? false : state.dismissed }
  if (toggle === 'shortlist') return { ...state, shortlisted: active, dismissed: active ? false : state.dismissed }
  return { ...state, dismissed: active }
}

export function CareerActionButtons({
  onetId,
  title,
  state,
  slug,
  compact = false,
  showDismiss = true,
}: Props) {
  const [current, setCurrent] = useState(state)
  const [pendingToggle, setPendingToggle] = useState<CareerActionToggle | null>(null)
  const [isPending, startTransition] = useTransition()

  const update = (toggle: CareerActionToggle, active: boolean) => {
    const previous = current
    setCurrent(optimisticState(current, toggle, active))
    setPendingToggle(toggle)

    startTransition(async () => {
      const result = await setCareerActionStateAction({ onetId, toggle, active, slug: slug ?? undefined })
      setPendingToggle(null)
      if (result.success) {
        setCurrent(result.state)
      }
      else {
        setCurrent(previous)
        toast.error(result.error)
      }
    })
  }

  const buttonSize = compact ? 'sm' : 'default'
  const buttonClass = compact
    ? 'h-8 rounded-full px-2.5 text-xs'
    : 'rounded-full'

  return (
    <div className="flex flex-wrap gap-2" aria-label={`${title} career actions`}>
      <Button
        type="button"
        size={buttonSize}
        variant={current.saved ? 'default' : 'outline'}
        className={buttonClass}
        aria-pressed={current.saved}
        aria-label={current.saved ? `Unsave ${title}` : `Save ${title}`}
        disabled={isPending && pendingToggle === 'save'}
        onClick={() => update('save', !current.saved)}
      >
        <Bookmark className={current.saved ? 'fill-current' : ''} />
        {current.saved ? 'Saved' : 'Save'}
      </Button>
      <Button
        type="button"
        size={buttonSize}
        variant={current.shortlisted ? 'default' : 'outline'}
        className={buttonClass}
        aria-pressed={current.shortlisted}
        aria-label={current.shortlisted ? `Remove ${title} from shortlist` : `Shortlist ${title}`}
        disabled={isPending && pendingToggle === 'shortlist'}
        onClick={() => update('shortlist', !current.shortlisted)}
      >
        <Star className={current.shortlisted ? 'fill-current' : ''} />
        {current.shortlisted ? 'Shortlisted' : 'Shortlist'}
      </Button>
      {showDismiss && (
        <Button
          type="button"
          size={buttonSize}
          variant={current.dismissed ? 'secondary' : 'ghost'}
          className={buttonClass}
          aria-pressed={current.dismissed}
          aria-label={current.dismissed ? `Restore ${title}` : `Dismiss ${title}`}
          disabled={isPending && pendingToggle === 'dismiss'}
          onClick={() => update('dismiss', !current.dismissed)}
        >
          {current.dismissed ? <RotateCcw /> : <X />}
          {current.dismissed ? 'Restore' : 'Dismiss'}
        </Button>
      )}
    </div>
  )
}
