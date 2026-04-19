# Career Personas Design

**Date:** 2026-04-18
**Status:** Draft — pending review

## Summary

Every O*NET career code gets a fictional persona — a named, portrait-illustrated character who works in that role. On the career detail page, a hero card introduces the persona ("Meet Maria Alvarez, ER nurse, 12 years in"). The existing career chat shifts from a generic counselor to **first-person roleplay as that persona**. Persona facts (backstory, education, day-to-day) are creative; career facts (salary, growth, requirements) come from the real recommendation data and are cited verbatim.

Personas are **global per career** — one persona per O*NET code, shared across all users. All persona text and images are generated once by a seed script and committed to the repo as static assets. No runtime generation, no new database tables, no background jobs.

## Motivation

The current career detail page lists facts and offers a chat with a generic "career counselor" assistant. Students exploring careers connect more with stories than with salary tables. A concrete persona — a person with a name, age, backstory, and photograph — turns an abstract occupation into someone the student can relate to and have a conversation with. Seeing a diverse cast across the persona set also helps students see themselves in roles they might not otherwise consider.

## Decisions made during brainstorming

| # | Decision | Choice |
|---|---|---|
| 1 | Persona scope | **Global per career.** One persona per O*NET code, shared across all users. |
| 2 | Chat behavior | **First-person roleplay.** The chatbot *is* the persona, with real facts injected for factual questions. |
| 3 | Visual style | **Cartoon illustration**, matching the existing "Would You Rather" aesthetic: thick black outlines, flat colors, warm earth palette. No text/labels baked into images. |
| 4 | Generation strategy | **Offline batch seeding.** Full O*NET coverage (~1,000 codes). All persona data and images committed to the repo as static assets. No runtime generation. |
| 5 | Persona fields | name, age, gender, pronouns, yearsInField, location, educationPath, pathToCurrentPosition, dayInTheLife, hobby + imagePrompt/imagePath for reproducibility. |
| 6 | Representation | **Deliberate distribution** across gender, ethnicity, and age bands, balanced across the full 1,000-code set (not within individual phases). |
| 7 | Rollout | **Staged seed:** top 200 codes first (shipped with feature), remaining ~800 in an overnight batch. |
| 8 | UI placement | **Hero card above** the existing 2-col stats+chat layout. |
| 9 | Un-seeded careers | **Revert to current behavior.** Hero hidden; generic chat; unchanged layout. |
| 10 | Character-rule edge cases | Page-level disclaimer ("Meet a fictional character. Real career facts."). In-character chat, non-deceptive if directly pressed. Real O*NET facts injected and cited verbatim. |
| 11 | Text-gen model | **GPT-5** for persona text. `gpt-image-1` for portraits. Career recommendations and live chat continue to use GPT-4o (unchanged). |
| 12 | Gender distribution | 47% female / 47% male / 6% nonbinary. |
| 13 | Ethnicity distribution | ~25% White / ~22% Black / ~22% Hispanic / ~18% Asian / ~13% other (Middle Eastern, Pacific Islander, Indigenous, multiracial). |
| 14 | Age bands | 25% 20s / 35% 30s / 25% 40s / 15% 50s+. Years in field constrained by age. |

## Architecture

### Data layout

```
data/personas/personas.json                # manifest, keyed by onetId
data/personas/distribution.json            # running tallies (regen bookkeeping)
public/careers/personas/{onetId}.webp      # portrait, 512×512, cartoon style
```

No database tables are added. Persona data is static, version-controlled, and reviewable in PRs.

### Persona type

```ts
// src/lib/personas/types.ts
export type Gender = 'female' | 'male' | 'nonbinary'
export type EthnicityCue =
  | 'white' | 'black' | 'hispanic' | 'asian'
  | 'middle_eastern' | 'pacific_islander' | 'indigenous' | 'multiracial'

export type Persona = {
  onetId: string
  name: string
  age: number
  gender: Gender
  pronouns: string             // "she/her", "he/him", "they/them"
  ethnicityCue: EthnicityCue   // for image prompt + running distribution
  yearsInField: number
  location: string             // "Denver, CO"
  educationPath: string        // "Associate of Nursing at Front Range CC, then RN-to-BSN bridge at Regis."
  pathToCurrentPosition: string // 2–3 sentences
  dayInTheLife: string         // 2–3 sentences
  hobby: string                // 1 sentence
  imagePrompt: string          // exact prompt used, for reproducibility
  generatedAt: string          // ISO date
  textModel: string            // "gpt-5"
  imageModel: string           // "gpt-image-1"
}

export type PersonaManifest = Record<string /* onetId */, Persona>
```

### Loader

```ts
// src/lib/personas/index.ts
import manifest from '@/../data/personas/personas.json'
export function getPersona(onetId: string): Persona | null {
  return (manifest as PersonaManifest)[onetId] ?? null
}
```

