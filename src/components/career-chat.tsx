'use client'

import { useChat } from '@ai-sdk/react'
import { Chat } from '@/components/ui/chat'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

interface CareerChatProps {
  career: Career
}

export function CareerChat({ career }: CareerChatProps) {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
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
