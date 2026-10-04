'use client'

import { FormEvent, useState, useTransition } from 'react'
import { StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { addCareerNoteAction } from '@/app/careers/actions'
import { Button } from '@/components/ui/button'

interface Props {
  onetId: string
  slug?: string | null
  initialNote?: string | null
}

export function CareerNoteForm({ onetId, slug, initialNote }: Props) {
  const [draft, setDraft] = useState('')
  const [latestNote, setLatestNote] = useState(initialNote ?? '')
  const [isPending, startTransition] = useTransition()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const note = draft.trim()
    if (!note) {
      toast.error('Write a note before saving')
      return
    }

    startTransition(async () => {
      const result = await addCareerNoteAction({ onetId, note, slug: slug ?? undefined })
      if (result.success) {
        setLatestNote(result.state.latestNote ?? note)
        setDraft('')
        toast.success('Note saved')
      }
      else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <StickyNote className="h-4 w-4 text-primary-soft" />
        Notes
      </div>
      {latestNote && (
        <p className="rounded-xl border border-border bg-background/40 p-3 text-sm text-muted-foreground">
          {latestNote}
        </p>
      )}
      <textarea
        value={draft}
        onChange={event => setDraft(event.target.value)}
        placeholder="Add what you want to remember about this career"
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary-soft"
        maxLength={1000}
      />
      <Button type="submit" size="sm" className="rounded-full" disabled={isPending}>
        Save note
      </Button>
    </form>
  )
}
