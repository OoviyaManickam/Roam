'use client'

import { useState, useEffect, useRef } from 'react'
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
  { id: 'rooftop-bars', label: 'Rooftop Bars', emoji: '🍸' },
  { id: 'nature-walks', label: 'Nature Walks', emoji: '🌿' },
  { id: 'bookshops', label: 'Bookshops', emoji: '📚' },
  { id: 'museums', label: 'Museums', emoji: '🏛️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'brunch', label: 'Brunch', emoji: '🥞' },
]

const TIME_PRESETS: { label: string; start: string; end: string }[] = [
  { label: 'Morning', start: '07:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '17:00' },
  { label: 'Evening', start: '17:00', end: '22:00' },
  { label: 'Full Day', start: '09:00', end: '21:00' },
]

export function OnboardingForm() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const [mounted, setMounted] = useState(false)
  const [city, setCity] = useState('')
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [budget, setBudget] = useState('5')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('20:00')
  const [step, setStep] = useState<'form' | 'permission'>('form')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Video background loop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [mounted])

  if (!mounted) return null

  const prefs: UserPreferences = {
    city, vibes,
    budgetUsdc: parseFloat(budget),
    startTime, endTime,
    walletAddress: address ?? '',
  }

  function toggleVibe(v: Vibe) {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }

  function handlePermissionGranted(ctx: PermissionContext) {
    sessionStorage.setItem('roam_prefs', JSON.stringify(prefs))
    sessionStorage.setItem('roam_permission', JSON.stringify(ctx))
    router.push('/roam')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white flex flex-col">
      {/* Full-page video background */}
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 1 }}
      />
      {/* White overlay — heavier at top for legibility, fades out toward bottom so video shows */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.3) 100%)', zIndex: 1 }} />

      {/* Nav */}
      <nav className="relative flex justify-between items-center px-8 py-3 max-w-7xl mx-auto w-full" style={{ zIndex: 10 }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', letterSpacing: '-0.03em', color: '#000', textDecoration: 'none' }}>
          Roam<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>®</sup>
        </a>
        {isConnected && (
          <span className="text-xs text-stone-400 font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        )}
      </nav>

      {/* Centered form area */}
      <div className="relative flex-1 flex items-center justify-center px-6 pb-4" style={{ zIndex: 10 }}>
        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-2">Plan your day</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 6vw, 2.8rem)', lineHeight: 1.1, letterSpacing: '-0.03em' }} className="font-normal text-black">
              {step === 'form' ? 'Where are you roaming?' : 'Ready to roam?'}
            </h2>
          </div>

          {step === 'form' && (
            <div className="space-y-5">

              {/* City */}
              <div className="border-b-2 border-stone-800 pb-1">
                <label className="block text-[11px] uppercase tracking-[0.15em] text-stone-600 mb-2">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York, Manhattan…"
                  className="w-full bg-transparent text-stone-900 text-lg placeholder-stone-400 focus:outline-none font-medium"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
              </div>

              {/* Vibes */}
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-stone-600 mb-3">Today&apos;s vibe</label>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => toggleVibe(v.id)}
                      className={`px-3.5 py-1.5 rounded-full text-sm transition-all border font-medium ${
                        vibes.includes(v.id)
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white/80 text-stone-700 border-stone-400 hover:border-stone-700 hover:text-stone-900'
                      }`}
                    >
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-[11px] uppercase tracking-[0.15em] text-stone-600">Budget</label>
                  <div className="flex items-baseline gap-1">
                    <span className="text-stone-500 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-16 bg-transparent text-2xl font-normal text-stone-900 focus:outline-none text-right"
                      style={{ fontFamily: 'Georgia, serif' }}
                    />
                    <span className="text-sm text-stone-500">USDC</span>
                  </div>
                </div>
                <input
                  type="range" min="1" max="20" step="0.5"
                  value={Math.min(parseFloat(budget) || 1, 20)}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full accent-stone-900"
                  style={{ cursor: 'pointer' }}
                />
                <div className="flex justify-between text-[11px] text-stone-400 mt-1">
                  <span>$1</span><span>$20+</span>
                </div>
              </div>

              {/* Time window — presets */}
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-stone-600 mb-3">Time window</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {TIME_PRESETS.map((t) => {
                    const active = startTime === t.start && endTime === t.end
                    return (
                      <button
                        key={t.label}
                        onClick={() => { setStartTime(t.start); setEndTime(t.end) }}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          active
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white/80 text-stone-700 border-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {t.label}
                        <span className={`block text-[10px] mt-0.5 ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                          {t.start} → {t.end}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {/* Custom override still available but subtle */}
                <div className="flex items-center gap-3">
                  <input
                    type="time" value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 bg-white/60 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-stone-700 transition-colors"
                  />
                  <span className="text-stone-400 text-sm">→</span>
                  <input
                    type="time" value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 bg-white/60 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-stone-700 transition-colors"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="pt-1">
                {!isConnected ? (
                  <button
                    onClick={() => connect({ connector: injected() })}
                    className="w-full py-4 rounded-full border-2 border-stone-700 hover:bg-stone-900 hover:text-white text-stone-900 text-sm font-semibold transition-all"
                  >
                    Connect MetaMask
                  </button>
                ) : (
                  <button
                    onClick={() => setStep('permission')}
                    disabled={!city || vibes.length === 0}
                    className="w-full py-4 rounded-full bg-stone-900 hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                  >
                    Continue →
                  </button>
                )}
              </div>

            </div>
          )}

          {step === 'permission' && (
            <div className="space-y-6">
              {/* Summary card */}
              <div className="rounded-2xl border border-stone-100 bg-white/70 backdrop-blur-sm p-6 space-y-4">
                <p className="text-[11px] uppercase tracking-[0.15em] text-stone-400">Your plan</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">City</span>
                    <span className="text-black font-medium">{city}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Vibes</span>
                    <span className="text-black font-medium text-right max-w-[60%]">{vibes.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Budget</span>
                    <span className="text-black font-medium">${budget} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Window</span>
                    <span className="text-black font-medium">{startTime} → {endTime}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-400 text-center leading-relaxed">
                One permission. Roam pays each stop autonomously,<br />within your budget, until {endTime}.
              </p>

              <PermissionGrant prefs={prefs} onGranted={handlePermissionGranted} />

              <button
                onClick={() => setStep('form')}
                className="w-full py-2 text-stone-400 hover:text-black text-xs tracking-wide transition-all"
              >
                ← Edit preferences
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