`getPersona` is imported only on the server (specifically from `src/app/api/careers/[onetId]/route.ts`). The full manifest never ships to the client bundle; only the single persona for the current career is serialized over the API response.

## Runtime changes

### Career detail page

File: `src/app/careers/[onetId]/page.tsx` (client component — unchanged rendering model)

Adds a full-width hero above the current 2-column grid:

```
┌─────────────────────────────────────────────┐
│  <PersonaHero persona={...} />             │   NEW
│  "Meet Maria Alvarez" + portrait + tagline │
│  "Fictional character. Real career facts." │
└─────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────┐
│ CareerDetails│ CareerChat (persona-aware)   │
└──────────────┴──────────────────────────────┘
```

Data flow:

- `GET /api/careers/{onetId}` (file: `src/app/api/careers/[onetId]/route.ts`) is extended to return `{ career, persona }`, where `persona` is the result of `getPersona(onetId)` or `null`. The manifest is imported server-side in this route; it never ships to the client bundle.
- The client page stores both `career` and `persona` in state, renders `<PersonaHero>` only when `persona` is non-null, and passes `persona` into `<CareerChat>`.
- When `persona` is `null`: hero is not rendered; `CareerChat` falls back to its current generic prompt + greeting — exact current behavior.

### New component: `PersonaHero`

File: `src/components/persona-hero.tsx`

Responsibilities:
- Render the portrait (`next/image` pointed at `/careers/personas/{onetId}.webp`), 128–160px circular crop on mobile, 160–192px on desktop.
- Render name, age, yearsInField tagline ("ER nurse, 12 years in").
- Render location + hobby as secondary detail.
- Render the disclaimer directly under the name in muted small text: *"Meet a fictional character. Real career facts."*

Styling: reuses the page's existing card + border tokens (`bg-surface/50`, `border-border`, `rounded-2xl`).

### Chat route: persona injection

File: `src/app/api/careers/chat/route.ts`

- Accept an optional `persona` field in the POST body alongside `careerContext`.
- Branch the system prompt:
  - **With persona:** first-person roleplay system prompt (below).
  - **Without persona:** unchanged — current generic career-counselor prompt.

System-prompt template, with persona:

```
You are {persona.name}, a {persona.age}-year-old {persona.gender} working
as a {career.title}. Speak in first person. Your character details are
below — you may riff on them but stay consistent.

PERSONA
  Pronouns: {persona.pronouns}
  Location: {persona.location}
  Years in field: {persona.yearsInField}
  Education path: {persona.educationPath}
  How you got here: {persona.pathToCurrentPosition}
  A typical day: {persona.dayInTheLife}
  Hobby: {persona.hobby}

FACTS ABOUT THE CAREER (cite verbatim when asked; do NOT invent numbers)
  Description: {career.description}
  Salary range: {career.salaryRange}
  Job growth: {career.jobGrowth}
  O*NET: {career.onetId}

RULES
- Tell stories and anecdotes plausibly grounded in your backstory.
- For salary, growth, or formal-requirements questions, use the FACTS above.
- If the user asks "are you real" / "are you AI", say you're a character
  created to help them explore this career, and that the career facts you
  share are grounded in real data. Then offer to keep going.
- Stay in first person otherwise.
- Audience is a student. Be warm, concrete, specific.
```

### Chat client: persona-aware greeting

File: `src/components/career-chat.tsx`

Initial assistant message becomes persona-aware when persona is present:

```
Hi, I'm {persona.name} — I've been a {career.title.toLowerCase()} for
{persona.yearsInField} years. Ask me anything about what the job is really like.
```

If persona is null, the current greeting is unchanged.

The chat also passes `persona` through to the route as part of the `body` payload.

## Seed script

### File

`scripts/seed-personas.ts` — executed via `pnpm tsx scripts/seed-personas.ts [flags]`.

Idempotent and resumable. Reads the existing manifest + distribution bookkeeping; skips codes already present unless `--force`.

### Flags

- `--limit N` — process at most N unseeded codes (phase 1 = `--limit 200`).
- `--all` — process every unseeded O*NET code (phase 2).
- `--onet <id>` — generate or regenerate one specific code.
- `--force` — regenerate even if already in the manifest.
- `--dry-run` — print what would be done, make no writes.

### "Top 200" ranking

1. Query `career_recommendations` grouped by `onet_id`, ordered by count desc.
2. Take the top distinct codes until 200 are selected.
3. If fewer than 200 distinct codes exist in the DB, top up from a committed curated fallback list of common US occupations (derived from BLS high-employment occupations). Committed under `data/personas/phase1-fallback.json`.

Ranking is deterministic: a snapshot of the ranking is written to `data/personas/phase1-ranking.json` at the start of phase 1 so re-runs are reproducible.

