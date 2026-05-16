'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { useChat } from '@/hooks/useChat'
import { useChatToggle } from '@/hooks/useChatToggle'
import { ChatFab } from './chat-fab'

interface ChatUser {
  id: string
  name: string
  email: string
}

interface ChatContextValue {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
  messages: ReturnType<typeof useChat>['messages']
  isLoading: boolean
  isSending: boolean
  isSessionEnded: boolean
  unreadCount: number
  sendMessage: (content: string) => void
  clearUnread: () => void
  roomId: string | null
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
  user: ChatUser | null
}

export function ChatProvider({ children, user }: ChatProviderProps) {
  const { isOpen, toggle, open, close } = useChatToggle()
  const { messages, isLoading, isSending, isSessionEnded, unreadCount, sendMessage, clearUnread, roomId } = useChat({
    userId: user?.id ?? 'anonymous',
    userName: user?.name ?? 'Guest',
    userEmail: user?.email ?? ''
  })

  const value: ChatContextValue = {
    isOpen,
    toggle,
    open,
    close,
    messages,
    isLoading,
    isSending,
    isSessionEnded,
    unreadCount,
    sendMessage,
    clearUnread,
    roomId
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatFab
        isOpen={isOpen}
        onToggle={toggle}
        messages={messages}
        isLoading={isLoading}
        isSending={isSending}
        isSessionEnded={isSessionEnded}
        unreadCount={unreadCount}
        onSend={sendMessage}
        onClearUnread={clearUnread}
      />
    </ChatContext.Provider>
  )
}