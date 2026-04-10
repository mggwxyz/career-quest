// src/app/discover/profile/_components/RiasecRadarChart.tsx
import { RIASEC_AXIS_ORDER, RIASEC_THEME } from '@/app/_data/riasecTheme'

interface RiasecRadarChartProps {
  riasec: Record<string, number>
}

const CHART_SIZE = 320
const CENTER = CHART_SIZE / 2
const RADIUS = 110
const LABEL_RADIUS = RADIUS + 22

/**
 * Inline SVG radar chart for the full 6-dimension RIASEC profile.
 * Axis order is fixed (see RIASEC_AXIS_ORDER) so the chart shape is comparable.
 */
export function RiasecRadarChart({ riasec }: RiasecRadarChartProps) {
  const values = Object.values(riasec)
  const maxValue = Math.max(...values, 1)

  // Determine which 3 codes are "top" so we can highlight their labels.
  const topCodes = new Set(
    Object.entries(riasec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code),
  )

  // Angle per axis (starting from -90° so the first axis is straight up).
  const angleFor = (index: number) =>
    (Math.PI * 2 * index) / RIASEC_AXIS_ORDER.length - Math.PI / 2

  // Generate concentric hex grid rings at 33%, 67%, and 100% of the radius.
  const gridRings = [0.33, 0.67, 1].map((scale) => {
    const points = RIASEC_AXIS_ORDER.map((_, i) => {
      const angle = angleFor(i)
      return `${Math.cos(angle) * RADIUS * scale},${Math.sin(angle) * RADIUS * scale}`
    }).join(' ')
    return points
  })

  // Data polygon points.
  const dataPoints = RIASEC_AXIS_ORDER.map((code, i) => {
    const value = (riasec[code] ?? 0) / maxValue
    const angle = angleFor(i)
    return {
      code,
      x: Math.cos(angle) * RADIUS * value,
      y: Math.sin(angle) * RADIUS * value,
    }
  })

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/60">
      <h2 className="font-serif text-lg text-foreground text-center mb-1">Interest Profile</h2>
      <p className="text-xs text-muted-foreground text-center mb-4">Your RIASEC personality map</p>

      <svg
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="w-full max-w-[340px] mx-auto block"
        overflow="visible"
        role="img"
        aria-label="RIASEC radar chart"
      >
        <defs>
          <radialGradient id="riasec-radar-fill">
            <stop offset="0%" stopColor="rgba(124,58,237,0.5)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0.15)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${CENTER},${CENTER})`}>
          {/* Grid rings */}
          {gridRings.map((points, i) => (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth={1}
            />
          ))}
          {/* Axis lines */}
          {RIASEC_AXIS_ORDER.map((_, i) => {
            const angle = angleFor(i)
            return (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={Math.cos(angle) * RADIUS}
                y2={Math.sin(angle) * RADIUS}
                stroke="rgba(139,92,246,0.12)"
                strokeWidth={1}
              />
            )
          })}
          {/* Data polygon */}
          <polygon
            points={dataPolygon}
            fill="url(#riasec-radar-fill)"
            stroke="#7c3aed"
            strokeWidth={2}
          />
          {/* Data vertices */}
          {dataPoints.map((p) => {
            const theme = RIASEC_THEME[p.code]
            return (
              <circle
                key={p.code}
                cx={p.x}
                cy={p.y}
                r={topCodes.has(p.code) ? 5 : 4}
                fill={theme?.colorHex ?? '#7c3aed'}
                stroke="#0a0a1a"
                strokeWidth={2}
              />
            )
          })}
          {/* Axis labels */}
          {RIASEC_AXIS_ORDER.map((code, i) => {
            const theme = RIASEC_THEME[code]
            const angle = angleFor(i)
            const x = Math.cos(angle) * LABEL_RADIUS
            const y = Math.sin(angle) * LABEL_RADIUS
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

      {/* Screen-reader-only numeric listing */}
      <ul className="sr-only">
        {RIASEC_AXIS_ORDER.map((code) => {
          const theme = RIASEC_THEME[code]
          const pct = Math.round(((riasec[code] ?? 0) / maxValue) * 100)
          return (
            <li key={code}>
              {theme?.label ?? code}
              {': '}
              {pct}
              %
            </li>
          )
        })}
      </ul>
    </div>
  )
}
