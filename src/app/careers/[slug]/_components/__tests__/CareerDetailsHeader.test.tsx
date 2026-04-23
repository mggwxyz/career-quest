import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CareerDetailsHeader } from '../CareerDetailsHeader'
import type { OccupationRow } from '@/lib/onet/occupations'
import type { CareerDetail } from '@/lib/onet/schemas'

const occupation: OccupationRow = {
  code: '29-1141.00',
  slug: 'registered-nurses',
  title: 'Registered Nurses',
  shortTitle: null,
  description: 'Assess patient health problems and needs.',
  shortDescription: null,
  jobZone: 4,
  brightOutlook: true,
  riasecPrimary: 'S',
  riasecAll: ['S', 'I', 'R'],
  salaryAnnualMedian: 85000,
  salaryHourlyMedian: null,
  outlookCategory: null,
}

const detail: CareerDetail = {
  code: '29-1141.00',
  title: 'Registered Nurses',
  description: 'Assess patient health problems and needs.',
  tasks: [],
  skills: [],
  knowledge: [],
  workActivities: [],
  technology: [],
  relatedCareers: [],
  jobZone: 4,
  salaryAnnualMedian: 85000,
  salaryHourlyMedian: null,
  outlookDescription: 'Faster than average growth',
} as CareerDetail

describe('CareerDetailsHeader', () => {
  it('renders the title as a heading', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByRole('heading', { name: 'Registered Nurses' })).toBeInTheDocument()
  })

  it('renders the short description', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByText('Assess patient health problems and needs.')).toBeInTheDocument()
  })

  it('renders Holland codes, outlook, salary, and education pills', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.getByText('S · I · R')).toBeInTheDocument()
    expect(screen.getByText(/Bright Outlook/i)).toBeInTheDocument()
    expect(screen.getByText(/Faster than average growth/)).toBeInTheDocument()
    expect(screen.getByText(/\$85,000/)).toBeInTheDocument()
    expect(screen.getByText(/Job Zone 4/)).toBeInTheDocument()
  })

  it('renders the "Why it fits you" callout when whyItMatches is present', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches="You care about helping people." />)
    expect(screen.getByText('Why it fits you')).toBeInTheDocument()
    expect(screen.getByText('You care about helping people.')).toBeInTheDocument()
  })

  it('omits the "Why it fits you" callout when whyItMatches is null', () => {
    render(<CareerDetailsHeader occupation={occupation} detail={detail} whyItMatches={null} />)
    expect(screen.queryByText('Why it fits you')).not.toBeInTheDocument()
  })

  it('falls back to "varies" salary when detail is null and occupation has no salary', () => {
    const occupationNoSalary = { ...occupation, salaryAnnualMedian: null, salaryHourlyMedian: null }
    render(<CareerDetailsHeader occupation={occupationNoSalary} detail={null} whyItMatches={null} />)
    expect(screen.getByText(/Median varies/)).toBeInTheDocument()
  })
})
