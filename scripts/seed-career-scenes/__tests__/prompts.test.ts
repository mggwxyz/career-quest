import { describe, it, expect } from 'vitest'
import { CAREER_STYLE_PREFIX, buildSceneTextPrompt, buildSceneImagePrompt } from '../prompts'

describe('CAREER_STYLE_PREFIX', () => {
  it('keeps the shared persona/item visual tokens', () => {
    expect(CAREER_STYLE_PREFIX).toContain('Flat-color vector illustration')
    expect(CAREER_STYLE_PREFIX).toContain('#f5ebdd')
    expect(CAREER_STYLE_PREFIX).toContain('no gradients')
  })

  it('uses a candid 3:2 single-subject composition with optional background, not a portrait', () => {
    expect(CAREER_STYLE_PREFIX).toContain('3:2 landscape')
    expect(CAREER_STYLE_PREFIX).toContain('single person')
    expect(CAREER_STYLE_PREFIX).toContain('in the background')
    expect(CAREER_STYLE_PREFIX).toContain('no one looking at the camera')
    expect(CAREER_STYLE_PREFIX).not.toContain('one to three people')
    expect(CAREER_STYLE_PREFIX).not.toContain('Portrait from chest up')
  })
})

describe('buildSceneTextPrompt', () => {
  it('includes the career title, O*NET id, and description', () => {
    const p = buildSceneTextPrompt({
      careerTitle: 'Plumber',
      onetId: '47-2152.00',
      careerDescription: 'Assemble, install, and repair pipes.',
    })
    expect(p).toContain('Plumber')
    expect(p).toContain('47-2152.00')
    expect(p).toContain('Assemble, install, and repair pipes.')
  })

  it('asks for a single-focus candid scene with optional background, concrete tasks, and diversity', () => {
    const p = buildSceneTextPrompt({ careerTitle: 'Plumber', onetId: '47-2152.00' })
    expect(p).toContain('one person')
    expect(p).toContain('- scene:')
    expect(p).toContain('in the background')
    expect(p.toLowerCase()).toContain('candid')
    expect(p.toLowerCase()).toContain('diverse')
    expect(p).not.toContain('peopleCount')
  })

  it('omits the description line when none is given', () => {
    const p = buildSceneTextPrompt({ careerTitle: 'Plumber', onetId: '47-2152.00' })
    expect(p).not.toContain('What they do:')
  })
})

describe('buildSceneImagePrompt', () => {
  it('prefixes the locked style and injects the scene', () => {
    const scene = 'Two electricians pull cable through a ceiling.'
    const p = buildSceneImagePrompt({ scene })
    expect(p.startsWith(CAREER_STYLE_PREFIX)).toBe(true)
    expect(p).toContain(scene)
  })

  it('reinforces candid framing and forbids text', () => {
    const p = buildSceneImagePrompt({ scene: 'A scene.' })
    expect(p).toContain('no one looking at the camera')
    expect(p).toContain('No text')
  })
})
