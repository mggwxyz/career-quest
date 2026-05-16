import { RIASEC_AXIS_ORDER, RIASEC_THEME } from '@/app/_data/riasecTheme'
import type { AssessmentResult } from '@/lib/assessment'
import { getPresetInterestIcon } from '@/lib/interestIcons'

interface Props {
  riasec: AssessmentResult['riasec']
  /** Topics chosen on discover/interests (saved via /api/user/interests). */
  profileInterests?: string[]
}

const CHART_SIZE = 320
const CENTER = CHART_SIZE / 2
const RADIUS = 110
const LABEL_RADIUS = RADIUS + 22

// Scores are 0..100. Variance to SD mapped onto the same 0..100 band roughly
// by multiplying by 25 (engine's score scale factor).
const VAR_TO_SCORE_SD = 25

function pointFor(value: number, angle: number): [number, number] {
  const r = (value / 100) * RADIUS
  return [Math.cos(angle) * r, Math.sin(angle) * r]
}

function angleFor(i: number) {
  return (Math.PI * 2 * i) / RIASEC_AXIS_ORDER.length - Math.PI / 2
}

// Approximate the variance that corresponds to a confidence band, for rendering only.
function riasecVariance(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 0.15
  if (confidence === 'medium') return 0.35
  return 0.7
}

/**
 * Inline SVG radar chart for the 6-dimension RIASEC profile with confidence
 * bands. The shaded ring between the inner (mean − 1 SD) and outer
 * (mean + 1 SD) polygons visualises per-scale uncertainty; the solid polygon
 * is the posterior mean. Axis order is fixed (see RIASEC_AXIS_ORDER) so the
 * chart shape is comparable across users.
 */
