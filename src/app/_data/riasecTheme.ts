// src/app/_data/riasecTheme.ts
// Fixed theme per RIASEC code — used by hero cards and the radar chart.

export interface RiasecThemeEntry {
  label: string
  /** Short descriptor — the portion of CODE_LABELS after the en-dash. */
  description: string
  /** Emoji shown inside the hero card badge. */
  icon: string
  /** Hex color used directly inside the inline SVG radar chart. */
  colorHex: string
  /** Tailwind color family used for gradients, borders, and text. */
  tailwindColor: string
}

export const RIASEC_THEME: Record<string, RiasecThemeEntry> = {
  R: {
    label: 'Realistic',
    description: 'enjoys hands-on, practical activities',
    icon: '🔧',
    colorHex: '#ef4444',
    tailwindColor: 'red',
  },
  I: {
    label: 'Investigative',
    description: 'likes to explore, research and analyze',
    icon: '🔬',
    colorHex: '#818cf8',
    tailwindColor: 'indigo',
  },
  A: {
    label: 'Artistic',
    description: 'values creativity, design and self-expression',
    icon: '🎨',
    colorHex: '#a855f7',
    tailwindColor: 'purple',
  },
  S: {
    label: 'Social',
    description: 'prefers helping, teaching and supporting others',
    icon: '🤝',
    colorHex: '#06b6d4',
    tailwindColor: 'cyan',
  },
  E: {
    label: 'Enterprising',
    description: 'motivated by leading, persuading and selling',
    icon: '🚀',
    colorHex: '#fbbf24',
    tailwindColor: 'amber',
  },
  C: {
    label: 'Conventional',
    description: 'enjoys structure, order and data management',
    icon: '📋',
    colorHex: '#22c55e',
    tailwindColor: 'green',
  },
}

/**
 * Fixed clockwise axis order for the radar chart (starting from the top).
 * Keeping this stable across users ensures chart shape is comparable.
 */
export const RIASEC_AXIS_ORDER: readonly string[] = ['S', 'I', 'C', 'A', 'R', 'E']

export const getRiasecTheme = (code: string): RiasecThemeEntry | undefined =>
  RIASEC_THEME[code]
