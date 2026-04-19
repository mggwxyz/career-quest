'use client'

import { useChat } from '@ai-sdk/react'
import type { Message } from '@ai-sdk/ui-utils'
import Image from 'next/image'
import { Chat } from '@/components/ui/chat'
import type { CareerContext } from '@/lib/chat/build-system-prompt'
import type { Persona } from '@/lib/personas/types'

interface Props {
  careerContext: CareerContext
  recommendationContext: { whyItMatches: string } | null
  persona: Persona | null
}

function buildOpeningMessage(persona: Persona, careerTitle: string): Message {
  const content = `Hey — I'm ${persona.name}. I've been a ${careerTitle} for ${persona.yearsInField} years, based in ${persona.location}. Happy to share whatever would be helpful — the day-to-day, how I got here, the hard parts, anything else. What are you curious about?`
  return {
    id: 'persona-greeting',
    role: 'assistant',
    content,
  }
}

export function CareerRolePlayChat({ careerContext, recommendationContext, persona }: Props) {
  const openingMessages: Message[] = persona
    ? [buildOpeningMessage(persona, careerContext.title)]
    : []

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
    initialMessages: openingMessages,
  })

  const onStartOver = () => setMessages(openingMessages)

  const assistantAvatar = persona
    ? { src: `/careers/personas/${persona.onetId}.webp`, name: persona.name }
    : undefined

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
            {assistantAvatar
              ? (
                <Image
                  src={assistantAvatar.src}
                  alt={assistantAvatar.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-border"
                />
              )
              : (
                <span aria-hidden className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary" />
              )}
            {headerLabel}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-muted-foreground hover:text-primary-soft underline disabled:opacity-40"
          disabled={messages.length <= openingMessages.length || status === 'streaming'}
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
          assistantAvatar={assistantAvatar}
          className="flex-1 p-4"
        />
      </div>
    </div>
  )
}
