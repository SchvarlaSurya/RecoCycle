"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useWasteStore } from "@/store/useWasteStore";
import { Recycle, FileText } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string;
  weight: number;
  reward: number;
  date: string;
  status: string;
  created_at: string;
}

export default function RiwayatPage() {
  const { user, isLoaded } = useUser();
  const storeTransactions = useWasteStore((state) => state.transactions);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/transactions?userId=${user.id}&type=setoran`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted: Transaction[] = data.map((tx: any) => ({
            id: tx.id || tx.reference_id || '',
            type: tx.description?.split(' - ')[0]?.replace('Setor ', '') || tx.category || 'Setoran',
            category: tx.category || '',
            description: tx.description || '',
            weight: 0,
            reward: parseFloat(tx.amount) || 0,
            date: tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }) : '',
            status: tx.status || 'pending',
            created_at: tx.created_at || '',
          }));
          setTransactions(formatted);
        }
      }
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, fetchTransactions]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchTransactions();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchTransactions]);

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
      case "terverifikasi":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "ditolak":
      case "rejected":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    }
  };

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "MENUNGGU";
      case "terverifikasi":
      case "success":
      case "berhasil":
        return "TERVERIFIKASI";
      case "ditolak":
      case "rejected":
        return "DITOLAK";
      default:
        return status.toUpperCase();
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
        {isLoading || !isLoaded ? (
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
                        {formatStatus(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-700">
                      {item.date} • {item.id.slice(0, 8).toUpperCase()}
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
                          ID: {item.id.slice(0, 8).toUpperCase()} • Tgl: {item.date}
                        </p>
                      </div>
                      <div className="space-y-2 pt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">Material</span>
                          <span className="font-medium text-stone-900">{item.type}</span>
                        </div>
                        {item.description && (
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-600">Deskripsi</span>
                            <span className="font-medium text-stone-900">{item.description}</span>
                          </div>
                        )}
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
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                  <Recycle className="h-10 w-10 text-emerald-300" />
                </div>
                <h3 className="text-lg font-semibold text-stone-700">Belum Ada Riwayat Setoran</h3>
                <p className="mt-2 text-sm text-stone-500 max-w-xs mx-auto">
                  Mulai setor sampah pertama Anda dan lihat riwayat transaksi di sini.
                </p>
                <Link
                  href="/dashboard/setor"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Mulai Setor Sekarang
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
