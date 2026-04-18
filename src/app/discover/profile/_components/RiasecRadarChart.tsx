// src/app/discover/profile/_components/RiasecRadarChart.tsx
import { RIASEC_AXIS_ORDER, RIASEC_THEME } from '@/app/_data/riasecTheme'
import type { AssessmentResult, RiasecScale } from '@/lib/assessment'

interface Props {
  riasec: AssessmentResult['riasec']
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
export function RiasecRadarChart({ riasec }: Props) {
  const topCodes = new Set(
    RIASEC_AXIS_ORDER
      .map(code => ({ code, rank: riasec[code as RiasecScale].rank }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(x => x.code),
  )

  const meanPoly = RIASEC_AXIS_ORDER
    .map((code, i) => pointFor(riasec[code as RiasecScale].score, angleFor(i)))
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const highPoly = RIASEC_AXIS_ORDER
    .map((code, i) => {
      const s = riasec[code as RiasecScale]
      // Approximate SD from variance by sqrt, scaled.
      const sd = Math.sqrt(riasecVariance(s.confidence)) * VAR_TO_SCORE_SD
      return pointFor(Math.min(100, s.score + sd), angleFor(i))
    })
    .map(p => `${p[0]},${p[1]}`)
    .join(' ')

  const lowPoly = RIASEC_AXIS_ORDER
    .map((code, i) => {
      const s = riasec[code as RiasecScale]
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
    <div className="p-6 rounded-2xl border border-border bg-surface/60">
      <h2 className="font-serif text-lg text-foreground text-center mb-1">Interest Profile</h2>
      <p className="text-xs text-muted-foreground text-center mb-4">Shaded bands show confidence</p>
      <svg
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="w-full max-w-[340px] mx-auto block"
        overflow="visible"
        role="img"
        aria-label="RIASEC radar chart with confidence bands"
      >
        <defs>
          <radialGradient id="riasec-radar-fill">
            <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.15)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${CENTER},${CENTER})`}>
          {/* Grid rings */}
          {gridRings.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke="rgba(139,92,246,0.15)"
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
                stroke="rgba(139,92,246,0.12)"
                strokeWidth={1}
              />
            )
          })}
          {/* Confidence band: outer high polygon, inner low polygon, even-odd fill creates the ring. */}
          <path
            d={`M ${highPoly.replace(/ /g, ' L ')} Z M ${lowPoly.replace(/ /g, ' L ')} Z`}
            fill="rgba(124,58,237,0.15)"
            fillRule="evenodd"
          />
          {/* Mean polygon */}
          <polygon
            points={meanPoly}
            fill="url(#riasec-radar-fill)"
            stroke="#7c3aed"
            strokeWidth={2}
          />
          {/* Mean vertices */}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const a = angleFor(i)
            const [x, y] = pointFor(riasec[code as RiasecScale].score, a)
            return (
              <circle
                key={code}
                cx={x}
                cy={y}
                r={topCodes.has(code) ? 5 : 4}
                fill={theme?.colorHex ?? '#7c3aed'}
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
                fill={highlighted ? theme?.colorHex ?? '#c4b5fd' : '#9f99be'}
              >
                {theme?.label ?? code}
              </text>
            )
          })}
        </g>
      </svg>
      {/* Screen-reader-only summary */}
      <ul className="sr-only">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const s = riasec[code as RiasecScale]
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
