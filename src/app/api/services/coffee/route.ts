import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentRequired, hasValidPaymentHeader } from '@/lib/x402'

export async function POST(req: NextRequest) {
  if (!hasValidPaymentHeader(req)) {
    return NextResponse.json(
      buildPaymentRequired(0.60, '/api/services/coffee', 'Specialty coffee spot reservation'),
      {
        status: 402,
        headers: { 'X-Payment-Required': 'true' },
      }
    )
  }

  return NextResponse.json({
    access: `COFFEE-TOKEN-${Date.now()}`,
    venue: 'Third Wave Coffee, Koramangala',
    address: '80 Feet Road, Koramangala 4th Block',
    valid_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    reservation: 'Table for 1, window seat reserved',
  })
}
