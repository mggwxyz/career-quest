import { describe, expect, it } from 'vitest'
import { CareerRecommendationAiOutputSchema } from '@/lib/schemas/career'

const baseRecommendation = {
  title: 'Software Developers',
  description: 'Build and maintain software systems.',
  onetId: '15-1252.00',
  whyItMatches: 'Matches investigative and conventional interests.',
}

describe('CareerRecommendationAiOutputSchema', () => {
  it('defaults missing pay and outlook fields to renderable placeholders', () => {
    const parsed = CareerRecommendationAiOutputSchema.parse(baseRecommendation)

    expect(parsed).toEqual({
      ...baseRecommendation,
      jobGrowth: '—',
      salaryRange: '—',
    })
  })

  it('keeps pay and outlook fields supplied by the model', () => {
    const parsed = CareerRecommendationAiOutputSchema.parse({
      ...baseRecommendation,
      jobGrowth: 'Much faster than average',
      salaryRange: '$80,000 - $130,000',
    })

    expect(parsed.jobGrowth).toBe('Much faster than average')
    expect(parsed.salaryRange).toBe('$80,000 - $130,000')
  })
})
