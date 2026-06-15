'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { Activity, PaymentStatus } from '@/lib/types'

interface Props {
  activities: Activity[]
  statuses: Record<string, PaymentStatus>
  txHashes: Record<string, string>
}

const STATUS_CONFIG: Record<PaymentStatus, { color: string; dot: string; label: string }> = {
  pending:   { color: 'border-stone-200 bg-stone-50',   dot: 'bg-stone-300',          label: 'Scheduled' },
  paying:    { color: 'border-stone-300 bg-stone-100',  dot: 'bg-black animate-pulse', label: 'Paying via 1Shot...' },
  confirmed: { color: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500',       label: 'Paid ✓' },
  failed:    { color: 'border-red-200 bg-red-50',       dot: 'bg-red-500',             label: 'Failed' },
}

function DownloadItinerary({ activities, statuses, txHashes }: Props) {
  // Hidden QR canvases — one per confirmed activity
  const qrRefs = useRef<Record<string, HTMLCanvasElement | null>>({})

  function download() {
    const canvas = document.createElement('canvas')
    const scale = 2
    const W = 600
    const rowH = 110
    const qrSize = 72
    const confirmedCount = activities.filter(a => statuses[a.id] === 'confirmed').length
    const H = 100 + activities.length * rowH + (confirmedCount > 0 ? 20 : 0)
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    // Header
    ctx.fillStyle = '#1c1917'
    ctx.font = 'bold 22px Georgia, serif'
    ctx.fillText('Roam® — Your Itinerary', 32, 44)
    ctx.fillStyle = '#78716c'
    ctx.font = '11px sans-serif'
    ctx.fillText(`Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 32, 62)

    // Divider
    ctx.fillStyle = '#e7e5e4'
    ctx.fillRect(32, 74, W - 64, 1)

    // Activities
    activities.forEach((activity, i) => {
      const status = statuses[activity.id] ?? 'pending'
      const txHash = txHashes[activity.id]
      const y = 90 + i * rowH

      // Dot
      ctx.beginPath()
      ctx.arc(44, y + 16, 5, 0, Math.PI * 2)
      ctx.fillStyle = status === 'confirmed' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#d6d3d1'
      ctx.fill()

      // Name
      ctx.fillStyle = '#1c1917'
      ctx.font = 'bold 13px sans-serif'
      ctx.fillText(activity.name, 60, y + 18)

      // Description
      ctx.fillStyle = '#78716c'
      ctx.font = '11px sans-serif'
      ctx.fillText(activity.description.slice(0, 55) + (activity.description.length > 55 ? '…' : ''), 60, y + 34)

      // Time + cost
      ctx.fillStyle = '#a8a29e'
      ctx.font = '10px monospace'
      ctx.fillText(`${activity.time}  ·  $${activity.costUsdc.toFixed(2)} USDC  ·  ${status === 'confirmed' ? 'Paid ✓' : status}`, 60, y + 50)

      // TX hash
      if (txHash) {
        ctx.fillStyle = '#a8a29e'
        ctx.font = '9px monospace'
        ctx.fillText(`tx: ${txHash.slice(0, 28)}…${txHash.slice(-8)}`, 60, y + 65)
      }

      // QR code from hidden canvas
      if (txHash && qrRefs.current[activity.id]) {
        const qrCanvas = qrRefs.current[activity.id]!
        ctx.drawImage(qrCanvas, W - qrSize - 32, y + 4, qrSize, qrSize)
      }

      // Row divider
      ctx.fillStyle = '#f5f5f4'
      ctx.fillRect(32, y + rowH - 8, W - 64, 1)
    })

    // Footer
    ctx.fillStyle = '#d6d3d1'
    ctx.font = '9px sans-serif'
    ctx.fillText('Powered by Roam · 1Shot · Base Sepolia', 32, H - 14)

    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'roam-itinerary.png'
    a.click()
  }

  return (
    <>
      {/* Hidden QR canvases */}
      <div className="hidden">
        {activities.filter(a => txHashes[a.id]).map(a => (
          <QRCodeCanvas
            key={a.id}
            value={`https://basescan.org/tx/${txHashes[a.id]}`}
            size={72}
            bgColor="#ffffff"
            fgColor="#1c1917"
            ref={(el: HTMLCanvasElement | null) => { qrRefs.current[a.id] = el }}
          />
        ))}
      </div>
      <button
        onClick={download}
        className="w-full mt-3 py-2.5 rounded-xl border border-stone-300 text-stone-600 text-xs font-medium hover:bg-stone-900 hover:text-white hover:border-stone-900 transition-all"
      >
        ↓ Download Itinerary
      </button>
    </>
  )
}

export function PaymentTimeline({ activities, statuses, txHashes }: Props) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <h3 className="text-xs text-stone-400 uppercase tracking-wider mb-3 flex-shrink-0">Your day</h3>
      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {activities.map((activity) => {
          const status = statuses[activity.id] ?? 'pending'
          const cfg = STATUS_CONFIG[status]
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-2xl p-4 transition-all duration-500 ${cfg.color}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <p className="text-black font-medium text-sm">{activity.name}</p>
                    <p className="text-stone-500 text-xs mt-0.5">{activity.description}</p>
                    <p className="text-stone-400 text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-black text-sm font-semibold">${activity.costUsdc.toFixed(2)}</p>
                  <p className={`text-xs mt-0.5 ${status === 'confirmed' ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {cfg.label}
                  </p>
                  {status === 'confirmed' && (
                    <p className="text-xs text-stone-400 mt-1">⚡ via 1Shot</p>
                  )}
                </div>
              </div>
              {status === 'confirmed' && (
                <div className="mt-2 space-y-1">
                  {txHashes[activity.id] ? (
                    <>
                      <p className="text-xs text-stone-300 font-mono truncate">
                        tx: {txHashes[activity.id].slice(0, 14)}…{txHashes[activity.id].slice(-6)}
                      </p>
                      <a
                        href={`https://basescan.org/tx/${txHashes[activity.id]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors"
                      >
                        View on Basescan ↗
                      </a>
                    </>
                  ) : (
                    <p className="text-[10px] text-stone-300 animate-pulse">Fetching tx hash…</p>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Download button — shown once at least one activity exists */}
      {activities.length > 0 && (
        <div className="flex-shrink-0">
          <DownloadItinerary activities={activities} statuses={statuses} txHashes={txHashes} />
        </div>
      )}
    </div>
  )
}
