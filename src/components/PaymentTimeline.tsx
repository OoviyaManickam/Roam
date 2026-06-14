'use client'

import { motion } from 'framer-motion'
import { Activity, PaymentStatus } from '@/lib/types'

interface Props {
  activities: Activity[]
  statuses: Record<string, PaymentStatus>
  txHashes: Record<string, string>
}

const STATUS_CONFIG: Record<PaymentStatus, { color: string; dot: string; label: string }> = {
  pending: {
    color: 'border-gray-800 bg-gray-900',
    dot: 'bg-gray-600',
    label: 'Scheduled',
  },
  paying: {
    color: 'border-violet-800 bg-violet-950',
    dot: 'bg-violet-500 animate-pulse',
    label: 'Paying via 1Shot...',
  },
  confirmed: {
    color: 'border-emerald-800 bg-emerald-950',
    dot: 'bg-emerald-500',
    label: 'Paid ✓',
  },
  failed: {
    color: 'border-red-800 bg-red-950',
    dot: 'bg-red-500',
    label: 'Failed',
  },
}

export function PaymentTimeline({ activities, statuses, txHashes }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm text-gray-500 uppercase tracking-wider">Your day</h3>
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
                  <p className="text-white font-medium text-sm">{activity.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{activity.description}</p>
                  <p className="text-gray-600 text-xs mt-1">{activity.time}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white text-sm font-semibold">
                  ${activity.costUsdc.toFixed(2)}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    status === 'confirmed' ? 'text-emerald-400' : 'text-gray-600'
                  }`}
                >
                  {cfg.label}
                </p>
                {status === 'confirmed' && (
                  <p className="text-xs text-violet-400 mt-1">⚡ via 1Shot</p>
                )}
              </div>
            </div>
            {txHashes[activity.id] && (
              <p className="text-xs text-gray-700 mt-2 font-mono truncate">
                tx: {txHashes[activity.id]}
              </p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
