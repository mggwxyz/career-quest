import Image from 'next/image'
import type { Persona } from '@/lib/personas/types'

interface PersonaHeroProps {
  persona: Persona
  careerTitle: string
}

export function PersonaHero({ persona, careerTitle }: PersonaHeroProps) {
  const portraitSrc = `/careers/personas/${persona.onetId}.webp`

  return (
    <div className="p-6 bg-surface/50 border border-border rounded-2xl mb-6">
      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div className="shrink-0">
          <Image
            src={portraitSrc}
            alt={persona.name}
            width={160}
            height={160}
            className="rounded-2xl object-cover"
            priority
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Meet</p>
          <h2 className="font-serif text-2xl text-foreground">{persona.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {careerTitle}
            {' • '}
            {persona.yearsInField}
            {' years in'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-0.5 italic">
            Meet a fictional character. Real career facts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-4 text-sm">
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Location:</span>
              {' '}
              {persona.location}
            </p>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Hobby:</span>
              {' '}
              {persona.hobby}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
