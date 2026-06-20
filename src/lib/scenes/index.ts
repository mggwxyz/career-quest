import manifest from '../../../data/careers/scenes.json'
import type { CareerScene, SceneManifest } from './types'

export type { CareerScene, SceneManifest } from './types'

export function getScene(onetId: string): CareerScene | null {
  const m = manifest as SceneManifest
  return m[onetId] ?? null
}

export function hasScene(onetId: string): boolean {
  return (manifest as SceneManifest)[onetId] !== undefined
}

export function listSceneOnetIds(): string[] {
  return Object.keys(manifest as SceneManifest)
}
