'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Props {
  endTime: string // "HH:MM"
}

export function PermissionTimer({ endTime }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [justExpired, setJustExpired] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function calc() {
      const now = new Date()
      const [h, m] = endTime.split(':').map(Number)
      const expiry = new Date()
      expiry.setHours(h, m, 0, 0)
      const secs = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000))
      setSecondsLeft(prev => {
        if (prev > 0 && secs === 0) setJustExpired(true)
        return secs
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endTime])

  const totalSeconds = (() => {
    const [h, m] = endTime.split(':').map(Number)
    const expiry = new Date(); expiry.setHours(h, m, 0, 0)
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return Math.floor((expiry.getTime() - start.getTime()) / 1000)
  })()

  const pct = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100))
  const hrs = Math.floor(secondsLeft / 3600)
  const mins = Math.floor((secondsLeft % 3600) / 60)
  const secs = secondsLeft % 60
  const display = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const expired = secondsLeft === 0

  return (
    <>
      {/* Expiry toast — flashes when permission just hit zero */}
      <AnimatePresence>
        {justExpired && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3"
          >
            <span>🔒 Permission revoked — your Roam session has ended</span>
            <button
              onClick={() => { setJustExpired(false); router.push('/onboarding') }}
              className="text-xs underline underline-offset-2 text-stone-300 hover:text-white transition-colors"
            >
              Re-grant →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`backdrop-blur-sm border rounded-2xl px-4 py-3 transition-all duration-500 ${
        expired ? 'bg-red-50/80 border-red-200' : 'bg-stone-50/80 border-stone-200'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-stone-500 uppercase tracking-wider text-[10px]">Permission</span>
          {expired ? (
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-xs font-semibold">Revoked</span>
              <button
                onClick={() => router.push('/onboarding')}
                className="text-[10px] px-2 py-0.5 rounded border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              >
                Re-grant
              </button>
            </div>
          ) : (
            <span className={`font-mono font-bold text-lg tabular-nums ${pct < 20 ? 'text-red-500' : 'text-stone-800'}`}>
              {display}
            </span>
          )}
        </div>
        <p className="text-[10px] text-stone-400 mt-1">{expired ? 'Permission has expired' : `expires ${endTime}`}</p>
      </div>
    </>
  )
}
