import { NextRequest, NextResponse } from 'next/server'
import { publish } from '@/lib/store'

export async function POST(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get('activityId')
  if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })

  const body = await req.json()
  const status = body.status === 'confirmed' ? 'confirmed' : 'failed'

  publish({
    type: 'payment_update',
    activityId,
    status,
    txHash: body.txHash,
    relayedVia: '1shot',
  })

  return NextResponse.json({ ok: true })
}
