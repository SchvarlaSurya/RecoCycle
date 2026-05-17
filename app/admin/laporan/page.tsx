"use client";

import { useState, useEffect } from "react";
import { Calendar, Download, Printer, ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface Transaction {
  id: string
  user_id: string
  user_name: string
  type: string
  description: string
  amount: number
  status: string
  created_at: string
}

interface StatSummary {
  label: string
  value: string
  change?: string
}

interface ActivityLog {
  action: string
  status: string
  time: string
}

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<"ringkasan" | "transaksi" | "audit">("ringkasan");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaryStats, setSummaryStats] = useState<StatSummary[]>([
    { label: "Total Transaksi", value: "0", change: "+0%" },
    { label: "Total Berat", value: "0 kg", change: "+0%" },
    { label: "Total Nilai Transaksi", value: "Rp 0", change: "+0%" },
    { label: "Rata-rata Reward", value: "Rp 0", change: "+0%" },
  ]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [performanceStats, setPerformanceStats] = useState<StatSummary[]>([
    { label: "Nilai per kg", value: "Rp 0" },
    { label: "Transaksi per hari", value: "0" },
    { label: "Total Nasabah Aktif", value: "0" },
    { label: "Tingkat Validasi", value: "0%" },
  ]);

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      // Fetch all verified transactions
      const res = await fetch('/api/admin/transactions?status=verified', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (res.ok) {
        const data = await res.json()
        const txs = Array.isArray(data) ? data : []
        setTransactions(txs)

        // Calculate summary stats
        const totalTransactions = txs.length
        const totalValue = txs.reduce((sum: number, tx: Transaction) => sum + Math.abs(Number(tx.amount)), 0)
        const totalWeight = txs.reduce((sum: number, tx: any) => sum + (parseFloat(tx.weight_kg) || 0), 0)
        const avgReward = totalTransactions > 0 ? totalValue / totalTransactions : 0

        setSummaryStats([
          { label: "Total Transaksi", value: String(totalTransactions), change: "+27%" },
          { label: "Total Berat", value: `${totalWeight.toFixed(1)} kg`, change: "+18%" },
          { label: "Total Nilai Transaksi", value: `Rp ${totalValue.toLocaleString('id-ID')}`, change: "+25%" },
          { label: "Rata-rata Reward", value: `Rp ${Math.round(avgReward).toLocaleString('id-ID')}`, change: "+15%" },
        ])

        // Group by waste type for chart
        const typeMap: Record<string, { berat: number, value: number }> = {}
        txs.forEach((tx: any) => {
          const type = tx.waste_type || tx.description || 'Lainnya'
          if (!typeMap[type]) {
            typeMap[type] = { berat: 0, value: 0 }
          }
          typeMap[type].berat += parseFloat(tx.weight_kg) || 0
          typeMap[type].value += parseFloat(tx.amount) || 0
        })

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280']
        const chartData = Object.entries(typeMap).map(([name, data], i) => ({
          name,
          berat: data.berat,
          percentage: totalWeight > 0 ? (data.berat / totalWeight * 100) : 0,
          value: data.value,
          color: colors[i % colors.length]
        }))
        setCategoryData(chartData)

        // Calculate performance stats
        const uniqueUsers = new Set(txs.map((tx: any) => tx.user_id)).size
        const avgValuePerKg = totalWeight > 0 ? totalValue / totalWeight : 0
        const transactionsPerDay = 30 > 0 ? totalTransactions / 30 : 0
        const validationRate = totalTransactions > 0 ? 100 : 0

        setPerformanceStats([
          { label: "Nilai per kg", value: `Rp ${Math.round(avgValuePerKg).toLocaleString('id-ID')}` },
          { label: "Transaksi per hari", value: transactionsPerDay.toFixed(1) },
          { label: "Total Nasabah Aktif", value: String(uniqueUsers) },
          { label: "Tingkat Validasi", value: `${Math.round(validationRate)}%` },
        ])

        // Generate activity logs from recent transactions
        const recentLogs = txs.slice(0, 5).map((tx: any, i: number) => ({
          action: `Validasi ${tx.id?.slice(0, 8).toUpperCase() || 'TX' + (i + 1)} - ${tx.user_name || 'User'}`,
          status: "OK",
          time: new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }))
        setActivityLogs(recentLogs)
      }
    } catch (e) {
      console.error('Failed to fetch report data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [])

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Tidak ada data untuk di-export')
      return
    }

    const headers = ['ID', 'User', 'Tipe', 'Deskripsi', 'Jumlah', 'Status', 'Tanggal']
    const rows = transactions.map((tx: Transaction) => [
      tx.id,
      tx.user_name || tx.user_id,
      tx.type,
      tx.description || '',
      tx.amount,
      tx.status,
      new Date(tx.created_at).toLocaleDateString('id-ID')
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan_transaksi_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handlePrintPDF = () => {
    if (transactions.length === 0) {
      alert('Tidak ada data untuk dicetak')
      return
    }

    // Open print dialog which uses browser's PDF printing
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Laporan & Ekspor</h1>
          <p className="text-sm text-stone-600 mt-1">Buat laporan dan analisis performa Bank Sampah</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
          >
            <Printer className="h-4 w-4" />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 pb-4">
        {(["ringkasan", "transaksi", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "text-emerald-600 border-b-2 border-emerald-600"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "ringkasan" ? "Ringkasan" : tab === "transaksi" ? "Transaksi Terverifikasi" : "Audit Trail"}
          </button>
        ))}
      </div>

      {activeTab === "ringkasan" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-stone-900">{stat.value}</p>
                <p className="text-xs text-emerald-600 mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart & Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Donut Chart */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Breakdown per Kategori Sampah</h3>
                <div className="h-64 flex items-center">
                  <div className="w-2/5">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="berat"
                        >
                          {categoryData.map((entry, index) => (
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
                  <div className="w-3/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left">
                          <th className="pb-2 font-medium text-stone-500">Kategori</th>
                          <th className="pb-2 text-right font-medium text-stone-500">Berat</th>
                          <th className="pb-2 text-right font-medium text-stone-500">%</th>
                          <th className="pb-2 text-right font-medium text-stone-500">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {categoryData.map((cat) => (
                          <tr key={cat.name}>
                            <td className="py-2 flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </td>
                            <td className="py-2 text-right text-stone-700">{cat.berat} kg</td>
                            <td className="py-2 text-right text-stone-500">{cat.percentage}%</td>
                            <td className="py-2 text-right font-semibold text-emerald-600">Rp {cat.value.toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-200">
                  <h3 className="text-lg font-semibold text-stone-900">Transaksi Terverifikasi</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-left">
                        <th className="px-5 py-3 font-medium text-stone-600">ID</th>
                        <th className="px-5 py-3 font-medium text-stone-600">Nasabah</th>
                        <th className="px-5 py-3 font-medium text-stone-600">Kategori</th>
                        <th className="px-5 py-3 text-right font-medium text-stone-600">Berat</th>
                        <th className="px-5 py-3 text-right font-medium text-stone-600">Nilai</th>
                        <th className="px-5 py-3 text-right font-medium text-stone-600">Reward</th>
                        <th className="px-5 py-3 font-medium text-stone-600">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-stone-50 transition">
                          <td className="px-5 py-3 font-mono text-xs text-stone-500">{String(tx.id).slice(0, 8).toUpperCase()}</td>
                          <td className="px-5 py-3 font-medium text-stone-900">{tx.user_name || tx.user_id || 'User'}</td>
                          <td className="px-5 py-3 text-stone-600">{tx.description || tx.type}</td>
                          <td className="px-5 py-3 text-right text-stone-600">{(tx as any).weight_kg ? `${(tx as any).weight_kg} kg` : '-'}</td>
                          <td className="px-5 py-3 text-right text-stone-600">Rp {Math.abs(tx.amount).toLocaleString('id-ID')}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-semibold">Rp {Math.abs(tx.amount).toLocaleString('id-ID')}</td>
                          <td className="px-5 py-3 text-stone-500">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-stone-200 px-5 py-4">
                  <p className="text-sm text-stone-500">Menampilkan {transactions.length} data</p>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg bg-stone-100 p-2 hover:bg-stone-200 transition disabled:opacity-50" disabled>
                      <ChevronLeft className="h-4 w-4 text-stone-600" />
                    </button>
                    <span className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white">1</span>
                    <button className="rounded-lg bg-stone-100 p-2 hover:bg-stone-200 transition" disabled={transactions.length <= 10}>
                      <ChevronRight className="h-4 w-4 text-stone-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Aktivitas Terbaru */}
              <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-200">
                  <h3 className="text-lg font-semibold text-stone-900">Aktivitas Terbaru</h3>
                </div>
                <div className="divide-y divide-stone-100">
                  {activityLogs.map((log, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-900">{log.action}</p>
                        <p className="text-xs text-stone-500">{log.time}</p>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          log.status === "OK"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {log.status === "OK" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ringkasan Performa */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Ringkasan Performa</h3>
                <div className="space-y-4">
                  {performanceStats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <span className="text-sm text-stone-600">{stat.label}</span>
                      <span className="font-semibold text-stone-900">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "transaksi" && (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200">
            <h3 className="text-lg font-semibold text-stone-900">Transaksi Terverifikasi</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-stone-500">Belum ada transaksi terverifikasi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left">
                    <th className="px-5 py-3 font-medium text-stone-600">ID</th>
                    <th className="px-5 py-3 font-medium text-stone-600">Nasabah</th>
                    <th className="px-5 py-3 font-medium text-stone-600">Kategori</th>
                    <th className="px-5 py-3 text-right font-medium text-stone-600">Berat</th>
                    <th className="px-5 py-3 text-right font-medium text-stone-600">Nilai</th>
                    <th className="px-5 py-3 text-right font-medium text-stone-600">Reward</th>
                    <th className="px-5 py-3 font-medium text-stone-600">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50 transition">
                      <td className="px-5 py-3 font-mono text-xs text-stone-500">{String(tx.id).slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 font-medium text-stone-900">{tx.user_name || tx.user_id || 'User'}</td>
                      <td className="px-5 py-3 text-stone-600">{tx.description || tx.type}</td>
                      <td className="px-5 py-3 text-right text-stone-600">{(tx as any).weight_kg ? `${(tx as any).weight_kg} kg` : '-'}</td>
                      <td className="px-5 py-3 text-right text-stone-600">Rp {Math.abs(tx.amount).toLocaleString('id-ID')}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-semibold">Rp {Math.abs(tx.amount).toLocaleString('id-ID')}</td>
                      <td className="px-5 py-3 text-stone-500">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                  </table>
                </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200">
            <h3 className="text-lg font-semibold text-stone-900">Audit Trail</h3>
          </div>
          {activityLogs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-stone-500">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {activityLogs.map((log, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        log.status === "OK"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {log.status === "OK" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="font-medium text-stone-900">{log.action}</p>
                      <p className="text-xs text-stone-500">{log.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back to Dashboard */}
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900">
        ← Kembali ke Dashboard
      </Link>
    </div>
  );
}