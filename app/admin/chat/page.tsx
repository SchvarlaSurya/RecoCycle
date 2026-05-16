'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Search, Power, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatRoom {
  id: string
  user_id: string
  user_name: string
  user_email: string
  status: string
  last_message: string | null
  last_message_at: string
  unread_admin: number
  unread_user: number
  created_at: string
}

interface ChatMessage {
  id: string
  room_id: string
  sender_role: 'user' | 'admin'
  sender_name: string
  content: string
  is_read: boolean
  created_at: string
}

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getISOTimestamp() {
  const date = new Date()
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const wibOffset = 7 * 60 * 60000
  return new Date(utc + wibOffset).toISOString()
}

export default function AdminChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEndingSession, setIsEndingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef(true)
  const lastTimestampRef = useRef('1970-01-01T00:00:00.000Z')
  const isSendingRef = useRef(false)
  const roomIdRef = useRef<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat/rooms', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (!res.ok) throw new Error('Failed to fetch rooms')
      const data = await res.json()
      setRooms(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to fetch rooms:', e)
    } finally {
      setIsLoadingRooms(false)
    }
  }, [])

  const fetchMessages = useCallback(async (roomId: string, after: string): Promise<ChatMessage[]> => {
    try {
      const res = await fetch(`/api/admin/chat/messages?roomId=${roomId}&after=${encodeURIComponent(after)}`, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error('Failed to fetch messages:', e)
      return []
    }
  }, [])

  const deleteRoom = useCallback(async (roomId: string) => {
    if (!confirm('Yakin ingin menghapus chat ini?')) return

    try {
      const res = await fetch(`/api/admin/chat/rooms?roomId=${roomId}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (!res.ok) throw new Error('Failed to delete room')

      // Remove from local state immediately
      setRooms(prev => prev.filter(r => r.id !== roomId))
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null)
        setMessages([])
      }
      setShowDeleteConfirm(null)
    } catch (e) {
      console.error('Failed to delete room:', e)
      alert('Gagal menghapus chat')
    }
  }, [selectedRoom])

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 3000)
    return () => clearInterval(interval)
  }, [fetchRooms])

  useEffect(() => {
    if (!selectedRoom) return

    pollingRef.current = true
    setIsLoadingMessages(true)
    setMessages([])
    lastTimestampRef.current = '1970-01-01T00:00:00.000Z'
    roomIdRef.current = selectedRoom.id

    async function initAndPoll() {
      if (!selectedRoom) return
      try {
        const msgs = await fetchMessages(selectedRoom.id, '1970-01-01T00:00:00.000Z')
        setMessages(msgs)
        if (msgs.length > 0) {
          lastTimestampRef.current = msgs[msgs.length - 1].created_at
        }
        setIsLoadingMessages(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } catch (e) {
        console.error('Failed to init messages:', e)
        setIsLoadingMessages(false)
      }

      while (pollingRef.current && selectedRoom && roomIdRef.current === selectedRoom.id) {
        await new Promise(r => setTimeout(r, 1500))
        if (!pollingRef.current || !selectedRoom || roomIdRef.current !== selectedRoom.id) break

        try {
          const newMsgs = await fetchMessages(selectedRoom.id, lastTimestampRef.current)
          if (newMsgs.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id))
              const unique = newMsgs.filter(m => !existingIds.has(m.id))
              if (unique.length === 0) return prev
              lastTimestampRef.current = newMsgs[newMsgs.length - 1].created_at
              return [...prev, ...unique]
            })
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          }
        } catch (e) {
          console.error('Poll error:', e)
        }
      }
    }

    initAndPoll()

    return () => {
      pollingRef.current = false
    }
  }, [selectedRoom?.id, fetchMessages])

  const handleSendMessage = async () => {
    if (!selectedRoom || !inputMessage.trim() || isSending) return

    const trimmedContent = inputMessage.trim()
    if (isSendingRef.current) {
      console.log('Still sending, please wait...')
      return
    }

    isSendingRef.current = true
    setIsSending(true)
    const optimisticId = crypto.randomUUID()
    const optimistic: ChatMessage = {
      id: optimisticId,
      room_id: selectedRoom.id,
      sender_role: 'admin',
      sender_name: 'Admin Support',
      content: trimmedContent,
      is_read: true,
      created_at: getISOTimestamp()
    }

    setMessages(prev => [...prev, optimistic])
    setInputMessage('')
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    try {
      const res = await fetch('/api/admin/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          senderName: 'Admin Support',
          content: trimmedContent
        })
      })
      if (!res.ok) throw new Error('Failed to send')

      const result = await res.json()
      lastTimestampRef.current = result.created_at || getISOTimestamp()

      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      if (result.id) {
        setMessages(prev => [...prev, result])
      }
      fetchRooms()
    } catch (e) {
      console.error('Failed to send message:', e)
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInputMessage(trimmedContent)
    } finally {
      setIsSending(false)
      setTimeout(() => {
        isSendingRef.current = false
      }, 1000)
    }
  }

  const handleEndSession = async () => {
    if (!selectedRoom) return

    if (!confirm('Apakah Anda yakin ingin mengakhiri sesi chat ini? Semua riwayat chat akan dihapus.')) {
      return
    }

    setIsEndingSession(true)
    // Stop polling first
    pollingRef.current = false
    try {
      await fetch(`/api/admin/chat/rooms?roomId=${selectedRoom.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      setSelectedRoom(null)
      setMessages([])
      // Remove from rooms list
      setRooms(prev => prev.filter(r => r.id !== selectedRoom.id))
      fetchRooms()
    } catch (e) {
      console.error('Failed to end session:', e)
      alert('Gagal mengakhiri sesi chat')
      pollingRef.current = true
    } finally {
      setIsEndingSession(false)
    }
  }

  const filteredRooms = rooms.filter(room =>
    room.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    // Parse as UTC, then convert to WIB (UTC+7)
    const date = new Date(dateString)
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
    const wibOffset = 7 * 60 * 60000
    const wibDate = new Date(utc + wibOffset)
    return wibDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] gap-4">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 border border-stone-200 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Hapus Chat?</h3>
                <p className="text-sm text-stone-500">Aksi ini tidak bisa dibatalkan</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => deleteRoom(showDeleteConfirm)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden",
        selectedRoom && "hidden lg:flex"
      )}>
        <div className="p-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Chat Rooms</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingRooms ? (
            <div className="p-4 text-center text-stone-500">Memuat...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-4 text-center text-stone-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-stone-300" />
              <p>Belum ada chat</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <div key={room.id} className="relative group">
                <button
                  onClick={() => setSelectedRoom(room)}
                  className={cn(
                    'w-full p-4 text-left border-b border-stone-100 transition-colors',
                    'hover:bg-stone-50',
                    selectedRoom?.id === room.id && 'bg-emerald-50 border-l-2 border-l-emerald-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-stone-900 text-sm">{room.user_name}</span>
                    <span className="text-xs text-stone-400">{formatDate(room.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500 truncate max-w-[180px]">
                      {room.last_message || 'Belum ada pesan'}
                    </p>
                    {room.unread_user > 0 && (
                      <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white font-bold">
                        {room.unread_user}
                      </span>
                    )}
                  </div>
                </button>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(room.id)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden",
        !selectedRoom && "hidden lg:flex"
      )}>
        {selectedRoom ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-stone-200 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="lg:hidden p-2 text-stone-400 hover:text-stone-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-900 text-sm sm:text-base truncate">{selectedRoom.user_name}</h3>
                <p className="text-xs text-stone-500 truncate hidden sm:block">{selectedRoom.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'px-2 sm:px-3 py-1 rounded-full text-xs font-medium',
                  selectedRoom.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                )}>
                  {selectedRoom.status === 'open' ? 'Aktif' : 'Tutup'}
                </div>
                {selectedRoom.status === 'open' && (
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(selectedRoom.id)}
                      className={cn(
                        'p-2 rounded-xl transition-all',
                        'bg-red-50 text-red-600 hover:bg-red-100'
                      )}
                      title="Hapus chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleEndSession}
                      disabled={isEndingSession}
                      className={cn(
                        'p-2 rounded-xl transition-all',
                        'bg-red-50 text-red-600 hover:bg-red-100',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="Akhiri sesi chat"
                    >
                      {isEndingSession ? (
                        <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-stone-400 text-sm">
                  Belum ada pesan
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5',
                        msg.sender_role === 'admin'
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                      )}
                    >
                      {msg.sender_role !== 'admin' && (
                        <p className="text-xs font-medium text-emerald-600 mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        'text-[10px] sm:text-xs mt-1',
                        msg.sender_role === 'admin' ? 'text-emerald-200' : 'text-stone-400'
                      )}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 border-t border-stone-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  placeholder="Ketik balasan..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className={cn(
                    'p-2 sm:p-3 rounded-xl bg-emerald-600 text-white transition-all',
                    'hover:bg-emerald-500 hover:scale-105',
                    'active:scale-95',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  {isSending ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 sm:h-5 w-4 sm:w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-400">Pilih chat untuk melihat pesan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
