import { NextRequest, NextResponse } from 'next/server'
import { Activity, PermissionContext } from '@/lib/types'
import { buildTransferCall, trackSpend } from '@/lib/delegation'
import { getFeeData, relay, getStatus } from '@/lib/oneshot'
import { publish } from '@/lib/store'

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`
const X402_FACILITATOR = '0xD3ebF3386Da80bCf26E3dbE3cF4F42332BBbccEB' as `0x${string}`
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532', 10) || 84532
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

const categoryToEndpoint: Record<string, string> = {
  'street-food': '/api/services/food',
  'coffee': '/api/services/coffee',
  'live-music': '/api/services/music',
  'food': '/api/services/food',
  'music': '/api/services/music',
}

interface PayRequest {
  activity: Activity
  permissionContext: PermissionContext
}

async function pollForTxHash(taskId: string, maxAttempts = 15): Promise<string | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const status = await getStatus(taskId)
    if (status.txHash) return status.txHash
    if (status.status === 'failed') return undefined
  }
  return undefined
}

export async function POST(req: NextRequest) {
  const { activity, permissionContext }: PayRequest = await req.json()

  if (Date.now() / 1000 > permissionContext.expiryTimestamp) {
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: 'Permission expired' }, { status: 400 })
  }

  publish({ type: 'payment_update', activityId: activity.id, status: 'paying' })

  try {
    const feeData = await getFeeData(CHAIN_ID, USDC_ADDRESS)
    const call = buildTransferCall(USDC_ADDRESS, X402_FACILITATOR, activity.costUsdc)
    const endpoint = categoryToEndpoint[activity.category] ?? activity.serviceEndpoint

    const relayResult = await relay({
      chainId: CHAIN_ID,
      from: permissionContext.accountAddress,
      calls: [call],
      delegation: '',
      permissionsContext: permissionContext.permissionsContext,
      feeToken: feeData.feeToken,
      feeQuote: feeData.quote,
      webhookUrl: `${APP_URL}/api/status?activityId=${activity.id}`,
    })

    console.log('[pay] relay submitted, taskId:', relayResult.id)

    // Poll for confirmation
    const txHash = await pollForTxHash(relayResult.id)
    console.log('[pay] txHash:', txHash)

    trackSpend(permissionContext.accountAddress, activity.costUsdc, permissionContext.expiryTimestamp)

    const serviceRes = await fetch(`${APP_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': relayResult.id,
      },
    })

    const serviceData = serviceRes.ok ? await serviceRes.json() : { access: `TOKEN-${Date.now()}` }

    publish({
      type: 'payment_update',
      activityId: activity.id,
      status: 'confirmed',
      txHash,
      accessToken: serviceData.access,
      relayedVia: '1shot',
    })

    return NextResponse.json({ success: true, relay: relayResult, txHash, service: serviceData })
  } catch (err) {
    console.error('[pay] error:', err)
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
