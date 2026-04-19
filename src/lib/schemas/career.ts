import { z } from 'zod'

export const CareerRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  onetId: z.string(),
  slug: z.string().nullable()
    .optional(),
  whyItMatches: z.string(),
  jobGrowth: z.string(),
  salaryRange: z.string(),
})

export const CareersResponseSchema = z.object({
  careers: z.array(CareerRecommendationSchema),
})

export type CareerRecommendation = z.infer<typeof CareerRecommendationSchema>
export type CareersResponse = z.infer<typeof CareersResponseSchema>
