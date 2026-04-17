'use client'

import { useState } from 'react'

interface StarFieldProps {
  count?: number
  className?: string
}

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const size = 0.5 + Math.random() * 1.5
    const colorRoll = Math.random()
    let color = 'bg-white'
    if (colorRoll > 0.92) color = 'bg-primary-soft'
    else if (colorRoll > 0.85) color = 'bg-accent-warm'
    else if (colorRoll > 0.80) color = 'bg-accent-cyan'

    return {
      id: i,
      style: {
        'left': `${Math.random() * 100}%`,
        'top': `${Math.random() * 100}%`,
        'width': `${size}px`,
        'height': `${size}px`,
        '--duration': `${3 + Math.random() * 5}s`,
        '--delay': `${Math.random() * 6}s`,
        '--max-opacity': `${0.3 + Math.random() * 0.5}`,
        'animation': `twinkle var(--duration) ease-in-out infinite`,
        'animationDelay': `var(--delay)`,
        'opacity': 0,
      } as React.CSSProperties,
      color,
    }
  })
}

export function StarField({ count = 45, className = '' }: StarFieldProps) {
  const [stars] = useState(() => generateStars(count))

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden motion-reduce:hidden ${className}`}>
      {stars.map(star => (
        <div
          key={star.id}
          className={`absolute rounded-full ${star.color}`}
          style={star.style}
        />
      ))}
    </div>
  )
}
