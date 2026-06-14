import { NextRequest, NextResponse } from 'next/server'
import { Activity, PermissionContext } from '@/lib/types'
import { buildTransferCall, trackSpend, isBudgetExceeded } from '@/lib/delegation'
import { getFeeData, relay } from '@/lib/oneshot'
import { publish } from '@/lib/store'

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`
const X402_FACILITATOR = '0xd3eBF3386dA80bCF26E3dBE3cF4f42332bbbcCEb' as `0x${string}`
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532', 10) || 84532
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

interface PayRequest {
  activity: Activity
  permissionContext: PermissionContext
}

export async function POST(req: NextRequest) {
  const { activity, permissionContext }: PayRequest = await req.json()

  if (isBudgetExceeded(permissionContext.accountAddress, activity.costUsdc, permissionContext.budgetUsdc)) {
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: 'Budget exceeded' }, { status: 400 })
  }

  if (Date.now() / 1000 > permissionContext.expiryTimestamp) {
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: 'Permission expired' }, { status: 400 })
  }

  publish({ type: 'payment_update', activityId: activity.id, status: 'paying' })

  try {
    const feeData = await getFeeData(CHAIN_ID, USDC_ADDRESS)
    const call = buildTransferCall(USDC_ADDRESS, X402_FACILITATOR, activity.costUsdc)

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

    trackSpend(permissionContext.accountAddress, activity.costUsdc)

    const serviceRes = await fetch(`${APP_URL}${activity.serviceEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': relayResult.id,
      },
    })

    const serviceData = await serviceRes.json()

    publish({
      type: 'payment_update',
      activityId: activity.id,
      status: 'confirmed',
      txHash: relayResult.txHash,
      accessToken: serviceData.access,
      relayedVia: '1shot',
    })

    return NextResponse.json({ success: true, relay: relayResult, service: serviceData })
  } catch (err) {
    console.error('[pay] error:', err)
    publish({ type: 'payment_update', activityId: activity.id, status: 'failed' })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
