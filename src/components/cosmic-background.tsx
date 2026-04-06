import { StarField } from '@/components/star-field'

interface CosmicBackgroundProps {
  starCount?: number
  variant?: 'hero' | 'page'
}

export function CosmicBackground({ starCount = 40, variant = 'page' }: CosmicBackgroundProps) {
  const gradients = variant === 'hero'
    ? `
      radial-gradient(ellipse 600px 400px at 25% 20%, var(--nebula-hero-primary) 0%, transparent 70%),
      radial-gradient(ellipse 500px 350px at 75% 70%, var(--nebula-hero-secondary) 0%, transparent 70%),
      radial-gradient(ellipse 300px 300px at 60% 30%, var(--nebula-hero-tertiary) 0%, transparent 70%)
    `
    : `
      radial-gradient(ellipse 500px 350px at 20% 30%, var(--nebula-primary) 0%, transparent 70%),
      radial-gradient(ellipse 400px 300px at 80% 70%, var(--nebula-secondary) 0%, transparent 70%)
    `

  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      <div className="absolute inset-0" style={{ background: gradients }} />
      <StarField count={starCount} />
    </div>
  )
}
