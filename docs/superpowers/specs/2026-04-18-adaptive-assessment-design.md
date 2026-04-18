# Adaptive Career Assessment — Design

**Status:** Draft
**Date:** 2026-04-18
**Owner:** Michael Gilbertson

## Summary

Replace the current 30-item, three-deck, fixed-order "would you rather" career quiz with an **adaptive engine** of ~60 items that stops between 12 and 20 questions based on answer confidence. Output is a Holland 3-letter code, top work values, and a work-context profile, each with confidence bands. Career recommendations consume this richer profile in place of today's raw tallies.

The adaptive engine uses a Bayesian point-estimate model with SME-rated item loadings — the pragmatic middle path between today's naive tallies and full Thurstonian IRT (which requires user response data we don't yet have). Logged response data is forward-compatible with a TIRT migration later.

## Goals

- Reach a reliable Holland code in fewer questions (target median: ~14)
- Output confidence-aware results so the LLM and the profile UI can hedge appropriately
- Work for the full 11-to-early-20s audience without forking the experience
- Keep the binary "would-you-rather" card format users already engage with
- Capture data that supports future empirical recalibration

## Non-goals

- Thurstonian IRT or full forced-choice IRT machinery (deferred until N ≥ 500)
- Item-bank-in-database / admin UI for editing items (deferred unless content velocity demands it)
- Norm-referenced percentile scoring (requires a reference population we don't have)
- Cross-session trend visualization
- Changes to the free-text interests selection UX
- Changes to the `/careers/chat` endpoint
- Backward compatibility with the existing `quiz_answers` schema and data

## Background — Research findings driving the design

(Sources cited inline; full report in conversation log.)

- **Holland hexagon:** R-I-A-S-E-C around a circle. Opposites (R-S, I-E, A-C) are the most discriminating pairs; alternates moderate; adjacents weak. The current bank has too many adjacents (R-C, S-E) which carry little signal.
- **Forced-choice scoring is ipsative:** raw tallies force scales to sum to a constant, making between-person comparisons mathematically invalid. Thurstonian IRT (Brown & Maydeu-Olivares 2011) is the gold standard but needs ~300+ users to calibrate. A pragmatic middle path is a Bayesian point-estimate model with SME-rated discrimination parameters.
- **Adaptive testing reduces items 40–60%** at equivalent precision (vs. fixed-form) for interest inventories.
- **Public-domain item bank exists:** IPIP RIASEC Markers (Armstrong et al. 2008) — 48 validated items.
- **Desirability matching is the single biggest quality lever:** if paired options have unequal "coolness," you measure aspiration, not interest. SME desirability ratings, with pairs matched within 0.5 SD, are standard.
- **Age 11–14:** RIASEC interests are stable enough to measure (rank-order r ~ 0.5 from age 12; Low & Rounds 2005). Work values are noisy below age 14 — should be framed as "current leanings" and de-weighted in scoring.

## Scope decisions (locked during brainstorm)

| Decision | Choice |
|---|---|
| Format | Binary would-you-rather + adaptive engine (same card UX) |
| Audience | Broad: 11 through early-20s |
| Stopping rule | Floor 12, confidence-based, hard cap 20 |
| Dimensions | RIASEC + O*NET work values + 3-axis work context (structure-vs-variety, indoor-vs-outdoor, solo-vs-team) |
| Grade collection | Optional question at quiz start (skippable) |
| Output format | Holland 3-letter code + top work values + work context + confidence bands |
| Backward compatibility | None. Existing quiz answers are wiped on deploy. |

## Architecture

### Item bank

- Size: **~60 items**, up from 30. Bigger bank gives the adaptive engine real choices at each step.
- Stored in code (`src/app/_data/questions.ts`) — not in DB. Re-evaluate if content velocity demands DB-backed items.
- Coverage rules:
  - ≥10 items per RIASEC scale as the dominant scale
  - ~50% opposite-pair items (R-S, I-E, A-C), ~35% alternate, ~15% adjacent
  - Each pair's options matched within ±0.5 on SME desirability
  - Each item tagged with a `minGradeBand` so younger users only see age-appropriate content
  - All item text at ~grade-6 reading level

### Item shape

```ts
type Item = {
  id: string
  option1: Option
  option2: Option
  dimensionContrast: 'opposite' | 'alternate' | 'adjacent' | 'mixed'
  primaryScales: string[]      // e.g. ['R', 'S'] for a clean opposite pair
  minGradeBand?: 'middle' | 'early-hs' | 'late-hs' | 'college'
}

type Option = {
  id: string
  text: string
  imageUrl: string
  prompt: string                // for image regeneration
  loadings: {
    riasec:      Record<'R'|'I'|'A'|'S'|'E'|'C', number>            // 0–3
    workValues:  Record<'ACH'|'IND'|'REC'|'REL'|'SUP'|'WC', number> // 0–3
    workContext: {
      structureVariety: number   // -2 to +2, bipolar (negative = structure)
      indoorOutdoor:    number   // bipolar (negative = indoor)
      soloTeam:         number   // bipolar (negative = solo)
    }
  }
  desirability: number          // 1–5, SME rating
}
```

A single option carries loadings on every scale (mostly zeros, with one dominant 3 and zero-to-two secondary 1s). This lets one card contribute signal to multiple dimensions simultaneously — critical when capping at 20 items.

### Posterior state (per session)

```ts
type Posterior = {
  riasec:     Record<'R'|'I'|'A'|'S'|'E'|'C', { mean: number, variance: number }>
  workValues: Record<'ACH'|'IND'|'REC'|'REL'|'SUP'|'WC', { mean: number, variance: number }>
  workContext: {
    structureVariety: { mean: number, variance: number }
    indoorOutdoor:    { mean: number, variance: number }
    soloTeam:         { mean: number, variance: number }
  }
}
```

- **Priors (no info):** `mean = 0`, `variance = 1` on every scale.
- **Priors (grade-band adjusted):**
  - Middle school (grades 6–8): work-value priors get `variance = 1.5` (acknowledges instability per Super's career development theory)
  - All other bands: defaults
  - **Grade not provided** (user skipped the optional question): treated as the broadest case — defaults applied; item filtering uses no `minGradeBand` restriction (all items eligible). The engine cannot benefit from age-aware tuning but does not penalize the user.

### Update rule (per response)

Bradley-Terry-style softmax. When the user picks Option A over Option B, on each scale `s`:

```
P(pick A | θ_s) ∝ exp(θ_s · (a_s − b_s))
```

Applied across all scales simultaneously, converted to a posterior update via conjugate-normal approximation (Kalman-filter style) — two arithmetic operations per scale per response. Runs in <1ms client-side.

Items where both options have similar loadings on a given scale produce small updates on that scale; items with sharply contrasting loadings produce large updates. The math handles weighting naturally — no need for ad-hoc hexagon-distance multipliers.

**Skip handling:** treated as half-strength evidence updating both options' loadings slightly downward on the user's posterior. Counts toward the item count.

**Between-block regularization:** within a block (RIASEC alone), forced-choice math is ipsative by design. A weak prior toward zero is applied across blocks so e.g. "high on all work values" remains expressible (work values aren't internally forced-choice across the bank).

### Adaptive engine loop

```
1. Score current posterior: compute mean, variance, ranking on each scale
2. Check stopping rule. If stop → finalize and exit.
3. Score every unseen item by expected information gain
4. Pick highest-scoring item; tie-break by smallest desirability gap between options
5. Show it; record response; update posterior; repeat
```

### Item-scoring function (next-item selection)

For each candidate item, compute the expected reduction in posterior variance across scales weighted by how close those scales are to a decision boundary:

> Pick the item that best separates the two scales the user is currently most uncertain between.

Concretely:
- For each pair of scales `(s_i, s_j)` whose posterior means are within 0.3 of each other, OR both currently in contention for the top-3 RIASEC code: score the item by `|loading_diff(s_i) − loading_diff(s_j)|`
- Sum across contested scale pairs
- Penalize items where both options have very similar overall loading vectors (low overall information)

This is a cheap proxy for full Bayesian D-optimality. O(bank_size × scales) per question — fast at 60 items.

### Item-selection phases

- **Item 1 (cold start):** deterministic. The single highest-information opposite-pair item, biased toward common interests so it doesn't feel weird (e.g., a clear R-vs-S item: "fix a broken bike" vs. "tutor a struggling classmate"). Same first item for every user.
- **Items 2–6 (coverage):** prioritize items touching RIASEC scales not yet touched. Engine maintains a "scale touched" set; restricts candidate pool until all six are touched at least once.
- **Items 7–20 (refinement):** pure information-gain optimization.

### Stopping rule

Stop when **all** of these hold AND ≥12 items have been answered:

1. Top-3 RIASEC codes' posterior means each separated from the 4th-ranked by > 1× pooled SD
2. Top-3 codes' confidence bands are at least Medium (variance < 0.5)
3. At least one work-value scale has Medium-or-better confidence (skipped for grade-band = `middle`)

If item 20 is reached without those conditions: stop anyway, flag remaining low-confidence scales in the result.

### Confidence bands

| Band | Posterior variance |
|---|---|
| High | < 0.25 |
| Medium | 0.25 – 0.50 |
| Low | > 0.50 |

### Inconsistency detection

After scoring, the engine checks for response patterns suggesting random-clicking or sharp contradictions (e.g., picking the strongly-S option early, then the strongly-anti-S option late, with no intervening evidence to explain the swing). If detected, `inconsistencyFlag = true` is set; the UI surfaces a gentle "want to revisit any?" modal and the LLM prompt notes the result is exploratory.

Heuristic-based for v1; tune threshold from telemetry. False positives expected.

### Output (handoff to LLM and profile page)

```ts
type AssessmentResult = {
  hollandCode: string                                          // e.g. "SAE"
  riasec: Record<'R'|'I'|'A'|'S'|'E'|'C', {
    score: number                                              // posterior mean, scaled 0–100
    rank: 1 | 2 | 3 | 4 | 5 | 6
    confidence: 'high' | 'medium' | 'low'
  }>
  workValues: {
    top: Array<'ACH'|'IND'|'REC'|'REL'|'SUP'|'WC'>             // top 2–3 by score
    all: Record<string, { score: number, confidence: 'high'|'medium'|'low' }>
    suppressed?: boolean                                       // true if grade-band = middle
  }
  workContext: {
    structureVariety: { lean: 'structure'|'variety'|'balanced', strength: number, confidence: 'high'|'medium'|'low' }
    indoorOutdoor:    { lean: 'indoor'|'outdoor'|'mixed',       strength: number, confidence: 'high'|'medium'|'low' }
    soloTeam:         { lean: 'solo'|'team'|'flexible',         strength: number, confidence: 'high'|'medium'|'low' }
  }
  meta: {
    itemsAnswered: number
    itemsSkipped: number
    completedAt: string
    engineVersion: string
    inconsistencyFlag: boolean
  }
}
```

### LLM prompt format change

Today's prompt feeds raw `JSON.stringify(results)` (e.g. `{R: 2, I: 4, A: 1, S: 3, E: 0, C: 2}`).

New prompt feeds a human-readable profile derived from `AssessmentResult`:

```
User Profile:
- Holland Code: SAE (Social-Artistic-Enterprising)
- Confidence: S high, A high, E medium; clearly low on R, C
- Top work values: REL (high), ACH (medium); other values uncertain
- Work context: prefers variety over structure (high confidence),
  team over solo (medium), no strong indoor/outdoor preference
- Notes: User is in middle school; work-value results are tentative.
       Inconsistency flag: false. Items answered: 14.
```

This lets the LLM ground "why this matches" copy in real signal and hedge appropriately on low-confidence scales.

### Profile page changes

- Big "You're an SAE" headline with three letter cards
- Existing RIASEC radar chart, now rendering posterior means with shaded confidence bands
- "Top motivators" pill list for work values
- "Your work style" section: three small bipolar sliders for work-context axes
- Optional "explain this letter" tooltip per RIASEC letter

### Quiz UX flow

```
1. Optional grade question (single screen, skippable):
   "What grade are you in? — helps us tune your results"
   Options: 6th–8th | 9th–10th | 11th–12th | College+ | Prefer not to say
2. Brief intro card: "About 12–20 quick choices. There are no wrong answers.
   You can skip any question. Hit pause anytime."
3. First question (deterministic R-vs-S item)
4. Adaptive loop until stop
5. Results
```

UX details:
- **Progress indicator** is a confidence meter ("Getting clearer" → "Almost there" → "Got it") — not "5 of 30," because the count varies.
- **Skip** stays available; engine treats it as half-strength evidence.
- **Back button** allowed only for the most recent answer ("undo last"). Going further back would invalidate posterior updates.
- **Pause / resume** persists posterior + answer log to DB after each response. Resume reconstructs from the database.
- **Mid-quiz peek:** after item 8, an unobtrusive "Peek at your profile so far?" button reveals the current posterior with all confidence bands as Low/Medium without ending the quiz.
- **Bail handling:** if `itemsAnswered < 12`, results screen says "We need a few more answers" with continue button.
- **Inconsistency modal:** if `inconsistencyFlag`, gentle modal asks if they want to revisit.

### Telemetry

Per item logged:
- response choice, response time (ms), skip flag
- position in sequence
Per session logged:
- stop reason (`confidence` | `cap` | `bail`)
- final posterior, inconsistency flag
- grade band

This data, accumulated over hundreds of users, enables future migration from SME-rated to empirically-calibrated parameters.

## Database schema

No FK to `neon_auth.users_sync` per project convention. No RLS — ownership enforced in application code via `getSession()` filters on `user.id`.

```sql
-- App-level extensions to auth identity
CREATE TABLE user_profiles (
  user_id         text PRIMARY KEY,
  grade_band      text,                       -- default; session can override
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Current set of free-text interests selected by the user
CREATE TABLE user_interests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  interest        text NOT NULL,
  source          text NOT NULL DEFAULT 'manual',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, interest)
);
CREATE INDEX ON user_interests (user_id);

-- One row per assessment attempt
CREATE TABLE assessment_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  grade_band      text,                       -- snapshot at session start
  engine_version  text NOT NULL,
  posterior       jsonb NOT NULL,
  result          jsonb,                      -- AssessmentResult on completion
  inconsistency   boolean NOT NULL DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  abandoned_at    timestamptz
);
CREATE INDEX ON assessment_sessions (user_id, started_at DESC);
CREATE INDEX ON assessment_sessions (user_id, completed_at DESC) WHERE completed_at IS NOT NULL;
-- Enforce one active session per user at the DB layer
CREATE UNIQUE INDEX ON assessment_sessions (user_id)
  WHERE completed_at IS NULL AND abandoned_at IS NULL;

-- Append-only log of every item shown in a session
CREATE TABLE assessment_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  item_id         text NOT NULL,
  position        smallint NOT NULL,
  shown_at        timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  choice          smallint,                   -- 1, 2, or NULL for skip
  response_ms     integer,
  UNIQUE (session_id, position)
);
CREATE INDEX ON assessment_responses (session_id, position);
CREATE INDEX ON assessment_responses (item_id);

-- One row per LLM call that produced career recommendations
CREATE TABLE recommendation_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text NOT NULL,
  session_id          uuid NOT NULL REFERENCES assessment_sessions(id),
  interests_snapshot  text[] NOT NULL,
  prompt              text NOT NULL,
  model               text NOT NULL,
  engine_version      text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  duration_ms         integer,
  error               text
);
CREATE INDEX ON recommendation_runs (user_id, created_at DESC);

-- Individual recommended careers (many per run)
CREATE TABLE career_recommendations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  user_id         text NOT NULL,              -- denormalized for hot-path queries
  rank            smallint NOT NULL,
  onet_id         text NOT NULL,
  title           text NOT NULL,
  description     text NOT NULL,
  why_it_matches  text NOT NULL,
  job_growth      text,
  salary_range    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON career_recommendations (user_id, run_id);

-- User actions on recommended careers (favoriting, dismissing, etc.)
-- Keyed by O*NET ID so actions persist across re-recommendations of the same career
CREATE TABLE career_user_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  onet_id         text NOT NULL,
  action          text NOT NULL,              -- 'saved'|'dismissed'|'opened'
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON career_user_actions (user_id, onet_id);
CREATE INDEX ON career_user_actions (user_id, action, created_at DESC);
```

**Schema rationale highlights:**

- `user_profiles` extends auth identity for app-level fields without FK to `neon_auth`.
- `user_interests` rows (not jsonb) so interests can be queried/aggregated; snapshot copied to `recommendation_runs.interests_snapshot` at LLM-call time for reproducibility.
- DB-enforced "one active session per user" via partial unique index — prevents two-tabs bugs.
- `assessment_responses` is append-only and is the goldmine for future TIRT calibration.
- `recommendation_runs` separates the LLM call from the produced careers — full prompt logged for replay/audit.
- `career_user_actions` keyed by O*NET ID, not recommendation row, so favorites follow the career across re-takes.

**Existing tables:** `quiz_answers` is dropped. `career_recommendations` is rebuilt with the new shape (no migration of historical data per scope decision).

## Code structure

```
src/app/_data/
  questions.ts              REWRITE — flat bank of ~60 items with full Option shape
  itemLoadings.ts           NEW — SME ratings (or merged into questions.ts)
  hexagon.ts                NEW — RIASEC distance helpers, scale constants

src/lib/assessment/         NEW DIRECTORY
  posterior.ts              Posterior init / update math
  engine.ts                 Next-item selection, stopping rule
  scoring.ts                Posterior → AssessmentResult conversion
  inconsistency.ts          Inconsistency detection
  promptFormat.ts           AssessmentResult → LLM prompt section
  __tests__/                Unit tests + simulation harness

src/store/slices/
  wouldYouRatherSlice.ts    REWRITE — wraps engine, manages session state, no decks

src/app/api/assessment/     NEW — replaces /api/user/progress
  session/route.ts          Create / fetch active session
  response/route.ts         Record a response + return next item
  result/route.ts           Fetch completed result

src/app/discover/preferences/
  page.tsx                  REWRITE — grade question, confidence meter, peek modal
  _components/              UPDATE — confidence meter, peek modal, undo last

src/app/discover/profile/
  page.tsx                  REWRITE — Holland code headline, work-context sliders
  _components/RiasecRadarChart.tsx  UPDATE — confidence bands

src/app/careers/
  actions.ts                UPDATE — build new prompt format from AssessmentResult

src/db/schema.ts            REWRITE — new tables, drop quiz_answers
drizzle/migrations/         NEW migration files
```

## Testing strategy

- **Unit tests** (deterministic seeds throughout):
  - Posterior init/update with known inputs → known outputs
  - Item-scoring function: given a fixed posterior, the highest-scoring item is the expected one
  - Stopping rule: contrived sequences hit floor / hit cap / hit confidence-stop
  - Inconsistency detection: known contradictory sequences flagged; consistent sequences not
  - Hexagon distance helpers: every pair returns the expected category
- **Property tests:** posterior variance is monotonically non-increasing across answers; Holland code stable under small re-orderings of equivalent answer sequences.
- **Simulation harness (most important):** generate ~10,000 synthetic users with known "true" RIASEC profiles spanning the 6×5×4 = 120 Holland codes; simulate each through the engine using the Bradley-Terry response model; verify recovered codes match true profiles within tolerance. This is how we validate the engine actually works without needing real users.
- **End-to-end:** Playwright for the happy path and the resume path.

## Rollout phasing

1. **Engine + scoring + schema** (no UI changes). Engine runs server-side, exercised via test endpoint and simulation harness. No user impact.
2. **SME calibration**: produce loadings + desirability for the full bank; the user reviews.
3. **UI rewrite**: quiz flow, profile page, careers prompt update. Replace existing routes.
4. **Observability**: dashboard for response distributions, average items-to-stop, inconsistency rates, per-item information value. Not strictly required for launch but guides tuning.

## Open risks

1. **SME-rated loadings are a single point of failure.** If loading estimates are systematically off, every result is biased. Mitigation: simulation harness reveals gross errors; loadings file gets reviewed before launch; first ~50 real users get manual review.
2. **Cold-start desirability matching is approximate.** Young-adult means used as default; the 11–14 cohort may genuinely find different things "cool." Telemetry will reveal response asymmetries (e.g., one option chosen 80% of the time → desirability mismatch).
3. **The 12-item floor + adaptive may still feel "long" to a 12-year-old.** If telemetry shows abandonment spikes past item 8, consider reducing the floor to 10 with a stricter confidence requirement.
4. **Inconsistency detection is heuristic.** Will produce some false positives. Tune from telemetry.
5. **`engine_version` discipline:** if anyone tweaks loadings/thresholds without bumping the version string, historical comparisons silently break. Add a CI check that forces a version bump when files in `src/lib/assessment/` or `src/app/_data/itemLoadings.ts` change.

## Glossary

- **RIASEC** — Holland's six interest themes: Realistic, Investigative, Artistic, Social, Enterprising, Conventional.
- **Holland code** — three-letter ranking of the user's top three RIASEC themes (e.g., SAE).
- **O*NET work values** — Achievement, Independence, Recognition, Relationships, Support, Working Conditions.
- **Ipsative** — measurement where scores sum to a fixed constant per person; allows within-person comparison only.
- **TIRT** — Thurstonian Item Response Theory; the gold-standard psychometric model for forced-choice items.
- **CAT** — Computerized Adaptive Testing.
- **SME** — Subject-Matter Expert.
- **Posterior** — the engine's current belief about the user's scores on each scale, expressed as means + variances.
- **Confidence band** — qualitative bucket (high/medium/low) derived from posterior variance.
