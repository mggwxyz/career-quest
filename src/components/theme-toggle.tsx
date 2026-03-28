'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button className="w-7 h-7 rounded-full" aria-label="Toggle theme" />
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-7 h-7 rounded-full bg-primary/10 border border-border hover:border-border-hover flex items-center justify-center transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Moon size={14} className="text-muted-foreground" />
        : <Sun size={14} className="text-muted-foreground" />}
    </button>
  )
}
