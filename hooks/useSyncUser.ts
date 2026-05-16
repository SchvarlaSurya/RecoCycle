import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function useSyncUser() {
  const { user, isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data to our database when they log in
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userData: {
            name: user.firstName || user.fullName || user.username || 'User',
            email: user.primaryEmailAddress?.emailAddress || null,
            firstName: user.firstName,
            fullName: user.fullName
          }
        })
      }).catch(console.error)
    }
  }, [user, isSignedIn])

  return { user, isSignedIn }
}