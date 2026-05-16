'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, ArrowUpRight, Search, RefreshCw, AlertCircle, Banknote, Smartphone } from "lucide-react";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface Withdrawal {
  id: string
  user_id: string
  user_name: string
  method: string
  method_name: string
  account_name: string
  account_number: string
  amount: number
  status: string
  created_at: string
}

export default function AdminWithdrawalsPage() {
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAllWithdrawals = async () => {
    setIsLoading(true)
    try {
      // Fetch ALL withdrawals (admin has no status filter)
      const res = await fetch(`/api/withdrawal?status=`, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (res.ok) {
        const data = await res.json()
        setAllWithdrawals(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('Failed to fetch withdrawals:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllWithdrawals()
  }, [])

  const handleVerify = async (id: string | number, amount: number | string) => {
    if (actionLoading) return
    setActionLoading(String(id))
    try {
      const parsedAmount = parseAmount(amount)
      console.log('Verifying withdrawal:', { id: String(id), amount })
      const res = await fetch('/api/admin/withdrawals/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({ id: String(id) })
      })
      const result = await res.json()
      console.log('Verify response:', result)
      if (result && result.success === true) {
        alert(`Penarikan berhasil diverifikasi!\nNominal: Rp ${parsedAmount.toLocaleString('id-ID')}`)
        // Update local state
        setAllWithdrawals(prev => prev.map(w =>
          String(w.id) === String(id) ? { ...w, status: 'Selesai' } : w
        ))
      } else {
        const errorMsg = result?.error || 'Gagal memproses penarikan'
        alert('Gagal: ' + errorMsg)
      }
    } catch (e) {
      console.error('Failed to verify:', e)
      alert('Terjadi kesalahan saat verifikasi')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string | number) => {
    if (!confirm('Yakin ingin menolak penarikan ini?')) return
    if (actionLoading) return
    setActionLoading(String(id))
    try {
      console.log('Rejecting withdrawal:', { id: String(id) })
      const res = await fetch('/api/admin/withdrawals/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({ id: String(id) })
      })
      const result = await res.json()
      console.log('Reject response:', result)
      if (result && result.success === true) {
        alert('Penarikan ditolak!')
        setAllWithdrawals(prev => prev.map(w =>
          String(w.id) === String(id) ? { ...w, status: 'Ditolak' } : w
        ))
      } else {
        const errorMsg = result?.error || 'Gagal memproses penarikan'
        alert('Gagal: ' + errorMsg)
      }
    } catch (e) {
      console.error('Failed to reject:', e)
      alert('Terjadi kesalahan saat menolak')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string'
      ? parseFloat(amount.replace(/[^0-9]/g, '')) || 0
      : amount || 0
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
  }

  const parseAmount = (amount: number | string): number => {
    const num = typeof amount === 'string'
      ? parseFloat(amount.replace(/[^0-9]/g, '')) || 0
      : amount || 0
    return num // Jangan pakai Math.abs() untuk menyimpan tanda
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

  // Normalize status for display
  const getNormalizedStatus = (status: string): 'pending' | 'verified' | 'rejected' => {
    const s = status.toLowerCase()
    if (s.includes('menunggu') || s === 'pending') return 'pending'
    if (s.includes('selesai') || s.includes('verified') || s.includes('complete')) return 'verified'
    if (s.includes('tolak') || s.includes('reject') || s.includes('ditolak')) return 'rejected'
    // Handle exact match for 'Selesai' and 'Ditolak'
    if (status === 'Selesai') return 'verified'
    if (status === 'Ditolak') return 'rejected'
    return 'pending'
  }

  const getStatusLabel = (status: string): string => {
    const s = status.toLowerCase()
    if (s.includes('menunggu') || s === 'pending') return 'MENUNGGU VERIFIKASI'
    if (s.includes('selesai') || s.includes('verified') || s.includes('complete')) return 'SELESAI'
    if (s.includes('tolak') || s.includes('reject') || s.includes('ditolak')) return 'DITOLAK'
    return status.toUpperCase()
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    verified: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border border-red-200'
  }

  // Normalize all withdrawals for filtering
  const normalizedWithdrawals = allWithdrawals.map(w => ({
    ...w,
    normalizedStatus: getNormalizedStatus(w.status)
  }))

  // Filter based on tab
  const filteredWithdrawals = normalizedWithdrawals.filter(w => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      w.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.method_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.account_number?.includes(searchQuery)

    // Status filter
    if (filter === 'all') return matchesSearch
    return matchesSearch && w.normalizedStatus === filter
  })

  const pendingCount = normalizedWithdrawals.filter(w => w.normalizedStatus === 'pending').length
  const verifiedCount = normalizedWithdrawals.filter(w => w.normalizedStatus === 'verified').length
  const rejectedCount = normalizedWithdrawals.filter(w => w.normalizedStatus === 'rejected').length
  const totalPendingAmount = normalizedWithdrawals
    .filter(w => w.normalizedStatus === 'pending')
    .reduce((sum, w) => sum + parseAmount(w.amount), 0)

  const isEWallet = (method: string) => ['gopay', 'dana', 'ovo'].includes(method?.toLowerCase())
  const isBank = (method: string) => ['bca', 'mandiri', 'bni', 'bri', 'bjb'].includes(method?.toLowerCase())

  const tabs = [
    { key: 'all' as const, label: 'Semua', count: allWithdrawals.length },
    { key: 'pending' as const, label: 'Menunggu', count: pendingCount },
    { key: 'verified' as const, label: 'Selesai', count: verifiedCount },
    { key: 'rejected' as const, label: 'Ditolak', count: rejectedCount },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Verifikasi Penarikan Saldo</h1>
          <p className="text-stone-600 text-sm mt-1">
            {pendingCount > 0
              ? `${pendingCount} penarikan menunggu verifikasi (${formatCurrency(totalPendingAmount)})`
              : 'Semua penarikan sudah diproses'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllWithdrawals}
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
          placeholder="Cari berdasarkan nama, metode, atau nomor rekening..."
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
            <ArrowUpRight className="w-4 h-4" />
            Total Penarikan
          </div>
          <p className="text-2xl font-bold mt-1 text-stone-900">{allWithdrawals.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <Clock className="w-4 h-4" />
            Menunggu
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Selesai
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

      {/* Withdrawals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
          <ArrowUpRight className="w-16 h-16 mx-auto mb-4 text-stone-300" />
          <p className="text-stone-500">Belum ada request penarikan</p>
          <p className="text-sm text-stone-400 mt-1">Penarikan baru akan muncul di sini setelah user mengajukan</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWithdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[withdrawal.normalizedStatus]}`}>
                      {getStatusLabel(withdrawal.status)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatDate(withdrawal.created_at)} • {formatTime(withdrawal.created_at)}
                    </span>
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">
                      ID: {String(withdrawal.id).slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
                      {(withdrawal.user_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900">{withdrawal.user_name || 'Unknown User'}</h3>
                      <p className="text-xs text-stone-500">User ID: {withdrawal.user_id}</p>
                    </div>
                  </div>

                  {/* Amount Card */}
                  <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-4 mb-4 border border-red-200">
                    <span className="text-red-600 text-sm">Jumlah Penarikan</span>
                    <p className="text-3xl font-bold mt-1 text-red-700">
                      {formatCurrency(parseAmount(withdrawal.amount))}
                    </p>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {isEWallet(withdrawal.method) ? (
                          <Smartphone className="w-4 h-4 text-violet-500" />
                        ) : isBank(withdrawal.method) ? (
                          <Banknote className="w-4 h-4 text-blue-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-stone-400" />
                        )}
                        <span className="text-stone-500 text-xs">Metode</span>
                      </div>
                      <p className="font-medium text-stone-900">{withdrawal.method_name || withdrawal.method || '-'}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3">
                      <span className="text-stone-500 text-xs block mb-1">Nomor</span>
                      <p className="font-medium text-stone-900">{withdrawal.account_number}</p>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3 col-span-2">
                      <span className="text-stone-500 text-xs block mb-1">Nama Pemilik</span>
                      <p className="font-medium text-stone-900">{withdrawal.account_name}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:min-w-[140px]">
                  {withdrawal.normalizedStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleVerify(withdrawal.id, withdrawal.amount)}
                        disabled={actionLoading === String(withdrawal.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50"
                      >
                        {actionLoading === String(withdrawal.id) ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(withdrawal.id)}
                        disabled={actionLoading === String(withdrawal.id)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </button>
                    </>
                  )}

                  {withdrawal.normalizedStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 bg-emerald-50 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Approved</span>
                    </div>
                  )}

                  {withdrawal.normalizedStatus === 'rejected' && (
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