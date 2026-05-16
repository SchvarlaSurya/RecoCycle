'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatDropup } from './chat-dropup'
import type { ChatMessage } from '@/hooks/useChat'

interface ChatFabProps {
  isOpen: boolean
  onToggle: () => void
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  isSessionEnded?: boolean
  unreadCount: number
  onSend: (content: string) => void
  onClearUnread: () => void
}

export function ChatFab({
  isOpen,
  onToggle,
  messages,
  isLoading,
  isSending,
  isSessionEnded,
  unreadCount,
  onSend,
  onClearUnread
}: ChatFabProps) {
  useEffect(() => {
    if (isOpen) {
      onClearUnread()
    }
  }, [isOpen, onClearUnread])

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {isOpen && (
        <ChatDropup
          messages={messages}
          isLoading={isLoading}
          isSending={isSending}
          isSessionEnded={isSessionEnded}
          onSend={onSend}
          onClose={onToggle}
        />
      )}

      <button
        onClick={onToggle}
        className={cn(
          'w-14 h-14 rounded-full bg-green-600 shadow-lg shadow-green-900/30',
          'flex items-center justify-center',
          'hover:bg-green-700 hover:scale-110 hover:shadow-xl hover:shadow-green-900/40',
          'active:scale-95',
          'transition-all duration-200 ease-out',
          'relative'
        )}
        aria-label={isOpen ? 'Tutup chat' : 'Buka chat'}
      >
        <span
          className={cn(
            'absolute transition-all duration-200',
            isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
          )}
        >
          <X className="w-6 h-6 text-white" />
        </span>
        <span
          className={cn(
            'absolute transition-all duration-200',
            !isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
          )}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </span>

        {unreadCount > 0 && isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-bounce shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20" />
        )}
      </button>
    </div>
  )
}