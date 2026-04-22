import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const SPARKLE_PATH
  = 'M12 0 C12.6 9, 15 11.4, 24 12 C15 12.6, 12.6 15, 12 24 C11.4 15, 9 12.6, 0 12 C9 11.4, 11.4 9, 12 0 Z'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #4EDBA7 0%, #22c55e 100%)',
          borderRadius: 40,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="#04130a" xmlns="http://www.w3.org/2000/svg">
          <path d={SPARKLE_PATH} />
        </svg>
      </div>
    ),
    size,
  )
}
