'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const barRef = useRef<HTMLDivElement>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const crawlTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    // Reset bar instantly (no transition)
    bar.style.transition = 'none'
    bar.style.width = '0%'
    bar.style.opacity = '1'

    // Start animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Shoot to 60% fast
        bar.style.transition = 'width 350ms ease-out'
        bar.style.width = '60%'

        // Crawl slowly to 85%
        crawlTimerRef.current = setTimeout(() => {
          bar.style.transition = 'width 4000ms ease-out'
          bar.style.width = '85%'
        }, 350)
      })
    })

    return () => {
      clearTimeout(crawlTimerRef.current)
      clearTimeout(completeTimerRef.current)

      // Complete: shoot to 100%
      bar.style.transition = 'width 150ms ease-out'
      bar.style.width = '100%'

      // Then fade out
      completeTimerRef.current = setTimeout(() => {
        bar.style.transition = 'opacity 250ms ease-out'
        bar.style.opacity = '0'

        // Reset for next navigation
        setTimeout(() => {
          bar.style.transition = 'none'
          bar.style.width = '0%'
          bar.style.opacity = '1'
        }, 250)
      }, 150)
    }
  }, [pathname, searchParams])

  return (
    <>
      {/* Thin top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
        <div
          ref={barRef}
          className="h-full bg-green-500 rounded-r-full"
          style={{
            width: '0%',
            boxShadow: '0 0 10px rgba(34, 197, 94, 0.7), 0 0 4px rgba(34, 197, 94, 0.5)',
          }}
        />
      </div>
    </>
  )
}