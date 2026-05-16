'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { ChatHeader } from './chat-header'
import { ChatMessagesList } from './chat-messages-list'
import { ChatInputBar } from './chat-input-bar'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/useChat'

interface ChatDropupProps {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  isSessionEnded?: boolean
  onSend: (content: string) => void
  onClose: () => void
}

export function ChatDropup({ messages, isLoading, isSending, isSessionEnded, onSend, onClose }: ChatDropupProps) {
  const [isTyping] = useState(false)

  const handleClose = () => {
    // Just close without any confirmation
    onClose()
  }

  return (
    <div
      className={cn(
        'w-[320px] sm:w-[360px] md:w-[400px]',
        'h-[420px] sm:h-[480px] md:h-[520px]',
        'bg-white rounded-2xl shadow-2xl shadow-black/25',
        'flex flex-col overflow-hidden',
        'animate-dropup-enter'
      )}
      style={{
        transformOrigin: 'bottom right'
      }}
    >
      <ChatHeader onClose={handleClose} isOnline={!isSessionEnded} />

      {isSessionEnded ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-lg font-semibold text-slate-700 mb-2">Sesi Chat Berakhir</h4>
            <p className="text-sm text-slate-500 mb-4">
              Sesi chat Anda telah diakhiri oleh admin. Terima kasih sudah menggunakan layanan kami.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : (
        <>
          <ChatMessagesList
            messages={messages}
            isLoading={isLoading}
            isTyping={isTyping}
          />
          <ChatInputBar onSend={onSend} disabled={isSending} isSending={isSending} />
        </>
      )}
    </div>
  )
}