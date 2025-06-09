import { createOpenAI } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'

const openai = createOpenAI({
  // custom settings, e.g.
  compatibility: 'strict', // strict mode, enable when using the OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const results = await request.json()

    const prompt = `
        Based on the following assessment results, suggest 10 career paths that would be a good match. 
        For each career, provide a brief explanation of why it matches their profile.
        Format the response as a JSON array of objects, where each object has the following properties:
        - title: string (the title of the career)
        - description: string (a brief description of the career)
        - onetId: string (the Onet ID of the career)
        - whyItMatches: string (a brief explanation of why it matches their profile)
        - jobGrowth: string (the job growth of the career)
        - salaryRange: string (the salary range of the career)

        Assessment Results:
        ${JSON.stringify(results, null, 2)}

        .`

    const result = await generateObject({
      model: openai.chat('gpt-4o'),
      system: `You are a career counselor helping to match people with suitable careers based on their interests, values, and preferences.`,
      prompt,
      schema: z.object({
        careers: z.array(z.object({
          title: z.string(),
          description: z.string(),
          onetId: z.string(),
          whyItMatches: z.string(),
          jobGrowth: z.string(),
          salaryRange: z.string(),
        })),
      }),
    })

    console.log({ result })

    if (!result) {
      throw new Error('No response from OpenAI')
    }

    return NextResponse.json({ careers: result.object.careers })
  }
  catch (error) {
    console.error('Error generating career recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate career recommendations' },
      { status: 500 },
    )
  }
}
