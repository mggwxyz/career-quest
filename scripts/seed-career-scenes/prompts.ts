/** Locked cartoon-style prefix for career scenes. Mirrors IMAGE_STYLE_PREFIX in
 *  scripts/seed-personas/prompts.ts so scenes visually match the persona
 *  portraits and would-you-rather items. The composition lines differ on
 *  purpose: a candid multi-person workplace scene, not a centered portrait. */
export const CAREER_STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, expressive but minimal faces.',
  'No text, no labels, no signage, no written words anywhere.',
  'Flat 2D look, no gradients, no shading beyond simple flat color.',
  'Wide 3:2 landscape composition showing one to three people in a workplace scene.',
  'Candid mid-action moment — no one looking at the camera, no posing.',
  'Scene:',
].join(' ')

/** Prompt for the GPT-5 step: distill a career into one concrete candid scene. */
export function buildSceneTextPrompt(args: {
  careerTitle: string
  onetId: string
  careerDescription?: string
}): string {
  const { careerTitle, onetId, careerDescription } = args
  return [
    `Describe a single candid illustration of people at work as ${careerTitle} (O*NET ${onetId}).`,
    careerDescription ? `What they do: ${careerDescription}` : '',
    '',
    'Return:',
    '- peopleCount: an integer from 1 to 3 — how many workers fit this moment naturally (some jobs are solitary, some collaborative).',
    '- scene: one concrete paragraph (2-4 sentences). Name the setting, what each person is physically doing right now, and the real tools/equipment of this job. Show actual tasks and responsibilities of the role, not abstractions.',
    '',
    'Hard requirements for the scene:',
    '- Candid: people are mid-action and absorbed in their work. No one looks at the viewer or poses.',
    '- Concrete over generic: "fitting a copper pipe under a sink with a wrench", not "doing plumbing work".',
    '- When more than one person is shown, include a natural, diverse mix (vary gender, age, and ethnicity).',
    '- No text, signs, logos, or readable writing in the described scene.',
    '- Keep it to what a single illustration can show.',
  ].filter(Boolean).join('\n')
}

/** Prompt for the image step: locked style prefix + the distilled scene. */
export function buildSceneImagePrompt(args: { scene: string }): string {
  return `${CAREER_STYLE_PREFIX} ${args.scene} Candid, no one looking at the camera. No text, no captions, no labels anywhere.`
}
