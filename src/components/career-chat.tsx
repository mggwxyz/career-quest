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
    <div className="card bg-base-100 shadow-xl h-[600px] flex flex-col">
      <div className="card-body p-0 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-base-300">
          <h2 className="text-lg font-semibold">
            Chat about
            {' '}
            {career.title}
          </h2>
          <p className="text-sm text-base-content/70">
            Ask me anything about this career!
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 border-b border-base-300">
            <div className="alert alert-error">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Chat Error</span>
                <span className="text-sm">Failed to send message. Please try again.</span>
                <button
                  onClick={reload}
                  className="btn btn-sm btn-ghost"
                  disabled={status === 'streaming'}
                >
                  Retry Last Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Interface */}
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
    </div>
  )
}
