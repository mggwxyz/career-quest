import { EventEmitter } from 'node:events'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IMAGE_MODEL, generateSceneImage } from '../generate-image'

const mocks = vi.hoisted(() => ({
  imagesGenerate: vi.fn(),
  spawn: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    images: {
      generate: mocks.imagesGenerate,
    },
  })),
}))

vi.mock('node:child_process', () => ({
  default: { spawn: mocks.spawn },
  spawn: mocks.spawn,
}))

vi.mock('node:fs/promises', () => ({
  default: {
    unlink: mocks.unlink,
    writeFile: mocks.writeFile,
  },
  unlink: mocks.unlink,
  writeFile: mocks.writeFile,
}))

describe('generateSceneImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.imagesGenerate.mockResolvedValue({
      data: [{ b64_json: Buffer.from('image-bytes').toString('base64') }],
    })
    mocks.writeFile.mockResolvedValue(undefined)
    mocks.unlink.mockResolvedValue(undefined)
    mockCwebpExit(0)
  })

  it('renders an image, converts it to webp, removes the png, and returns the public path', async () => {
    const result = await generateSceneImage({
      onetId: '29-1141.00',
      scene: 'A nurse checks a patient monitor beside a hospital bed.',
    })

    const pngPath = resolve(process.cwd(), 'public/careers/scenes/29-1141.00.png')
    const webpPath = resolve(process.cwd(), 'public/careers/scenes/29-1141.00.webp')

    expect(IMAGE_MODEL).toBe('gpt-image-2')
    expect(mocks.imagesGenerate).toHaveBeenCalledWith({
      model: 'gpt-image-2',
      prompt: expect.stringContaining('A nurse checks a patient monitor beside a hospital bed.'),
      size: '1536x1024',
      quality: 'medium',
      n: 1,
    })
    expect(mocks.writeFile).toHaveBeenCalledWith(pngPath, Buffer.from('image-bytes'))
    expect(mocks.spawn).toHaveBeenCalledWith('cwebp', [
      '-quiet',
      '-q',
      '82',
      '-resize',
      '1024',
      '0',
      pngPath,
      '-o',
      webpPath,
    ])
    expect(mocks.unlink).toHaveBeenCalledWith(pngPath)
    expect(mocks.writeFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.spawn.mock.invocationCallOrder[0],
    )
    expect(mocks.spawn.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.unlink.mock.invocationCallOrder[0],
    )
    expect(result).toEqual({
      imagePrompt: expect.stringContaining('No text'),
      imagePath: '/careers/scenes/29-1141.00.webp',
    })
  })

  it('still removes the intermediate png when webp conversion fails', async () => {
    mockCwebpExit(1)

    await expect(generateSceneImage({
      onetId: '47-2152.00',
      scene: 'A plumber tightens a copper pipe under a sink.',
      quality: 'high',
    })).rejects.toThrow('cwebp exited 1')

    expect(mocks.unlink).toHaveBeenCalledWith(
      resolve(process.cwd(), 'public/careers/scenes/47-2152.00.png'),
    )
    expect(mocks.writeFile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.spawn.mock.invocationCallOrder[0],
    )
    expect(mocks.spawn.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.unlink.mock.invocationCallOrder[0],
    )
  })
})

function mockCwebpExit(code: number) {
  mocks.spawn.mockImplementation(() => {
    const childProcess = new EventEmitter()
    queueMicrotask(() => childProcess.emit('exit', code))
    return childProcess
  })
}
