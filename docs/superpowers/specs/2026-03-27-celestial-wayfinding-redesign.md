# Celestial Wayfinding — Full App Redesign

## Overview

Full visual redesign of Career Quest with a "Deep Space Elegance" aesthetic. Dark-first theme with deep navy/indigo base, luminous violet accents, editorial serif typography, glass-morphism UI, and animated star-field backgrounds. Every page gets the treatment: home, interests, assessment, summary, careers, and auth.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full redesign — all pages | Complete visual cohesion across the app |
| Component library | Hybrid — keep DaisyUI for utilities (dropdowns, modals, alerts, toasts), custom-build key visual pieces | Assessment cards, nav, hero, career cards need bespoke cosmic styling; no need to hand-roll toast notifications |
| Assessment images | Keep photos, add cosmic styling | Photos ground career choices in reality; gradient overlays + glow borders add atmosphere |
| Navigation | Floating glass bar | Reinforces cosmic vibe on every page; natural evolution of current top navbar |
| Career results | Glowing card grid | Most usable for comparing careers; glow intensity tied to match strength gives visual hierarchy |

## Design System

### Typography

- **Display font**: Instrument Serif (headlines, hero text, card section labels, page titles)
- **Body font**: DM Sans (paragraphs, UI text, buttons, navigation, form labels)
- Both loaded via Google Fonts / `next/font/google`

### Color Tokens

All colors defined as CSS custom properties. OKLch format to match existing setup.

| Token | Role | Hex | Usage |
|-------|------|-----|-------|
| `--base` | Page background | `#0a0a1a` | Root body background |
| `--surface` | Card/panel bg | `#0f0f24` | Cards, panels, form containers |
| `--surface-glass` | Glass panels | `rgba(10, 10, 30, 0.6)` + `backdrop-filter: blur(24px)` | Navbar, auth card |
| `--primary` | Primary actions | `#7c3aed` | Buttons, active states, progress fills |
| `--primary-gradient` | CTA backgrounds | `linear-gradient(135deg, #7c3aed, #6366f1)` | Primary buttons |
| `--primary-soft` | Subtle highlights | `#c4b5fd` | Text accents, labels, secondary text |
| `--accent-warm` | Warm accents | `#fbbf24` | Eyebrow text, "Why it fits" labels, highlight tags |
| `--accent-cyan` | Cool accents | `#06b6d4` | Tertiary accent, occasional colored stars |
| `--text` | Primary text | `#e0dff0` | Body text, headings |
| `--text-muted` | Secondary text | `#8b85a8` | Descriptions, subtitles, meta labels |
| `--text-dim` | Tertiary text | `#6b63a0` | Labels, divider text, placeholders |
| `--border` | Subtle borders | `rgba(139, 92, 246, 0.15)` | Card borders, input borders |
| `--border-hover` | Hover borders | `rgba(139, 92, 246, 0.4)` | Interactive element hover state |

### Effects

| Effect | Implementation | Where used |
|--------|---------------|------------|
| Star field | Procedurally generated `<div>` dots with CSS `twinkle` animation (randomized duration 3-8s, delay 0-6s, max-opacity 0.3-0.8). ~40-55 stars per section. Occasional violet/amber/cyan colored stars (~20% of total). | Hero, all page backgrounds |
| Nebula gradients | 2-3 overlapping `radial-gradient` ellipses with purple/indigo tints at ~20-35% opacity | Behind star fields on every page |
| Glass-morphism | `backdrop-filter: blur(24px)` + semi-transparent bg + subtle border + bottom glow line | Navbar, auth card |
| Photo overlay | `linear-gradient(180deg, transparent 40%, rgba(10,10,26, 0.85) 100%)` + subtle violet tint | Assessment card images |
| Glow borders | Violet border that intensifies on hover/selection. Cards: `box-shadow: 0 0 50px rgba(124, 58, 237, 0.25)` on selected state | Assessment cards, career cards |
| CTA buttons | Gradient fill, subtle shadow `0 2px 12px rgba(124, 58, 237, 0.2)`. Slightly stronger glow on hover only. | All primary action buttons |

### Border Radius

- Cards, panels: `16px`
- Navbar: `14px`
- Buttons (pill): `28px`
- Chips/tags: `24px` / `20px`
- Inputs: `10px` (auth forms), `24px` (pill inputs like custom interest)
- Auth card: `20px`

### Spacing

