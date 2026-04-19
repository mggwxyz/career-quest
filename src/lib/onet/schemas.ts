import { z } from 'zod'

// GET /online/occupations?start=&end=
export const OccupationsListSchema = z.object({
  total: z.number(),
  start: z.number(),
  end: z.number(),
  occupation: z.array(z.object({
    code: z.string(),
    title: z.string(),
  })),
})

export type OccupationsList = z.infer<typeof OccupationsListSchema>

// --- v2 MNM sub-resources ---

// GET /mnm/careers/{code}
export const MnmCareerV2SummarySchema = z.object({
  code: z.string(),
  title: z.string(),
  what_they_do: z.string().optional(),
  tags: z.object({ bright_outlook: z.boolean().optional() }).optional(),
  on_the_job: z.array(z.string()).default([]),
})

// GET /mnm/careers/{code}/knowledge  |  /skills
// Both use the same group-of-elements shape.
const ElementGroupSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  element: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
}))
export const MnmElementGroupSchema = ElementGroupSchema

// GET /mnm/careers/{code}/technology
export const MnmTechnologyV2Schema = z.array(z.object({
  code: z.number().optional(),
  title: z.string(),
  example: z.array(z.object({
    title: z.string(),
    hot_technology: z.boolean().optional(),
    in_demand: z.boolean().optional(),
    percentage: z.number().optional(),
  })).default([]),
}))

// GET /mnm/careers/{code}/education
export const MnmEducationV2Schema = z.object({
  job_zone: z.object({ code: z.number().int()
    .min(1)
    .max(5) }),
})

// GET /mnm/careers/{code}/job_outlook
// Salary may be annual_* or hourly_* depending on the occupation.
export const MnmJobOutlookV2Schema = z.object({
  outlook: z.object({
    category: z.string(),
    description: z.string(),
  }),
  bright_outlook: z.array(z.object({
    code: z.string(),
    title: z.string(),
  })).optional(),
  salary: z.object({
    annual_10th_percentile: z.number().optional(),
    annual_median: z.number().optional(),
    annual_90th_percentile: z.number().optional(),
    hourly_10th_percentile: z.number().optional(),
    hourly_median: z.number().optional(),
    hourly_90th_percentile: z.number().optional(),
  }).default({}),
})

// GET /mnm/careers/{code}/explore_more
export const MnmExploreMoreV2Schema = z.object({
  careers: z.array(z.object({
    code: z.string(),
    title: z.string(),
  })).default([]),
})

// GET /online/occupations/{code}/summary/interests
export const OnlineInterestsSummaryV2Schema = z.object({
  interest_code: z.string(),
  element: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).default([]),
})

// --- Normalized CareerDetail consumed by UI + chat projectors ---

export interface CareerDetail {
  code: string
  title: string
  description: string | null
  brightOutlook: boolean
  tasks: string[]
  skills: string[]
  knowledge: string[]
  technology: string[]
  jobZone: number
  /** Full ordered list of RIASEC names from the O*NET Holland code. */
  riasecNames: string[]
  salaryAnnualMedian: number | null
  salaryHourlyMedian: number | null
  outlookCategory: string | null
  outlookDescription: string | null
  relatedCareers: Array<{ code: string, title: string }>
}
