import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { buildCareerRolePlaySystemPrompt } from '@/lib/chat/build-system-prompt'

export const maxDuration = 30

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const CareerContextSchema = z.object({
  title: z.string(),
  onetCode: z.string(),
  shortDescription: z.string(),
  tasks: z.array(z.string()).max(10),
  skills: z.array(z.string()).max(15),
  knowledge: z.array(z.string()).max(10),
  workActivities: z.array(z.string()).max(10),
  technology: z.array(z.string()).max(15),
  jobZone: z.object({ number: z.number(), name: z.string(), description: z.string() }),
  riasecTop: z.array(z.string()).max(6),
  salaryMedian: z.string(),
  outlook: z.string(),
})

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  careerContext: CareerContextSchema,
  recommendationContext: z.object({ whyItMatches: z.string() }).nullable(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  const system = buildCareerRolePlaySystemPrompt(body.careerContext, body.recommendationContext)

  const result = streamText({
    model: openai('gpt-4o'),
    system,
    messages: body.messages,
  })

  return result.toDataStreamResponse()
}
