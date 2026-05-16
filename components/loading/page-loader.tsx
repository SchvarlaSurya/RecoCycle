'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogoSpinner } from './logo-spinner'

interface PageLoaderProps {
  theme?: 'light' | 'dark'
}

export function PageLoader({ theme = 'light' }: PageLoaderProps) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const prevPathRef = useRef<string>(pathname)
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // Skip on first render
    if (prevPathRef.current === pathname) return
    prevPathRef.current = pathname

    clearTimeout(showTimerRef.current)
    clearTimeout(hideTimerRef.current)

    setExiting(false)
    showTimerRef.current = setTimeout(() => {
      setVisible(true)
    }, 0)

    // Auto-hide after 600ms
    hideTimerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setVisible(false)
        setExiting(false)
      }, 200)
    }, 600)

    return () => {
      clearTimeout(showTimerRef.current)
      clearTimeout(hideTimerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className={`
        fixed inset-0 z-[9998]
        flex flex-col items-center justify-center gap-6
        bg-white/95 backdrop-blur-sm
        ${exiting ? 'loader-exit' : 'loader-enter'}
      `}
    >
      {/* Animated RecoCycle logo */}
      <LogoSpinner size={96} theme={theme} />

      {/* Brand text */}
      <div
        className="flex flex-col items-center gap-1.5"
        style={{ animation: 'loader-fade-in 300ms ease-out 100ms both' }}
      >
        <span className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          RecoCycle
        </span>
        <span className={`text-[11px] font-semibold tracking-[0.25em] uppercase ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
          Circular Waste Mobility
        </span>
      </div>

      {/* Bouncing dots */}
      <div
        className="flex items-center gap-1.5"
        style={{ animation: 'loader-fade-in 300ms ease-out 200ms both' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{
              animation: `bounce-dot 1.2s ease-in-out ${i * 200}ms infinite`,
            }}
          />
        ))}
      </div>

      {/* Bottom tagline */}
      <p
        className={`absolute bottom-10 text-sm tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}
        style={{ animation: 'loader-fade-in 400ms ease-out 300ms both' }}
      >
        Bersama, kita wujudkan Indonesia bebas sampah.
      </p>
    </div>
  )
}