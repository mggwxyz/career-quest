// lib/careerQuiz.ts
// ────────────────────────────────────────────────────────────────────────────────
import { experimental_streamText as streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

/* -------------------------------------------------------------------------- */
/*  Types                                                                    */
/* -------------------------------------------------------------------------- */

type Choice = 'option1' | 'option2'

interface Option {
  text: string
  codes: string[] // e.g. ["R"]  or ["ACH"]  or ["INO","TM"]
}

interface Question {
  id: number
  option1: Option
  option2: Option
}

interface Deck {
  name: string // “RIASEC Interests” | …
  description: string
  questions: Question[]
}

/**  Shape of an incoming response payload:
 *  {
 *    "RIASEC Interests": { "1": "option2", "2": "option1", … },
 *    "Work-Value Motivators": { "1": "option1", … },
 *    …
 *  }
 */
type ResponseMap = Record<string, Record<number, Choice>>

/* -------------------------------------------------------------------------- */
/*  1)  Tally                                                                */
/* -------------------------------------------------------------------------- */

export function tallyResponses(
  decks: Deck[],
  responses: ResponseMap,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}

  for (const deck of decks) {
    const counts: Record<string, number> = {}

    for (const q of deck.questions) {
      const pick = responses[deck.name]?.[q.id]
      if (!pick) continue

      const chosenCodes = q[pick].codes
      for (const code of chosenCodes) {
        counts[code] = (counts[code] || 0) + 1
      }
    }
    result[deck.name] = counts
  }

  return result
}

/* -------------------------------------------------------------------------- */
/*  2)  Turn tallies into student-friendly prose                              */
/* -------------------------------------------------------------------------- */

export function buildStudentSummary(
  tallies: Record<string, Record<string, number>>,
): string {
  const lines: string[] = []

  for (const [deckName, codes] of Object.entries(tallies)) {
    const sorted = Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c} (${n})`)
      .join(', ')
    lines.push(`• **${deckName}:** ${sorted}`)
  }

  return lines.join('\n')
}

/* -------------------------------------------------------------------------- */
/*  3)  Ask ChatGPT for career suggestions                                    */
/* -------------------------------------------------------------------------- */

export async function getCareerRecommendations(
  tallies: Record<string, Record<string, number>>,
  nCareers = 5,
): Promise<string[]> {
  // Format the tallies as bullet points ChatGPT can read easily.
  const summaryForModel = Object.entries(tallies)
    .map(
      ([deck, codes]) =>
        `${deck} → `
        + Object.entries(codes)
          .map(([code, count]) => `${code}:${count}`)
          .join(', '),
    )
    .join('\n')

  const { text } = await streamText({
    model: openai.chat('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content:
          'You are an expert career counselor who only suggests well-known, legitimate career paths.',
      },
      {
        role: 'user',
        content: [
          `A student completed a career preference quiz. Their code tallies are:\n${summaryForModel}\n`,
          `Please list the top ${nCareers} careers they should explore.`,
          'Provide just a numbered list. Each line: "Career – 1-sentence rationale."',
        ].join('\n'),
      },
    ],
  })

  // Split into individual careers and trim.
  return text
    .split('\n')
    .map(l => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
}

/* -------------------------------------------------------------------------- */
/*  Example usage                                                             */
/* -------------------------------------------------------------------------- */

/*
import decks from './decks.json';
import { tallyResponses, buildStudentSummary, getCareerRecommendations } from './careerQuiz';

(async () => {
  // Imagine these came from the front-end quiz UI.
  const responses: ResponseMap = {
    'RIASEC Interests': { 1: 'option2', 2: 'option1', /* … *\/ },
    'Work-Value Motivators': { 1: 'option1', /* … *\/ },
    'Workplace-Environment Preferences': { 1: 'option2', /* … *\/ }
  };

  const tallies = tallyResponses(decks, responses);
  const studentSummary = buildStudentSummary(tallies);
  console.log('\nStudent summary:\n', studentSummary);

  const careers = await getCareerRecommendations(tallies, 7);
  console.log('\nSuggested careers:\n', careers.join('\n'));
})();
*/
