"use client";

import { useMemo, useEffect, useState } from "react";
import { useWasteStore, useUserTier, type Transaction, type Withdrawal } from "@/store/useWasteStore";
import { getUserDashboardData, getGlobalWasteStats } from "@/app/actions/transaction";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import TrashScanner from "@/components/TrashScanner";

const COLORS = ["#047857", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#065f46"];

export default function DashboardPage() {
  const { balance, transactions, isHydrated, initStore } = useWasteStore();
  const [loading, setLoading] = useState(!isHydrated);
  const [globalDist, setGlobalDist] = useState<{ name: string; value: number }[]>([]);
  const [globalWeekly, setGlobalWeekly] = useState<{ date: string; weight: number }[]>([]);
  const [timeToWeekEnd, setTimeToWeekEnd] = useState<string>("");
  const [timeToMonthEnd, setTimeToMonthEnd] = useState<string>("");

  useEffect(() => {
    Promise.all([getUserDashboardData(), getGlobalWasteStats()])
      .then(([userRes, globalRes]) => {
        if (userRes.success) {
          initStore(
            userRes.balance || 0,
            (userRes.transactions ?? []) as Transaction[],
            (userRes.withdrawals ?? []) as Withdrawal[]
          );
        }
        if (globalRes.success && globalRes.distributionData && globalRes.weeklyData) {
          setGlobalDist(globalRes.distributionData);
          setGlobalWeekly(globalRes.weeklyData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setLoading(false);
      });
  }, [initStore]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();

      const day = now.getDay();
      const diffToSunday = day === 0 ? 0 : 7 - day;
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToSunday, 23, 59, 59, 999);
      const weekDiff = Math.max(0, endOfWeek.getTime() - now.getTime());

      const wDays = Math.floor(weekDiff / (1000 * 60 * 60 * 24));
      const wHours = Math.floor((weekDiff / (1000 * 60 * 60)) % 24);
      const wMins = Math.floor((weekDiff / (1000 * 60) % 60));
      const wSecs = Math.floor((weekDiff / 1000) % 60);
      setTimeToWeekEnd(`${wDays}d ${wHours.toString().padStart(2, "0")}:${wMins.toString().padStart(2, "0")}:${wSecs.toString().padStart(2, "0")}`);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthDiff = Math.max(0, endOfMonth.getTime() - now.getTime());

      const mDays = Math.floor(monthDiff / (1000 * 60 * 60 * 24));
      const mHours = Math.floor((monthDiff / (1000 * 60 * 60)) % 24);
      const mMins = Math.floor((monthDiff / (1000 * 60) % 60));
      const mSecs = Math.floor((monthDiff / 1000) % 60);
      setTimeToMonthEnd(`${mDays}d ${mHours.toString().padStart(2, "0")}:${mMins.toString().padStart(2, "0")}:${mSecs.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSampah = useMemo(() => transactions.reduce((acc, tx) => acc + tx.weight, 0), [transactions]);
  const totalNilai = useMemo(() => transactions.reduce((acc, tx) => acc + tx.reward, 0), [transactions]);
  const totalTransaksi = transactions.length;

  const initialDummyTotal = 98600;
  const baseBalance = 875000;
  const accumulatedRewards = totalNilai - initialDummyTotal;
  const theoreticalBalance = baseBalance + accumulatedRewards;
  const totalDitarik = theoreticalBalance > balance ? theoreticalBalance - balance : 0;

  const recentTransactions = transactions.slice(0, 5);
  const { tier, totalWeight, bonusPercentage, nextTierWeight, progressToNext } = useUserTier();
  const tierStyles = {
    Bronze: {
      shell: "from-amber-700 via-amber-800 to-stone-950",
      badge: "bg-amber-400/20 text-amber-100",
      label: "text-amber-200/80",
      subtle: "text-amber-100/85",
      progressTrack: "bg-white/15",
      progressBar: "from-amber-200 via-white to-amber-100",
      accent: "text-amber-200",
      icon: "text-amber-200/10",
    },
    Silver: {
      shell: "from-slate-400 via-slate-500 to-slate-700",
      badge: "bg-white/15 text-slate-100",
      label: "text-slate-200/80",
      subtle: "text-slate-100/85",
      progressTrack: "bg-white/15",
      progressBar: "from-slate-200 via-white to-slate-100",
      accent: "text-slate-200",
      icon: "text-slate-200/10",
    },
    Gold: {
      shell: "from-yellow-500 via-amber-500 to-orange-700",
      badge: "bg-yellow-300/20 text-yellow-100",
      label: "text-yellow-100/90",
      subtle: "text-yellow-100/95",
      progressTrack: "bg-white/15",
      progressBar: "from-yellow-200 via-white to-amber-200",
      accent: "text-yellow-100",
      icon: "text-yellow-200/10",
    },
    Platinum: {
      shell: "from-cyan-400 via-sky-500 to-indigo-700",
      badge: "bg-cyan-300/20 text-cyan-100",
      label: "text-cyan-100/90",
      subtle: "text-cyan-100/95",
      progressTrack: "bg-white/15",
      progressBar: "from-cyan-200 via-white to-sky-200",
      accent: "text-cyan-100",
      icon: "text-cyan-200/10",
    },
  } as const;
  const cardStyle = tierStyles[tier as keyof typeof tierStyles] ?? tierStyles.Bronze;
  const progressLabel = nextTierWeight > 0 ? `${Math.min(totalWeight, nextTierWeight)}/${nextTierWeight} kg` : `${totalWeight} kg`;
  const nextTierName = tier === "Bronze" ? "Silver" : tier === "Silver" ? "Gold" : tier === "Gold" ? "Platinum" : "Platinum";

  return (
    <div className="mx-auto w-full space-y-6 pb-12">
      {/* Header + Tier Card Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Title */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-semibold text-stone-900">Ringkasan Dasbor</h1>
          <p className="mt-1 text-sm text-stone-700">Pantau pergerakan statistik daur ulang secara real-time.</p>
        </div>

        {/* Tier Status Card */}
        <div className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${cardStyle.shell} p-5 text-white shadow-xl lg:w-80 lg:flex-shrink-0`}>
          {/* Decorative icon */}
          <div className={`absolute -right-4 -top-4 ${cardStyle.icon}`}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>

          <div className="relative z-10 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-widest ${cardStyle.label}`}>Status Member</p>
                <h2 className="mt-1 text-2xl font-bold italic tracking-tight text-white">{tier}</h2>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cardStyle.badge}`}>
                +{bonusPercentage}%
              </span>
            </div>

            {/* Progress section */}
            {nextTierWeight > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className={cardStyle.subtle}>{progressLabel}</span>
                  <span className={cardStyle.subtle}>{progressToNext.toFixed(0)}%</span>
                </div>
                <div className={`h-2 w-full overflow-hidden rounded-full ${cardStyle.progressTrack}`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${cardStyle.progressBar}`}
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
                <p className={`text-xs ${cardStyle.subtle}`}>
                  Menuju <span className={`font-semibold ${cardStyle.accent}`}>{nextTierName}</span> · {nextTierWeight} kg
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className={`text-xs font-medium ${cardStyle.subtle}`}>Tier Tertinggi Tercapai</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-stone-700">Total Sampah Dikumpulkan</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {totalSampah} <span className="text-lg font-normal text-stone-500">kg</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-stone-700">Total Transaksi</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {totalTransaksi} <span className="text-lg font-normal text-stone-500">kali</span>
          </p>
        </GlassCard>
        <GlassCard className="bg-gradient-to-br from-emerald-50/90 to-white/70 p-5 shadow-[0_16px_40px_rgba(16,185,129,0.10)]">
          <p className="text-sm font-medium text-emerald-800">Saldo Tersedia</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">Rp {balance.toLocaleString("id-ID")}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-stone-700">Total Saldo Ditukar</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">Rp {totalDitarik.toLocaleString("id-ID")}</p>
        </GlassCard>
      </section>

      {/* Trash Scanner */}
      <section>
        <TrashScanner />
      </section>

      {/* Charts Row */}
      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">Tren Mingguan</h2>
            <div className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-xs text-emerald-700">{timeToWeekEnd}</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={globalWeekly} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} />
                <RechartsTooltip cursor={{ fill: "#f5f5f4" }} contentStyle={{ borderRadius: "0.75rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="weight" name="Berat" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">Distribusi Bulanan</h2>
            <div className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="font-mono text-xs text-amber-700">{timeToMonthEnd}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {globalDist.length > 0 ? (
              <>
                <div className="h-52 w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={globalDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {globalDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} kg`, "Volume"]} contentStyle={{ borderRadius: "0.75rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 sm:w-1/2">
                  {globalDist.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-lg bg-stone-50/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium text-stone-700">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-stone-900">{entry.value} kg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-52 w-full items-center justify-center text-stone-400 text-sm">Belum ada data</div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* Recent Transactions */}
      <GlassCard className="overflow-hidden">
        <div className="border-b border-white/55 px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="text-lg font-semibold text-stone-900">Setoran Terbaru</h2>
          <p className="mt-0.5 text-sm text-stone-600">Riwayat transaksi terakhir yang berhasil masuk.</p>
        </div>
        <div className="divide-y divide-white/55">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-emerald-50/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="font-semibold text-stone-900">{item.type}</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-stone-600">
                    <span>{item.date}</span>
                    <span className="text-stone-300">•</span>
                    <span className="font-medium">{item.weight} kg</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <p className="font-bold text-emerald-700">+ Rp {item.reward.toLocaleString("id-ID")}</p>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-stone-500">Belum ada setoran masuk.</div>
          )}
        </div>
      </GlassCard>

      {loading && <div className="hidden" aria-hidden="true" />}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[24px] border border-white/50 bg-white/70 backdrop-blur-sm p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}