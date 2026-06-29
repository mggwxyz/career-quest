import { z } from 'zod'

/**
 * What the model returns. The local O*NET mirror overwrites pay/outlook when the code exists;
 * missing keys default to "—" so the UI always has a string to render.
 */
export const CareerRecommendationAiOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  onetId: z.string(),
  whyItMatches: z.string(),
  jobGrowth: z
    .string()
    .default('—')
    .describe('Brief job outlook: growth category or career trend; estimates OK'),
  salaryRange: z
    .string()
    .default('—')
    .describe('Typical pay e.g. median or range; estimates OK if exact figures unknown'),
})

export const CareerRecommendationSchema = CareerRecommendationAiOutputSchema.extend({
  slug: z.string().nullable()
    .optional(),
  riasecCodes: z.array(z.string()).optional(),
  hasScene: z.boolean().optional(),
})

export const CareersResponseSchema = z.object({
  careers: z.array(CareerRecommendationAiOutputSchema),
})

export type CareerRecommendation = z.infer<typeof CareerRecommendationSchema>
export type CareersResponse = z.infer<typeof CareersResponseSchema>
