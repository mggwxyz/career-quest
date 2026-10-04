import { describe, expect, it } from 'vitest'
import { getScene, hasScene, listSceneOnetIds } from '../index'

const seededOnetId = '11-1011.00'
const missingOnetId = '00-0000.00'

describe('career scene manifest helpers', () => {
  it('returns seeded scene metadata by O*NET id', () => {
    const scene = getScene(seededOnetId)

    expect(scene).toMatchObject({
      onetId: seededOnetId,
      careerTitle: 'Chief Executives',
      imagePath: `/careers/scenes/${seededOnetId}.webp`,
    })
    expect(scene?.sceneDescription).toEqual(expect.any(String))
    expect(scene?.imagePrompt).toEqual(expect.any(String))
  })

  it('reports whether an O*NET id has a scene', () => {
    expect(hasScene(seededOnetId)).toBe(true)
    expect(hasScene(missingOnetId)).toBe(false)
    expect(getScene(missingOnetId)).toBeNull()
  })

  it('lists the seeded O*NET ids that can be resolved', () => {
    const ids = listSceneOnetIds()

    expect(ids.length).toBeGreaterThan(900)
    expect(ids).toContain(seededOnetId)
    expect(ids).not.toContain(missingOnetId)
    expect(ids.every(id => hasScene(id))).toBe(true)
  })
})
