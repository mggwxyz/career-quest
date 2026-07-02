'use client'

import { useChat, type Message } from '@ai-sdk/react'
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
  const role = persona.role?.trim() || careerTitle
  const years = `${persona.yearsInField} ${persona.yearsInField === 1 ? 'year' : 'years'}`
  const content = `Hey — I'm ${persona.name}. I've been a ${role} for ${years}, based in ${persona.location}. Happy to share whatever would be helpful — the day-to-day, how I got here, the hard parts, anything else. What are you curious about?`
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

  const portraitSrc = persona ? `/careers/personas/${persona.onetId}.webp` : null

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface/50 border border-border rounded-2xl h-[600px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            {portraitSrc && persona
              ? (
                <Image
                  src={portraitSrc}
                  alt={persona.name}
                  width={72}
                  height={72}
                  className="w-[72px] h-[72px] rounded-xl object-cover border border-border shrink-0"
                  priority
                />
              )
              : (
                <span aria-hidden className="w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-primary to-secondary shrink-0" />
              )}
            <div className="min-w-0">
              {persona
                ? (
                  <>
                    <h2 className="font-serif text-xl text-foreground leading-tight">{persona.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {persona.role?.trim() || careerContext.title}
                      {' • '}
                      {persona.yearsInField}
                      {' '}
                      {persona.yearsInField === 1 ? 'year' : 'years'}
                      {' • '}
                      {persona.location}
                    </p>
                  </>
                )
                : (
                  <>
                    <h2 className="text-lg font-semibold text-foreground">
                      Talk with a
                      {' '}
                      {careerContext.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Speaking from experience — ask about the day-to-day, getting started, what surprises people, or anything else.
                    </p>
                  </>
                )}
            </div>
          </div>
          <button
            type="button"
            onClick={onStartOver}
            className="self-start text-xs px-3 py-1 rounded-full border border-border bg-surface text-foreground hover:border-border-hover hover:bg-muted transition-all disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-border shrink-0 sm:self-auto"
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
            assistantName={persona?.name}
            className="flex-1 p-4"
          />
        </div>
      </div>
      {persona && (
        <p className="text-xs text-muted-foreground/80 italic text-center">
          Fictional character. Real career facts.
        </p>
      )}
    </div>
  )
}
