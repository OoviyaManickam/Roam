import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentRequired, hasValidPaymentHeader } from '@/lib/x402'

export async function POST(req: NextRequest) {
  if (!hasValidPaymentHeader(req)) {
    return NextResponse.json(
      buildPaymentRequired(0.80, '/api/services/food', 'Street food market access — best local eats'),
      {
        status: 402,
        headers: { 'X-Payment-Required': 'true' },
      }
    )
  }

  return NextResponse.json({
    access: `FOOD-TOKEN-${Date.now()}`,
    venue: 'Krishna Street Food Market',
    address: '4th Cross, Koramangala, Bangalore',
    valid_until: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    tip: 'Try the pani puri at stall #7',
  })
}
