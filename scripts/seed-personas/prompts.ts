/** Locked cartoon-style prefix for portraits. Mirrors scripts/generate-item-images.ts
 *  so persona portraits visually match existing would-you-rather illustrations. */
export const IMAGE_STYLE_PREFIX = [
  'Flat-color vector illustration in a friendly modern storybook style.',
  'Thick uniform black outlines, warm cream/beige background (#f5ebdd).',
  'Muted earth-tone palette with selective blue and mustard-yellow accents.',
  'Simple geometric shapes, single centered focal subject, expressive but',
  'minimal faces. No text, no labels, no signage, no written words anywhere.',
  'Flat 2D look, no gradients, no shading beyond simple flat color.',
  'Square 1:1 composition. Portrait from chest up, centered.',
  'Subject:',
].join(' ')

/** Avoid-these-tropes list for persona text. Injected as a constraint into the
 *  GPT-5 prompt so 200+ backstories don't all sound the same. */
export const AVOID_TROPES = [
  '"always knew she/he/they wanted to"',
  '"grew up in a small town"',
  '"discovered a passion for"',
  '"helping people" as the only motivation',
  'inspirational quotes',
  'cliché mentor figures (unless specific and concrete)',
  'identical structural openers across different personas',
]

export function buildPersonaTextPrompt(args: {
  careerTitle: string
  onetId: string
  careerDescription?: string
  demographics: {
    gender: string
    ageBand: string
    age: number
    ethnicityCue: string
    yearsInField: number
  }
}): string {
  const { careerTitle, onetId, careerDescription, demographics: d } = args
  return [
    `Invent a fictional but realistic person working as a ${careerTitle} (O*NET ${onetId}).`,
    careerDescription ? `Career description: ${careerDescription}` : '',
    '',
    'Demographic constraints (hard — use exactly):',
    `- gender: ${d.gender}`,
    `- approximate age: ${d.age} (${d.ageBand})`,
    `- ethnicity cue: ${d.ethnicityCue} (for name + visual prompt; do not mention ethnicity in the bio text)`,
    `- years in field: ${d.yearsInField}`,
    '',
    'Generate these fields. Be specific and concrete — avoid generic statements.',
    '',
    '- name: first + last name consistent with the ethnicity cue.',
    `- role: the singular, natural job label this person would use for themselves in first person — fits the sentence "I'm a ___.". Never use the O*NET career title verbatim if it is plural or lists multiple titles. For example, "Special Effects Artists and Animators" → pick one of "Special Effects Artist" or "Special Effects Animator" that best fits the path/day you will describe. Match capitalization like a normal English job title (e.g., "Registered Nurse", "Software Developer").`,
    '- pronouns: "she/her", "he/him", "they/them" or similar.',
    '- location: a real US city, chosen to fit the role plausibly.',
    '- educationPath: one sentence, specific schools/credentials.',
    '- pathToCurrentPosition: 2–3 sentences. How they got from education to now.',
    '- dayInTheLife: 2–3 sentences. Concrete tasks, not abstractions.',
    '- hobby: one sentence, specific. Not a category ("reading") — a specific one ("reading Brandon Sanderson novels on weekends").',
    '',
    'AVOID these tropes (do not use any of them):',
    ...AVOID_TROPES.map(t => `- ${t}`),
    '',
    'Be varied across personas. If many personas are being generated in a batch, each must read distinctly.',
  ].filter(Boolean).join('\n')
}

// Note: name is intentionally NOT in the image prompt — portraits must
// contain no text/captions/labels (user requirement). Demographics drive
// the visual; the name lives only in the persona text.
export function buildImagePrompt(args: {
  age: number
  gender: string
  ethnicityCue: string
  careerTitle: string
}): string {
  const { age, gender, ethnicityCue, careerTitle } = args
  return `${IMAGE_STYLE_PREFIX} A ${age}-year-old ${ethnicityCue} ${gender} who works as a ${careerTitle}. Show wardrobe and one small prop appropriate to the job. Friendly neutral expression. No text, no captions, no labels anywhere.`
}
