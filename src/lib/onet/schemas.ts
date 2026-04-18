import { z } from 'zod'

const NamedElementSchema = z.object({ name: z.string() })

export const MnmCareerSchema = z.object({
  code: z.string(),
  title: z.string(),
  what_they_do: z.string(),
  on_the_job: z.object({ task: z.array(z.string()).default([]) }),
  knowledge: z.object({ element: z.array(NamedElementSchema).default([]) }),
  skills: z.object({ element: z.array(NamedElementSchema).default([]) }),
  technology: z.object({
    category: z.array(z.object({
      example: z.array(NamedElementSchema).default([]),
    })).default([]),
  }).default({ category: [] }),
  where_they_work: z.object({
    industry: z.array(z.object({
      title: z.string(),
      percent_employed: z.number(),
    })).default([]),
  }).optional()
    .default({ industry: [] }),
  job_outlook: z.object({
    outlook: z.object({
      category: z.string(),
      description: z.string(),
    }),
    salary: z.object({
      annual_median: z.number().nullable()
        .optional(),
      annual_median_over: z.boolean().optional(),
    }),
    bright_outlook: z.object({
      category: z.array(z.string()).default([]),
      description: z.string().optional(),
    }).optional(),
  }),
  education: z.object({ job_zone: z.number().int()
    .min(1)
    .max(5) }),
  interests: z.object({
    element: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
    })).default([]),
  }),
  explore_more: z.object({
    careers: z.object({
      career: z.array(z.object({ code: z.string(), title: z.string() })).default([]),
    }).optional(),
  }).optional(),
})

export type MnmCareer = z.infer<typeof MnmCareerSchema>

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
