'use client'

import { motion } from 'framer-motion'

interface Props {
  spent: number
  total: number
  endTime: string
}

export function BudgetBar({ spent, total, endTime }: Props) {
  const pct = Math.min((spent / total) * 100, 100)
  const remaining = Math.max(total - spent, 0)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Budget</span>
        <span className="text-white font-semibold">
          <span className="text-emerald-400">${spent.toFixed(2)}</span>
          <span className="text-gray-600"> / ${total.toFixed(2)} USDC</span>
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>${remaining.toFixed(2)} remaining</span>
        <span>Expires {endTime}</span>
      </div>
    </div>
  )
}
