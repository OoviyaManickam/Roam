'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useRouter } from 'next/navigation'

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)
  const { isConnected } = useAccount()
  const { connect } = useConnect()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Redirect to form if already connected
  useEffect(() => {
    if (mounted && isConnected) router.push('/onboarding')
  }, [mounted, isConnected, router])

  // Looping video with fade in/out
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const FADE = 0.5

    function tick() {
      if (!video) return
      const t = video.currentTime
      const d = video.duration || 1
      if (t < FADE) {
        video.style.opacity = String(t / FADE)
      } else if (t > d - FADE) {
        video.style.opacity = String((d - t) / FADE)
      } else {
        video.style.opacity = '1'
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    function onEnded() {
      if (!video) return
      video.style.opacity = '0'
      setTimeout(() => {
        if (!video) return
        video.currentTime = 0
        video.play()
      }, 100)
    }

    video.addEventListener('ended', onEnded)
    video.play().catch(() => {})
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  function handleConnect() {
    if (isConnected) {
      router.push('/onboarding')
    } else {
      connect({ connector: injected() })
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Video background */}
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
        muted
        playsInline
        className="absolute left-0 right-0 bottom-0 w-full h-auto object-cover"
        style={{ top: '300px', opacity: 0 }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" style={{ zIndex: 1 }} />

      {/* Nav */}
      <nav className="relative flex justify-between items-center px-8 py-6 max-w-7xl mx-auto" style={{ zIndex: 10 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', letterSpacing: '-0.03em', color: '#000' }}>
          Roam<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>®</sup>
        </span>
        <button
          onClick={handleConnect}
          className="rounded-full px-6 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03]"
          style={{ background: '#000', color: '#fff' }}
        >
          {mounted && isConnected ? 'Enter Roam →' : 'Connect Wallet'}
        </button>
      </nav>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 pb-40"
        style={{ paddingTop: 'calc(8rem - 75px)', zIndex: 10 }}
      >
        <h1
          className="font-normal max-w-4xl"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(4rem, 10vw, 7rem)',
            lineHeight: 0.95,
            letterSpacing: '-2.46px',
            color: '#000',
            animation: 'fadeRise 0.8s ease-out both',
          }}
        >
          Roam
        </h1>

        <p
          className="text-base sm:text-lg max-w-xl mt-6 leading-relaxed"
          style={{
            color: '#6F6F6F',
            animation: 'fadeRise 0.8s ease-out 0.2s both',
          }}
        >
          Set your vibe. Sign once. Just roam.
        </p>

        <button
          onClick={handleConnect}
          className="rounded-full text-base font-medium mt-12 transition-transform hover:scale-[1.03]"
          style={{
            padding: '1.25rem 3.5rem',
            background: '#000',
            color: '#fff',
            animation: 'fadeRise 0.8s ease-out 0.4s both',
          }}
        >
          {mounted && isConnected ? 'Enter Roam →' : 'Begin Journey'}
        </button>
      </section>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
