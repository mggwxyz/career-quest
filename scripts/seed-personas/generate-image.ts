import OpenAI from 'openai'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { buildImagePrompt } from './prompts'
import type { Sample } from './sample'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function runCwebp(inputPath: string, outputPath: string, quality = 85): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn('cwebp', ['-quiet', '-q', String(quality), '-resize', '512', '512', inputPath, '-o', outputPath])
    p.on('error', rej)
    p.on('exit', code => (code === 0 ? res() : rej(new Error(`cwebp exited ${code}`))))
  })
}

/** Generate a portrait for a persona and write it to public/careers/personas/{onetId}.webp.
 *  Also writes the intermediate .png alongside for debugging; commit is up to the operator. */
export async function generatePortrait(args: {
  onetId: string
  careerTitle: string
  sample: Sample
  model?: string
}): Promise<{ imagePrompt: string, imagePath: string }> {
  const model = args.model ?? 'gpt-image-1'
  const imagePrompt = buildImagePrompt({
    age: args.sample.age,
    gender: args.sample.gender,
    ethnicityCue: args.sample.ethnicityCue,
    careerTitle: args.careerTitle,
  })

  const result = await client.images.generate({
    model,
    prompt: imagePrompt,
    size: '1024x1024',
    quality: 'medium',
    n: 1,
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error(`No image returned for ${args.onetId}`)

  const personasDir = resolve(process.cwd(), 'public/careers/personas')
  const pngPath = resolve(personasDir, `${args.onetId}.png`)
  const webpPath = resolve(personasDir, `${args.onetId}.webp`)

  await writeFile(pngPath, Buffer.from(b64, 'base64'))
  await runCwebp(pngPath, webpPath, 85)

  return {
    imagePrompt,
    imagePath: `/careers/personas/${args.onetId}.webp`,
  }
}
