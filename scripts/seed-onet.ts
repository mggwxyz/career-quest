#!/usr/bin/env tsx
import 'dotenv-flow/config'
import { db } from '@/db'
import { onetOccupations } from '@/db/schema'
import { onetFetch } from '@/lib/onet/client'
import {
  MnmCareerV2SummarySchema,
  MnmEducationV2Schema,
  MnmJobOutlookV2Schema,
  OccupationsListSchema,
  OnlineInterestsSummaryV2Schema,
} from '@/lib/onet/schemas'
import { deriveMirrorRow, type MirrorSource } from '@/lib/onet/seed-helpers'
import { sql as drizzleSql } from 'drizzle-orm'

const MIN_DELAY_MS = 3000 // ~20 rpm

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function listAllOccupationCodes(): Promise<string[]> {
  const codes: string[] = []
  let start = 1
  const pageSize = 200
  while (true) {
    const data = await onetFetch<unknown>(
      `/online/occupations?start=${start}&end=${start + pageSize - 1}`,
      { revalidateSeconds: 0 },
    )
    const parsed = OccupationsListSchema.parse(data)
    for (const occ of parsed.occupation) codes.push(occ.code)
    if (parsed.end >= parsed.total) break
    start = parsed.end + 1
    await sleep(MIN_DELAY_MS)
  }
  return codes
}

async function fetchMirrorSource(code: string): Promise<MirrorSource> {
  const [summaryRaw, educationRaw, interestsRaw, jobOutlookRaw] = await Promise.all([
    onetFetch<unknown>(`/mnm/careers/${code}`, { revalidateSeconds: 0 }),
    onetFetch<unknown>(`/mnm/careers/${code}/education`, { revalidateSeconds: 0 }),
    onetFetch<unknown>(`/online/occupations/${code}/summary/interests`, { revalidateSeconds: 0 }),
    onetFetch<unknown>(`/mnm/careers/${code}/job_outlook`, { revalidateSeconds: 0 }),
  ])
  const summary = MnmCareerV2SummarySchema.parse(summaryRaw)
  const education = MnmEducationV2Schema.parse(educationRaw)
  const interests = OnlineInterestsSummaryV2Schema.parse(interestsRaw)
  const jobOutlook = MnmJobOutlookV2Schema.parse(jobOutlookRaw)
  return {
    code: summary.code,
    title: summary.title,
    description: summary.what_they_do ?? null,
    brightOutlook: Boolean(summary.tags?.bright_outlook),
    jobZone: education.job_zone.code,
    interestCode: interests.interest_code,
    salaryAnnualMedian: jobOutlook.salary.annual_median ?? null,
    salaryHourlyMedian: jobOutlook.salary.hourly_median ?? null,
    outlookCategory: jobOutlook.outlook.category,
  }
}

async function seedOne(code: string, taken: Set<string>) {
  let retries = 0
  while (retries < 3) {
    try {
      const source = await fetchMirrorSource(code)
      const row = deriveMirrorRow(source, taken)
      taken.add(row.slug)
      await db.insert(onetOccupations).values(row)
        .onConflictDoUpdate({
          target: onetOccupations.code,
          set: {
            slug: row.slug,
            title: row.title,
            description: row.description,
            jobZone: row.jobZone,
            brightOutlook: row.brightOutlook,
            riasecPrimary: row.riasecPrimary,
            riasecAll: row.riasecAll,
            salaryAnnualMedian: row.salaryAnnualMedian,
            salaryHourlyMedian: row.salaryHourlyMedian,
            outlookCategory: row.outlookCategory,
            updatedAt: drizzleSql`now()`,
          },
        })
      return
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/\b429\b/.test(msg)) {
        console.warn(`[seed] 429 on ${code} — sleeping 30s`)
        await sleep(30_000)
        retries++
      }
      else {
        console.error(`[seed] failed ${code}:`, msg)
        return
      }
    }
  }
}

async function main() {
  console.log('[seed] listing all occupation codes from O*NET...')
  const codes = await listAllOccupationCodes()
  console.log(`[seed] found ${codes.length} occupations. seeding...`)

  const existing = await db.select({ slug: onetOccupations.slug }).from(onetOccupations)
  const taken = new Set<string>(existing.map(r => r.slug))

  for (let i = 0; i < codes.length; i++) {
    await seedOne(codes[i], taken)
    if (i % 25 === 0) console.log(`[seed] ${i}/${codes.length}`)
    await sleep(MIN_DELAY_MS)
  }
  console.log('[seed] done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
