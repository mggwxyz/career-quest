# Open Source Career Exploration Research and Goal Backlog

Date: 2026-06-25

Purpose: compare Career Quest with adjacent open-source or public-source career
exploration projects, identify useful feature gaps, and turn those gaps into
standalone `/goal` invocations.

## Executive Recommendation

Career Quest already has a strong assessment-to-O\*NET-match core. The most
useful next goals should move it from "find good careers" to "plan, compare,
track, and act on careers."

Prioritize these themes:

1. Lower friction: guest exploration and public read-only career browsing.
2. User memory: saved careers, notes, chat history, assessment history, and a
   dashboard.
3. Decision support: side-by-side comparisons, local labor-market data,
   training paths, education cost/time, and scenario modeling.
4. Action planning: skill-gap analysis, learning roadmaps, resume/profile
   import, and career transition mapping.
5. Institutional use: educator/counselor cohorts, shareable reports, exports,
   consent boundaries, and analytics.

## Current Career Quest Baseline

Evidence from the current repo:

- The README defines the core product as interest picking, adaptive assessment,
  O\*NET matching, and career chat (`README.md:9-12`).
- The adaptive engine uses RIASEC, work values, work context, posterior updates,
  stopping rules, and expected information gain (`README.md:16-24`).
- The DB already persists interests, assessment sessions, assessment responses,
  recommendation runs, career recommendations, and a generic
  `career_user_actions` table (`src/db/schema.ts:36-122`).
- Assessment APIs currently require authentication for session start/resume
  (`src/app/api/assessment/session/route.ts:12-15`,
  `src/app/api/assessment/session/route.ts:37-40`), and saved interests also
  require authentication (`src/app/api/user/interests/route.ts:25-40`).
- The assessment UI supports resume, skip, peek, completion, profile, matches,
  answer review, and retake (`src/app/discover/would-you-rather/page.tsx:56-89`,
  `src/app/discover/would-you-rather/page.tsx:147-185`,
  `src/app/discover/would-you-rather/page.tsx:224-235`).
- The profile page already renders Holland code, confidence, work values, work
  context, RIASEC radar, answer review, and retake
  (`src/app/discover/profile/page.tsx:71-110`).
- Matches already include loading/error states, O\*NET-enriched salary/outlook,
  scene images, why-it-fits text, and regeneration
  (`src/app/discover/matches/_components/CareersClient.tsx:81-189`).
- Career browse already searches and filters the O\*NET catalog by text, RIASEC,
  education zone, bright outlook, chat-ready, and user matches
  (`src/app/careers/page.tsx:14-65`, `src/app/careers/page.tsx:70-195`).
- Career detail pages already fetch O\*NET detail endpoints for tasks, skills,
  technology, education, outlook, interests, and related careers
  (`src/lib/onet/occupations.ts:68-114`), then provide a role-play chat
  (`src/app/careers/[slug]/page.tsx:36-108`,
  `src/app/careers/[slug]/_components/CareerRolePlayChat.tsx:31-144`).
- Scene image generation is already planned and partly present via
  `docs/superpowers/specs/2026-06-14-career-scene-images-design.md` and
  `scripts/seed-career-scenes/`; avoid duplicating that as a new goal unless
  wiring or QA remains.

## External Projects and Patterns

Strongest open-source or public-source inspiration:

- American Dream Jobs:
  https://github.com/jzhao23/american-dream-jobs
  - Free, open-source career discovery platform.
  - Good ideas: compare up to 3 careers, earnings calculator, local job-market
    data for 350+ metro areas, AI resilience, curated career paths, and explicit
    authoritative data-source documentation.
  - Especially relevant because it also uses O\*NET, BLS, CareerOneStop, and AI
    exposure data.

- AI Career Navigator:
  https://github.com/MadsDoodle/Career-Navigator
  - MIT-licensed workflow from resume/profile intake through skill gaps,
    learning pathways, job matching, application support, growth simulation, and
    progress measurement.
  - Good ideas: closed-loop career journey, readiness score, skill-gap matrix,
    micro-quests, application tracking, and growth diary.

- SkillAlign:
  https://github.com/Y4SSERk/SkillAlign
  - Uses ESCO taxonomy, Neo4j, transformer embeddings, and FAISS to match skills
    semantically to occupations.
  - Good ideas: explainable skill-to-career matching, skill gap analysis, graph
    relationships, and vector search as a supplement to RIASEC matching.

