'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import type { CareerContext } from '@/lib/chat/build-system-prompt'
import type { Persona } from '@/lib/personas/types'

interface Props {
  careerContext: CareerContext
  recommendationContext: { whyItMatches: string } | null
  persona: Persona | null
}

export function CareerRolePlayChat({ careerContext, recommendationContext, persona }: Props) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
    setMessages,
  } = useChat({
    api: '/api/careers/chat',
    body: { careerContext, recommendationContext, persona },
    initialMessages: [],
  })

  const onStartOver = () => setMessages([])

  const headerLabel = persona
    ? (
      <>
        Talk with
        {' '}
        <span>{persona.name}</span>
        <span className="text-muted-foreground font-normal">{`, ${careerContext.title}`}</span>
      </>
    )
    : (
      <>
        Talk with a
        {' '}
        <span>{careerContext.title}</span>
      </>
    )

  const headerSubtitle = persona
    ? `${persona.yearsInField} years in the field — based in ${persona.location}.`
    : 'Speaking from experience — ask about the day-to-day, getting started, what surprises people, or anything else.'

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span aria-hidden className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary" />
            {headerLabel}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-muted-foreground hover:text-primary-soft underline disabled:opacity-40"
          disabled={messages.length === 0 || status === 'streaming'}
        >
          Start over
        </button>
      </div>

      {error && (
        <div className="p-4 border-b border-border" role="alert">
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive mb-1">Chat Error</p>
            <p className="text-xs text-muted-foreground mb-2">Failed to send message. Please try again.</p>
            <button
              type="button"
              onClick={() => reload()}
              disabled={status === 'streaming'}
              className="text-xs text-primary-soft hover:underline disabled:opacity-50"
            >
              Retry Last Message
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Chat
          messages={messages}
          handleSubmit={handleSubmit}
          input={input}
          handleInputChange={handleInputChange}
          isGenerating={status === 'streaming'}
          className="flex-1 p-4"
        />
      </div>
    </div>
  )
}
