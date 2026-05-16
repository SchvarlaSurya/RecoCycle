'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ChatMessage {
  id: string
  room_id: string
  sender_role: 'user' | 'admin'
  sender_name: string
  content: string
  is_read: boolean
  created_at: string
}

interface UseChatProps {
  userId: string
  userName: string
  userEmail: string
}

// Get current timestamp in ISO format for Indonesia timezone (WIB = UTC+7)
function getIndonesiaTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
}

function getISOTimestamp() {
  const date = new Date()
  // Force UTC+7 for Indonesia (WIB)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const wibOffset = 7 * 60 * 60000 // UTC+7
  return new Date(utc + wibOffset).toISOString()
}

export function useChat({ userId, userName, userEmail }: UseChatProps) {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSessionEnded, setIsSessionEnded] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const lastTimestampRef = useRef('1970-01-01T00:00:00.000Z')
  const pollingRef = useRef(true)
  const initRef = useRef<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const isSendingRef = useRef(false)
  const lastSentIdRef = useRef<string>('')

  const fetchRoom = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/chat/rooms?userId=${encodeURIComponent(uid)}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }, [])

  const fetchMessages = useCallback(async (rId: string, after: string): Promise<ChatMessage[]> => {
    try {
      const res = await fetch(`/api/chat/messages?roomId=${rId}&after=${encodeURIComponent(after)}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }, [])

  const createRoom = useCallback(async (uid: string, uname: string, uemail: string) => {
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uname, userEmail: uemail })
      })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    // Only init once per userId
    if (initRef.current === userId && roomIdRef.current) return
    initRef.current = userId

    async function initRoom() {
      setIsLoading(true)
      try {
        let room = await fetchRoom(userId)
        if (!room) {
          room = await createRoom(userId, userName, userEmail)
        }
        if (!room || !room.id) {
          initRef.current = null
          setIsLoading(false)
          return
        }

        setRoomId(room.id)
        roomIdRef.current = room.id
        pollingRef.current = true

        const msgs = await fetchMessages(room.id, '1970-01-01T00:00:00.000Z')
        setMessages(msgs)
        if (msgs.length > 0) {
          lastTimestampRef.current = msgs[msgs.length - 1].created_at
        }
      } catch (e) {
        console.error('Failed to init chat room:', e)
      } finally {
        setIsLoading(false)
      }
    }

    initRoom()

    return () => {
      pollingRef.current = false
      roomIdRef.current = null
      initRef.current = null
    }
  }, [userId, userName, userEmail, fetchRoom, createRoom, fetchMessages])

  useEffect(() => {
    if (!roomId) return

    pollingRef.current = true
    let localTimestamp = lastTimestampRef.current
    const currentRoomId = roomId

    async function poll() {
      while (pollingRef.current) {
        try {
          const roomRes = await fetchRoom(userId)
          if (roomRes?.status === 'closed') {
            setIsSessionEnded(true)
            setMessages([])
            pollingRef.current = false
            break
          }

          const newMsgs = await fetchMessages(currentRoomId, localTimestamp)
          if (newMsgs.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const unique = newMsgs.filter(m => !existingIds.has(m.id))
              if (unique.length === 0) return prev
              localTimestamp = newMsgs[newMsgs.length - 1].created_at
              lastTimestampRef.current = localTimestamp
              return [...prev, ...unique]
            })

            const adminMsgs = newMsgs.filter(m => m.sender_role === 'admin')
            if (adminMsgs.length > 0) {
              setUnreadCount(c => c + adminMsgs.length)
            }
          }
        } catch (e) {
          console.error('Poll error:', e)
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    poll()

    return () => {
      pollingRef.current = false
    }
  }, [roomId, userId, fetchRoom, fetchMessages])

  const sendMessage = useCallback(async (content: string) => {
    const currentRoomId = roomIdRef.current
    const trimmedContent = content.trim()

    // Prevent empty messages
    if (!currentRoomId || !trimmedContent) return

    // Prevent rapid duplicate sends using message ID
    if (isSendingRef.current) {
      console.log('Still sending, please wait...')
      return
    }

    isSendingRef.current = true

    const optimisticId = crypto.randomUUID()
    const optimistic: ChatMessage = {
      id: optimisticId,
      room_id: currentRoomId,
      sender_role: 'user',
      sender_name: userName,
      content: trimmedContent,
      is_read: false,
      created_at: getISOTimestamp()
    }

    // Clear input immediately
    setIsSending(true)

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: currentRoomId,
          senderRole: 'user',
          senderName: userName,
          content: trimmedContent
        })
      })

      if (!res.ok) throw new Error('Failed to send')

      const result = await res.json()
      lastTimestampRef.current = result.created_at || getISOTimestamp()

      // Remove optimistic message and add real one from server
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      if (result.id) {
        setMessages(prev => [...prev, result])
      }
    } catch (e) {
      console.error('Failed to send message:', e)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    } finally {
      setIsSending(false)
      // Reset after a longer delay to ensure the message is properly sent
      setTimeout(() => {
        isSendingRef.current = false
      }, 1000)
    }
  }, [userName])

  const clearUnread = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return { messages, isLoading, isSending, isSessionEnded, unreadCount, sendMessage, clearUnread, roomId }
}