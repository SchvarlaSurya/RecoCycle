'use client'

import { useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useWasteStore } from '@/store/useWasteStore'

export function useNotifications() {
  const { user, isSignedIn } = useUser()
  const { notifications, setNotifications, addNotification, setUserTier } = useWasteStore()

  const fetchNotifications = useCallback(async () => {
    if (!isSignedIn || !user) return

    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        // Convert DB notifications to store format
        const formatted = (data.notifications || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          date: n.created_at,
          read: n.is_read
        }))
        setNotifications(formatted)
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }, [user, isSignedIn, setNotifications])

  const fetchUserTier = useCallback(async () => {
    if (!isSignedIn || !user) return

    try {
      const res = await fetch(`/api/exp?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUserTier(data.user.exp || 0, data.tierInfo?.tier || 'bronze')
        }
      }
    } catch (e) {
      console.error('Failed to fetch user tier:', e)
    }
  }, [user, isSignedIn, setUserTier])

  useEffect(() => {
    if (isSignedIn && user) {
      fetchNotifications()
      fetchUserTier()

      // Poll for new notifications every 10 seconds
      const interval = setInterval(() => {
        fetchNotifications()
        fetchUserTier()
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [isSignedIn, user, fetchNotifications, fetchUserTier])

  return {
    notifications,
    fetchNotifications,
    fetchUserTier,
    addNotification
  }
}