- Sahay AI:
  https://github.com/SOHAM-3T/SAHAY_AI
  - MIT-licensed career mentor with resume parsing, RAG guidance, skill-gap
    analysis, learning roadmaps, and real-time chat.
  - Good ideas: resume upload as an input, career mentor memory, skill extraction
    from artifacts, and "what to learn next" outputs.

- Careerly:
  https://github.com/Sanjay-batthula/careerly
  - AI career guidance platform with career mapping, personalized roadmaps,
    market intelligence, college integration, global reach, and progress
    tracking.
  - Good ideas: step-by-step career journeys, market-intelligence surfacing, and
    milestone tracking.

- Career Guidance System:
  https://github.com/Unique-01/Career-Guidance-System
  - Public Django/React guidance platform with reports, PDF/Excel exports,
    educational resources, admin tools, analytics, CMS, and feedback/support.
  - Good ideas: counselor/admin workflows, report exports, resources library,
    role-based management, and feedback loops.

Useful non-open-source/public references:

- LinkedIn Career Explorer:
  https://linkedin.github.io/career-explorer/
  - Good ideas: transferable-skill similarity score, skills users already have,
    skills to build, regional jobs, and transition sorting.
  - Caveat: LinkedIn data has terms and privacy constraints; use as product
    inspiration, not a data source.

- O\*NET Interest Profiler:
  https://www.onetcenter.org/IP.html
  - Official benchmark for RIASEC assessment design. It has 30-question Mini-IP
    and 60-question Short Form formats, links results to 900+ O\*NET occupations,
    supports web/widget/API integration, and is Creative Commons licensed.
  - Good ideas: assessment provenance, self-interpretation, Spanish access,
    official score report/worksheet downloads, and clear licensing.

- O\*NET Web Services:
  https://services.onetcenter.org/about
  - Provides occupational data and career exploration APIs for 900+ occupations,
    including the full O\*NET database and popular site features. O\*NET says its
    database is updated quarterly.

- BLS OEWS:
  https://www.bls.gov/oes/
  - Annual employment and wage estimates for approximately 830 occupations,
    including national, state, metropolitan, and nonmetropolitan areas.

- CareerOneStop mySkills myFuture:
  https://www.myskillsmyfuture.org/
  - Transition workflow starts from a current/past job, finds careers with
    similar skills, then exposes wage, training, and job-opening paths.

## What Not To Rebuild First

Do not spend early goals on generic versions of features Career Quest already
has:

- Basic RIASEC profile visualization.
- Basic O\*NET browse/detail pages.
- Simple AI career recommendation generation.
- Simple career chat without persistence.
- Scene image generation scripts already covered by the June 14 plan.

## Invokable Goal Backlog

Each item below is meant to stand alone as a `/goal` objective. Dependencies are
called out where one goal becomes better after another ships, but each goal can
still be scoped independently.

### G01 - Guest-To-Account Discovery

Invoke:

`/goal Build a guest-to-account discovery flow for Career Quest: anonymous users can pick interests, complete the adaptive assessment, view an ephemeral profile, browse public careers, then sign up or log in to save/merge their results, interests, matches, and career actions.`

Why:

- O\*NET Interest Profiler, LinkedIn Career Explorer, and mySkills myFuture all
  support meaningful exploration before account creation.
- Current assessment and interest APIs return 401 without a user.

Scope:

- Anonymous assessment session storage strategy: signed cookie, local durable
  token, or explicit guest user row.
- Merge behavior when the user authenticates.
- Public read-only `/careers` and `/careers/[slug]` access with save/chat gated
  behind auth.
- UX prompts only when persistence or AI-costly actions are requested.

Acceptance:

- Playwright: anonymous user completes assessment and sees a profile.
- Playwright: anonymous user signs up after completion and saved DB rows match
  the guest result.
- Unit/API tests cover unauthenticated and authenticated session behavior.
- Existing authenticated assessment tests remain green.

### G02 - Saved Careers And Career Portfolio Dashboard

Invoke:

`/goal Build a career portfolio dashboard that uses saved career actions, assessment history, recommendation runs, recent chats, notes, and next steps so users can return to their exploration work instead of starting from matches each time.`

Why:

- AI Career Navigator, Careerly, and Career Guidance System all emphasize
  progress tracking and dashboards.
- Career Quest already has a `career_user_actions` table but no surfaced save,
  dismiss, compare, note, or dashboard workflow.

Scope:

