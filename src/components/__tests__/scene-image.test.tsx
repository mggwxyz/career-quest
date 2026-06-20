import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SceneImage } from '../scene-image'

describe('SceneImage', () => {
  it('does not zoom the career scene image when the card is hovered', () => {
    render(<SceneImage onetId="29-1141.00" alt="Registered Nurses at work" />)

    expect(screen.getByRole('img', { name: 'Registered Nurses at work' })).not.toHaveClass('group-hover:scale-105')
  })
})
