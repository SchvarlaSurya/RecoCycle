"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Bell, Calendar, ChevronDown, Package, Users, CheckCircle, ArrowRight, FileText, ShieldCheck, AlertCircle, Clock, TrendingUp, Recycle } from "lucide-react";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface DashboardStats {
  totalUsers: number
  totalPickups: number
  totalKg: number
  pendingPickups: number
  pendingWithdrawals: number
  pendingWithdrawalAmount: number
  totalBalance: number
}

interface RecentTransaction {
  id: string
  user_id: string
  user_name: string
  type: string
  category: string | null
  description: string | null
  amount: number
  status: string
  created_at: string
}

interface PendingPickup {
  id: string
  user_id: string
  user_name: string
  waste_name: string
  weight_kg: number
  pickup_date: string
  time_slot: string
  address: string
  estimated_reward: number
  status: string
  created_at: string
}

interface PendingWithdrawal {
  id: string
  user_id: string
  user_name: string
  method: string
  method_name: string
  account_number: string
  amount: number
  status: string
  created_at: string
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPickups: 0,
    totalKg: 0,
    pendingPickups: 0,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0,
    totalBalance: 0
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [pendingPickups, setPendingPickups] = useState<PendingPickup[]>([])
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; kg: number }[]>([])
  const [topWaste, setTopWaste] = useState<{ name: string; kg: number; percent: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()

      if (data.stats) {
        setStats(data.stats)
      }

      if (data.weeklyTrend) {
        setWeeklyData(data.weeklyTrend)
      }

      if (data.distribution) {
        setCategoryData(data.distribution.map((d: any) => ({
          name: d.name,
          value: d.kg,
          color: d.color
        })))
      }

      if (data.topWaste) {
        setTopWaste(data.topWaste)
      }

      if (data.recentTransactions) {
        setRecentTransactions(data.recentTransactions)
      }

      if (data.pendingPickups) {
        setPendingPickups(data.pendingPickups)
      }

      if (data.pendingWithdrawals) {
        setPendingWithdrawals(data.pendingWithdrawals)
      }

    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
    const interval = setInterval(fetchAdminData, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Jakarta'
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta'
    })
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      verified: 'bg-emerald-100 text-emerald-700',
      'Menunggu Verifikasi': 'bg-amber-100 text-amber-700',
      'Selesai': 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700',
      'Ditolak': 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700'
    }
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e4efe9] text-stone-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Selamat datang kembali, Admin! 👋</h1>
          <p className="text-stone-600 text-sm mt-1">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Jakarta'
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Administrator
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-lg hover:shadow-emerald-100 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">Total Saldo Sistem</p>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900">{formatCurrency(stats.totalBalance)}</p>
          <p className="text-xs text-emerald-600 mt-1">Saldo semua user</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 hover:shadow-lg hover:shadow-blue-100 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">Total Sampah Masuk</p>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900">{stats.totalKg.toFixed(1)} kg</p>
          <p className="text-xs text-blue-600 mt-1">{stats.totalPickups} pickup terverifikasi</p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 hover:shadow-lg hover:shadow-violet-100 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">Total Nasabah</p>
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900">{stats.totalUsers}</p>
          <p className="text-xs text-violet-600 mt-1">User terdaftar</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 hover:shadow-lg hover:shadow-amber-100 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">Pending Verifikasi</p>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-stone-900">{stats.pendingPickups + stats.pendingWithdrawals}</p>
          <p className="text-xs text-amber-600 mt-1">{stats.pendingPickups} pickup, {stats.pendingWithdrawals} penarikan</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Tren Setoran Mingguan (kg)</h2>
          {weeklyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} domain={[0, 'auto']} width={30} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px",
                      color: "white",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="kg"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorKg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500">
              <p>Belum ada data tren</p>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Distribusi Sampah</h2>
          {categoryData.length > 0 ? (
            <div className="h-64 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-stone-700">{cat.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">{cat.value} kg</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500">
              <p>Belum ada data distribusi</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Pending & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Pickups */}
        <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">Pending Pickup</h2>
            <Link href="/admin/pickups" className="text-sm text-emerald-600 hover:text-emerald-700">Lihat Semua →</Link>
          </div>
          {pendingPickups.length > 0 ? (
            <div className="space-y-3">
              {pendingPickups.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Recycle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{p.user_name || 'User'}</p>
                      <p className="text-xs text-stone-500">{p.waste_name} • {p.weight_kg} kg</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    {formatCurrency(p.estimated_reward)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-400" />
              <p>Semua pickup sudah diproses</p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">Transaksi Terbaru</h2>
            <Link href="/admin/transaksi" className="text-sm text-emerald-600 hover:text-emerald-700">Lihat Semua →</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'penarikan' ? 'bg-red-100' : 'bg-emerald-100'
                    }`}>
                      {tx.type === 'penarikan' ? (
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      ) : (
                        <Recycle className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{tx.user_name || 'User'}</p>
                      <p className="text-xs text-stone-500">{tx.description || tx.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-stone-400">{formatTime(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada transaksi</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Waste Section */}
      <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Sampah Paling Sering Disetor</h2>
        {topWaste.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topWaste.map((waste, i) => (
              <div key={i} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">{waste.name}</p>
                    <p className="text-xs text-stone-500">{waste.percent}% dari total</p>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    style={{ width: `${waste.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-lg font-bold text-stone-900">{waste.kg.toFixed(1)} kg</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada data sampah</p>
          </div>
        )}
      </div>
    </div>
  )
}