import { describe, expect, it } from 'vitest'
import {
  CareerRecommendationAiOutputSchema,
  CareersResponseSchema,
} from '../career'

const minimalCareer = {
  title: 'Software Developer',
  description: 'Builds and maintains software systems.',
  onetId: '15-1252.00',
  whyItMatches: 'Matches an investigative and conventional profile.',
}

describe('career recommendation schemas', () => {
  it('defaults missing AI metadata fields to renderable placeholders', () => {
    const parsed = CareerRecommendationAiOutputSchema.parse(minimalCareer)

    expect(parsed.jobGrowth).toBe('—')
    expect(parsed.salaryRange).toBe('—')
  })

  it('preserves AI-provided metadata values in career response arrays', () => {
    const parsed = CareersResponseSchema.parse({
      careers: [
        {
          ...minimalCareer,
          jobGrowth: 'Bright outlook',
          salaryRange: '$100,000/yr',
        },
      ],
    })

    expect(parsed.careers[0]).toMatchObject({
      jobGrowth: 'Bright outlook',
      salaryRange: '$100,000/yr',
    })
  })
})
