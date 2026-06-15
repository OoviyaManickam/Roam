'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AgentFeed } from '@/components/AgentFeed'
import { PaymentTimeline } from '@/components/PaymentTimeline'
import { BudgetBar } from '@/components/BudgetBar'
import { PermissionTimer } from '@/components/PermissionTimer'
import {
  UserPreferences,
  PermissionContext,
  Activity,
  PaymentStatus,
  SSEEvent,
} from '@/lib/types'

export default function RoamPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [permission, setPermission] = useState<PermissionContext | null>(null)
  const [agentText, setAgentText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [statuses, setStatuses] = useState<Record<string, PaymentStatus>>({})
  const [txHashes, setTxHashes] = useState<Record<string, string>>({})
  const [spent, setSpent] = useState(0)

  const paymentQueue = useRef<Activity[]>([])
  const isPaying = useRef(false)
  const permissionRef = useRef<PermissionContext | null>(null)
  const activitiesRef = useRef<Activity[]>([])

  // Load from sessionStorage
  useEffect(() => {
    const p = sessionStorage.getItem('roam_prefs')
    const ctx = sessionStorage.getItem('roam_permission')
    if (!p || !ctx) {
      router.push('/')
      return
    }
    const parsedPrefs = JSON.parse(p) as UserPreferences
    const parsedCtx = JSON.parse(ctx) as PermissionContext
    setPrefs(parsedPrefs)
    setPermission(parsedCtx)
    permissionRef.current = parsedCtx
  }, [router])

  // Subscribe to SSE stream
  useEffect(() => {
    const es = new EventSource('/api/stream')

    es.onmessage = (e) => {
      const event: SSEEvent = JSON.parse(e.data)

      if (event.type === 'agent_chunk' && event.chunk) {
        setAgentText((t) => t + event.chunk)
      }

      if (event.type === 'itinerary_ready' && event.itinerary) {
        setIsStreaming(false)
        const acts = event.itinerary.activities
        setActivities(acts)
        activitiesRef.current = acts
        acts.forEach((a) =>
          setStatuses((s) => ({ ...s, [a.id]: 'pending' }))
        )
        paymentQueue.current = [...acts]
        processNextPayment()
      }

      if (event.type === 'payment_update') {
        setStatuses((s) => ({ ...s, [event.activityId]: event.status }))
        if (event.txHash) {
          setTxHashes((h) => ({ ...h, [event.activityId]: event.txHash! }))
        }
        if (event.status === 'confirmed' || event.status === 'failed') {
          if (event.status === 'confirmed') {
            const activity = activitiesRef.current.find((a) => a.id === event.activityId)
            if (activity) setSpent((s) => s + activity.costUsdc)
          }
          isPaying.current = false
          processNextPayment()
        }
      }
    }

    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start Venice agent once prefs are loaded
  useEffect(() => {
    if (!prefs) return
    setIsStreaming(true)
    fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
  }, [prefs])

  async function processNextPayment() {
    if (isPaying.current || paymentQueue.current.length === 0) return
    const ctx = permissionRef.current
    if (!ctx) return

    const next = paymentQueue.current.shift()!
    isPaying.current = true

    await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity: next, permissionContext: ctx }),
    })
  }

  if (!prefs || !permission) return null

  return (
    <div className="relative w-full overflow-hidden bg-white" style={{ height: '100vh' }}>
      {/* Video background */}
      <video
        autoPlay muted playsInline loop
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.3) 100%)', zIndex: 1 }} />

      <div className="relative flex flex-col h-full" style={{ zIndex: 10 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', letterSpacing: '-0.03em' }} className="font-normal">
              Roam<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>®</sup>
            </h1>
            <p className="text-stone-500 text-sm">📍 {prefs.city}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-emerald-600 font-medium">● Permission Active</div>
            <div className="text-xs text-stone-400">expires {prefs.endTime}</div>
          </div>
        </div>

        {/* Budget + Timer — side by side, half each */}
        <div className="px-8 flex gap-4 flex-shrink-0">
          <div className="flex-1">
            <BudgetBar spent={spent} total={prefs.budgetUsdc} />
          </div>
          <div className="flex-1">
            <PermissionTimer endTime={prefs.endTime} />
          </div>
        </div>

        {/* Main content — agent feed left, payment timeline right */}
        <div className="flex gap-4 px-8 py-4 flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            <AgentFeed text={agentText} isStreaming={isStreaming} />
          </div>
          <div className="w-72 flex-shrink-0 min-h-0">
            <PaymentTimeline activities={activities} statuses={statuses} txHashes={txHashes} />
          </div>
        </div>
      </div>
    </div>
  )
}
