"use client";

import { useState } from "react";
import { useWasteStore } from "@/store/useWasteStore";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { sendBalanceNotificationEmail } from "@/app/actions/notification";
import Link from "next/link";

export default function TarikSaldoPage() {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    method: "bank_transfer",
    accountNumber: "",
    accountName: "",
    amount: "",
  });

  const { balance, withdrawals, requestWithdrawal } = useWasteStore();

  const totalPendingOrSent = withdrawals
    .filter((withdrawal) => withdrawal.status !== "Ditolak")
    .reduce((acc, withdrawal) => acc + withdrawal.amount, 0);
  const availableBalance = balance - totalPendingOrSent;

  const getAmountNumber = (amountString: string) => Number(amountString.replace(/[^0-9]/g, ""));

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/[^0-9]/g, "");
    setForm({ ...form, amount: rawValue });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const withdrawValue = getAmountNumber(form.amount);

    if (withdrawValue < 50000) {
      alert("Minimal penarikan adalah Rp 50.000");
      return;
    }
    if (withdrawValue > availableBalance) {
      alert("Saldo tidak mencukupi!");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const success = requestWithdrawal({
        method: form.method,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        amount: withdrawValue,
      });

      if (success) {
        setIsSubmitting(false);
        setIsSuccess(true);

        const newTotalBalance = availableBalance - withdrawValue;

        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-stone-900">Penarikan Diajukan!</span>
            <span className="font-medium text-stone-700">- Rp {withdrawValue.toLocaleString("id-ID")}</span>
            <span className="mt-1 text-xs text-stone-500">Sedang menunggu verifikasi admin.</span>
          </div>,
          { duration: 5000 }
        );

        if (user?.primaryEmailAddress?.emailAddress) {
          void sendBalanceNotificationEmail({
            email: user.primaryEmailAddress.emailAddress,
            name: user.fullName || user.username || "Eco Warrior",
            amount: withdrawValue,
            type: "withdrawal",
            balance: newTotalBalance,
          });
        }

        setForm({ method: "bank_transfer", accountNumber: "", accountName: "", amount: "" });
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        setIsSubmitting(false);
        alert("Terjadi kesalahan saat memproses penarikan.");
      }
    }, 1500);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <header className="glass-panel flex flex-col gap-2 rounded-[30px] px-5 py-4 sm:px-7 sm:py-5">
            <h1 className="text-2xl font-semibold text-stone-900">Tarik Saldo Reward</h1>
            <p className="text-sm text-stone-700">
              Pindahkan saldo RecoCycle Anda ke rekening bank atau e-wallet pilihan.
              Penarikan akan <span className="font-semibold text-stone-900">diverifikasi terlebih dahulu</span>.
            </p>
            <div className="mt-2 flex">
              <Link
                href="/dashboard/tarik/status"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition hover:text-emerald-800 hover:underline"
              >
                Lihat Status Penarikan
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </header>

          <div className="glass-panel overflow-hidden rounded-[30px] p-5 sm:p-7">
            {isSuccess ? (
              <div className="rounded-[28px] border border-emerald-200/70 bg-emerald-50/90 p-6 text-center shadow-[0_16px_40px_rgba(16,185,129,0.08)]">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <p className="text-lg font-semibold text-emerald-800">Penarikan Berhasil Diajukan</p>
                <p className="mt-2 text-sm text-emerald-700">
                  Permintaan penarikan Anda sedang <span className="font-semibold">menunggu verifikasi admin</span>.
                </p>
                <div className="mt-5">
                  <Link
                    href="/dashboard/tarik/status"
                    className="inline-block rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  >
                    Cek Status Penarikan
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Metode Penarikan</label>
                  <select
                    value={form.method}
                    onChange={(event) => setForm({ ...form, method: event.target.value })}
                    className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                  >
                    <option value="bank_transfer">Transfer Bank (BCA, Mandiri, BNI, dll)</option>
                    <option value="gopay">GoPay</option>
                    <option value="dana">DANA</option>
                    <option value="ovo">OVO</option>
                    <option value="shopeepay">ShopeePay</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Nama Pemilik Akun / Rekening</label>
                    <input
                      required
                      type="text"
                      value={form.accountName}
                      onChange={(event) => setForm({ ...form, accountName: event.target.value })}
                      className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                      placeholder="Nama di buku tabungan/akun"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Nomor Rekening / HP</label>
                    <input
                      required
                      type="tel"
                      value={form.accountNumber}
                      onChange={(event) => setForm({ ...form, accountNumber: event.target.value })}
                      className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                      placeholder="Contoh: 0812xxxx atau 7310xxxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Nominal Penarikan (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-medium text-stone-500">Rp</span>
                    <input
                      required
                      type="text"
                      value={form.amount ? Number(form.amount).toLocaleString("id-ID") : ""}
                      onChange={handleAmountChange}
                      className="w-full rounded-2xl border border-white/60 bg-white/75 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                      placeholder="50.000"
                    />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">Minimal penarikan Rp 50.000 tanpa potong pajak.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !form.amount}
                    className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:transform-none"
                  >
                    {isSubmitting ? "Memproses Transaksi..." : "Tarik Dana Sekarang"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-dark-panel group rounded-[30px] p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">
            <p className="text-sm font-medium text-stone-400 transition-colors group-hover:text-stone-300">
              Total Saldo Tersedia
            </p>
            <p className="mt-2 text-3xl font-semibold">Rp {availableBalance.toLocaleString("id-ID")}</p>
            {totalPendingOrSent > 0 && (
              <p className="mt-2 inline-flex rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300">
                Tertahan (Pending): Rp {totalPendingOrSent.toLocaleString("id-ID")}
              </p>
            )}
            <div className="mt-5 border-t border-stone-700 pt-4">
              <p className="text-xs text-stone-400">
                Gunakan sisa kuota dengan bijak, tidak ada potongan biaya administrasi bulanan.
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-[30px] p-5 transition-all duration-300 hover:shadow-md">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-900">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informasi Penting
            </h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-emerald-800">
              <li>Penarikan akan diverifikasi oleh tim admin kami dalam maksimal 1x24 jam kerja.</li>
              <li>Minimal penarikan e-wallet Rp 50.000, sementara bank lokal Rp 100.000.</li>
              <li>Pastikan nama pemilik akun dan nomor tujuan sudah benar sebelum mengirim.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