- Add save/dismiss/shortlist actions to match cards, browse cards, and career
  detail pages.
- Dashboard sections: profile summary, saved careers, shortlisted careers,
  recently viewed careers, assessment attempts, and recommended next actions.
- Keep destructive actions reversible where reasonable.

Acceptance:

- DB migration or schema refinement documents action values.
- UI tests cover save/unsave from match and detail pages.
- Dashboard renders from DB state without needing a fresh AI generation.
- E2E covers save career -> dashboard -> career detail round trip.

### G03 - Career Compare

Invoke:

`/goal Add a side-by-side career comparison workflow for 2-3 saved or selected careers, using O*NET detail data, user match reasons, salary/outlook, job zone, tasks, skills, knowledge, technology, related careers, and profile-fit explanations.`

Why:

- American Dream Jobs makes comparison a central feature.
- Career Quest has the required O\*NET detail data and match reasons, but each
  career is currently evaluated in isolation.

Scope:

- Compare tray or dashboard compare list.
- `/careers/compare?ids=...` route.
- Normalize fields into a comparable model with empty-state fallbacks.
- Highlight tradeoffs: fit, pay, outlook, preparation, core tasks, skills to
  build, work context, and related careers.

Acceptance:

- Unit tests for compare model projection.
- E2E covers adding two careers and loading compare.
- Compare remains useful with partial O\*NET detail failure.
- Mobile layout avoids horizontal overflow.

### G04 - Skill Gap And Learning Roadmap

Invoke:

`/goal Build skill-gap and learning-roadmap support from a user's assessment/profile to a target career, using O*NET skills, knowledge, tasks, work activities, and optional resume/profile input to produce explainable gaps, priorities, and learning steps.`

Why:

- SkillAlign, Sahay AI, AI Career Navigator, and Careerly all turn matching into
  "what to learn next."
- Career Quest already fetches O\*NET skills, knowledge, tasks, and technology.

Scope:

- Initial non-resume version: infer current strengths from assessment,
  interests, and user-selected known skills.
- Target-career skill matrix: have, likely have, unknown, need to build.
- Learning steps: 3-6 concrete actions, resources placeholders, and progress
  checkboxes.
- Optional later extension: resume/profile upload and skill extraction.

Acceptance:

- Deterministic projector tests cover O\*NET detail -> gap inputs.
- AI output is schema-validated and never overwrites source O\*NET facts.
- UI shows provenance for each gap: O\*NET, user-entered, assessment-inferred, or
  AI-suggested.
- A user can mark steps complete and return to them.

### G05 - Local Labor Market Layer

Invoke:

`/goal Add a local labor-market layer to Career Quest using BLS OEWS and CareerOneStop-style data so users can compare wages, employment, training options, and job availability by state or metro instead of relying only on national O*NET pay/outlook.`

Why:

- American Dream Jobs differentiates with local job-market data.
- BLS OEWS publishes annual occupation wage/employment estimates for national,
  state, metro, and nonmetro areas.
- CareerOneStop tools orient users toward wage, training, and job-opening paths.

Scope:

- Region selector persisted per user/profile.
- Data ingestion plan for BLS OEWS area/SOC wage data.
- Add local wage/employment cards to browse, detail, compare, and dashboard.
- Design fallbacks for SOC/O\*NET mapping gaps.

Acceptance:

- Ingest script can load a small fixture and validate SOC mappings.
- Unit tests cover national fallback, state/metro selection, and missing data.
- UI clearly labels data year and region.
- No live external calls in request-time user flows unless explicitly cached.

### G06 - Persistent Career Chat Memory

Invoke:

`/goal Persist career chat history per user and career, including persona context, recommendation context, message transcript, timestamps, and a safe delete/start-over flow, then surface recent chats from the dashboard and career detail pages.`

Why:

- Career Quest has a strong role-play chat, but the client only keeps transient
  `useChat` state.
- AI Career Navigator and Sahay AI both treat mentor interaction as an ongoing
  workflow rather than a single throwaway conversation.

Scope:

- DB tables for chat threads and messages.
- Load existing thread on career detail.
- "Start over" creates a new thread or archives the old one instead of only
  resetting client state.
- Dashboard recent chats.

Acceptance:

- API tests cover create/load/append/archive/delete authorization.
- E2E covers sending a message, navigating away, returning, and seeing history.
- Transcript storage has size limits and redaction/safety decisions documented.

