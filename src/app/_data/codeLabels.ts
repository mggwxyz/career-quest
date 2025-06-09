// lib/codeLabels.ts
// ────────────────────────────────────────────────────────────────────────────────
/**
 * Flat map of every code used in the quiz → a concise, human-readable
 * description.  Feel free to tweak wording to match your brand voice.
 */
export const CODE_LABELS: Record<string, string> = {
  /* ---------- RIASEC (Holland) ----------- */
  R: 'Realistic – enjoys hands-on, practical activities',
  I: 'Investigative – likes to explore, research and analyze',
  A: 'Artistic – values creativity, design and self-expression',
  S: 'Social – prefers helping, teaching and supporting others',
  E: 'Enterprising – motivated by leading, persuading and selling',
  C: 'Conventional – enjoys structure, order and data management',

  /* ---------- Work-Value clusters -------- */
  ACH: 'Achievement – tackling tough goals and seeing results',
  IND: 'Independence – autonomy in scheduling and decisions',
  REC: 'Recognition – public praise and status for good work',
  REL: 'Relationships – cooperation and helping people directly',
  SUP: 'Support – clear guidance, security and good supervision',
  WC: 'Working Conditions – comfort, equipment and environment',

  /* ---------- Workplace-Environment codes */
  INO: 'Indoor Office – climate-controlled desk/tech setting',
  OUT: 'Outdoor/Field – work that keeps you outside or in nature',
  RT: 'Routine/Structured – stable tasks and predictable days',
  VR: 'Varied/Changing – frequent change, travel or new problems',
  TM: 'Team-Based – constant collaboration with others',
  SO: 'Solo/Independent – quiet focus with minimal interruption',
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Return the human-readable label (or the raw code if we don’t know it). */
export const describeCode = (code: string): string =>
  CODE_LABELS[code] ?? code

/**
   * Convert the tallies object that comes from `tallyResponses` into a
   * markdown-friendly bullet list that uses descriptions.
   *
   * Example output line:
   *   • RIASEC Interests: Realistic (3), Artistic (2), Investigative (1)
   */
export function describeTallies(
  tallies: Record<string, Record<string, number>>,
): string {
  const lines: string[] = []

  for (const [deck, codes] of Object.entries(tallies)) {
    const sorted = Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([code, n]) =>
          `${describeCode(code).replace(/ –.*/, '')} (${n})`, // keep short name
      )
      .join(', ')
    lines.push(`• **${deck}:** ${sorted}`)
  }

  return lines.join('\n')
}