export function RiasecRadarChart({ riasec, profileInterests = [] }: Props) {
  const selectedInterestCodes = RIASEC_AXIS_ORDER
    .map(code => ({ code, rank: riasec[code].rank }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map(x => x.code)

  const topCodes = new Set(selectedInterestCodes)

  const meanPoly = RIASEC_AXIS_ORDER
    .map((code, i) => pointFor(riasec[code].score, angleFor(i)))
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const highPoly = RIASEC_AXIS_ORDER
    .map((code, i) => {
      const s = riasec[code]
      // Approximate SD from variance by sqrt, scaled.
      const sd = Math.sqrt(riasecVariance(s.confidence)) * VAR_TO_SCORE_SD
      return pointFor(Math.min(100, s.score + sd), angleFor(i))
    })
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const lowPoly = RIASEC_AXIS_ORDER
    .map((code, i) => {
      const s = riasec[code]
      const sd = Math.sqrt(riasecVariance(s.confidence)) * VAR_TO_SCORE_SD
      return pointFor(Math.max(0, s.score - sd), angleFor(i))
    })
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const gridRings = [0.33, 0.67, 1].map(scale =>
    RIASEC_AXIS_ORDER.map((_, i) => {
      const a = angleFor(i)
      return `${Math.cos(a) * RADIUS * scale},${Math.sin(a) * RADIUS * scale}`
    }).join(' '),
  )

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/60 flex flex-col">
      <h2 className="font-serif text-lg text-foreground text-center mb-0.5">Interest Profile</h2>
      <p
        className="text-[10px] text-muted-foreground/90 text-center mb-1.5 max-w-xs mx-auto leading-snug"
        title="Where the mint band is wide along a spoke, the score is less certain"
      >
        Wider band = more uncertain
      </p>
      <svg
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="w-full max-w-[340px] mx-auto block"
        overflow="visible"
        role="img"
        aria-label="RIASEC radar chart with confidence bands"
      >
        <g transform={`translate(${CENTER},${CENTER})`}>
          {/* Grid rings */}
          {gridRings.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="rgba(78,219,167,0.16)"
              strokeWidth={1}
            />
          ))}
          {/* Axis lines */}
          {RIASEC_AXIS_ORDER.map((_, i) => {
            const a = angleFor(i)
            return (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={Math.cos(a) * RADIUS}
                y2={Math.sin(a) * RADIUS}
                stroke="rgba(78,219,167,0.12)"
                strokeWidth={1}
              />
            )
          })}
          {/* Confidence band: outer high polygon, inner low polygon, even-odd fill creates the ring. */}
          <path
            d={`M ${highPoly.replace(/ /g, ' L ')} Z M ${lowPoly.replace(/ /g, ' L ')} Z`}
            fill="rgba(78,219,167,0.15)"
            fillRule="evenodd"
          />
          {/* Mean polygon */}
          <polygon
            points={meanPoly}
            fill="rgba(78,219,167,0.12)"
            stroke="#4EDBA7"
            strokeWidth={2}
          />
          {/* Mean vertices */}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const a = angleFor(i)
            const [x, y] = pointFor(riasec[code].score, a)
            return (
              <circle
                key={code}
                cx={x}
                cy={y}
                r={topCodes.has(code) ? 5 : 4}
                fill="#4EDBA7"
                stroke="#0a0a1a"
                strokeWidth={2}
              />
            )
          })}
          {/* Axis labels */}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const a = angleFor(i)
            const x = Math.cos(a) * LABEL_RADIUS
            const y = Math.sin(a) * LABEL_RADIUS
            const anchor = Math.abs(x) < 1 ? 'middle' : x > 0 ? 'start' : 'end'
            const highlighted = topCodes.has(code)
            return (
              <text
                key={code}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={highlighted ? 700 : 500}
                fill={highlighted ? '#e0dff0' : '#9f99be'}
              >
                {theme?.label ?? code}
              </text>
            )
          })}
        </g>
      </svg>
      {/* Legend — all six dimensions, scores 0–100 */}
      <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11px] list-none p-0 m-0">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const highlighted = topCodes.has(code)
          const s = riasec[code]
          const scoreLabel = Math.round(s.score)
          const label = theme?.label ?? code
          return (
            <li
              key={code}
              className="flex items-center gap-1.5 min-w-0"
              title={`${label}: ${scoreLabel} out of 100 (${s.confidence} confidence)`}
            >
              <span
                aria-hidden
                className={`inline-block w-2 h-2 rounded-full shrink-0 ${highlighted ? 'bg-primary' : 'bg-muted-foreground/40'}`}
              />
              <span className={`min-w-0 truncate ${highlighted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
              <span
                className={`ml-auto tabular-nums shrink-0 text-[10px] ${highlighted ? 'text-foreground/85' : 'text-muted-foreground/90'}`}
              >
                {scoreLabel}
              </span>
            </li>
          )
        })}
      </ul>
      {/* Topics from discover/interests — not RIASEC scores; heading matches Your Work Style */}
      {profileInterests.length > 0 && (
        <section className="mt-4 pt-4 border-t border-border">
          <h2
            id="interest-profile-selected-heading"
            className="font-serif text-lg text-foreground mb-3"
          >
            Your Selected Interests
          </h2>
          <ul
            className="flex flex-wrap gap-2 list-none p-0 m-0"
            aria-labelledby="interest-profile-selected-heading"
          >
            {profileInterests.map((interest, i) => {
              const Icon = getPresetInterestIcon(interest)
              return (
                <li key={`${interest}-${i}`}>
                  <span
                    className={`inline-flex items-center min-w-0 max-w-[min(100%,240px)] px-2.5 py-1 rounded-full border border-border bg-surface/60 text-xs text-foreground ${Icon ? 'gap-2' : ''}`}
                    title={interest}
                  >
                    {Icon
                      ? (
                        <Icon className="size-4 shrink-0 text-primary-soft" strokeWidth={2} aria-hidden="true" />
                      )
                      : null}
                    <span className="truncate">{interest}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {/* Screen-reader-only summary */}
      <ul className="sr-only">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const s = riasec[code]
          return (
            <li key={code}>
              {`${theme?.label ?? code}: score ${s.score}, confidence ${s.confidence}`}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
