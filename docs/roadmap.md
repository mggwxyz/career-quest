# Career Quest — Roadmap

> Last updated: 2026-07-02
> Supersedes the 2026-03-25 roadmap (pre-Neon-Auth, pre-O*NET era — most of it shipped).
> Companion doc: [`docs/research/2026-06-25-open-source-career-exploration-goals.md`](./research/2026-06-25-open-source-career-exploration-goals.md) (G01–G14 backlog).

## Where we are

Shipped and live at career-quest-app.vercel.app:

- Interest picker + Bayesian adaptive assessment (RIASEC, work values, work context) with resume, skip, peek, retake
- O*NET-backed career matching with salary/outlook, scene images, why-it-fits
- Career browse/search/filter over the full O*NET catalog + detail pages with role-play AI chat
- Neon Auth (email/password + Google), Drizzle/Neon Postgres persistence
- Vitest unit suite, 9-spec Playwright suite running in CI (chromium, single worker)

Worktrees already branched for G01, G02, G03, G05 (`goal-g*/`, no commits yet).

---

## Phase 1 — Polish what exists 🔧

_Goal: zero known defects, every surface feels finished. Small, closeable items._

### 1.1 Close the open daily-review issues
- [x] #56 — CI Node version jump 20 → 24 exposure (closed: green E2E run on Node 24)
- [x] #55 — Abandon-session test asserts on `.where()` call shape (now asserts the full predicate)
- [x] #54 — PNG not cleaned up on cwebp failure in scene seeding (unlink in `finally`)
- [x] #38 — 5 legacy scene entries use old multi-persona format (regenerated, closed)

### 1.2 UX finish pass
- [x] Audit every route for loading / empty / error states — fixed: silent assessment submit/start failures now toast, profile/answers distinguish fetch errors from empty (with retry), `/careers` + `/careers/[slug]` got loading skeletons, Enter applies career search pre- and post-hydration
- [x] Mobile sweep: automated 375px no-overflow check covers assessment, matches, profile/answers, `/careers`, and `/careers/[slug]`; fixed card/chat wrapping
- [x] Accessibility pass: axe-clean on core flows, FlowStepper contrast fixed, keyboard-navigation spec green for Tab/Enter/Space assessment flow
- [x] Copy/labeling pass: O*NET-derived pay/outlook/job-zone details now label `O*NET 30.3 national data`
- [x] Perceived-perf pass: loading skeletons are in place and above-the-fold scene images now opt into priority loading

### 1.3 Hardening
- [x] Rate limiting on AI endpoints — chat: 20 req/min + 100KB body cap + 50×8k message caps; recommendations: 1 generation/min via `recommendation_runs`
- [x] Consistent Zod validation on all local route handler inputs (`assessment/session`, `assessment/response`, `user/interests`, `careers/chat`)
- [ ] Error tracking (Sentry or Vercel-native) so production failures stop being invisible
- [ ] Prune dead branches/worktrees (`.worktrees/`, stale `claude/*`) and archive `archive/` decisions

**Exit criteria:** issue tracker at zero, axe clean on core flows, no unhandled API error paths.

---

## Phase 2 — E2E testing build-out 🧪

_Goal: a suite trustworthy enough that green = shippable, fast enough to run on every PR._

### 2.1 Make CI actually gate quality
- [ ] Add lint + typecheck + `vitest run` jobs to CI (today only E2E runs)
- [ ] Block merge on all jobs; keep E2E report artifact upload

### 2.2 Fix the parallelism bottleneck
- [ ] Per-spec (or per-test) user factories instead of one shared test user — this is what forces `workers: 1` today
- [ ] Isolated DB per CI run via a Neon branch created in global-setup, deleted in teardown — no shared-state flakes, safe parallel workers
- [ ] Target: full suite < 5 min with parallel workers

### 2.3 Expand coverage where it's thin
- [ ] Full-journey spec: interests → assessment → profile → matches → detail → chat (the money path, one spec, no shortcuts)
- [ ] Assessment resume-on-reload and abandon/retake flows
- [ ] Matches regeneration + failure fallback (MSW-simulated OpenAI failure)
- [ ] Mobile viewport project (Pixel/iPhone device presets) for assessment + matches
- [ ] Axe-core assertions inside existing specs rather than a separate audit
- [ ] Auth edge cases: expired session mid-assessment, OAuth error return

### 2.4 Keep it honest
- [ ] Flake policy: any test needing a retry to pass gets an issue, not a shrug
- [ ] Tag a `@smoke` subset (~1 min) for local pre-push; full suite on PR
- [ ] Every Phase 3 goal ships with its own specs (acceptance criteria in the research doc already require this)

**Exit criteria:** CI gates lint/type/unit/e2e, suite parallel and < 5 min, money path covered end-to-end.

---

## Phase 3 — Ambitious goals 🚀

_Sequenced from the G01–G14 research backlog. Theme: from "find good careers" to "plan, compare, track, and act on careers."_

### Wave 1 — Remove friction, add memory (worktrees already exist)
1. **G01 Guest-to-account discovery** — anonymous assessment + public career browsing, merge into account on signup. Biggest funnel unlock; everything downstream benefits.
2. **G02 Career portfolio dashboard** — save/dismiss/shortlist careers, assessment history, recent activity. Turns one-shot sessions into a returning-user product.
3. **G03 Career compare** — side-by-side 2–3 careers on fit, pay, outlook, preparation, skills.
4. **G06 Persistent career chat memory** — threads survive reload; recent chats on dashboard.

### Wave 2 — Decision support
5. **G05 Local labor market layer** — BLS OEWS state/metro wages and employment; region selector. National averages become *your* numbers.
6. **G04 Skill gap & learning roadmap** — profile → target career gap matrix with explainable provenance and 3–6 concrete learning steps.
7. **G07 Shareable/exportable reports** — private share link + print/PDF profile report for parents, teachers, counselors.
8. **G13 Curated career collections** — editorial clusters (trades, tech-without-a-degree, climate/energy…) to fight choice overload.

### Wave 3 — Moonshots
9. **"Day in the life" simulator** — extend the role-play chat into a structured interactive shift: scenario beats, choices, scene images per beat. Career Quest's most differentiated asset (adaptive engine + persona chat + scene art) composed into one experience.
10. **G10 Educator/counselor workspace** — cohorts, consent-aware sharing, aggregate RIASEC dashboards. The wedge into schools; depends on G07 reports.
11. **G09 Career pathway & scenario modeling** — entry paths, education cost/time, earning scenarios with labeled assumptions.
12. **G08 Resume/profile import** — bridge for career-changers; feeds G04 gap scoring.
13. **Spanish i18n** — O*NET ships Spanish occupation data; huge reach for the student audience.
14. **Assessment credibility (G12)** — benchmark the adaptive engine against the O*NET Interest Profiler, publish methodology. Turns "custom engine" from a liability into the headline.

### Cross-cutting (start in Wave 1, grow continuously)
- **G14 Privacy-conscious analytics** — funnel events + "was this useful?" feedback; can't prioritize Waves 2–3 without it
- **G11 Data provenance & freshness** — source manifests, stale-data warnings, admin data-health view

---

## Sequencing summary

```
Phase 1 (polish)  ──►  Phase 2 (e2e)  ──►  Wave 1 (G01→G02→G03→G06)
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                       Wave 2 (G05, G04, G07, G13)   analytics + provenance
                              │                        (cross-cutting)
                              ▼
                       Wave 3 (simulator, G10, G09, G08, i18n, G12)
```

Each Phase 3 goal is a standalone `/goal` invocation — exact prompts and acceptance criteria live in the research doc.
