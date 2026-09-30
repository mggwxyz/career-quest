import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CareerRecommendation } from '@/lib/schemas/career'
import CareersClient from '../CareersClient'

vi.mock('../../actions', () => ({
  generateCareerRecommendationsAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

const baseCareer: CareerRecommendation = {
  title: 'Software Developers',
  description: 'Design and build computer applications.',
  onetId: '15-1252.00',
  whyItMatches: 'You enjoy solving technical problems.',
  jobGrowth: '—',
  salaryRange: '—',
  slug: 'software-developers',
  hasScene: false,
}

describe('CareersClient', () => {
  it('hides placeholder career metadata chips from recommendation cards', () => {
    render(<CareersClient initialCareers={[baseCareer]} />)

    expect(screen.getByRole('heading', { name: 'Software Developers' })).toBeInTheDocument()
    expect(screen.queryByText('Growth:')).not.toBeInTheDocument()
    expect(screen.queryByText('Salary:')).not.toBeInTheDocument()
    expect(screen.queryByText(/O\*NET 30\.3 national data/)).not.toBeInTheDocument()
  })

  it('shows career metadata and source label when real values are available', () => {
    render(
      <CareersClient
        initialCareers={[
          {
            ...baseCareer,
            jobGrowth: 'Faster than average',
            salaryRange: '$120,000 median',
          },
        ]}
      />,
    )

    expect(screen.getByText('Growth:')).toBeInTheDocument()
    expect(screen.getByText('Faster than average')).toBeInTheDocument()
    expect(screen.getByText('Salary:')).toBeInTheDocument()
    expect(screen.getByText('$120,000 median')).toBeInTheDocument()
    expect(screen.getByText(/O\*NET 30\.3 national data/)).toBeInTheDocument()
  })
})
