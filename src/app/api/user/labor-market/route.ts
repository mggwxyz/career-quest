import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { getLaborMarketRegions, getUserLaborMarketRegion, setUserLaborMarketRegion } from '@/lib/labor-market/regions'

export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const [regions, selectedRegion] = await Promise.all([
    getLaborMarketRegions(),
    getUserLaborMarketRegion(session.user.id),
  ])

  return NextResponse.json({ regions, selectedRegion })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { regionId?: unknown }
  const regionId = typeof body.regionId === 'string' ? body.regionId.trim() : ''
  if (!regionId) {
    return NextResponse.json({ error: 'regionId is required' }, { status: 400 })
  }

  const selectedRegion = await setUserLaborMarketRegion(session.user.id, regionId)
  if (!selectedRegion) {
    return NextResponse.json({ error: 'Unknown labor-market region' }, { status: 400 })
  }

  return NextResponse.json({ selectedRegion })
}
