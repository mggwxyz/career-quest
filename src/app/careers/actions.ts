'use server'

import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { getSession } from '@/lib/auth/get-session'
import { db } from '@/db'
import { assessmentSessions, careerRecommendations, recommendationRuns } from '@/db/schema'
import { CareerRecommendation, CareersResponseSchema } from '@/lib/schemas/career'
import { AssessmentResult, ENGINE_VERSION, formatResultForPrompt } from '@/lib/assessment'

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_INTEREST_LENGTH = 64
const MAX_INTERESTS = 30
const MODEL_ID = 'gpt-4o'

/**
 * Sanitize free-text interests before interpolating them into the OpenAI prompt.
 *
 * Mitigates: oversized payload attacks (item count / per-item length), control
 * characters, and code-fence / HTML delimiter injection (backtick, angle brackets).
 *
 * Does NOT attempt to block plain-text role-injection phrases ("System:",
 * "Ignore previous instructions", etc.). That is handled at a higher layer by:
 *   1. Zod output schema (CareersResponseSchema) — structurally validates the
 *      model response so a poisoned payload cannot return arbitrary data.
 *   2. OpenAI role separation — interests are interpolated into the user turn,
 *      not the system turn, so text that says "System:" does not elevate
 *      privileges at the wire level.
 */
function sanitizeInterestsForPrompt(rawInterests: string[]): string[] {
  return rawInterests
    .slice(0, MAX_INTERESTS)
    .map(interest =>
      interest
        // Strip C0 + DEL + C1 control characters
        .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')
        .replace(/[`<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_INTEREST_LENGTH),
    )
    .filter(interest => interest.length > 0)
}

export async function generateCareerRecommendationsAction(
  interests: string[],
): Promise<{ success: boolean, careers?: CareerRecommendation[], error?: string }> {
  const startedAt = Date.now()
  try {
    const session = await getSession()
    if (!session?.user) {
      return { success: false, error: 'Authentication required' }
    }
    const user = session.user

    const [latest] = await db.select().from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.userId, user.id),
        isNotNull(assessmentSessions.completedAt),
      ))
      .orderBy(desc(assessmentSessions.completedAt))
      .limit(1)
    if (!latest?.result) {
      return { success: false, error: 'Complete the assessment before requesting careers' }
    }

    const cleanInterests = sanitizeInterestsForPrompt(interests)
    const profile = formatResultForPrompt(latest.result as AssessmentResult)
    const prompt = `
${profile}

Selected Interests:
${cleanInterests.join(', ')}

Suggest 10 career paths that match the profile above. For each, return:
- title, description, onetId, whyItMatches, jobGrowth, salaryRange.
Respond as a JSON array.
    `.trim()

    const result = await generateObject({
      model: openai.chat(MODEL_ID),
      system: `You are a career counselor. Use the Holland code, confidence bands, work values, and work context to recommend careers that fit. Hedge explicitly when any scale is low confidence.`,
      prompt,
      schema: CareersResponseSchema,
    })

    if (!result) {
      throw new Error('No response from OpenAI')
    }

    // NOTE: these two inserts are NOT wrapped in a transaction. The Neon HTTP
    // driver (`@neondatabase/serverless`) supports only a batch-style transaction
    // API, which does not let us read `run.id` from the first insert before
    // issuing the second. A failed second insert therefore leaves an orphan
    // `recommendation_runs` row; `careers/page.tsx` handles that by matching
    // the latest run that has recommendations. When we move to a node-postgres
    // or pooled driver this can become a proper `db.transaction(...)`.
    const [run] = await db.insert(recommendationRuns).values({
      userId: user.id,
      sessionId: latest.id,
      interestsSnapshot: cleanInterests,
      prompt,
      model: MODEL_ID,
      engineVersion: ENGINE_VERSION,
      durationMs: Date.now() - startedAt,
    })
      .returning({ id: recommendationRuns.id })

    await db.insert(careerRecommendations).values(
      result.object.careers.map((c, i) => ({
        runId: run.id,
        userId: user.id,
        rank: i + 1,
        onetId: c.onetId,
        title: c.title,
        description: c.description,
        whyItMatches: c.whyItMatches,
        jobGrowth: c.jobGrowth,
        salaryRange: c.salaryRange,
      })),
    )

    return { success: true, careers: result.object.careers }
  }
  catch (error) {
    console.error('Error generating career recommendations:', error)
    // Note: we intentionally do NOT write a "failed run" row here.
    // `recommendation_runs.session_id` is NOT NULL and FKs to
    // `assessment_sessions.id`; any sentinel / placeholder UUID would fail
    // the FK constraint, and if the failure happened before we located a
    // session there is no valid id to attach. Telemetry for failed prompt
    // assembly lives in logs until a nullable-session or separate
    // failure-log table exists.
    return { success: false, error: 'Failed to generate career recommendations' }
  }
}
