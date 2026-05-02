"use client";

import { useEffect, useState } from "react";
import { useWasteStore } from "@/store/useWasteStore";

export default function RiwayatPage() {
  const transactions = useWasteStore((state) => state.transactions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
      case "diproses":
      case "menunggu":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      case "berhasil":
      case "selesai":
      case "success":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "ditolak":
      case "rejected":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="glass-panel flex flex-col gap-1 rounded-[30px] px-5 py-4 sm:px-7 sm:py-5">
        <h1 className="text-2xl font-semibold text-stone-900">Riwayat Setoran</h1>
        <p className="text-sm text-stone-700">
          Daftar seluruh setoran sampah Anda bersama RecoCycle. Klik transaksi untuk
          melihat struk digital.
        </p>
      </header>

      <section className="glass-panel overflow-hidden rounded-[30px]">
        {isLoading ? (
          <div className="divide-y divide-white/55">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-32 animate-pulse rounded-md bg-stone-200" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-stone-100" />
                  </div>
                  <div className="h-4 w-40 animate-pulse rounded-md bg-stone-100" />
                </div>
                <div className="mt-2 flex items-center gap-4 sm:mt-0">
                  <div className="h-6 w-24 animate-pulse rounded-md bg-stone-200" />
                  <div className="h-5 w-5 animate-pulse rounded-md bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/55">
            {transactions.map((item) => (
              <div key={item.id} className="flex flex-col">
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="group flex cursor-pointer flex-col gap-2 px-5 py-4 transition-colors hover:bg-emerald-50/40 active:bg-emerald-50/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-stone-900">{item.type}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-700">
                      {item.date} • {item.id}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-4 sm:mt-0">
                    <p className="font-semibold text-emerald-800">+ Rp {item.reward.toLocaleString("id-ID")}</p>
                    <svg className={`h-5 w-5 text-stone-400 transition-transform ${expandedId === item.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="bg-white/25 px-5 pb-5 pt-1 sm:px-6">
                    <div className="mr-auto max-w-sm cursor-default rounded-[26px] border border-emerald-100 border-dashed bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-transform duration-300 hover:scale-[1.02] hover:shadow-md sm:ml-auto sm:mr-0">
                      <div className="flex flex-col items-center justify-center border-b border-stone-100 pb-3">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-900">
                          RecoCycle - Struk Digital
                        </h3>
                        <p className="mt-0.5 text-[11px] text-stone-600">
                          ID: {item.id} • Tgl: {item.date}
                        </p>
                      </div>
                      <div className="space-y-2 pt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">Material</span>
                          <span className="font-medium text-stone-900">{item.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">Berat Bersih</span>
                          <span className="font-medium text-stone-900">{item.weight} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">Harga per kg</span>
                          <span className="font-medium text-stone-900">
                            Rp {(item.reward / item.weight).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between border-t border-stone-100 pt-3 text-sm">
                          <span className="font-semibold text-stone-800">Total Reward</span>
                          <span className="font-bold text-emerald-700">Rp {item.reward.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="px-6 py-12 text-center text-stone-600">
                Belum ada riwayat transaksi setoran.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