### G07 - Shareable And Exportable Reports

Invoke:

`/goal Add shareable and exportable career reports: users can generate a private share link and PDF/print view for their Holland profile, confidence bands, work values, work context, top matches, saved careers, and comparison notes.`

Why:

- O\*NET Interest Profiler provides score report/worksheet downloads.
- Career Guidance System includes PDF/Excel reports.
- Students often need to share results with parents, teachers, counselors, or
  advisors.

Scope:

- Report model assembled from existing profile/result/matches data.
- Private share token with revoke/expiry.
- Print/PDF-friendly route.
- Optional counselor note section.

Acceptance:

- Unit tests for report projection and token authorization.
- Playwright visual/smoke test for report route.
- Shared link exposes only intended report fields.
- Report states data date/source for O\*NET-derived fields.

### G08 - Resume Or Profile Import

Invoke:

`/goal Add resume/profile import as an optional Career Quest input: parse an uploaded resume or structured profile into skills, experience, education, interests, and target constraints, then use it to enrich career matches, skill gaps, and learning roadmaps.`

Why:

- Sahay AI and AI Career Navigator use resume/profile intake as the bridge from
  exploration to action.
- LinkedIn Career Explorer and mySkills myFuture start from prior work
  experience or current job.

Scope:

- Start with structured text/paste or simple PDF upload.
- Extract skills and experience into a reviewed draft, not automatic truth.
- Store extracted profile data separately from assessment results.
- Use extracted skills in G04 skill-gap scoring.

Acceptance:

- Upload limits, file validation, and privacy copy are explicit.
- Extraction is schema-validated and user-confirmed before persistence.
- Tests cover malformed upload and authorization.
- The feature works without requiring resume upload for students with little
  work history.

### G09 - Career Pathway And Scenario Modeling

Invoke:

`/goal Add career pathway and scenario modeling: for selected careers, show likely entry paths, time-to-employment, education/training cost assumptions, earning scenarios, AI exposure/resilience notes, and progression paths with clear source provenance.`

Why:

- American Dream Jobs includes earnings calculator, education costs, AI
  resilience ratings, and curated paths.
- AI Career Navigator includes growth simulation for salary, stability, and
  progression.

Scope:

- Start with a small curated pathway model per high-value cluster before scaling
  to all O\*NET occupations.
- Scenario inputs: location, education starting point, training time, cost,
  salary percentile assumptions.
- Label every non-O\*NET assumption.

Acceptance:

- Methodology doc explains formulas, data sources, assumptions, and limitations.
- Unit tests cover scenario calculations.
- UI prevents overclaiming and shows confidence/source labels.
- Compare page can include scenario rows when data exists.

### G10 - Educator And Counselor Workspace

Invoke:

`/goal Build an educator/counselor workspace for Career Quest with invite-only cohorts, consent-aware student sharing, aggregate interest/match dashboards, report review, and administrative controls that avoid exposing private chat transcripts by default.`

Why:

- Career Explorer-style public projects and Career Guidance System both include
  school/admin or reporting concepts.
- Career Quest's likely users include students, parents, educators, and
  counselors; shared guidance workflows are natural for the product.

Scope:

- Role model: student, educator/counselor, admin.
- Cohort invites and student opt-in sharing.
- Aggregate dashboards only: RIASEC distributions, saved clusters, completion
  progress, and report links.
- Privacy policy and redaction boundaries.

Acceptance:

- Authorization tests for role and cohort boundaries.
- Student can revoke sharing.
- Educator cannot see private chat history unless a future explicit consent
  model is added.
- Aggregate views protect small cohorts from accidental re-identification.

### G11 - Data Provenance, Freshness, And Admin QA

Invoke:

`/goal Add data provenance, freshness, and admin QA for Career Quest's O*NET, BLS, CareerOneStop, persona, and generated-scene data: expose source versions, updated-at dates, seed manifests, stale-data warnings, and admin verification tools.`

Why:

- O\*NET updates quarterly, BLS OEWS updates annually, and Career Quest already
  mixes local mirrors, live O\*NET detail calls, AI recommendations, personas,
  and generated images.
- American Dream Jobs explicitly documents data sources and methodology.

Scope:

- Source metadata table or manifest convention.
- Admin read-only data health route.
- Display data vintage on relevant UI surfaces.
- Seed scripts write manifest entries with source/version/date.

Acceptance:

