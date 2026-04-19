import type { MnmCareer } from './schemas'
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

export function toCareerContext(career: MnmCareer): CareerContext {
  const formatSalary = (n: number | null | undefined) =>
    typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : 'varies'

  return {
    title: career.title,
    onetCode: career.code,
    shortDescription: career.what_they_do,
    tasks: career.on_the_job.task.slice(0, 5),
    skills: career.skills.element.slice(0, 10).map(e => e.name),
    knowledge: career.knowledge.element.slice(0, 5).map(e => e.name),
    workActivities: [], // MNM payload does not include structured work activities; left empty.
    technology: career.technology.category
      .flatMap(c => c.example)
      .slice(0, 8)
      .map(e => e.name),
    jobZone: {
      number: career.education.job_zone,
      name: JOB_ZONE_NAMES[career.education.job_zone],
      description: JOB_ZONE_DESCRIPTIONS[career.education.job_zone],
    },
    riasecTop: career.interests.element.slice(0, 3).map(e => e.name),
    salaryMedian: formatSalary(career.job_outlook.salary.annual_median),
    outlook: career.job_outlook.outlook.description,
  }
}
