"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { transactionStatusLabel } from "@/lib/types";
import { getDashboardOverviewStats, type AdminStats, getAllTransactionsAdmin } from "@/app/actions/adminDashboard";
import { getActivityLog } from "@/app/actions/adminVerification";

type AdminTransaction = NonNullable<Awaited<ReturnType<typeof getAllTransactionsAdmin>>["data"]>[number];
type AdminActivityLog = NonNullable<Awaited<ReturnType<typeof getActivityLog>>["logs"]>[number];

function AdminGlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-dark-panel rounded-[28px] ${className}`}>
      {children}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTx, setRecentTx] = useState<AdminTransaction[]>([]);
  const [recentLogs, setRecentLogs] = useState<AdminActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [statsRes, txRes, logsRes] = await Promise.all([
          getDashboardOverviewStats(),
          getAllTransactionsAdmin(),
          getActivityLog(5),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }

        if (txRes.success && txRes.data) {
          setRecentTx(txRes.data.slice(0, 5));
        }

        if (logsRes.success && logsRes.logs) {
          setRecentLogs(logsRes.logs);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const totalBalance = stats?.totalBalance || 0;
  const todayWeight = stats?.todayWeight || 0;
  const pendingCount = stats?.pendingCount || 0;
  const activeNasabah = stats?.activeNasabahCount || 0;
  const monthlyByCategory = stats?.monthlyByCategory || [];
  const weeklyData = stats?.weeklyData || [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-white">Dashboard Admin</h1>
        <p className="text-sm text-slate-300">Pantau aktivitas Bank Sampah secara real-time.</p>
      </div>

      <section id="admin-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminGlassCard className="relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Total Saldo Nasabah
            </div>
            <p className="mt-3 text-3xl font-bold text-white">Rp {totalBalance.toLocaleString("id-ID")}</p>
            <p className="mt-1 text-xs text-slate-500">Akumulasi seluruh saldo aktif</p>
          </div>
        </AdminGlassCard>

        <AdminGlassCard className="relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-400/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5.0a48.392 48.392 0 012.916.52A6.003 6.003 0 0118.06 9.84M5.25 4.97A48.303 48.303 0 002.334 5.49 6.003 6.003 0 005.94 9.84m0 0a4.495 4.495 0 01-.9 7.41 4.5 4.5 0 01-3.45 1.235M5.94 9.84a4.493 4.493 0 00-1.245 3.66" />
              </svg>
              Berat Masuk Hari Ini
            </div>
            <p className="mt-3 text-3xl font-bold text-white">
              {todayWeight} <span className="text-lg text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Terverifikasi hari ini</p>
          </div>
        </AdminGlassCard>

        <AdminGlassCard className="relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
          <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-400/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Nasabah Aktif
            </div>
            <p className="mt-3 text-3xl font-bold text-white">
              {activeNasabah} <span className="text-lg text-slate-500">orang</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Total partisipan di sistem</p>
          </div>
        </AdminGlassCard>

        <Link href="/admin/transaksi" className="block">
          <AdminGlassCard className={`relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)] ${pendingCount > 0 ? "border-amber-400/25 bg-amber-500/10" : ""}`}>
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${pendingCount > 0 ? "bg-amber-300/12" : "bg-white/6"}`} />
            <div className="relative">
              <div className={`flex items-center gap-2 text-sm font-medium ${pendingCount > 0 ? "text-amber-200" : "text-slate-400"}`}>
                <svg className={`h-4 w-4 ${pendingCount > 0 ? "text-amber-300" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Pending Verification
              </div>
              <p className={`mt-3 text-3xl font-bold ${pendingCount > 0 ? "text-amber-100" : "text-white"}`}>
                {pendingCount}
                {pendingCount > 0 && <span className="ml-2 inline-flex h-3 w-3 animate-ping rounded-full bg-amber-400" />}
              </p>
              <p className={`mt-1 text-xs ${pendingCount > 0 ? "text-amber-200/80" : "text-slate-500"}`}>
                {pendingCount > 0 ? "Klik untuk validasi ->" : "Semua transaksi sudah diproses"}
              </p>
            </div>
          </AdminGlassCard>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminGlassCard className="p-5 sm:p-6">
          <h2 className="mb-6 text-lg font-semibold text-white">Tren Setoran 7 Hari Terakhir</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <RechartsTooltip cursor={{ fill: "#17212b" }} contentStyle={{ borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(15,23,32,0.92)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.2)" }} formatter={(value) => [`${value} kg`, "Berat"]} />
                <Bar dataKey="weight" name="Berat (kg)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminGlassCard>

        <AdminGlassCard className="p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Berat per Kategori (Bulan Ini)</h2>
          {monthlyByCategory.length > 0 ? (
            <div className="space-y-3">
              {monthlyByCategory.map((item, i) => {
                const max = monthlyByCategory[0].weight || 1;
                const pct = Math.round((item.weight / max) * 100);
                const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500"];
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-200">{item.name}</span>
                      <span className="font-semibold text-white">{item.weight} kg</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full transition-all duration-700 ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-slate-500">Belum ada data bulan ini.</div>
          )}
        </AdminGlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminGlassCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Transaksi Terbaru</h2>
            <Link href="/admin/transaksi" className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
              Lihat Semua {"->"}
            </Link>
          </div>
          <div className="divide-y divide-white/8">
            {recentTx.length > 0 ? (
              recentTx.map((tx) => (
                <div key={String(tx.id)} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{String(tx.user_id)}</p>
                    <p className="truncate text-xs text-slate-400">
                      {String(tx.waste_type)} · {Number(tx.estimated_weight)}kg · {String(tx.tx_id)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      tx.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : tx.status === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {transactionStatusLabel[tx.status as keyof typeof transactionStatusLabel] || String(tx.status)}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-slate-500">Belum ada transaksi</p>
            )}
          </div>
        </AdminGlassCard>

        <AdminGlassCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Aktivitas Terakhir</h2>
            <Link href="/admin/log" className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
              Lihat Semua {"->"}
            </Link>
          </div>
          <div className="divide-y divide-white/8">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 transition-colors hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{log.action}</p>
                    <span className="flex-shrink-0 text-[10px] text-slate-500">{log.adminName}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {log.targetId || log.targetType} - {log.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-slate-500">Belum ada log aktivitas</p>
            )}
          </div>
        </AdminGlassCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/transaksi" className="glass-dark-panel-soft group flex items-center gap-4 rounded-[28px] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-400/20 hover:bg-white/8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 transition-transform group-hover:scale-110">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Validasi Transaksi</p>
            <p className="text-xs text-slate-400">Proses setoran masuk</p>
          </div>
        </Link>
        <Link href="/admin/nasabah" className="glass-dark-panel-soft group flex items-center gap-4 rounded-[28px] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-400/20 hover:bg-white/8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 transition-transform group-hover:scale-110">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Kelola Nasabah</p>
            <p className="text-xs text-slate-400">Verifikasi dan manajemen akun</p>
          </div>
        </Link>
        <Link href="/admin/laporan" className="glass-dark-panel-soft group flex items-center gap-4 rounded-[28px] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-400/20 hover:bg-white/8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 transition-transform group-hover:scale-110">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-100">Buat Laporan</p>
            <p className="text-xs text-slate-400">Export data CSV / cetak PDF</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
