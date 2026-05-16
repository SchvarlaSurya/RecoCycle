"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@clerk/nextjs";
import { Eye, EyeOff, Loader2, Info, ChevronDown, ArrowUpRight, ArrowDownLeft, Gift, Wallet, CheckCircle, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

const schema = z.object({
  method: z.string().min(1, "Pilih metode penarikan"),
  accountName: z.string().min(2, "Nama minimal 2 karakter"),
  accountNumber: z.string().min(5, "Nomor minimal 5 digit"),
  amount: z.string().min(1, "Masukkan nominal").refine((val) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""));
    return !isNaN(num) && num >= 50000;
  }, "Minimal penarikan Rp 50.000"),
});

type FormData = z.infer<typeof schema>;

const withdrawalMethods = [
  { id: "bca", name: "Transfer Bank BCA" },
  { id: "mandiri", name: "Transfer Bank Mandiri" },
  { id: "bni", name: "Transfer Bank BNI" },
  { id: "bri", name: "Transfer Bank BRI" },
  { id: "bjb", name: "Transfer Bank BJB" },
  { id: "gopay", name: "GoPay" },
  { id: "dana", name: "DANA" },
  { id: "ovo", name: "OVO" },
];

const statusColors: Record<string, string> = {
  TERVERIFIKASI: "bg-emerald-100 text-emerald-700",
  SELESAI: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  DITOLAK: "bg-red-100 text-red-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  MENUNGGU_VERIFIKASI: "bg-amber-100 text-amber-700",
  "MENUNGGU VERIFIKASI": "bg-amber-100 text-amber-700",
};

const typeColors: Record<string, string> = {
  setoran: "text-emerald-600 bg-emerald-50",
  reward: "text-amber-600 bg-amber-50",
  penarikan: "text-red-600 bg-red-50",
};

interface Activity {
  id: string
  type: string
  icon: any
  desc: string
  status: string
  date: string
  amount: number
}

const getIcon = (type: string) => {
  switch (type) {
    case 'setoran': return ArrowDownLeft;
    case 'reward': return Gift;
    case 'penarikan': return ArrowUpRight;
    default: return ArrowDownLeft;
  }
};

