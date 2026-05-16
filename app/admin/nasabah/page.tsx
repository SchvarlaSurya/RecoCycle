"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, RefreshCw, Users, Package, Clock, CheckCircle, XCircle, Eye, Edit, Trash2, Plus } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface Nasabah {
  id: string
  name: string
  email: string | null
  tier: string
  exp: number
  totalSetoran: number
  totalPickups: number
  totalKg: number
  status: 'verified' | 'pending' | 'frozen'
  joinDate: string
}

const wasteCatalog = [
  { id: "1", name: "Kertas dan Kardus", category: "ANORGANIK", price: 5150, lastUpdate: "10 Mei 2026" },
  { id: "2", name: "Logam Ringan", category: "ANORGANIK", price: 7828, lastUpdate: "10 Mei 2026" },
  { id: "3", name: "Plastik Campur", category: "ANORGANIK", price: 4326, lastUpdate: "10 Mei 2026" },
  { id: "4", name: "Baterai Rumah Tangga", category: "KHUSUS", price: 10094, lastUpdate: "10 Mei 2026" },
  { id: "5", name: "Elektronik Kecil", category: "KHUSUS", price: 13596, lastUpdate: "10 Mei 2026" },
  { id: "6", name: "Sisa Organik Kering", category: "ORGANIK", price: 1751, lastUpdate: "10 Mei 2026" },
];

const categoryColors: Record<string, string> = {
  KHUSUS: "bg-red-100 text-red-700",
  ANORGANIK: "bg-blue-100 text-blue-700",
  ORGANIK: "bg-lime-100 text-lime-700",
};

const statusBadgeColors: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  frozen: "bg-red-100 text-red-700",
};

const tierBadgeColors: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-stone-200 text-stone-600",
  gold: "bg-yellow-100 text-yellow-700",
};

const categoryChartData = wasteCatalog.map((item) => ({
  name: item.name,
  value: item.price,
  color: item.category === "KHUSUS" ? "#ef4444" : item.category === "ANORGANIK" ? "#3b82f6" : "#84cc16",
}));

