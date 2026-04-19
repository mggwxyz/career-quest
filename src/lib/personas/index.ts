import manifest from '../../../data/personas/personas.json'
import type { Persona, PersonaManifest } from './types'

export type { Persona, PersonaManifest, Gender, EthnicityCue, AgeBand } from './types'

export function getPersona(onetId: string): Persona | null {
  const m = manifest as PersonaManifest
  return m[onetId] ?? null
}
