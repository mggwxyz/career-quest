import type { AssessmentResult } from '@/lib/assessment'

type Axis = {
  key: keyof AssessmentResult['workContext']
  leftLabel: string
  rightLabel: string
  leftLeans: string[]
}

const AXES: Axis[] = [
  { key: 'structureVariety', leftLabel: 'Structure', rightLabel: 'Variety', leftLeans: ['structure'] },
  { key: 'indoorOutdoor', leftLabel: 'Indoor', rightLabel: 'Outdoor', leftLeans: ['indoor'] },
  { key: 'soloTeam', leftLabel: 'Solo', rightLabel: 'Team', leftLeans: ['solo'] },
]

function pctFor(lean: string, strength: number, leftLeans: string[]): number {
  if (leftLeans.includes(lean)) return 50 - strength * 50
  if (lean === 'balanced' || lean === 'mixed' || lean === 'flexible') return 50
  return 50 + strength * 50
}

export default function WorkContextSliders({ result }: { result: AssessmentResult }) {
  return (
    <section>
      <h2 className="font-serif text-lg text-foreground mb-4">Your Work Style</h2>
      <div className="space-y-5">
        {AXES.map((axis) => {
          const v = result.workContext[axis.key]
          const pct = pctFor(v.lean, v.strength, axis.leftLeans)
          return (
            <div key={axis.key}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{axis.leftLabel}</span>
                <span className="uppercase tracking-wider text-[10px]">{v.confidence}</span>
                <span>{axis.rightLabel}</span>
              </div>
              <div className="relative h-1 rounded-full bg-primary/10">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-primary to-secondary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                  style={{ left: `calc(${pct}% - 6px)` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
