# Career scene images — design

**Date:** 2026-06-14
**Status:** Approved (pending spec review)

## Goal

Generate one illustrated "scene" image per O*NET career, in the same visual style
as the existing persona portraits, but showing **1–3 people doing the tasks and
responsibilities of that job** as a **candid moment** — people mid-action, no one
looking at the camera. Mirrors the existing persona image pipeline
(`scripts/seed-personas.ts`).

## Decisions

| Decision | Choice |
| --- | --- |
| Aspect ratio | Landscape **3:2** (`gpt-image-1` `1536x1024`) |
| Prompt approach | **Two-step**: GPT-5 distills a concrete candid scene → `gpt-image-1` renders it |
| Structure | Mirror the modular `scripts/seed-personas/` layout |
| Scene source | DB `onet_occupations.description` (the local "what they do" text) — no live O*NET calls |
| Diversity | Handled at the prompt level (GPT instructed to vary gender/age/ethnicity); no demographic-sampling module |
| Scope | Script + assets + manifest only — **not** wiring scenes into the career detail UI |

## Files

New, parallel to `scripts/seed-personas/`:

```
scripts/seed-career-scenes.ts                       # entry/orchestrator: CLI, enumerate, loop, manifest
scripts/seed-career-scenes/prompts.ts               # CAREER_STYLE_PREFIX + scene-text prompt + image-prompt builder
scripts/seed-career-scenes/generate-scene-text.ts   # GPT-5 → structured candid-scene description
scripts/seed-career-scenes/generate-image.ts        # gpt-image-1 → png → cwebp webp
scripts/seed-career-scenes/__tests__/prompts.test.ts
```

## Output & manifest

Keyed by O*NET code, mirroring the persona convention.

- Images → `public/careers/scenes/{onetId}.webp` (intermediate `.png` written alongside).
- Manifest → `data/careers/scenes.json`. Per career:
  - `onetId`, `careerTitle`, `peopleCount` (1–3), `sceneDescription` (the GPT-distilled
    candid moment), `imagePrompt` (full final string sent to the image model),
    `imagePath` (`/careers/scenes/{onetId}.webp`), `generatedAt`, `textModel` (`gpt-5`),
    `imageModel` (`gpt-image-1`).
- Manifest is written **atomically after each success** (temp file + rename), so a run is
  resumable and a crash never corrupts the file.

## Data flow (per career)

1. Read `code`, `title`, `description` from `onet_occupations` for all careers (inline
   Drizzle query — `getOccupationByCode` lives behind `server-only` and won't load in a
   `tsx` script, same constraint the persona script handles).
2. **GPT-5** via `generateObject` (same setup as `seed-personas/generate-text.ts`:
   `createOpenAI` + `openai.chat('gpt-5')` + zod schema + `temperature: 1`) returns:
   - `peopleCount`: integer 1–3
   - `scene`: one concrete candid paragraph — who is in frame, the setting, and the real
     job tasks/tools they are mid-action on.
   System prompt: candid (no one facing the camera), concrete tasks over abstractions, and
   a naturally diverse mix of people (vary gender/age/ethnicity) when more than one person
   is shown.
3. **gpt-image-1** renders `CAREER_STYLE_PREFIX + scene + candid/no-camera clause +
   no-text clause` at `1536x1024`. Then `cwebp -resize 1024 0` (width 1024,
   aspect-preserved → ~1024×683, quality 82) writes the `.webp`.

## Style

`CAREER_STYLE_PREFIX` reuses the exact persona/item visual tokens (flat-color vector
storybook, thick uniform black outlines, warm cream/beige `#f5ebdd` background, muted
earth-tone palette with selective blue + mustard-yellow accents, flat 2D, no gradients,
no text/labels/signage) but **swaps the composition lines**:

- Remove: `single centered focal subject`, `Square 1:1 composition`, `Portrait from chest up, centered`.
- Add: `one to three people in a workplace scene, candid mid-action, no one looking at the camera, wide 3:2 landscape composition`.

The shared tokens are duplicated with a `mirrors IMAGE_STYLE_PREFIX` comment — the same
convention `seed-personas/prompts.ts` already uses (it duplicates from
`generate-item-images.ts`).

## CLI

Mirrors the persona/item scripts.

```
pnpm tsx scripts/seed-career-scenes.ts --limit 5 --dry-run   # preview scenes, no image spend
pnpm tsx scripts/seed-career-scenes.ts --limit 20            # test batch
pnpm tsx scripts/seed-career-scenes.ts --onet 29-1141.00 [--force]
pnpm tsx scripts/seed-career-scenes.ts                       # all missing (default)
pnpm tsx scripts/seed-career-scenes.ts --quality high
```

- Idempotent: skips any code already in the manifest unless `--force`.
- `--dry-run` runs the GPT scene step (so scenes can be eyeballed) but skips image
  generation and manifest writes. *(Alternative considered: skip GPT too for zero spend —
  rejected because previewing the scene text is the point of a dry run.)*
- Per-career failures are logged and do not abort the batch; process exits 1 if any failed.
- Requires `OPENAI_API_KEY`; `cwebp` must be on PATH (`brew install webp`).

## Testing

Unit-test the pure prompt builders in `prompts.ts`:

- `CAREER_STYLE_PREFIX` contains the shared style tokens.
- The image-prompt builder injects the scene text.
- The candid / no-one-looking-at-camera clause is present.
- The no-text/labels clause is present.
- 3:2 / landscape framing is stated.

Network steps (GPT, image, cwebp) stay untested, matching the persona scripts.

## Cost & rollout

~1000 careers × (1 GPT-5 structured call + 1 medium image) is real spend. Default run is
incremental and idempotent; recommended rollout is `--limit 5 --dry-run`, then
`--limit 20`, then the full run.
