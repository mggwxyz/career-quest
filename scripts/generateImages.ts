import { experimental_generateImage as generateImage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { questions } from '../src/app/_data/questions'
import { WORK_VALUE_IMAGES, ENV_IMAGES } from '../src/app/_data/profileImages'
import { execFile } from 'node:child_process'
import fs from 'fs/promises'
import path from 'path'
import pThrottle from 'p-throttle'
import { promisify } from 'node:util'

import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

const openai = createOpenAI({
  compatibility: 'strict',
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limit: 4 requests per minute.
const throttle = pThrottle({
  limit: 4,
  interval: 60 * 1000,
})

const execFileAsync = promisify(execFile)
const WEBP_QUALITY = '82'

async function writeImage(imagePath: string, bytes: Uint8Array) {
  if (!imagePath.endsWith('.webp')) {
    await fs.writeFile(imagePath, bytes)
    return
  }

  const tmpPngPath = `${imagePath}.tmp.png`
  await fs.writeFile(tmpPngPath, bytes)
  try {
    await execFileAsync('cwebp', ['-quiet', '-q', WEBP_QUALITY, tmpPngPath, '-o', imagePath])
  }
  finally {
    await fs.rm(tmpPngPath, { force: true })
  }
}

/**
 * Throttled generator — produces a single image using the shared cartoon/vector
 * style wrapper and writes it to the given directory.
 */
const throttledGenerateAndSaveImage = throttle(
  async (prompt: string, filename: string, outputDir: string) => {
    const imagePrompt = `Cartoon of ${prompt}. --no photorealism, minimalistic, and vector art style.`
    try {
      const { image } = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt: imagePrompt,
        size: '1024x1024',
      })

      await fs.mkdir(outputDir, { recursive: true })
      const imagePath = path.join(outputDir, filename)
      await writeImage(imagePath, image.uint8Array)
      console.log(`Generated image: ${path.relative(process.cwd(), imagePath)}`)
    }
    catch (error) {
      console.error(`Error generating image for ${filename}:`, error)
    }
  },
)

async function generateWouldYouRatherImages() {
  const outputDir = path.join(process.cwd(), 'public/would-you-rather/images')
  const tasks = questions.decks.flatMap(deck =>
    deck.questions.flatMap(question => [
      throttledGenerateAndSaveImage(question.option1.prompt, `${question.option1.id}.webp`, outputDir),
      throttledGenerateAndSaveImage(question.option2.prompt, `${question.option2.id}.webp`, outputDir),
    ]),
  )
  await Promise.all(tasks)
}

async function generateProfileImages() {
  const outputDir = path.join(process.cwd(), 'public/profile/images')
  const entries = [
    ...Object.values(WORK_VALUE_IMAGES),
    ...Object.values(ENV_IMAGES),
  ]
  const tasks = entries.map(entry =>
    throttledGenerateAndSaveImage(entry.prompt, entry.filename, outputDir),
  )
  await Promise.all(tasks)
}

async function main() {
  const profileOnly = process.argv.includes('--profile')
  if (profileOnly) {
    console.log('Generating profile images (work values + environments)...')
    await generateProfileImages()
  }
  else {
    console.log('Generating would-you-rather images...')
    await generateWouldYouRatherImages()
  }
}

main().catch(console.error)
