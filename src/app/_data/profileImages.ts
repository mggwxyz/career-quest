// src/app/_data/profileImages.ts
// Prompt + filename map for AI-generated work-value and environment illustrations.
// Used by both the generation script and the summary page.

export interface ProfileImageEntry {
  /** Short label (left side of the en-dash in CODE_LABELS). */
  shortLabel: string
  /** Descriptor (right side of the en-dash in CODE_LABELS). */
  description: string
  /** Filename inside public/profile/images/ (no leading slash). */
  filename: string
  /** Prompt fed to OpenAI (the generateImages.ts style wrapper is applied automatically). */
  prompt: string
}

export const WORK_VALUE_IMAGES: Record<string, ProfileImageEntry> = {
  ACH: {
    shortLabel: 'Achievement',
    description: 'tackling tough goals and seeing results',
    filename: 'workvalue-achievement.png',
    prompt: 'A young adult standing triumphantly at the top of a hill, arms raised after completing a challenging goal',
  },
  IND: {
    shortLabel: 'Independence',
    description: 'autonomy in scheduling and decisions',
    filename: 'workvalue-independence.png',
    prompt: 'A focused young person working autonomously at their own desk in a cozy personal workspace, calm and self-directed',
  },
  REC: {
    shortLabel: 'Recognition',
    description: 'public praise and status for good work',
    filename: 'workvalue-recognition.png',
    prompt: 'A young person receiving applause and a trophy on a small stage, smiling proudly',
  },
  REL: {
    shortLabel: 'Relationships',
    description: 'cooperation and helping people directly',
    filename: 'workvalue-relationships.png',
    prompt: 'Two friends warmly helping each other with a task, showing genuine connection and teamwork',
  },
  SUP: {
    shortLabel: 'Support',
    description: 'clear guidance, security and good supervision',
    filename: 'workvalue-support.png',
    prompt: 'A patient mentor guiding a young student with encouragement, offering clear instruction',
  },
  WC: {
    shortLabel: 'Working Conditions',
    description: 'comfort, equipment and environment',
    filename: 'workvalue-working-conditions.png',
    prompt: 'A comfortable, well-equipped modern workspace with good lighting, ergonomic chair, and a plant on the desk',
  },
}

export const ENV_IMAGES: Record<string, ProfileImageEntry> = {
  INO: {
    shortLabel: 'Indoor Office',
    description: 'climate-controlled desk/tech setting',
    filename: 'env-indoor-office.png',
    prompt: 'A bright, climate-controlled indoor office with a modern desk, computer, and a window view',
  },
  OUT: {
    shortLabel: 'Outdoor/Field',
    description: 'work that keeps you outside or in nature',
    filename: 'env-outdoor-field.png',
    prompt: 'A young adult working happily outdoors in nature, surrounded by trees and fresh air',
  },
  RT: {
    shortLabel: 'Routine/Structured',
    description: 'stable tasks and predictable days',
    filename: 'env-routine-structured.png',
    prompt: 'A young person calmly checking items off a predictable daily checklist at a tidy desk',
  },
  VR: {
    shortLabel: 'Varied/Changing',
    description: 'frequent change, travel or new problems',
    filename: 'env-varied-changing.png',
    prompt: 'A young adventurer moving between different scenes — a city, a lab, and a field — showing variety and change',
  },
  TM: {
    shortLabel: 'Team-Based',
    description: 'constant collaboration with others',
    filename: 'env-team-based.png',
    prompt: 'A collaborative team of young people working together around a table, engaged and smiling',
  },
  SO: {
    shortLabel: 'Solo/Independent',
    description: 'quiet focus with minimal interruption',
    filename: 'env-solo-independent.png',
    prompt: 'A focused young person working alone with headphones in a quiet, minimalist space, calm and undisturbed',
  },
}
