"use client";

import { useWasteStore } from "@/store/useWasteStore";
import Link from "next/link";

export default function StatusPenarikanPage() {
  const withdrawals = useWasteStore((state) => state.withdrawals);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu Verifikasi":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      case "Dikirim":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "Ditolak":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-stone-50 text-stone-700 ring-stone-600/20";
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-col gap-2 rounded-3xl border border-white/65 bg-white/78 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-7 sm:py-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tarik" className="rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-stone-200 hover:text-stone-700 transition-all duration-200 hover:-translate-x-1 active:scale-95">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Status Penarikan</h1>
            <p className="text-sm text-stone-700">Pantau proses pengiriman saldo ke rekening Anda di sini.</p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-white/65 bg-white/78 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="divide-y divide-white/55">
          {withdrawals.length > 0 ? (
            withdrawals.map((item) => (
              <div key={item.id} className="group flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 hover:bg-stone-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900 uppercase">
                      {item.method.replace('_', ' ')}
                    </p>
                    <span className="text-stone-300">•</span>
                    <span className="text-sm text-stone-700">{item.id}</span>
                  </div>
                  <p className="text-sm text-stone-700">
                    {item.accountName} - {item.accountNumber}
                  </p>
                  <p className="text-xs text-stone-600">Diajukan pada: {item.date}</p>
                </div>
                
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <p className="font-bold text-stone-900 text-lg">
                    Rp {item.amount.toLocaleString("id-ID")}
                  </p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 px-6 py-12 text-center">
              <div className="rounded-full bg-stone-100 p-4">
                <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-stone-900 font-medium">Belum ada riwayat penarikan</p>
                <p className="mt-1 text-sm text-stone-700">Anda belum pernah mengajukan penarikan saldo.</p>
              </div>
              <Link href="/dashboard/tarik" className="mt-2 inline-block rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 hover:-translate-y-0.5 active:scale-95 transition-all duration-200">
                Tarik Saldo Sekarang
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
