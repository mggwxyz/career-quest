'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'
import { CareerRecommendation } from '@/lib/schemas/career'

interface CareerChatProps {
  career: CareerRecommendation
}

export function CareerChat({ career }: CareerChatProps) {
  const { messages, input, handleInputChange, handleSubmit, status, error, reload } = useChat({
    api: '/api/careers/chat',
    initialMessages: [
      {
        id: 'system',
        role: 'assistant',
        content: `Hi! I'm here to help you learn about **${career.title}**. I can answer questions about the day-to-day responsibilities, required skills, career path, education requirements, and anything else you'd like to know about this career. What would you like to know?`,
      },
    ],
    body: {
      careerContext: {
        title: career.title,
        description: career.description,
        onetId: career.onetId,
        whyItMatches: career.whyItMatches,
        jobGrowth: career.jobGrowth,
        salaryRange: career.salaryRange,
      },
    },
  })

  return (
    <div className="bg-surface/50 border border-border rounded-2xl h-[500px] md:h-[600px] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Chat about
          {' '}
          {career.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask me anything about this career!
        </p>
      </div>

      {error && (
        <div className="p-4 border-b border-border" role="alert">
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
            <p className="text-sm font-semibold text-destructive mb-1">Chat Error</p>
            <p className="text-xs text-muted-foreground mb-2">Failed to send message. Please try again.</p>
            <button
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