- Tests cover source metadata formatting and stale warning thresholds.
- Seed scripts update provenance without manual edits.
- Career detail and compare pages expose data source dates where available.
- README/docs explain data source responsibilities.

### G12 - Assessment Provenance And O\*NET IP Benchmarking

Invoke:

`/goal Add assessment provenance and O*NET Interest Profiler benchmarking to Career Quest: document how the adaptive item bank maps to RIASEC, compare outputs against O*NET IP expectations where possible, and expose a user-facing confidence/provenance explanation.`

Why:

- O\*NET Interest Profiler is the official RIASEC benchmark, with documented
  formats, research history, self-interpretation, and links to O\*NET
  occupations.
- Career Quest has a custom adaptive engine; that is a product advantage only if
  provenance and limitations are clear.

Scope:

- Internal assessment methodology doc.
- Optional hidden/admin fixture comparison against O\*NET IP examples or stable
  synthetic profiles.
- User-facing "how this was scored" explanation.
- Review item-bank coverage by RIASEC pair, work values, and context.

Acceptance:

- Methodology doc maps engine concepts to current code.
- Tests or scripts summarize item-bank balance and coverage.
- UI copy explains confidence without overstating psychometric validity.
- Existing adaptive tests remain green.

### G13 - Curated Career Collections

Invoke:

`/goal Add curated career collections for Career Quest, starting with practical clusters such as healthcare, skilled trades, tech without a four-year degree, education/helping, creative production, and climate/energy, with editorial descriptions, O*NET-backed membership, and browse filters.`

Why:

- American Dream Jobs uses curated pathways to help users who do not yet know
  how to search.
- Career Quest's full O\*NET catalog is broad; guided collections reduce choice
  overload.

Scope:

- Static collection definitions backed by O\*NET IDs.
- Collection landing cards on browse and dashboard.
- Collection-aware filters and shareable URLs.
- Editorial standards: no unsupported claims and clear source/date.

Acceptance:

- Unit tests validate every collection O\*NET ID exists in seeded data.
- Browse route can filter by collection.
- Collections work without AI generation.
- Copy is reviewed for age/student appropriateness.

### G14 - Product Analytics And Research Feedback Loop

Invoke:

`/goal Add privacy-conscious product analytics and research feedback loops for Career Quest: track assessment completion, match generation, save/compare actions, browse filters, report sharing, and explicit usefulness feedback without collecting sensitive chat content by default.`

Why:

- AI Career Navigator and Careerly emphasize measuring progress and continuous
  updates.
- Career Quest will need evidence to decide which recommendations and career
  workflows actually help users.

Scope:

- Event taxonomy and consent policy.
- Server-side events for durable product milestones.
- User feedback prompts: "Was this match useful?", "Why not?", and "What would
  help next?"
- Admin/reporting surface or export.

Acceptance:

- Event schema has tests and documentation.
- Analytics can be disabled by environment variable.
- No chat body, resume body, or raw sensitive free text is logged by default.
- Dashboard/reporting shows aggregate funnel metrics.

## Suggested Execution Order

1. G01 Guest-To-Account Discovery.
2. G02 Saved Careers And Career Portfolio Dashboard.
3. G03 Career Compare.
4. G04 Skill Gap And Learning Roadmap.
5. G06 Persistent Career Chat Memory.
6. G05 Local Labor Market Layer.
7. G07 Shareable And Exportable Reports.
8. G11 Data Provenance, Freshness, And Admin QA.
9. G12 Assessment Provenance And O\*NET IP Benchmarking.
10. G08 Resume Or Profile Import.
11. G09 Career Pathway And Scenario Modeling.
12. G13 Curated Career Collections.
13. G10 Educator And Counselor Workspace.
14. G14 Product Analytics And Research Feedback Loop.

Rationale: access and persistence should land before heavier decision-support
features, because compare, reports, roadmaps, chat memory, and educator views
all need durable user-owned career artifacts.

## Source Quality Notes

- Treat American Dream Jobs and the official O\*NET/BLS/CareerOneStop sources as
  the highest-value evidence for product direction because they are directly
  aligned with O\*NET-based career exploration.
- Treat small GitHub topic projects as pattern inspiration, not proof of best
  practice. Several are young prototypes with low stars, short histories, or
  incomplete backends.
- Treat LinkedIn Career Explorer as feature inspiration only. Its data and terms
  are not a reusable source for Career Quest.
- Avoid adding new dependencies until a specific goal proves that the existing
  stack cannot support the feature.
