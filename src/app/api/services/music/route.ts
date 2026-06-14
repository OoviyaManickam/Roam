import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentRequired, hasValidPaymentHeader } from '@/lib/x402'

export async function POST(req: NextRequest) {
  if (!hasValidPaymentHeader(req)) {
    return NextResponse.json(
      buildPaymentRequired(1.20, '/api/services/music', 'Live jazz session entry pass'),
      {
        status: 402,
        headers: { 'X-Payment-Required': 'true' },
      }
    )
  }

  return NextResponse.json({
    access: `MUSIC-TOKEN-${Date.now()}`,
    venue: 'Humming Tree, Indiranagar',
    address: '12th Main, Indiranagar, Bangalore',
    valid_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    event: 'Sunday Jazz Collective — doors open 6pm',
  })
}
