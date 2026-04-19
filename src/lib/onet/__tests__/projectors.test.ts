import { describe, it, expect } from 'vitest'
import type { CareerDetail } from '../schemas'
import { toCareerContext, JOB_ZONE_NAMES, JOB_ZONE_DESCRIPTIONS } from '../projectors'

const sampleDetail: CareerDetail = {
  code: '29-1141.00',
  title: 'Registered Nurses',
  description: 'Assess patient health problems and needs, develop and implement nursing care plans.',
  brightOutlook: true,
  tasks: [
    'Maintain accurate, detailed reports and records.',
    'Monitor, record, and report symptoms or changes in patients\' conditions.',
    'Administer medications to patients and monitor patients for reactions or side effects.',
    'Modify patient treatment plans as indicated by patients\' responses and conditions.',
    'Consult and coordinate with healthcare team members to assess, plan, implement, or evaluate patient care plans.',
    'Monitor all aspects of patient care, including diet and physical activity.',
  ],
  skills: [
    'listening to others, not interrupting, and asking good questions',
    'understanding people\'s reactions',
    'talking to others',
    'keeping track of how well people and/or groups are doing',
    'figuring out how to help people',
    'looking for ways to help people',
    'changing what is done based on other people\'s actions',
    'thinking about the pros and cons of different options',
    'using scientific rules and strategies to solve problems',
    'reading work related information',
    'deleven',
  ],
  knowledge: [
    'patient care and counseling',
    'psychology',
    'customer service',
    'biology',
    'the structure and content of the English language',
    'sixth',
  ],
  technology: [
    'Epic Systems',
    'Cerner',
    'Microsoft Word',
    'Google Docs',
    'SAP',
    'Oracle',
    'MEDITECH',
    'Allscripts',
    'ninth',
  ],
  jobZone: 4,
  riasecNames: ['Social', 'Investigative', 'Realistic'],
  salaryAnnualMedian: 81680,
  salaryHourlyMedian: null,
  outlookCategory: 'Bright',
  outlookDescription: 'Employment is projected to grow Faster than average.',
  relatedCareers: [],
}

describe('toCareerContext', () => {
  it('projects a v2 CareerDetail into the chat CareerContext shape', () => {
    const ctx = toCareerContext(sampleDetail)
    expect(ctx.title).toBe('Registered Nurses')
    expect(ctx.onetCode).toBe('29-1141.00')
    expect(ctx.tasks).toHaveLength(5)
    expect(ctx.skills).toHaveLength(10)
    expect(ctx.knowledge).toHaveLength(5)
    expect(ctx.technology).toHaveLength(8)
    expect(ctx.jobZone.number).toBe(4)
    expect(ctx.jobZone.name).toBe(JOB_ZONE_NAMES[4])
    expect(ctx.jobZone.description).toBe(JOB_ZONE_DESCRIPTIONS[4])
    expect(ctx.riasecTop).toEqual(['Social', 'Investigative', 'Realistic'])
    expect(ctx.salaryMedian).toBe('$81,680')
    expect(ctx.outlook).toMatch(/Faster/)
  })

  it('falls back to hourly salary with /hr suffix when annual is missing', () => {
    const ctx = toCareerContext({
      ...sampleDetail,
      salaryAnnualMedian: null,
      salaryHourlyMedian: 23.33,
    })
    expect(ctx.salaryMedian).toBe('$23.33/hr')
  })

  it('shows "varies" when no salary is available', () => {
    const ctx = toCareerContext({
      ...sampleDetail,
      salaryAnnualMedian: null,
      salaryHourlyMedian: null,
    })
    expect(ctx.salaryMedian).toBe('varies')
  })
})