### Per-career pipeline

For each O*NET code in the batch:

1. **Sample a demographic cell.** Load `distribution.json`. Build per-axis weights biased against currently over-filled cells. Independently sample: gender, ethnicityCue, ageBand. Pick years in field consistent with age (max = age − 20).
2. **Generate persona text.** Call GPT-5 via `@ai-sdk/openai` with `generateObject` + a Zod-validated schema. Prompt supplies the sampled demographics as hard constraints and asks for specific, non-formulaic writing with an explicit "avoid these tropes" list.
3. **Build image prompt.** Compose from a locked style template + the persona's name, age, gender, ethnicity cue, role, and a neutral scene description. Include an explicit negative instruction: **"no text, no captions, no labels, no signage, no written words anywhere in the image."**
4. **Generate image.** Call `gpt-image-1` with `size: '1024x1024'`, convert to `.webp` at 512×512, save to `public/careers/personas/{onetId}.webp`.
5. **Write outputs atomically.** Append the persona to `personas.json` (via temp-file + rename). Update `distribution.json`. Commit is up to the operator (the script does not git-commit on its own).

Failure of any step aborts only that code and logs — the script continues to the next O*NET code.

### Locked image-prompt template

```
Portrait illustration in a warm, chunky-outlined flat cartoon style.
Thick black outlines, flat colors, minimal shading. Muted earth-tone
palette: cream background, olive, teal, warm brown accents. Friendly
rounded cartoon features, simplified forms. Square composition,
portrait from chest up, centered, looking toward camera.

No text, no captions, no labels, no signage, no written words anywhere
in the image.

Subject: {persona.name}, {persona.age}-year-old {ethnicityCue} {gender}
{career.title}. {scene / wardrobe appropriate to role}. {one distinctive
personal detail}.
```

### Distribution bookkeeping

`data/personas/distribution.json`:

```json
{
  "gender":    { "female": 0, "male": 0, "nonbinary": 0 },
  "ethnicity": { "white": 0, "black": 0, "hispanic": 0, "asian": 0,
                 "middle_eastern": 0, "pacific_islander": 0,
                 "indigenous": 0, "multiracial": 0 },
  "ageBand":   { "20s": 0, "30s": 0, "40s": 0, "50s_plus": 0 },
  "total": 0
}
```

Sampling reads these counters and biases weights inversely to current fill — e.g., if female is at 49% of current total and male is at 45%, male gets a slight boost on the next sample.

## Testing

### Unit

- `src/lib/personas/index.ts` — returns persona for seeded onetId, `null` otherwise.
- Sampling helper in the seed script — deterministic given a seed + distribution state.

### Integration

- `src/app/careers/[onetId]/page.tsx` — renders `<PersonaHero>` when persona exists, falls back to current layout when it doesn't. Two fixtures: one seeded code, one unseeded.
- `src/app/api/careers/chat/route.ts` — given a request with a persona, system prompt includes first-person rules and career facts; given a request without a persona, system prompt is the current generic one. (Snapshot test on the composed system message.)

### Manual

- Open 3–5 seeded career detail pages — confirm portrait renders, hero copy reads well, disclaimer is visible but unobtrusive.
- Chat with a persona — confirm first-person voice, salary/growth questions cite injected facts, "are you AI?" responds per the rules.
- Open an unseeded career detail page — confirm page looks identical to current production behavior.
- After phase-1 seed: run `pnpm tsx scripts/seed-personas.ts --dry-run --all` — output should list ~800 codes.

## Rollout

**Phase 1 (ships with the feature):**
1. Implement loader, `PersonaHero`, chat-route persona branching, client greeting change.
2. Run seed script with `--limit 200`.
3. Commit manifest + 200 webp images.
4. Verify top-200 coverage on staging; ship to production.

**Phase 2 (overnight, after phase 1 is live):**
1. Run `pnpm tsx scripts/seed-personas.ts --all` overnight.
2. Review: spot-check ~20 random new personas for quality, regenerate any egregious ones with `--onet <id> --force`.
3. Commit the ~800 new webp images + manifest delta.
4. Deploy.

Between phase 1 and phase 2, users recommended a long-tail O*NET code simply see the current production experience. No errors, no placeholder personas.

## Out of scope

- Runtime persona generation / background jobs / blob storage.
- Per-user persona customization ("meet a different person in this role").
- Administrative UI for regenerating personas (CLI-only via `--onet --force`).
- Persona dialogue memory across sessions.
- Internationalization of persona names / locations.

## Open questions

None blocking. Resolve during implementation:

- Exact portrait crop/dimensions on mobile — decided during visual implementation once we have 3–5 real seeded images to test with.
- Whether the seed script should optionally push to a staging branch and open a PR with the generated artifacts, rather than leaving the commit to the operator. Nice-to-have; not v1.
