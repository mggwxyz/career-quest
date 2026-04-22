import {
  Palette,
  FlaskConical,
  Laptop,
  Briefcase,
  Music,
  PenLine,
  HeartPulse,
  Ruler,
  Globe,
  Brain,
  Scale,
  GraduationCap,
  Building2,
  Camera,
  ChefHat,
  Dumbbell,
  Plane,
  Gamepad2,
  Smartphone,
  Sprout,
  type LucideIcon,
} from 'lucide-react'

/** Preset interests from the discover flow — label must match saved strings. */
export const COMMON_INTERESTS: { label: string, icon: LucideIcon }[] = [
  { label: 'Art & Design', icon: Palette },
  { label: 'Science', icon: FlaskConical },
  { label: 'Technology', icon: Laptop },
  { label: 'Business', icon: Briefcase },
  { label: 'Music', icon: Music },
  { label: 'Writing', icon: PenLine },
  { label: 'Healthcare', icon: HeartPulse },
  { label: 'Engineering', icon: Ruler },
  { label: 'Environment', icon: Globe },
  { label: 'Psychology', icon: Brain },
  { label: 'Law', icon: Scale },
  { label: 'Education', icon: GraduationCap },
  { label: 'Architecture', icon: Building2 },
  { label: 'Photography', icon: Camera },
  { label: 'Culinary', icon: ChefHat },
  { label: 'Fitness', icon: Dumbbell },
  { label: 'Travel', icon: Plane },
  { label: 'Gaming', icon: Gamepad2 },
  { label: 'Social Media', icon: Smartphone },
  { label: 'Sustainability', icon: Sprout },
]

const labelToIcon = new Map<string, LucideIcon>(
  COMMON_INTERESTS.map(({ label, icon }) => [label, icon]),
)

export const COMMON_INTEREST_LABELS = new Set(COMMON_INTERESTS.map(i => i.label))

/** Icon for a preset interest label only; custom user-added strings return null. */
export function getPresetInterestIcon(label: string): LucideIcon | null {
  return labelToIcon.get(label) ?? null
}
