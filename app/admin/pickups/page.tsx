'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, CheckCircle, Clock, XCircle, Eye, Filter, Search, RefreshCw } from "lucide-react";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface PendingPickup {
  id: string
  user_id: string
  user_name: string
  waste_type: string
  waste_name: string
  weight_kg: number
  pickup_date: string
  time_slot: string
  address: string
  notes: string | null
  estimated_reward: number
  status: string
  created_at: string
}

export default function AdminPickupsPage() {
  const [allPickups, setAllPickups] = useState<PendingPickup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending')
  const [selectedPickup, setSelectedPickup] = useState<PendingPickup | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAllPickups = async () => {
    setIsLoading(true)
    try {
      // Fetch ALL pickups (no status filter for admin)
      const res = await fetch('/api/admin/pickups', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched pickups:', data)
        if (Array.isArray(data)) {
          setAllPickups(data)
        } else {
          console.error('Response is not array:', data)
          setAllPickups([])
        }
      } else {
        console.error('Failed to fetch pickups:', res.status)
        const text = await res.text()
        console.error('Response:', text)
      }
    } catch (e) {
      console.error('Failed to fetch pickups:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllPickups()
  }, [])

  const handleVerify = async (id: string) => {
    if (!confirm('Verifikasi setoran ini?')) return
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/pickups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({ id, action: 'verify' })
      })
      const result = await res.json()
      console.log('Verify result:', result)
      if (result && result.success) {
        alert(`Berhasil!\n+${result.expEarned || 0} EXP\nTier: ${result.newTier}`)
        fetchAllPickups()
      } else {
        alert('Gagal: ' + (result?.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Failed to verify:', e)
      alert('Terjadi kesalahan saat verifikasi')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Yakin ingin menolak pickup ini?')) return
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/pickups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({ id, action: 'reject' })
      })
      const result = await res.json()
      if (result && result.success) {
        alert('Pickup ditolak!')
        fetchAllPickups()
      } else {
        alert('Gagal: ' + (result?.error || 'Unknown error'))
      }
    } catch (e) {
      console.error('Failed to reject:', e)
      alert('Terjadi kesalahan saat menolak')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    verified: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border border-red-200'
  }

  // Normalize status for display
  const getNormalizedStatus = (status: string): 'pending' | 'verified' | 'rejected' => {
    const s = status.toLowerCase()
    if (s.includes('menunggu') || s === 'pending') return 'pending'
    if (s.includes('selesai') || s.includes('verified') || s.includes('complete')) return 'verified'
    if (s.includes('tolak') || s.includes('reject') || s.includes('ditolak')) return 'rejected'
    return 'pending'
  }

  const getStatusLabel = (status: string): string => {
    const s = status.toLowerCase()
    if (s.includes('menunggu') || s === 'pending') return 'PENDING'
    if (s.includes('selesai') || s.includes('verified') || s.includes('complete')) return 'TERVERIFIKASI'
    if (s.includes('tolak') || s.includes('reject') || s.includes('ditolak')) return 'DITOLAK'
    return status.toUpperCase()
  }

  // Normalize all pickups for filtering
  const normalizedPickups = allPickups.map(p => ({
    ...p,
    normalizedStatus: getNormalizedStatus(p.status)
  }))

  // Filter based on tab
  const filteredPickups = normalizedPickups.filter(p => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      (p.user_name || 'User').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.waste_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    if (filter === 'all') return matchesSearch
    return matchesSearch && p.normalizedStatus === filter
  })

  const pendingCount = normalizedPickups.filter(p => p.normalizedStatus === 'pending').length
  const verifiedCount = normalizedPickups.filter(p => p.normalizedStatus === 'verified').length
  const rejectedCount = normalizedPickups.filter(p => p.normalizedStatus === 'rejected').length

  const tabs = [
    { key: 'all' as const, label: 'Semua', count: allPickups.length },
    { key: 'pending' as const, label: 'Pending', count: pendingCount },
    { key: 'verified' as const, label: 'Terverifikasi', count: verifiedCount },
    { key: 'rejected' as const, label: 'Ditolak', count: rejectedCount },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Verifikasi Setoran Sampah</h1>
          <p className="text-stone-600 text-sm mt-1">
            {pendingCount > 0 ? `${pendingCount} pickup menunggu verifikasi` : 'Semua pickup sudah diproses'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllPickups}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-white text-sm hover:bg-stone-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/admin" className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-sm hover:bg-stone-50 transition">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, kategori, atau alamat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              filter === tab.key
                ? tab.key === 'pending' ? 'bg-amber-600 text-white'
                : tab.key === 'verified' ? 'bg-emerald-600 text-white'
                : tab.key === 'rejected' ? 'bg-red-600 text-white'
                : 'bg-violet-600 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {tab.key === 'pending' && <Clock className="w-4 h-4" />}
            {tab.key === 'verified' && <CheckCircle className="w-4 h-4" />}
            {tab.key === 'rejected' && <XCircle className="w-4 h-4" />}
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-white/20' : 'bg-stone-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2 text-stone-500 text-sm">
            <Package className="w-4 h-4" />
            Total Pickup
          </div>
          <p className="text-2xl font-bold mt-1 text-stone-900">{allPickups.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Diverifikasi
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <XCircle className="w-4 h-4" />
            Ditolak
          </div>
          <p className="text-2xl font-bold mt-1 text-red-700">{rejectedCount}</p>
        </div>
      </div>

      {/* Pickups List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <Package className="h-16 w-16 mx-auto mb-4 text-stone-300" />
          <p className="text-stone-500">Belum ada pickup</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPickups.map((pickup) => (
            <div
              key={pickup.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[pickup.normalizedStatus]}`}>
                      {getStatusLabel(pickup.status)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatDate(pickup.created_at)} • {formatTime(pickup.created_at)}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                      {(pickup.user_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">{pickup.user_name || 'User'}</h3>
                      <p className="text-xs text-stone-500">ID: {pickup.user_id}</p>
                    </div>
                  </div>

                  {/* Waste Details */}
                  <div className="bg-stone-50 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                        📦
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-900">{pickup.waste_name}</p>
                        <p className="text-sm text-stone-600">{pickup.weight_kg} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-700">
                          {formatCurrency(pickup.estimated_reward)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Address */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-xl p-3">
                      <span className="text-xs text-stone-500 block mb-1">Jadwal Pickup</span>
                      <p className="font-medium text-stone-900">{formatDate(pickup.pickup_date)}</p>
                      <p className="text-xs text-stone-600">{pickup.time_slot}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3">
                      <span className="text-xs text-stone-500 block mb-1">Alamat</span>
                      <p className="font-medium text-stone-900 text-sm">{pickup.address}</p>
                    </div>
                  </div>
                  {pickup.notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <span className="text-xs text-amber-600 block mb-1">Catatan</span>
                      <p className="text-sm text-stone-700">{pickup.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:min-w-[140px]">
                  {pickup.normalizedStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerify(pickup.id)}
                        disabled={actionLoading === pickup.id}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
                      >
                        {actionLoading === pickup.id ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(pickup.id)}
                        disabled={actionLoading === pickup.id}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </button>
                    </>
                  )}

                  {pickup.normalizedStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 bg-emerald-50 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Approved</span>
                    </div>
                  )}

                  {pickup.normalizedStatus === 'rejected' && (
                    <div className="flex items-center justify-center gap-2 py-3 text-red-600 bg-red-50 rounded-xl">
                      <XCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Rejected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}