import { experimental_generateImage as generateImage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { questions } from '../src/app/_data/questions'
import fs from 'fs/promises'
import path from 'path'
import pThrottle from 'p-throttle'

import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

const openai = createOpenAI({
  // custom settings, e.g.
  compatibility: 'strict', // strict mode, enable when using the OpenAI API
  apiKey: process.env.OPENAI_API_KEY,
})

// Create a throttled function that allows 4 calls per minute
const throttle = pThrottle({
  limit: 4,
  interval: 60 * 1000, // 1 minute in milliseconds
})

// Create a throttled version of generateAndSaveImage
const throttledGenerateAndSaveImage = throttle(async (prompt: string, filename: string) => {
  const imagePrompt = `Cartoon of ${prompt}. --no photorealism, minimalistic, and vector art style.`
  try {
    const { image } = await generateImage({
      model: openai.image('gpt-image-1'),
      prompt: imagePrompt,
      size: '1024x1024',
    })

    // Create public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public/would-you-rather/images')
    await fs.mkdir(publicDir, { recursive: true })

    // Save the image
    const imagePath = path.join(publicDir, filename)
    await fs.writeFile(imagePath, image.uint8Array)
    console.log(`Generated image: ${filename}`)
  }
  catch (error) {
    console.error(`Error generating image for ${filename}:`, error)
  }
})

async function generateAllImages() {
  // Create an array of all image generation tasks
  const tasks = questions.decks.flatMap(deck =>
    deck.questions.flatMap(question => [
      throttledGenerateAndSaveImage(question.option1.prompt, `${question.option1.id}.png`),
      throttledGenerateAndSaveImage(question.option2.prompt, `${question.option2.id}.png`),
    ]),
  )

  // Execute all tasks in parallel
  await Promise.all(tasks)
}

// Run the image generation
generateAllImages().catch(console.error)
