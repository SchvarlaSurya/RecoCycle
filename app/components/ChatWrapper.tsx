'use client'

import { ChatProvider } from '@/components/chat/chat-provider'
import { useUser } from '@clerk/nextjs'

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <>{children}</>
  }

  return (
    <ChatProvider
      user={
        user
          ? {
              id: user.id,
              name: user.firstName || user.username || user.fullName || 'User',
              email: user.emailAddresses[0]?.emailAddress || ''
            }
          : null
      }
    >
      {children}
    </ChatProvider>
  )
}