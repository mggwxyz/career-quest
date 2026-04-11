'use server'

import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users, careerRecommendations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { CareerRecommendation, CareersResponseSchema } from '@/lib/schemas/career'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_INTEREST_LENGTH = 64
const MAX_INTERESTS = 30

function sanitizeInterestsForPrompt(rawInterests: string[]): string[] {
  return rawInterests
    .slice(0, MAX_INTERESTS)
    .map(interest =>
      interest
        // Strip control characters and common prompt-injection delimiters
        .replace(/[\x00-\x1f\x7f]/g, ' ')
        .replace(/[`<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_INTEREST_LENGTH),
    )
    .filter(interest => interest.length > 0)
}

export async function generateCareerRecommendationsAction(
  results: Record<string, Record<string, number>>,
  interests: string[],
): Promise<{ success: boolean, careers?: CareerRecommendation[], error?: string }> {
  try {
    const prompt = `
      Based on the following assessment results and selected interests, suggest 10 career paths that would be a good match.
      For each career, provide a brief explanation of why it matches their profile.
      Format the response as a JSON array of objects, where each object has the following properties:
      - title: string (the title of the career)
      - description: string (a brief description of the career)
      - onetId: string (the Onet ID of the career)
      - whyItMatches: string (a brief explanation of why it matches their profile)
      - jobGrowth: string (the job growth of the career)
      - salaryRange: string (the salary range of the career)

      Selected Interests:
      ${sanitizeInterestsForPrompt(interests).join(', ')}

      Assessment Results:
      ${JSON.stringify(results, null, 2)}
    `

    const result = await generateObject({
      model: openai.chat('gpt-4o'),
      system: `You are a career counselor helping to match people with suitable careers based on their interests, values, and preferences.
      Consider both their explicitly selected interests and their assessment results when making recommendations.
      Prioritize careers that align with their selected interests while also matching their RIASEC profile, work values, and environment preferences.`,
      prompt,
      schema: CareersResponseSchema,
    })

    if (!result) {
      throw new Error('No response from OpenAI')
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Ensure user row exists
    const existingUser = await db.select().from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        interests,
      })
    }
    else {
      await db.update(users)
        .set({ interests, updatedAt: new Date() })
        .where(eq(users.id, user.id))
    }

    // Delete old recommendations and insert new ones
    await db.delete(careerRecommendations)
      .where(eq(careerRecommendations.userId, user.id))

    await db.insert(careerRecommendations).values(
      result.object.careers.map(career => ({
        userId: user.id,
        onetId: career.onetId,
        title: career.title,
        description: career.description,
        whyItMatches: career.whyItMatches,
        jobGrowth: career.jobGrowth,
        salaryRange: career.salaryRange,
      })),
    )

    return { success: true, careers: result.object.careers }
  }
  catch (error) {
    console.error('Error generating career recommendations:', error)
    return { success: false, error: 'Failed to generate career recommendations' }
  }
}
