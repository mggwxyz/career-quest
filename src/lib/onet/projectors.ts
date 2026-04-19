import type { CareerDetail } from './schemas'
import type { CareerContext } from '@/lib/chat/build-system-prompt'

export const JOB_ZONE_NAMES: Record<number, string> = {
  1: 'Little or No Preparation Needed',
  2: 'Some Preparation Needed',
  3: 'Medium Preparation Needed',
  4: 'Considerable Preparation Needed',
  5: 'Extensive Preparation Needed',
}

export const JOB_ZONE_DESCRIPTIONS: Record<number, string> = {
  1: 'Some may require a high school diploma or GED; little formal education beyond that.',
  2: 'Usually requires a high school diploma plus some on-the-job training.',
  3: 'Usually requires training in vocational schools, related on-the-job experience, or an associate\'s degree.',
  4: 'Usually requires a four-year bachelor\'s degree; some require advanced training.',
  5: 'Extensive skill, knowledge, and experience — advanced degrees are usually required.',
}

export function toCareerContext(detail: CareerDetail): CareerContext {
  const annual = detail.salaryAnnualMedian
  const hourly = detail.salaryHourlyMedian
  const salaryMedian = typeof annual === 'number'
    ? `$${annual.toLocaleString('en-US')}`
    : typeof hourly === 'number'
      ? `$${hourly.toLocaleString('en-US')}/hr`
      : 'varies'

  return {
    title: detail.title,
    onetCode: detail.code,
    shortDescription: detail.description ?? '',
    tasks: detail.tasks.slice(0, 5),
    skills: detail.skills.slice(0, 10),
    knowledge: detail.knowledge.slice(0, 5),
    workActivities: [], // v2 MNM payload does not include structured work activities; left empty.
    technology: detail.technology.slice(0, 8),
    jobZone: {
      number: detail.jobZone,
      name: JOB_ZONE_NAMES[detail.jobZone] ?? '',
      description: JOB_ZONE_DESCRIPTIONS[detail.jobZone] ?? '',
    },
    riasecTop: detail.riasecNames.slice(0, 3),
    salaryMedian,
    outlook: detail.outlookDescription ?? '',
  }
}