- Page max-width: `max-w-4xl` (56rem / 896px) for most content, `max-w-5xl` (64rem / 1024px) for careers grid
- Navbar: floats 12px from top, 16px from sides
- Page padding: `32px-48px` vertical, `32px` horizontal
- Card gaps: `20-24px`

## Page Designs

### Navigation Bar (all pages)

Floating glass bar, 12px from top edge, full-width minus 32px (16px margins each side).

- **Left**: Logo icon (violet gradient square with ✦) + "Career Quest" in Instrument Serif
- **Right**: Nav links (Home, Assessment, Careers) + theme toggle (moon/sun icon in circular button) + user avatar (gradient circle)
- **Bottom edge**: Subtle gradient glow line (`linear-gradient` from transparent → violet → transparent)
- **Mobile**: Collapses to logo + hamburger icon. Slide-out drawer with same glass styling.
- **Active link**: Light violet background pill

### Home Page

**Hero section:**
- Full-width with star field + nebula gradients
- Eyebrow: "✦ Career Exploration Tool" in amber, uppercase, tracked
- Headline: "Find the Career You Were *Made For*" — Instrument Serif, 56px, italic emphasis in lavender
- Subtitle: "Answer a few questions about your interests, values, and work style — then let AI match you with careers that actually fit."
- CTA: "Get Started →" (primary gradient pill) + "How It Works" (outlined pill)
- **Motion**: Staggered entrance — eyebrow fades in, headline staggers up, subtitle fades, CTAs slide up. Stars twinkle continuously.

**How It Works section:**
- Divider: gradient line from transparent → violet → transparent
- Title: "How It Works" in Instrument Serif + subtitle
- Three cards in a row, equal styling:
  - Numbered circle (violet gradient bg, Instrument Serif number, violet glow)
  - Emoji icon
  - Title + description in DM Sans
  - All three number circles share identical violet styling
- No connecting lines or chevrons between cards
- **Motion**: Cards stagger in on scroll via Framer Motion viewport detection

### Interests Page (`/intake/interests`)

- Page title: "What Interests You?" in Instrument Serif + subtitle
- **Interest chips**: Pill-shaped buttons in a flex-wrap grid. Emoji prefix + label. Default: dim border + muted text. Selected: violet border + violet bg tint + brighter text + subtle glow. Hover: border brightens.
- **Custom input**: Pill-shaped input + "Add" button (small gradient pill)
- **Continue button**: Primary gradient pill, subtle shadow (not heavy glow)

### Would You Rather Page (`/intake/would-you-rather`)

- **Progress bar**: Thin (4px) gradient track with glow fill. "7 of 20" counter right-aligned.
- **Question**: "Would you rather..." in Instrument Serif, centered
- **Option cards**: 2-column grid, 24px gap
  - Photo with cosmic gradient overlay (transparent top → dark bottom + subtle violet tint)
  - Body: title (15px, 600 weight) + description (13px, muted)
  - Hover: lift 4px, border brightens, subtle shadow
  - Selected: strong violet border, deeper glow, checkmark badge scales in (spring animation)
  - Checkmark: 32px violet gradient circle with ✓, top-right corner
- **"or" badge**: 40px circle floating between cards (absolute positioned at center). Dark bg, subtle violet border, "or" in Instrument Serif italic.
- **Nav buttons**: "← Back" and "Skip →" outlined pills below cards
- **Transition**: After selection (500ms), current cards exit with opacity + translateX. New cards enter from opposite side. Framer Motion AnimatePresence.

### Summary Page (`/intake/summary`)

- Page title: "Your Profile" in Instrument Serif + subtitle
- **RIASEC bars**: Full-width card spanning both columns
  - Each trait: label (100px) + gradient bar + percentage
  - Sorted by score descending
  - Each bar has a unique color: Artistic=purple, Realistic=red, Investigative=indigo, Social=cyan, Enterprising=amber, Conventional=green
  - **Motion**: Bars animate width on mount, staggered by 100ms
- **Work Values card**: Pill tags. Top values highlighted in amber (`--accent-warm`), rest in subtle violet.
- **Environment card**: Same tag treatment as Work Values.
- **Actions**: "Retake Assessment" (outlined) + "Explore Careers →" (primary)

### Careers Page (`/careers`)

