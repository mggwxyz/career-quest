import { createOpenAI } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { userInfo } from '@/db/schema'
import { eq } from 'drizzle-orm'

const openai = createOpenAI({
  // custom settings, e.g.
  compatibility: 'strict', // strict mode, enable when using the OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
})

type CareerRecommendation = {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

const saveUserData = async (careers: CareerRecommendation[], quizResults: unknown, interests: string[]) => {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Error getting user:', userError)
    throw userError
  }

  if (!user?.id) {
    throw new Error('User not found')
  }

  // Try to update existing user info first
  const existingUser = await db.select().from(userInfo)
    .where(eq(userInfo.id, user.id))
    .limit(1)

  if (existingUser.length > 0) {
    // Update existing user
    await db.update(userInfo)
      .set({
        interests,
        quizResults: careers,
        updatedAt: new Date(),
      })
      .where(eq(userInfo.id, user.id))
  }
  else {
    // Insert new user
    await db.insert(userInfo).values({
      id: user.id,
      email: user.email,
      interests,
      quizResults: careers,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

// export const saveCareerRecommendations = async (results: any, interests: any) => {
//   const drizzleClient

//   await db.insert(careerRecommendations).values( )
// }

export async function POST(request: Request) {
  try {
    const { results, interests } = await request.json()

    console.log({ results, interests })

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
        ${interests.join(', ')}

        Assessment Results:
        ${JSON.stringify(results, null, 2)}

        .`

    const result = await generateObject({
      model: openai.chat('gpt-4o'),
      system: `You are a career counselor helping to match people with suitable careers based on their interests, values, and preferences. 
      Consider both their explicitly selected interests and their assessment results when making recommendations.
      Prioritize careers that align with their selected interests while also matching their RIASEC profile, work values, and environment preferences.`,
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

    try {
      await saveUserData(result.object.careers, results, interests)
    }
    catch (error) {
      console.error('Error saving user data:', error)
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