export default function TarikSaldoPage() {
  const { user } = useUser();
  const [showBalance, setShowBalance] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"semua" | "setoran" | "reward" | "penarikan">("semua");
  const [selectedMonth, setSelectedMonth] = useState("Mei 2026");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [balance, setBalance] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<number | null>(null);
  const [totalSetoran, setTotalSetoran] = useState({ amount: 0, count: 0 });
  const [totalReward, setTotalReward] = useState({ amount: 0, count: 0 });
  const [totalPenarikan, setTotalPenarikan] = useState({ amount: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: "",
      accountName: "",
      accountNumber: "",
      amount: "",
    },
  });

  const watchedAmount = watch("amount");
  const rawAmount = parseInt(watchedAmount?.replace(/[^0-9]/g, "") || "0");

  // Fetch user data and activities
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true)
      try {
        // Fetch user balance from user dashboard API
        const dashboardRes = await fetch(`/api/user/dashboard?userId=${user.id}`)
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json()
          setBalance(dashboardData.balance || 0)
          setTotalSetoran({ amount: dashboardData.total_setoran || 0, count: Math.floor((dashboardData.total_setoran || 0) / 100000) })
          setTotalReward({ amount: dashboardData.total_reward || 0, count: Math.floor((dashboardData.total_reward || 0) / 50000) })
          setTotalPenarikan({ amount: dashboardData.total_penarikan || 0, count: Math.floor((dashboardData.total_penarikan || 0) / 100000) })

          // Format transactions with correct amounts
          if (dashboardData.transactions && Array.isArray(dashboardData.transactions)) {
            const formatted: Activity[] = dashboardData.transactions.map((tx: any) => {
              // Always normalize: setoran/reward = positive, penarikan = negative
              const isPenarikan = tx.type === 'penarikan'
              const rawAmount = parseFloat(String(tx.amount).replace(/[^0-9]/g, '')) || 0

              return {
                id: tx.id,
                type: tx.type || 'setoran',
                icon: getIcon(tx.type),
                desc: tx.description || (isPenarikan ? 'Penarikan Saldo' : 'Setoran Sampah'),
                status: normalizeStatus(tx.status),
                date: new Date(tx.created_at).toLocaleDateString('id-ID'),
                amount: isPenarikan ? -rawAmount : rawAmount // Penarikan always negative, setoran always positive
              }
            })
            setActivities(formatted)
          }

          // Set pending withdrawal
          if (dashboardData.pendingWithdrawal) {
            setPendingWithdrawal(dashboardData.pendingWithdrawal)
          }
        }

        // Fetch pending withdrawals separately
        try {
          const pendingRes = await fetch(`/api/withdrawal?userId=${user.id}&status=Menunggu Verifikasi`, {
            headers: { 'x-admin-secret': ADMIN_SECRET }
          })
          if (pendingRes.ok) {
            const pending = await pendingRes.json()
            if (Array.isArray(pending) && pending.length > 0) {
              const totalPending = pending.reduce((sum: number, w: any) => {
                const amount = parseFloat(String(w.amount).replace(/[^0-9]/g, '')) || 0
                return sum + amount
              }, 0)
              setPendingWithdrawal(totalPending)
            }
          }
        } catch (e) {
          console.log('No pending withdrawals')
        }
      } catch (e) {
        console.error('Failed to fetch data:', e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Helper to normalize status
  const normalizeStatus = (status: string): string => {
    if (!status) return 'PENDING'
    const s = status.toLowerCase()
    if (s.includes('selesai') || s.includes('verified') || s.includes('complete')) return 'SELESAI'
    if (s.includes('ditolak') || s.includes('reject')) return 'DITOLAK'
    if (s.includes('menunggu') || s.includes('pending')) return 'PENDING'
    return status.toUpperCase()
  }

  const filteredActivities = activities.filter((activity) => {
    if (activeTab === "semua") return true;
    return activity.type === activeTab;
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setSubmitError("Silakan login terlebih dahulu")
      return
    }

    const methodName = withdrawalMethods.find(m => m.id === data.method)?.name || data.method

    const submittedAmount = watchedAmount?.replace(/\./g, '') || rawAmount.toString()

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: data.method,
          methodName,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          amount: submittedAmount,
          userId: user.id,
          userName: user.firstName || user.username || 'User'
        })
      })

      const result = await res.json()

      if (result.success) {
        setBalance(prev => prev - rawAmount)
        setSubmitSuccess(true)
        reset()

        const newActivity: Activity = {
          id: result.data?.id || crypto.randomUUID(),
          type: 'penarikan',
          icon: ArrowUpRight,
          desc: `Transfer ke ${methodName}`,
          status: 'PENDING',
          date: new Date().toLocaleDateString('id-ID'),
          amount: -rawAmount
        }
        setActivities(prev => [newActivity, ...prev])
      } else {
        setSubmitError(typeof result.error === 'string' ? result.error : 'Terjadi kesalahan saat memproses penarikan')
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("id-ID");
  };

  const availableBalance = balance;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Top Section - Balance Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">Saldo Tersedia</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {isLoading ? 'Memuat...' : (showBalance ? `Rp ${formatCurrency(availableBalance)}` : "Rp ••••••••")}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="rounded-full bg-white/20 p-1.5 transition hover:bg-white/30 cursor-pointer"
                  >
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 cursor-pointer">
                Tarik Saldo
              </button>
            </div>

            {/* Wallet Summary */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-emerald-200" />
                  <span className="text-xs text-emerald-100">Total Setoran</span>
                </div>
                <p className="mt-1 text-lg font-bold">Rp {formatCurrency(totalSetoran.amount)}</p>
                <p className="text-xs text-emerald-200">{totalSetoran.count} transaksi</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-200" />
                  <span className="text-xs text-emerald-100">Total Reward</span>
                </div>
                <p className="mt-1 text-lg font-bold">Rp {formatCurrency(totalReward.amount)}</p>
                <p className="text-xs text-emerald-200">{totalReward.count} transaksi</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-4">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-red-200" />
                  <span className="text-xs text-emerald-100">Total Penarikan</span>
                </div>
                <p className="mt-1 text-lg font-bold">Rp {formatCurrency(totalPenarikan.amount)}</p>
                <p className="text-xs text-emerald-200">{totalPenarikan.count} transaksi</p>
              </div>
            </div>

            {/* Pending Withdrawal Alert */}
            {pendingWithdrawal !== null && pendingWithdrawal > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-200" />
                  <span className="text-sm">Penarikan pending: Rp {formatCurrency(pendingWithdrawal || 0)}</span>
                </div>
                <span className="text-xs bg-amber-500/50 px-2 py-1 rounded-full">Menunggu verifikasi</span>
              </div>
            )}

            <p className="mt-4 text-xs text-emerald-200">
              Saldo terakhir diperbarui {new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}, WIB
            </p>
          </div>
        </div>

        {/* Right Side - Info */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Ringkasan
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Total Setoran</span>
                <span className="font-semibold text-emerald-700">Rp {formatCurrency(totalSetoran.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Total Reward</span>
                <span className="font-semibold text-amber-600">Rp {formatCurrency(totalReward.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Total Penarikan</span>
                <span className="font-semibold text-red-600">-Rp {formatCurrency(totalPenarikan.amount)}</span>
              </div>
              <div className="border-t border-stone-200 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-stone-900">Saldo Aktif</span>
                  <span className="font-bold text-emerald-700">Rp {formatCurrency(availableBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Withdrawal Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-stone-900">Form Penarikan Dana</h2>
            <p className="mt-1 text-sm text-stone-600">Pindahkan saldo ke rekening bank atau e-wallet.</p>

            <div className="mt-6 space-y-5">
              {/* Metode Penarikan */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Metode Penarikan
                </label>
                <div className="relative">
                  <select
                    {...register("method")}
                    className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  >
                    <option value="">-- Pilih Metode --</option>
                    {withdrawalMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                </div>
                {errors.method && (
                  <p className="mt-1 text-xs text-red-600">{errors.method.message}</p>
                )}
              </div>

              {/* Nama & Nomor */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Nama Pemilik Akun / Rekening
                  </label>
                  <input
                    {...register("accountName")}
                    type="text"
                    placeholder="Nama di buku tabungan"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.accountName && (
                    <p className="mt-1 text-xs text-red-600">{errors.accountName.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Nomor Rekening / HP
                  </label>
                  <input
                    {...register("accountNumber")}
                    type="text"
                    placeholder="Contoh: 08123456789"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.accountNumber && (
                    <p className="mt-1 text-xs text-red-600">{errors.accountNumber.message}</p>
                  )}
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Nominal Penarikan (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-500">Rp</span>
                  <input
                    {...register("amount")}
                    type="text"
                    value={watchedAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setValue("amount", raw ? parseInt(raw).toLocaleString("id-ID") : "");
                    }}
                    placeholder="50.000"
                    className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
                )}
                <p className="mt-1 text-xs text-stone-500">Minimal penarikan Rp 50.000</p>
              </div>

              {/* Info Banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Penarikan akan diverifikasi oleh tim admin kami dalam 1x24 jam kerja.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  "Tarik Dana Sekarang"
                )}
              </button>

              {submitError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  <X className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Side - Info Penting */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900">
              <Info className="h-5 w-5 text-emerald-600" />
              Informasi Penting
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-stone-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                Penarikan akan diverifikasi oleh tim admin kami dalam maksimal 1x24 jam kerja.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                Minimal penarikan e-wallet Rp 50.000, transfer bank Rp 100.000.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                Pastikan nama dan nomor rekening sudah benar sebelum mengirim.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                Saldo yang sudah ditarik tidak dapat dibatalkan atau dikembalikan.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom - Riwayat Aktivitas */}
      <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-stone-900">Riwayat Aktivitas</h2>

          <div className="flex items-center gap-4">
            {/* Tabs */}
            <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-1">
              {(["semua", "setoran", "reward", "penarikan"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    activeTab === tab
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Month Filter */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-xl border border-stone-200 bg-white px-4 py-2 pr-10 text-sm outline-none transition focus:border-emerald-500 cursor-pointer"
              >
                <option>Mei 2026</option>
                <option>April 2026</option>
                <option>Maret 2026</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>Belum ada aktivitas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="pb-3 text-left font-medium text-stone-600">Aktivitas</th>
                  <th className="pb-3 text-left font-medium text-stone-600">Status</th>
                  <th className="pb-3 text-left font-medium text-stone-600">Tanggal</th>
                  <th className="pb-3 text-right font-medium text-stone-600">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-stone-50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("rounded-xl p-2", typeColors[activity.type] || 'bg-stone-100 text-stone-600')}>
                          <activity.icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-stone-900">{activity.desc}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusColors[activity.status] || 'bg-stone-100 text-stone-600')}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="py-4 text-stone-600">{activity.date}</td>
                    <td className={cn("py-4 text-right font-semibold", activity.amount > 0 ? "text-emerald-700" : "text-red-600")}>
                      {activity.amount > 0 ? "+" : ""}Rp {formatCurrency(Math.abs(activity.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Penarikan Berhasil Diajukan!</h2>
              <p className="mt-2 text-sm text-stone-600">
                Penarikan sebesar <span className="font-semibold text-emerald-700">Rp {formatCurrency(rawAmount)}</span> sedang dalam proses verifikasi.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Estimasi 1x24 jam kerja untuk proses verifikasi.
              </p>
              <div className="mt-6 flex w-full gap-3">
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setSubmitSuccess(false)
                    window.location.href = '/dashboard'
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}