import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { buildSceneTextPrompt } from './prompts'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const SceneTextSchema = z.object({
  peopleCount: z.number().int()
    .min(1)
    .max(3),
  scene: z.string().min(20)
    .max(900),
})

export type SceneText = z.infer<typeof SceneTextSchema>

export async function generateSceneText(args: {
  onetId: string
  careerTitle: string
  careerDescription?: string
  model?: string
}): Promise<SceneText> {
  const model = args.model ?? 'gpt-5'
  const prompt = buildSceneTextPrompt({
    careerTitle: args.careerTitle,
    onetId: args.onetId,
    careerDescription: args.careerDescription,
  })

  const result = await generateObject({
    model: openai.chat(model),
    system: 'You compose concrete, candid scene descriptions for flat illustration reference. Always describe people mid-task, never posing, using the real tools of the job. Be specific and varied.',
    prompt,
    schema: SceneTextSchema,
    temperature: 1,
  })

  return result.object
}
