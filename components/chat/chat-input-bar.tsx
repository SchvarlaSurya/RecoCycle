'use client'

import { useState, useRef, useEffect } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputBarProps {
  onSend: (message: string) => void
  disabled?: boolean
  isSending?: boolean
}

export function ChatInputBar({ onSend, disabled, isSending }: ChatInputBarProps) {
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled && !isProcessing && !isSending) {
      setIsProcessing(true)
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
      }
      // Reset processing state after a short delay
      setTimeout(() => setIsProcessing(false), 300)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-slate-100 bg-white rounded-b-2xl px-3 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan..."
          rows={1}
          disabled={disabled || isProcessing || isSending}
          className={cn(
            'flex-1 resize-none text-sm outline-none placeholder:text-slate-400',
            'bg-transparent border-none scrollbar-hide',
            (disabled || isProcessing || isSending) && 'opacity-50 cursor-not-allowed'
          )}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isProcessing || isSending}
          className={cn(
            'flex-shrink-0 rounded-xl p-2.5 transition-all duration-200',
            'bg-green-600 text-white',
            'hover:bg-green-700 hover:scale-105',
            'active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}