'use client'

import { useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { PermissionGrant } from './PermissionGrant'
import { UserPreferences, Vibe, PermissionContext } from '@/lib/types'
import { useRouter } from 'next/navigation'

const VIBES: { id: Vibe; label: string; emoji: string }[] = [
  { id: 'street-food', label: 'Street Food', emoji: '🍜' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'live-music', label: 'Live Music', emoji: '🎵' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'markets', label: 'Markets', emoji: '🛍️' },
]

export function OnboardingForm() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const [city, setCity] = useState('')
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [budget, setBudget] = useState('5')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('20:00')
  const [step, setStep] = useState<'form' | 'permission'>('form')

  const prefs: UserPreferences = {
    city,
    vibes,
    budgetUsdc: parseFloat(budget),
    startTime,
    endTime,
    walletAddress: address ?? '',
  }

  function toggleVibe(v: Vibe) {
    setVibes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )
  }

  function handlePermissionGranted(ctx: PermissionContext) {
    sessionStorage.setItem('roam_prefs', JSON.stringify(prefs))
    sessionStorage.setItem('roam_permission', JSON.stringify(ctx))
    router.push('/roam')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2">Roam</h1>
          <p className="text-violet-400 text-lg">Set your vibe. Sign once. Just roam.</p>
        </div>

        {step === 'form' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Where are you?</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bangalore, Koramangala"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-3">Your vibes today</label>
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggleVibe(v.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      vibes.includes(v.id)
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-violet-500'
                    }`}
                  >
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Budget —{' '}
                <span className="text-violet-400">${budget} USDC</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>$1</span>
                <span>$10</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                className="w-full py-4 bg-gray-900 border border-gray-800 hover:border-violet-500 text-white rounded-2xl font-medium transition-all"
              >
                Connect MetaMask
              </button>
            ) : (
              <button
                onClick={() => setStep('permission')}
                disabled={!city || vibes.length === 0}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all"
              >
                Continue →
              </button>
            )}

            {isConnected && (
              <p className="text-center text-xs text-gray-600">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            )}
          </div>
        )}

        {step === 'permission' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-white">Your day plan</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>📍 {city}</p>
                <p>🎯 {vibes.join(', ')}</p>
                <p>💰 ${budget} USDC budget</p>
                <p>⏰ {startTime} → {endTime}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              Grant Roam a one-time permission to spend up to ${budget} USDC on your behalf
              today. Permission expires at {endTime}.
            </p>
            <PermissionGrant prefs={prefs} onGranted={handlePermissionGranted} />
            <button
              onClick={() => setStep('form')}
              className="w-full py-2 text-gray-600 hover:text-gray-400 text-sm transition-all"
            >
              ← Edit preferences
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
