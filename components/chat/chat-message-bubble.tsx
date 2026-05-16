'use client'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/useChat'

interface ChatMessageBubbleProps {
  message: ChatMessage
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  })
}

function formatDateSeparator(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Hari ini'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Kemarin'
  } else {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    })
  }
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender_role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-green-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        )}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-medium text-slate-500">{message.sender_name}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'mt-1 text-xs',
            isUser ? 'text-green-200' : 'text-slate-400'
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

export function DateSeparator({ dateString }: { dateString: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400">{formatDateSeparator(dateString)}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}