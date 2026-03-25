# Career Quest — Roadmap

> Last updated: 2026-03-25

A plan to take Career Quest from working prototype to polished, deployable product.

---

## Current State

The app has a solid foundation:
- ✅ Homepage with clear user flow
- ✅ Interest selection (predefined + custom)
- ✅ "Would You Rather" assessment (RIASEC, work values, environment preferences)
- ✅ Results summary page
- ✅ AI-powered career recommendations (OpenAI via Vercel AI SDK)
- ✅ Per-career detail pages with AI chat
- ✅ Supabase auth (OAuth + email/password)
- ✅ PostgreSQL persistence via Drizzle ORM
- ✅ Zustand state management with persistence
- ✅ Step indicator component
- ✅ Mobile-responsive nav with hamburger menu
- ✅ Husky + lint-staged for code quality

---

## Phase 1: Polish & Bug Fixes 🔧

_Goal: Make the existing features rock-solid._

### 1.1 Fix the Assessment Flow
- [ ] **Guest mode**: Allow users to take the assessment without logging in, prompt sign-up only when saving results or viewing careers
- [ ] **Progress persistence**: Save quiz progress to the database (not just localStorage) so users can resume across devices
- [ ] **Back navigation**: Add a "Previous Question" button in the Would You Rather quiz
- [ ] **Skip question**: Allow skipping questions with a "Neither" or "Skip" option
- [ ] **Validation**: Prevent navigating to Summary/Careers without completing the assessment

### 1.2 UI/UX Improvements
- [ ] **Loading states**: Add skeleton loaders for the careers page and career detail pages
- [ ] **Error handling**: User-friendly error messages when API calls fail (career generation, chat)
- [ ] **Empty states**: Better messaging when no careers have been generated yet
- [ ] **Mobile polish**: Test and fix the Would You Rather cards on small screens (currently grid-cols-2 may feel cramped)
- [ ] **Dark mode**: Add a theme toggle (next-themes is already installed but unused)
- [ ] **Animations**: Use framer-motion (already installed) for page transitions and card selections
- [ ] **Toast notifications**: Wire up sonner (already installed) for success/error feedback

### 1.3 Code Cleanup
- [ ] **Remove duplicate career generation logic**: `src/app/api/careers/route.ts` and `src/app/careers/actions.ts` have nearly identical code — consolidate to the server action only
- [ ] **Remove unused Clerk dependency**: `@clerk/nextjs` is in package.json but Supabase is the auth provider
- [ ] **Type safety**: Replace `unknown` casts in career data handling with proper Zod-validated types
- [ ] **Environment variables**: Add `.env.example` with all required vars documented

---

## Phase 2: Feature Enhancements 🚀

_Goal: Make it genuinely useful and engaging._

### 2.1 Enhanced Results
- [ ] **Visual charts**: Add radar/bar charts for RIASEC profile (e.g., recharts or chart.js)
- [ ] **Profile comparison**: Show how the user's profile compares to average profiles for their top careers
- [ ] **Shareable results**: Generate a shareable link or image of the user's RIASEC profile
- [ ] **PDF export**: Let users download their full assessment + career recommendations as a PDF

### 2.2 Career Exploration
- [ ] **O*NET API integration**: Pull real-time data from O*NET (tasks, skills, education, salary) instead of relying solely on AI-generated descriptions
- [ ] **Save/favorite careers**: Let users bookmark careers they're interested in
- [ ] **Compare careers**: Side-by-side comparison view for 2-3 careers
- [ ] **Career paths**: Show related careers and progression paths (entry → mid → senior)
- [ ] **Local job listings**: Integrate with a job board API (Indeed, LinkedIn) to show real openings

### 2.3 Better AI Experience
- [ ] **Streaming career generation**: Show careers appearing one-by-one as they're generated
- [ ] **Chat memory**: Persist chat history per career so users can return to conversations
- [ ] **General career advisor chat**: A standalone chat that knows the user's full profile
- [ ] **Follow-up assessments**: AI-suggested deeper-dive questions based on initial results

### 2.4 User Dashboard
- [ ] **Dashboard page**: Central hub showing profile summary, saved careers, and recent activity
- [ ] **Assessment history**: Track multiple assessment attempts over time
- [ ] **Profile editing**: Let users update their name, interests, and preferences
- [ ] **Retake flow**: Clear previous results and start fresh with a single click

---

## Phase 3: Production Readiness 🏗️

_Goal: Ship it._

### 3.1 Testing
- [ ] **Unit tests**: Core logic — `getDeckResults()`, tally functions, store slices
- [ ] **Integration tests**: API routes (career generation, chat, career detail)
- [ ] **E2E tests**: Full assessment flow with Playwright or Cypress
- [ ] **Accessibility audit**: Run axe-core, fix any a11y issues, add proper ARIA labels

### 3.2 Performance
- [ ] **Image optimization**: Ensure all Would You Rather images are properly sized and served via next/image
- [ ] **Bundle analysis**: Check for unnecessary client-side JS (Clerk removal will help)
- [ ] **API caching**: Cache O*NET data and career recommendations with appropriate TTLs
- [ ] **Rate limiting**: Add rate limiting to API routes (especially AI endpoints)

### 3.3 Infrastructure
- [ ] **CI/CD**: GitHub Actions for lint, type-check, test, and deploy
- [ ] **Vercel deployment**: Set up production and preview environments
- [ ] **Environment management**: Separate Supabase projects for dev/staging/prod
- [ ] **Monitoring**: Add error tracking (Sentry) and basic analytics (Vercel Analytics or Posthog)
- [ ] **Database migrations**: Ensure drizzle-kit migrations are versioned and CI-validated

### 3.4 Security
- [ ] **API route protection**: Ensure all data-mutating endpoints verify authentication
- [ ] **Input sanitization**: Validate all user inputs before sending to AI
- [ ] **Rate limiting on auth**: Prevent brute-force on login endpoints
- [ ] **Content Security Policy**: Add appropriate CSP headers

---

## Phase 4: Growth & Engagement 📈

_Goal: Make people want to come back._

- [ ] **Onboarding flow**: Guided first-time user experience with tooltips
- [ ] **Email notifications**: Weekly career spotlight or new matches based on profile
- [ ] **Social sharing**: Share results on social media with custom OG images
- [ ] **Educator mode**: Allow teachers/counselors to create class groups and view aggregate results
- [ ] **Mobile app**: Consider a PWA or React Native wrapper for mobile
- [ ] **Multilingual support**: i18n for broader accessibility
- [ ] **Gamification**: Badges, streaks, or XP for completing assessments and exploring careers

---

## Quick Wins (Start Here) ⚡

If you want to make immediate impact, tackle these first:

1. **Remove `@clerk/nextjs`** from dependencies (dead code)
2. **Add `.env.example`** so contributors can get started
3. **Wire up dark mode toggle** (next-themes is already there)
4. **Add sonner toasts** for career generation success/failure
5. **Consolidate duplicate career generation code**
6. **Add a "Back" button to the quiz**

---

## Tech Debt Tracker

| Item | Priority | Notes |
|------|----------|-------|
| Duplicate career generation logic | High | Server action + API route do the same thing |
| Unused Clerk dependency | Medium | Remove from package.json + any leftover imports |
| `unknown` type casts in career data | Medium | Use shared Zod schema |
| No `.env.example` | High | Blocks contributors |
| No tests | High | At minimum, test core assessment logic |
| Console.log statements in API routes | Low | Clean up before production |
