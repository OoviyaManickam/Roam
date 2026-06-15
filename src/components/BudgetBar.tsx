'use client'

import { motion } from 'framer-motion'

interface Props {
  spent: number
  total: number
}

export function BudgetBar({ spent, total }: Props) {
  const pct = Math.min((spent / total) * 100, 100)
  const remaining = Math.max(total - spent, 0)

  return (
    <div className="bg-stone-50/80 backdrop-blur-sm border border-stone-200 rounded-2xl px-4 py-3 space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-stone-500 uppercase tracking-wider text-[10px]">Budget</span>
        <span className="font-semibold text-stone-900">
          <span className="text-emerald-600">${spent.toFixed(2)}</span>
          <span className="text-stone-400"> / ${total.toFixed(2)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : 'bg-emerald-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-[10px] text-stone-400">${remaining.toFixed(2)} remaining</p>
    </div>
  )
}
