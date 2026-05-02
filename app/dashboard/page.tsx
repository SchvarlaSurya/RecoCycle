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

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-[30px] ${className}`}>
      {children}
    </div>
  );
}

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
      const wMins = Math.floor((weekDiff / 1000 / 60) % 60);
      const wSecs = Math.floor((weekDiff / 1000) % 60);
      setTimeToWeekEnd(`${wDays} Hari ${wHours.toString().padStart(2, "0")}:${wMins.toString().padStart(2, "0")}:${wSecs.toString().padStart(2, "0")}`);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthDiff = Math.max(0, endOfMonth.getTime() - now.getTime());

      const mDays = Math.floor(monthDiff / (1000 * 60 * 60 * 24));
      const mHours = Math.floor((monthDiff / (1000 * 60 * 60)) % 24);
      const mMins = Math.floor((monthDiff / 1000 / 60) % 60);
      const mSecs = Math.floor((monthDiff / 1000) % 60);
      setTimeToMonthEnd(`${mDays} Hari ${mHours.toString().padStart(2, "0")}:${mMins.toString().padStart(2, "0")}:${mSecs.toString().padStart(2, "0")}`);
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
      badge: "bg-white/12 text-amber-100 ring-1 ring-white/15",
      label: "text-amber-100/75",
      subtle: "text-amber-50/80",
      progressTrack: "bg-white/12",
      progressBar: "from-amber-100 via-white to-amber-200",
      accent: "text-white",
      button: "border-white/20 bg-white/10 text-white hover:bg-white/16",
      icon: "text-amber-100/10",
    },
    Silver: {
      shell: "from-slate-500 via-slate-600 to-slate-800",
      badge: "bg-white/12 text-slate-100 ring-1 ring-white/15",
      label: "text-slate-200/80",
      subtle: "text-slate-100/85",
      progressTrack: "bg-white/14",
      progressBar: "from-white via-slate-100 to-slate-200",
      accent: "text-white",
      button: "border-white/20 bg-white/10 text-white hover:bg-white/16",
      icon: "text-white/10",
    },
    Gold: {
      shell: "from-yellow-500 via-amber-500 to-orange-700",
      badge: "bg-white/14 text-yellow-50 ring-1 ring-white/15",
      label: "text-yellow-50/80",
      subtle: "text-yellow-50/90",
      progressTrack: "bg-white/16",
      progressBar: "from-white via-yellow-100 to-amber-100",
      accent: "text-white",
      button: "border-white/20 bg-white/10 text-white hover:bg-white/16",
      icon: "text-white/10",
    },
    Platinum: {
      shell: "from-cyan-500 via-sky-600 to-indigo-800",
      badge: "bg-white/14 text-cyan-50 ring-1 ring-white/15",
      label: "text-cyan-50/80",
      subtle: "text-cyan-50/90",
      progressTrack: "bg-white/16",
      progressBar: "from-white via-cyan-100 to-sky-100",
      accent: "text-white",
      button: "border-white/20 bg-white/10 text-white hover:bg-white/16",
      icon: "text-white/10",
    },
  } as const;
  const cardStyle = tierStyles[tier as keyof typeof tierStyles] ?? tierStyles.Bronze;
  const progressLabel = nextTierWeight > 0 ? `${Math.min(totalWeight, nextTierWeight)}/${nextTierWeight} kg` : `${totalWeight} kg`;
  const nextTierName = tier === "Bronze" ? "Silver" : tier === "Silver" ? "Gold" : tier === "Gold" ? "Platinum" : "Platinum";

  return (
    <div className="mx-auto w-full space-y-6 pb-12">
      <div className="mb-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Ringkasan Dasbor</h1>
          <p className="mt-1 text-sm text-stone-700">Pantau pergerakan statistik daur ulang secara real-time.</p>
        </div>

        <div className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br ${cardStyle.shell} p-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.18)]`}>
          <div className={`pointer-events-none absolute -right-7 top-3 ${cardStyle.icon}`}>
            <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${cardStyle.label}`}>Status Member</p>
                <h2 className="mt-2 text-4xl font-semibold italic tracking-tight text-white">{tier} Tier</h2>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${cardStyle.badge}`}>
                +{bonusPercentage}% bonus
              </span>
            </div>

            {nextTierWeight > 0 ? (
              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`text-xs font-medium ${cardStyle.subtle}`}>{progressLabel}</span>
                  <span className={`text-xs font-medium ${cardStyle.subtle}`}>Menuju {nextTierWeight} kg</span>
                </div>
                <div className={`h-2.5 w-full overflow-hidden rounded-full ${cardStyle.progressTrack}`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${cardStyle.progressBar} shadow-[0_0_14px_rgba(255,255,255,0.65)] transition-all duration-500`}
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className={`max-w-[16rem] text-sm leading-6 ${cardStyle.subtle}`}>
                    Upgrade ke <span className={`font-semibold ${cardStyle.accent}`}>{nextTierName}</span> untuk bonus harga setoran yang lebih tinggi.
                  </p>
                  <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${cardStyle.button}`}>
                    Progress
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7 flex items-end justify-between gap-4">
                <p className={`max-w-[17rem] text-sm leading-6 ${cardStyle.subtle}`}>
                  Kamu sudah berada di level tertinggi. Semua setoran berikutnya mendapat bonus harga tier maksimum.
                </p>
                <div className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${cardStyle.button}`}>
                  Tier Maksimal
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
          <p className="text-sm font-medium text-stone-700">Total Sampah Dikumpulkan</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {totalSampah} <span className="text-lg text-stone-600">kg</span>
          </p>
        </GlassCard>
        <GlassCard className="p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
          <p className="text-sm font-medium text-stone-700">Total Transaksi</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">
            {totalTransaksi} <span className="text-lg text-stone-600">kali</span>
          </p>
        </GlassCard>
        <GlassCard className="bg-gradient-to-br from-emerald-50/90 to-white/70 p-5 shadow-[0_16px_40px_rgba(16,185,129,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,185,129,0.12)]">
          <p className="text-sm font-medium text-emerald-800">Saldo Tersedia</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">Rp {balance.toLocaleString("id-ID")}</p>
        </GlassCard>
        <GlassCard className="p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
          <p className="text-sm font-medium text-stone-700">Total Poin / Saldo Ditukar</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">Rp {totalDitarik.toLocaleString("id-ID")}</p>
        </GlassCard>
      </section>

      <section className="my-6">
        <TrashScanner />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Tren Setoran Global Mingguan (kg)</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <div className="rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                Mingguan Reset: <span className="ml-1 font-mono tracking-tight text-emerald-700">{timeToWeekEnd}</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={globalWeekly} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#78716c" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#78716c" }} />
                <RechartsTooltip cursor={{ fill: "#f5f5f4" }} contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="weight" name="Berat (kg)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-stone-900">Distribusi Global Bulanan (Volume)</h2>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <div className="rounded-md border border-stone-200 bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                Bulanan Reset: <span className="ml-1 font-mono tracking-tight text-amber-700">{timeToMonthEnd}</span>
              </div>
            </div>
          </div>
          <div className="flex min-h-[280px] w-full flex-1 flex-col gap-6 md:flex-row md:items-center">
            {globalDist.length > 0 ? (
              <>
                <div className="h-[240px] w-full md:w-[55%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={globalDist} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                        {globalDist.map((entry, index) => (
                          <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} kg`, "Volume Global"]} contentStyle={{ borderRadius: "1rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex max-h-[240px] w-full flex-col gap-3 overflow-y-auto pr-2 md:w-[45%]">
                  {globalDist.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-lg border-b border-stone-50 px-2 py-1 text-sm transition-colors last:border-0 hover:bg-stone-50">
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <div className="h-3 w-3 flex-shrink-0 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate font-medium text-stone-700" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="ml-2 flex-shrink-0 font-semibold text-stone-900">{entry.value} kg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[240px] w-full items-center justify-center text-stone-400">Belum ada data setoran.</div>
            )}
          </div>
        </GlassCard>
      </section>

      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/55 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Setoran Terbaru</h2>
            <p className="text-sm text-stone-600">Riwayat transaksi terakhir yang berhasil masuk.</p>
          </div>
        </div>
        <div className="divide-y divide-white/55">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((item) => (
              <div key={item.id} className="group flex cursor-default flex-col gap-2 px-5 py-4 transition-colors hover:bg-emerald-50/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="font-semibold text-stone-900 transition-colors group-hover:text-emerald-800">{item.type}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-stone-700">{item.date}</span>
                    <span className="text-stone-300">&bull;</span>
                    <span className="text-sm font-medium text-stone-700">{item.weight} kg</span>
                    <span className="text-stone-300">&bull;</span>
                    <span className="text-xs font-medium uppercase tracking-wider text-stone-600">{item.id}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col items-end gap-1 sm:mt-0">
                  <p className="font-bold text-emerald-700">+ Rp {item.reward.toLocaleString("id-ID")}</p>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-stone-600">Belum ada setoran masuk.</div>
          )}
        </div>
      </GlassCard>

      {loading && <div className="hidden" aria-hidden="true" />}
    </div>
  );
}
