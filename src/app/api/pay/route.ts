import { NextRequest, NextResponse } from 'next/server'
import { Activity, PermissionContext } from '@/lib/types'
import { buildTransferCall, trackSpend } from '@/lib/delegation'
import { getFeeData, relay, getStatus } from '@/lib/oneshot'
import { publish } from '@/lib/store'

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`
const X402_FACILITATOR = '0xD3ebF3386Da80bCf26E3dbE3cF4F42332BBbccEB' as `0x${string}`
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453', 10) || 8453
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
const IS_LOCAL = APP_URL.includes('localhost')

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

async function pollForConfirmation(
  taskId: string,
  activityId: string,
  maxAttempts = 40,
): Promise<string | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const s = await getStatus(taskId)
    if (s.status === 'confirmed') {
      publish({ type: 'payment_update', activityId, status: 'confirmed', txHash: s.txHash, relayedVia: '1shot' })
      return s.txHash
    }
    if (s.status === 'failed') {
      publish({ type: 'payment_update', activityId, status: 'failed' })
      return undefined
    }
    // Surface txHash early when submitted (status 110)
    if (s.status === 'submitted' && s.txHash) {
      publish({ type: 'payment_update', activityId, status: 'paying', txHash: s.txHash, relayedVia: '1shot' })
    }
  }
  console.log('[pay] poll timed out for taskId:', taskId)
  publish({ type: 'payment_update', activityId, status: 'failed' })
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
      // Webhook works on deployed URL; on localhost we fall back to polling below
      destinationUrl: IS_LOCAL ? undefined : `${APP_URL}/api/status?activityId=${activity.id}`,
    })

    console.log('[pay] relay submitted, taskId:', relayResult.id)
    trackSpend(permissionContext.accountAddress, activity.costUsdc, permissionContext.expiryTimestamp)

    const serviceEndpointUrl = `${APP_URL}${endpoint}`

    if (IS_LOCAL) {
      // Localhost: webhook unreachable — poll in background and publish SSE when done
      pollForConfirmation(relayResult.id, activity.id).then((txHash) => {
        if (txHash) {
          fetch(serviceEndpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Payment': relayResult.id },
          }).then(async (r) => {
            const d = r.ok ? await r.json() : { access: `TOKEN-${Date.now()}` }
            console.log('[pay] service responded:', d)
          }).catch((e) => console.warn('[pay] service call failed:', e))
        }
      })
    } else {
      // Deployed: webhook handles confirmation — fire service call now
      fetch(serviceEndpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Payment': relayResult.id },
      }).then(async (r) => {
        const d = r.ok ? await r.json() : { access: `TOKEN-${Date.now()}` }
        console.log('[pay] service responded:', d)
      }).catch((e) => console.warn('[pay] service call failed:', e))
    }

    return NextResponse.json({ success: true, relay: relayResult })
  } catch (err) {
    console.error('[pay] error:', err)
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
