import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CareerRecommendation } from '@/lib/schemas/career'
import CareersClient from '../CareersClient'

vi.mock('@/app/discover/matches/actions', () => ({
  generateCareerRecommendationsAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('@/components/scene-image', () => ({
  SceneImage: ({ onetId, alt }: { onetId: string, alt: string }) => (
    <div role="img" aria-label={alt} data-testid="scene-image" data-onet-id={onetId} />
  ),
}))

const baseCareer: CareerRecommendation = {
  title: 'Software Developers',
  description: 'Builds applications and systems.',
  onetId: '15-1252.00',
  whyItMatches: 'It uses investigative and realistic strengths.',
  jobGrowth: 'Faster than average',
  salaryRange: '$100,000+',
  slug: 'software-developers',
  hasScene: true,
}

describe('CareersClient', () => {
  it('renders scene images only for careers with a seeded scene', () => {
    render(
      <CareersClient
        initialCareers={[
          baseCareer,
          {
            ...baseCareer,
            title: 'Archivists',
            onetId: '25-4011.00',
            slug: 'archivists',
            hasScene: false,
          },
          {
            ...baseCareer,
            title: 'Technical Writers',
            onetId: '27-3042.00',
            slug: 'technical-writers',
            hasScene: undefined,
          },
        ]}
      />,
    )

    expect(screen.getAllByTestId('scene-image')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Software Developers at work' })).toHaveAttribute('data-onet-id', '15-1252.00')
    expect(screen.queryByRole('img', { name: 'Archivists at work' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Technical Writers at work' })).not.toBeInTheDocument()
  })
})
