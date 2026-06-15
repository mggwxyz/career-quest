/** Locked cartoon-style prefix for career scenes. Mirrors IMAGE_STYLE_PREFIX in
 *  scripts/seed-personas/prompts.ts so scenes visually match the persona
 *  portraits and would-you-rather items. The composition lines differ on
 *  purpose: a candid single-subject workplace scene, not a centered portrait. */
export const CAREER_STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, expressive but minimal faces.',
  'No text, no labels, no signage, no written words anywhere.',
  'Flat 2D look, no gradients, no shading beyond simple flat color.',
  'Wide 3:2 landscape composition centered on a single person doing their job.',
  'Other people may appear smaller and simpler in the background only when the setting naturally calls for it.',
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
    `Describe a single candid illustration of one person at work as ${careerTitle} (O*NET ${onetId}).`,
    careerDescription ? `What they do: ${careerDescription}` : '',
    '',
    'Return:',
    '- scene: one concrete paragraph (2-4 sentences). Describe ONE worker as the clear focal subject, physically mid-action on a real task of this job — name the setting and the actual tools/equipment. Show genuine tasks and responsibilities, not abstractions.',
    '',
    'Hard requirements for the scene:',
    '- Single focus: exactly one prominent person doing the work. Other people may appear only in the background — smaller, simpler, and secondary — and only when the setting naturally has them (e.g. customers, patients, colleagues). Many jobs need no one else at all.',
    '- Candid: the worker is mid-action and absorbed in the task. No one looks at the viewer or poses.',
    '- Concrete over generic: "fitting a copper pipe under a sink with a wrench", not "doing plumbing work".',
    '- Vary the worker across careers — mix gender, age, and ethnicity so a diverse set of people is represented overall.',
    '- No text, signs, logos, or readable writing in the described scene.',
    '- Keep it to what a single illustration can show.',
  ].filter(Boolean).join('\n')
}

/** Prompt for the image step: locked style prefix + the distilled scene. */
export function buildSceneImagePrompt(args: { scene: string }): string {
  return `${CAREER_STYLE_PREFIX} ${args.scene} Candid, no one looking at the camera. No text, no captions, no labels anywhere.`
}
