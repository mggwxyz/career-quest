import { EventEmitter } from 'node:events'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateSceneImage, IMAGE_MODEL } from '../generate-image'
import { buildSceneImagePrompt } from '../prompts'
import OpenAI from 'openai'
import { writeFile, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'

const mocks = vi.hoisted(() => ({
  generateImage: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  spawn: vi.fn(),
}))

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    images: {
      generate: mocks.generateImage,
    },
  })),
}))

vi.mock('node:fs/promises', () => ({
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
  default: {
    writeFile: mocks.writeFile,
    unlink: mocks.unlink,
  },
}))

vi.mock('node:child_process', () => ({
  spawn: mocks.spawn,
  default: {
    spawn: mocks.spawn,
  },
}))

function mockCwebpExit(code: number) {
  mocks.spawn.mockImplementationOnce(() => {
    const process = new EventEmitter()
    queueMicrotask(() => {
      process.emit('exit', code)
    })
    return process
  })
}

describe('generateSceneImage', () => {
  beforeEach(() => {
    vi.mocked(OpenAI).mockClear()
    vi.mocked(writeFile).mockReset()
    vi.mocked(unlink).mockReset()
    vi.mocked(spawn).mockReset()
    mocks.generateImage.mockReset()
    mocks.generateImage.mockResolvedValue({
      data: [{ b64_json: Buffer.from('fake-png').toString('base64') }],
    })
    vi.mocked(writeFile).mockResolvedValue(undefined)
    vi.mocked(unlink).mockResolvedValue(undefined)
    mockCwebpExit(0)
  })

  it('requests the locked image defaults, converts the PNG, and returns the served WebP path', async () => {
    const result = await generateSceneImage({
      onetId: '47-2152.00',
      scene: 'A plumber repairs pipes below a kitchen sink.',
    })

    const expectedPrompt = buildSceneImagePrompt({
      scene: 'A plumber repairs pipes below a kitchen sink.',
    })
    const expectedPngPath = resolve(process.cwd(), 'public/careers/scenes/47-2152.00.png')
    const expectedWebpPath = resolve(process.cwd(), 'public/careers/scenes/47-2152.00.webp')

    expect(mocks.generateImage).toHaveBeenCalledWith({
      model: IMAGE_MODEL,
      prompt: expectedPrompt,
      size: '1536x1024',
      quality: 'medium',
      n: 1,
    })
    expect(writeFile).toHaveBeenCalledWith(expectedPngPath, Buffer.from('fake-png'))
    expect(spawn).toHaveBeenCalledWith('cwebp', [
      '-quiet',
      '-q',
      '82',
      '-resize',
      '1024',
      '0',
      expectedPngPath,
      '-o',
      expectedWebpPath,
    ])
    expect(unlink).toHaveBeenCalledWith(expectedPngPath)
    expect(result).toEqual({
      imagePrompt: expectedPrompt,
      imagePath: '/careers/scenes/47-2152.00.webp',
    })
  })

  it('removes the intermediate PNG when cwebp fails', async () => {
    vi.mocked(spawn).mockReset()
    mockCwebpExit(1)

    await expect(generateSceneImage({
      onetId: '47-2152.00',
      scene: 'A plumber repairs pipes below a kitchen sink.',
    }))
      .rejects
      .toThrow('cwebp exited 1')

    expect(unlink).toHaveBeenCalledWith(
      resolve(process.cwd(), 'public/careers/scenes/47-2152.00.png'),
    )
  })
})
