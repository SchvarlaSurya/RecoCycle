'use client'

import { useState, useEffect, useRef } from 'react'

export function useChatToggle() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const toggle = () => {
    setIsAnimating(true)
    setIsOpen(prev => !prev)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const open = () => {
    if (!isOpen) {
      setIsAnimating(true)
      setIsOpen(true)
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  const close = () => {
    if (isOpen) {
      setIsAnimating(true)
      setIsOpen(false)
      setTimeout(() => setIsAnimating(false), 200)
    }
  }

  return { isOpen, isAnimating, toggle, open, close }
}