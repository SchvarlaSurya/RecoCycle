'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import type { ChatMessage } from '@/hooks/useChat'
import { ChatMessageBubble, DateSeparator } from './chat-message-bubble'
import { TypingDots } from './typing-dots'
import { cn } from '@/lib/utils'

interface ChatMessagesListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  isTyping?: boolean
}

function shouldShowDateSeparator(current: ChatMessage, previous: ChatMessage | null): boolean {
  if (!previous) return true
  const currentDate = new Date(current.created_at).toDateString()
  const previousDate = new Date(previous.created_at).toDateString()
  return currentDate !== previousDate
}

export function ChatMessagesList({ messages, isLoading, isTyping }: ChatMessagesListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 flex items-center justify-center">
        <div className="text-center">
          <div className="h-7 w-7 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-slate-500">Memuat pesan...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 sm:h-14 sm:w-14 text-green-200 mx-auto mb-3" />
          <h4 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">Halo! 👋</h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-[220px] sm:max-w-[250px] mx-auto">
            Ada yang bisa kami bantu? Kirim pesan dan tim kami akan segera membalas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 sm:space-y-3">
      {messages.map((message, index) => {
        const previousMessage = index > 0 ? messages[index - 1] : null
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage)

        return (
          <div key={message.id}>
            {showDateSeparator && <DateSeparator dateString={message.created_at} />}
            <ChatMessageBubble message={message} />
          </div>
        )
      })}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
            <TypingDots />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}