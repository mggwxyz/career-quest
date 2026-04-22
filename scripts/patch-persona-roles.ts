/**
 * One-off patch: assign `role` to the six personas that the LLM-backfill
 * couldn't resolve (three codes missing from the current O*NET mirror, three
 * long "First-Line Supervisors of…" titles that the model refused to shorten).
 * Rerun-safe: only sets role when missing unless --force.
 */
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PersonaManifest } from '../src/lib/personas/types'

const MANIFEST_PATH = resolve(process.cwd(), 'data/personas/personas.json')

const PATCHES: Record<string, string> = {
  '29-1141.00': 'Registered Nurse',
  '29-1171.00': 'Nurse Practitioner',
  '15-1252.00': 'Software Developer',
  '35-1012.00': 'Food Service Supervisor',
  '43-1011.00': 'Office Supervisor',
  '39-1014.00': 'Recreation Supervisor',
}

function main() {
  const force = process.argv.includes('--force')
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as PersonaManifest
  let changed = 0
  for (const [code, role] of Object.entries(PATCHES)) {
    const p = manifest[code]
    if (!p) {
      console.warn(`[patch] ${code}: not in manifest`)
      continue
    }
    if (p.role && !force) {
      console.log(`[patch] ${code}: role already set (${p.role}), skipping`)
      continue
    }
    manifest[code] = { ...p, role }
    changed++
    console.log(`[patch] ${code} -> ${role}`)
  }
  if (changed > 0) {
    const tmp = `${MANIFEST_PATH}.tmp-${process.pid}`
    writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
    renameSync(tmp, MANIFEST_PATH)
    console.log(`[patch] wrote ${changed} updates to manifest`)
  }
}

main()
