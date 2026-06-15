import { NextRequest, NextResponse } from 'next/server'
import { publish } from '@/lib/store'

// 1Shot webhook type codes — from skill docs
// type 4 = Submitted (data.status 110, data.hash available)
// type 0 = Confirmed (data.status 200, data.receipt populated)
// type 1 = Failure   (data.status 500, data.data holds revert data)

export async function POST(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get('activityId')
  if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const webhookType = body.type as number | undefined
  const data = body.data as Record<string, unknown> | undefined

  console.log('[status] webhook activityId:', activityId, 'type:', webhookType, 'data.status:', data?.status)

  if (webhookType === 0) {
    // Confirmed — extract txHash from receipt
    const receipt = data?.receipt as Record<string, unknown> | undefined
    const txHash = (receipt?.transactionHash ?? data?.hash ?? data?.txHash) as string | undefined
    publish({
      type: 'payment_update',
      activityId,
      status: 'confirmed',
      txHash,
      relayedVia: '1shot',
    })
  } else if (webhookType === 1) {
    // Failure / revert
    publish({ type: 'payment_update', activityId, status: 'failed' })
  } else if (webhookType === 4) {
    // Submitted — tx is on-chain, hash available
    const txHash = (data?.hash ?? data?.txHash) as string | undefined
    if (txHash) {
      // Surface the hash early so the UI can show Basescan link immediately
      publish({ type: 'payment_update', activityId, status: 'paying', txHash, relayedVia: '1shot' })
    }
  }

  return NextResponse.json({ ok: true })
}
