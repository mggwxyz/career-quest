import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonaHero } from '../PersonaHero'
import type { Persona } from '@/lib/personas/types'

const persona: Persona = {
  onetId: '29-1141.00',
  name: 'Maria Alvarez',
  age: 34,
  gender: 'female',
  pronouns: 'she/her',
  ethnicityCue: 'hispanic',
  ageBand: '30s',
  yearsInField: 12,
  location: 'Denver, CO',
  educationPath: 'edu',
  pathToCurrentPosition: 'path',
  dayInTheLife: 'day',
  hobby: 'Trail running on weekends.',
  imagePrompt: '',
  generatedAt: '',
  textModel: 'gpt-5',
  imageModel: 'gpt-image-1',
}

describe('PersonaHero', () => {
  it('renders name, role, years, location, hobby, and the disclaimer', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurses" />)
    expect(screen.getByText(/Maria Alvarez/)).toBeInTheDocument()
    expect(screen.getByText(/Registered Nurses/)).toBeInTheDocument()
    expect(screen.getByText(/12 years/)).toBeInTheDocument()
    expect(screen.getByText(/Denver, CO/)).toBeInTheDocument()
    expect(screen.getByText(/Trail running/)).toBeInTheDocument()
    expect(screen.getByText(/Fictional character/i)).toBeInTheDocument()
  })

  it('uses the onetId to build the portrait src', () => {
    render(<PersonaHero persona={persona} careerTitle="Registered Nurses" />)
    const img = screen.getByAltText(/Maria Alvarez/) as HTMLImageElement
    // next/image rewrites src through its optimizer (e.g. /_next/image?url=...&w=...).
    // Decode and check the underlying path so the assertion stays robust.
    expect(decodeURIComponent(img.src)).toContain('/careers/personas/29-1141.00.webp')
  })
})
