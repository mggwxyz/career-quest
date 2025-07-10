import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, careerContext } = await req.json()

  const systemMessage = careerContext
    ? `You are a career counselor helping a student learn about the career: ${careerContext.title}.

Career Details:
- Title: ${careerContext.title}
- Description: ${careerContext.description}
- O*NET ID: ${careerContext.onetId}
- Why it matches the student: ${careerContext.whyItMatches}
- Job Growth: ${careerContext.jobGrowth}
- Salary Range: ${careerContext.salaryRange}

You should provide helpful, accurate information about this specific career including:
- Day-to-day responsibilities and tasks
- Required skills and qualifications
- Education and training requirements
- Career advancement opportunities
- Work environment and conditions
- Industry trends and outlook
- How to get started in this field

Keep your responses conversational, encouraging, and tailored to a student audience. Use the provided career details as context but feel free to expand with additional relevant information about this career field.`
    : `You are a helpful career counselor assistant. Answer questions about careers and provide guidance to students.`

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemMessage,
    messages,
  })

  return result.toDataStreamResponse()
}