export default function NasabahPage() {
  const [activeTab, setActiveTab] = useState<"nasabah" | "katalog">("nasabah");
  const [nasabah, setNasabah] = useState<Nasabah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<Nasabah | null>(null);
  const [editingUser, setEditingUser] = useState<Nasabah | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchNasabah = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/users?search=' + encodeURIComponent(search), {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (res.ok) {
        const data = await res.json()
        setNasabah(Array.isArray(data.users) ? data.users : [])
      }
    } catch (e) {
      console.error('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNasabah()
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchNasabah()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/users?userId=' + userId, {
        method: 'DELETE',
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (res.ok) {
        setShowDeleteConfirm(null)
        fetchNasabah()
      }
    } catch (e) {
      console.error('Failed to delete user')
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET
        },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editingUser.name,
          tier: editingUser.tier
        })
      })
      if (res.ok) {
        setEditingUser(null)
        fetchNasabah()
      }
    } catch (e) {
      console.error('Failed to update user')
    }
  }

  const filteredNasabah = nasabah.filter((user) => {
    const matchSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || user.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalNasabah = filteredNasabah.length;
  const verifiedCount = filteredNasabah.filter((u) => u.status === "verified").length;
  const pendingCount = filteredNasabah.filter((u) => u.status === "pending").length;
  const frozenCount = filteredNasabah.filter((u) => u.status === "frozen").length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 border border-stone-200 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Hapus User?</h3>
                <p className="text-sm text-stone-500">User akan dibekukan, bukan dihapus permanen</p>
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
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Detail User</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-bold text-stone-900">{selectedUser.name}</p>
                  <p className="text-sm text-stone-500">{selectedUser.email || 'No email'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Tier</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tierBadgeColors[selectedUser.tier]}`}>
                    {selectedUser.tier.charAt(0).toUpperCase() + selectedUser.tier.slice(1)}
                  </span>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">EXP</p>
                  <p className="text-lg font-bold text-stone-900">{selectedUser.exp.toLocaleString()} XP</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Total Pickup</p>
                  <p className="text-lg font-bold text-stone-900">{selectedUser.totalPickups}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs text-stone-500">Total Kg</p>
                  <p className="text-lg font-bold text-stone-900">{selectedUser.totalKg.toFixed(1)} kg</p>
                </div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs text-stone-500">Bergabung</p>
                <p className="text-sm font-medium text-stone-900">{selectedUser.joinDate}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Nama</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Tier</label>
                <select
                  value={editingUser.tier}
                  onChange={(e) => setEditingUser({ ...editingUser, tier: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleEditUser}
                  className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Kelola Nasabah & Katalog Harga</h1>
          <p className="text-stone-600 text-sm mt-1">
            {totalNasabah} total pengguna telah terdaftar di sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm('Sync semua user dari Clerk ke database?')) return
              setIsLoading(true)
              try {
                const res = await fetch('/api/admin/sync-users', {
                  method: 'POST',
                  headers: { 'x-admin-secret': ADMIN_SECRET }
                })
                const result = await res.json()
                if (result.success) {
                  alert(`Berhasil sync ${result.syncedCount} user dari Clerk!`)
                  fetchNasabah()
                } else {
                  alert('Gagal sync: ' + (result.error || 'Unknown error'))
                }
              } catch (e) {
                alert('Error: ' + String(e))
              } finally {
                setIsLoading(false)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm hover:bg-emerald-100 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Sync dari Clerk
          </button>
          <button
            onClick={fetchNasabah}
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

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 pb-4">
        <button
          onClick={() => setActiveTab("nasabah")}
          className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
            activeTab === "nasabah"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Nasabah
          {totalNasabah > 0 && (
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
              {totalNasabah}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("katalog")}
          className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
            activeTab === "katalog"
              ? "text-emerald-600 border-b-2 border-emerald-600"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Katalog Harga
        </button>
      </div>

      {activeTab === "nasabah" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <Users className="w-4 h-4" />
                Total Nasabah
              </div>
              <p className="text-3xl font-bold mt-1 text-stone-900">{totalNasabah}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Aktif
              </div>
              <p className="text-3xl font-bold mt-1 text-emerald-700">{verifiedCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Clock className="w-4 h-4" />
                Pending
              </div>
              <p className="text-3xl font-bold mt-1 text-amber-700">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <XCircle className="w-4 h-4" />
                Dibekukan
              </div>
              <p className="text-3xl font-bold mt-1 text-red-700">{frozenCount}</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-emerald-500 transition"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Semua Status</option>
              <option value="verified">Aktif</option>
              <option value="pending">Pending</option>
              <option value="frozen">Dibekukan</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredNasabah.length === 0 ? (
              <div className="text-center py-20 text-stone-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-stone-300" />
                <p>Belum ada nasabah</p>
                <p className="text-sm text-stone-400 mt-1">Nasabah akan muncul setelah user login ke sistem</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-left">
                        <th className="px-5 py-4 font-medium text-stone-500">Nasabah</th>
                        <th className="px-5 py-4 font-medium text-stone-500">Tier</th>
                        <th className="px-5 py-4 font-medium text-stone-500">EXP</th>
                        <th className="px-5 py-4 font-medium text-stone-500">Bergabung</th>
                        <th className="px-5 py-4 font-medium text-stone-500">Status</th>
                        <th className="px-5 py-4 font-medium text-stone-500 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredNasabah.map((user) => (
                        <tr key={user.id} className="hover:bg-stone-50 transition">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-stone-900">{user.name}</p>
                                <p className="text-xs text-stone-500">{user.email || 'No email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tierBadgeColors[user.tier] || tierBadgeColors.bronze}`}>
                              {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-amber-600">
                              {user.exp.toLocaleString()} XP
                            </span>
                          </td>
                          <td className="px-5 py-4 text-stone-500">{user.joinDate}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeColors[user.status]}`}>
                              {user.status === "verified" ? "Aktif" : user.status === "pending" ? "Pending" : "Beku"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="rounded-lg bg-stone-100 p-2 hover:bg-stone-200 transition cursor-pointer"
                                title="Lihat Detail"
                              >
                                <Eye className="h-4 w-4 text-stone-600" />
                              </button>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="rounded-lg bg-stone-100 p-2 hover:bg-stone-200 transition cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-stone-600" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className="rounded-lg bg-stone-100 p-2 hover:bg-red-100 transition cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4 text-stone-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4">
                  <p className="text-sm text-stone-500">Menampilkan {filteredNasabah.length} data</p>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === "katalog" && (
        <>
          {/* Katalog Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Katalog Harga Sampah</h2>
            <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </button>
          </div>

          {/* Horizontal Scroll Cards */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {wasteCatalog.map((item) => (
                <div
                  key={item.id}
                  className="w-72 rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                      <Package className="h-6 w-6 text-emerald-600" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${categoryColors[item.category]}`}>
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-900">{item.name}</h3>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">
                    Rp {item.price.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">per kg</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                    <Clock className="h-3 w-3" />
                    Update: {item.lastUpdate}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Chart */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Distribusi Harga per Kategori</h3>
            <div className="h-64 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {wasteCatalog.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.category === "KHUSUS" ? "#ef4444" : item.category === "ANORGANIK" ? "#3b82f6" : "#84cc16" }}
                      />
                      <span className="text-sm text-stone-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">Rp {item.price.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}