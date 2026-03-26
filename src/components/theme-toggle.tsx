'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="btn btn-ghost btn-sm btn-square">
        <div className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      className="btn btn-ghost btn-sm btn-square"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? (
          <Sun className="h-4 w-4" />
        )
        : (
          <Moon className="h-4 w-4" />
        )}
    </button>
  )
}
