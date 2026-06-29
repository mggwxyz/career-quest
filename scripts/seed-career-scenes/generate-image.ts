import OpenAI from 'openai'
import { writeFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { buildSceneImagePrompt } from './prompts'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type Quality = 'low' | 'medium' | 'high'

function runCwebp(inputPath: string, outputPath: string, quality = 82): Promise<void> {
  return new Promise((res, rej) => {
    // -resize 1024 0 → width 1024, height auto, preserving the 3:2 aspect.
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), '-resize', '1024', '0', inputPath, '-o', outputPath])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

/** Render a candid scene for a career and write it to
 *  public/careers/scenes/{onetId}.webp. The intermediate .png is removed after webp conversion. */
export async function generateSceneImage(args: {
  onetId: string
  scene: string
  quality?: Quality
  model?: string
}): Promise<{ imagePrompt: string, imagePath: string }> {
  const model = args.model ?? 'gpt-image-1'
  const imagePrompt = buildSceneImagePrompt({ scene: args.scene })

  const result = await client.images.generate({
    model,
    prompt: imagePrompt,
    size: '1536x1024',
    quality: args.quality ?? 'medium',
    n: 1,
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image returned for ${args.onetId}`)

  const scenesDir = resolve(process.cwd(), 'public/careers/scenes')
  const pngPath = resolve(scenesDir, `${args.onetId}.png`)
  const webpPath = resolve(scenesDir, `${args.onetId}.webp`)

  await writeFile(pngPath, Buffer.from(b64, 'base64'))
  await runCwebp(pngPath, webpPath, 82)
  await unlink(pngPath)

  return {
    imagePrompt,
    imagePath: `/careers/scenes/${args.onetId}.webp`,
  }
}
