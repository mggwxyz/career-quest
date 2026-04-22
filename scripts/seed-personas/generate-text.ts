import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { Sample } from './sample'
import { buildPersonaTextPrompt } from './prompts'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const PersonaTextSchema = z.object({
  name: z.string().min(2)
    .max(60),
  role: z.string().min(2)
    .max(60),
  pronouns: z.string().min(2)
    .max(40),
  location: z.string().min(3)
    .max(60),
  educationPath: z.string().min(10)
    .max(400),
  pathToCurrentPosition: z.string().min(20)
    .max(800),
  dayInTheLife: z.string().min(20)
    .max(600),
  hobby: z.string().min(5)
    .max(200),
})

export type PersonaText = z.infer<typeof PersonaTextSchema>

export async function generatePersonaText(args: {
  onetId: string
  careerTitle: string
  careerDescription?: string
  sample: Sample
  model?: string
}): Promise<PersonaText> {
  const model = args.model ?? 'gpt-5'
  const prompt = buildPersonaTextPrompt({
    careerTitle: args.careerTitle,
    onetId: args.onetId,
    careerDescription: args.careerDescription,
    demographics: {
      gender: args.sample.gender,
      ageBand: args.sample.ageBand,
      age: args.sample.age,
      ethnicityCue: args.sample.ethnicityCue,
      yearsInField: args.sample.yearsInField,
    },
  })

  const result = await generateObject({
    model: openai.chat(model),
    system: 'You are a careful character-design assistant. Invent realistic, specific, non-formulaic working professionals. Do not use the forbidden tropes the user lists.',
    prompt,
    schema: PersonaTextSchema,
    temperature: 1,
  })

  return result.object
}