- Page title: "Your Career Matches" + subtitle
- **Career card grid**: 2-column, 20px gap
  - Header: career title (16px, 600) + match percentage badge
  - High matches (90%+): violet border tint + subtle gradient wash in corner + stronger badge styling
  - Medium matches: subtler border + dimmer badge
  - Description, Growth (green for positive), Salary range
  - "Why it fits" section: amber label + explanation, separated by thin border-top
  - Hover: lift 2px + deeper shadow, no heavy glow
  - Click: navigates to career detail page
- **Unauthenticated state**: CTA card replacing results — "Sign in to generate your personalized career matches" with login/signup buttons
- **Loading state**: Skeleton cards with shimmer animation (gradient sweep)
- **Generate button**: Primary gradient pill, centered above results (for logged-in users who haven't generated yet)

### Auth Pages (`/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`)

All auth pages share a centered layout:
- Star field + nebula background (same as other pages)
- Centered glass card (max-width 380px, glass-morphism bg, rounded 20px)
- Logo icon + title (Instrument Serif) + subtitle
- Form fields: stacked, 16px gap. Labels in muted text, inputs with dark bg + violet focus border.
- Primary submit: gradient pill, subtle shadow
- Divider: "— or —" with gradient lines
- OAuth button: outlined style with Google icon
- Footer link: "Don't have an account? Sign up" / "Already have an account? Sign in"
- Success states (sign-up confirmation, password reset): same card frame with confirmation message

### Career Detail Page (`/careers/[onetId]`)

Follows the same design system. Key elements:
- Career title in Instrument Serif
- O*NET data displayed in the card grid pattern
- AI chat interface uses glass-morphism message bubbles
- User messages: subtle violet bg. AI messages: surface bg with border.

## Dark / Light Mode

- **Dark mode (primary)**: As designed above. This is the default experience.
- **Light mode**: Invert to cream/paper base (`#faf9f6`), desaturate accent colors slightly, swap glass-morphism to frosted white (`rgba(255,255,255,0.7)`). Text becomes dark navy. Violet accents stay but shift lighter. Stars become subtle dots on the light background.
- Theme toggle in navbar (moon/sun icon) triggers `next-themes` attribute change on `<html>`.

## Motion & Animation

| Animation | Trigger | Implementation |
|-----------|---------|---------------|
| Star twinkle | Page load (continuous) | CSS `@keyframes twinkle` on procedurally generated star divs |
| Hero entrance | Page load | Framer Motion staggered: eyebrow → headline → subtitle → CTA (delays 0, 0.1, 0.2, 0.3s) |
| Step cards | Scroll into view | Framer Motion `whileInView` with stagger |
| Interest chip select | Click | CSS transition: border-color, background, box-shadow (0.25s) |
| Assessment card select | Click | Framer Motion spring for checkmark scale. CSS transition for border/shadow. |
| Card transition (WYR) | After selection (500ms) | Framer Motion AnimatePresence: exit opacity+translateX, enter from opposite side |
| RIASEC bars | Mount | CSS transition on width (0.8s ease), staggered with `transition-delay` |
| Career card hover | Hover | CSS transition: transform translateY(-2px), box-shadow (0.3s) |
| Page transitions | Navigation | Framer Motion layout animations or Next.js view transitions |

## Responsive Behavior

| Breakpoint | Changes |
|-----------|---------|
| `< 640px` (mobile) | Nav: logo + hamburger. Hero text: ~36px. CTAs stack vertically. Assessment cards stack vertically (1 column). Step cards stack. Career cards stack. Auth card: full-width with reduced padding. |
| `640px - 768px` | 2-column layouts maintained where space allows. Reduced gaps. |
| `768px+` | Full desktop layouts as designed. |

## Technical Approach

- **Keep DaisyUI**: For dropdown menus, modal dialogs, alert/toast notifications, loading spinners, and tooltip components
- **Custom-build**: Navbar, hero, interest chips, assessment cards, career cards, auth card, progress bar, RIASEC bars, step cards
- **CSS custom properties**: All color tokens as variables in `globals.css` for theme switching
- **Framer Motion**: Page transitions, assessment card enter/exit, hero stagger, scroll-triggered reveals
- **Fonts**: Replace Geist with Instrument Serif + DM Sans via `next/font/google`
- **Star field**: React component that generates star divs procedurally on mount. Memoized to prevent re-renders.

## Mockup References

All interactive mockups are saved in `.superpowers/brainstorm/` for reference during implementation:
- `pages-home-nav-v3.html` — Final homepage + navigation
- `pages-assessment-v2.html` — Interests, Would You Rather, Summary
- `pages-careers-auth.html` — Career recommendations + Login/Sign Up
