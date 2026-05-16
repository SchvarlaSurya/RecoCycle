"use client"

import { useNotifications } from '@/hooks/useNotifications'

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  // This hook handles fetching notifications and user tier from the database
  useNotifications()

  return <>{children}</>
}