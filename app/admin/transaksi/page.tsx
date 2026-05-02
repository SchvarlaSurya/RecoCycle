"use client";

import { useEffect, useMemo, useState } from "react";
import { transactionStatusLabel, type TransactionStatus } from "@/lib/types";
import { getAllTransactionsAdmin, getWasteCatalogAdmin } from "@/app/actions/adminDashboard";
import { verifyTransaction, rejectTransaction } from "@/app/actions/adminVerification";

type AdminTransactionRow = {
  id: number;
  tx_id: string;
  user_id: string | null;
  waste_type: string | null;
  estimated_weight: number | string | null;
  actual_weight: number | string | null;
  price_per_kg: number | string | null;
  total_reward: number | string | null;
  reward?: number | string | null;
  weight?: number | string | null;
  status: string | null;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string | Date;
};

type WasteCatalogItem = {
  id: string;
  name: string;
  price_per_kg: number | string | null;
};

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [wasteCatalog, setWasteCatalog] = useState<WasteCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TransactionStatus>("all");
  const [selectedTx, setSelectedTx] = useState<AdminTransactionRow | null>(null);
  const [actualWeight, setActualWeight] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"verify" | "reject" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function loadData() {
    try {
      const [txRes, catalogRes] = await Promise.all([
        getAllTransactionsAdmin(),
        getWasteCatalogAdmin(),
      ]);
      if (txRes.success && txRes.data) {
        setTransactions(txRes.data);
      }
      if (catalogRes.success && catalogRes.data) {
        setWasteCatalog(catalogRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((tx) => tx.status === filter);
  }, [filter, transactions]);

  const pendingCount = transactions.filter((tx) => tx.status === "pending").length;

  const currentPrice = useMemo(() => {
    if (!selectedTx) return 0;
    const catalogItem = wasteCatalog.find((item) => item.name === selectedTx.waste_type);
    return catalogItem ? Number(catalogItem.price_per_kg) : Number(selectedTx.price_per_kg);
  }, [selectedTx, wasteCatalog]);

  const autoReward = useMemo(() => {
    const weight = Number(actualWeight);
    if (!weight || weight <= 0) return 0;
    return weight * currentPrice;
  }, [actualWeight, currentPrice]);

  const handleVerify = async () => {
    if (!selectedTx || !actualWeight || Number(actualWeight) <= 0) return;
    setIsProcessing(true);
    try {
      await verifyTransaction(selectedTx.tx_id, Number(actualWeight));
      await loadData();
      setSelectedTx(null);
      setActualWeight("");
      setMode(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTx || !rejectReason) return;
    setIsProcessing(true);
    try {
      await rejectTransaction(selectedTx.tx_id, rejectReason);
      await loadData();
      setSelectedTx(null);
      setRejectReason("");
      setMode(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openModal = (tx: AdminTransactionRow) => {
    setSelectedTx(tx);
    setActualWeight(String(tx.estimated_weight));
    setRejectReason("");
    setMode(tx.status === "pending" ? "verify" : null);
  };

  const statusBadge = (status: TransactionStatus | string) => {
    const rawStatus = status as TransactionStatus;
    const styles: Record<TransactionStatus, string> = {
      pending: "bg-amber-100 text-amber-800",
      verified: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[rawStatus] || "bg-stone-100 text-stone-800"}`}>
        {transactionStatusLabel[rawStatus] || status}
      </span>
    );
  };

  const tabs = [
    { key: "all" as const, label: "Semua", count: transactions.length },
    { key: "pending" as const, label: "Pending", count: pendingCount },
    { key: "verified" as const, label: "Terverifikasi", count: transactions.filter((tx) => tx.status === "verified").length },
    { key: "rejected" as const, label: "Ditolak", count: transactions.filter((tx) => tx.status === "rejected").length },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-white">Validasi Transaksi</h1>
        <p className="text-sm text-slate-300">Proses setoran masuk: input berat real, hitung otomatis, dan validasi.</p>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-amber-400" />
            <p className="text-sm font-medium text-amber-100">
              <span className="font-bold">{pendingCount} transaksi</span> menunggu validasi Anda.
            </p>
          </div>
        </div>
      )}

      <div className="glass-dark-panel flex gap-2 overflow-x-auto rounded-[24px] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              filter === tab.key
                ? "bg-white text-slate-950 shadow-sm"
                : "border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
            }`}
          >
            {tab.label}
            <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold ${
              filter === tab.key ? "bg-slate-950/10 text-slate-800" : "bg-white/10 text-slate-300"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="glass-dark-panel overflow-hidden rounded-[28px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/6 text-left">
                <th className="px-5 py-3 font-medium text-slate-400">ID</th>
                <th className="px-5 py-3 font-medium text-slate-400">Nasabah ID</th>
                <th className="hidden px-5 py-3 font-medium text-slate-400 sm:table-cell">Jenis Sampah</th>
                <th className="hidden px-5 py-3 font-medium text-slate-400 md:table-cell">Estimasi</th>
                <th className="hidden px-5 py-3 font-medium text-slate-400 md:table-cell">Tanggal</th>
                <th className="px-5 py-3 font-medium text-slate-400">Status</th>
                <th className="px-5 py-3 text-right font-medium text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filtered.map((tx) => (
                <tr key={tx.id} className={`transition-colors hover:bg-white/5 ${tx.status === "pending" ? "bg-amber-500/6" : ""}`}>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-slate-400">{tx.tx_id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-100">{tx.user_id}</p>
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-300 sm:table-cell">{tx.waste_type}</td>
                  <td className="hidden px-5 py-3.5 text-slate-300 md:table-cell">{tx.estimated_weight} kg</td>
                  <td className="hidden px-5 py-3.5 text-slate-400 md:table-cell">{new Date(tx.created_at).toLocaleDateString("id-ID")}</td>
                  <td className="px-5 py-3.5">{statusBadge(tx.status)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openModal(tx)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                        tx.status === "pending"
                          ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                          : "bg-white/10 text-slate-200 hover:bg-white/15"
                      }`}
                    >
                      {tx.status === "pending" ? "Proses" : "Detail"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-stone-400">
                    Tidak ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="glass-dark-panel w-full max-w-lg overflow-y-auto rounded-[28px] bg-slate-950/92">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {selectedTx.status === "pending" ? "Proses Transaksi" : "Detail Transaksi"}
                </h3>
                <p className="text-sm text-slate-400">{selectedTx.tx_id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTx(null);
                  setMode(null);
                }}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10"
                disabled={isProcessing}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Nasabah ID</p>
                  <p className="mt-1 text-xs font-medium text-slate-100">{selectedTx.user_id}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Jenis Sampah</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedTx.waste_type}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Estimasi Berat</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedTx.estimated_weight} kg</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Harga Master Data</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">Rp {currentPrice.toLocaleString("id-ID")}/kg</p>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Pesan Nasabah</p>
                  </div>
                  <p className="text-sm italic text-amber-900">&quot;{selectedTx.notes}&quot;</p>
                </div>
              )}

              {selectedTx.status !== "pending" && (
                <div className={`rounded-2xl p-4 ${selectedTx.status === "verified" || selectedTx.status === "Selesai" ? "border border-emerald-100 bg-emerald-50" : "border border-red-100 bg-red-50"}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${selectedTx.status === "verified" || selectedTx.status === "Selesai" ? "text-emerald-800" : "text-red-800"}`}>
                      {selectedTx.status === "verified" || selectedTx.status === "Selesai" ? "Terverifikasi" : "Ditolak"}
                    </p>
                  </div>
                  {(selectedTx.status === "verified" || selectedTx.status === "Selesai") && (
                    <div className="mt-2">
                      <p className="text-sm text-emerald-700">
                        Berat aktual: <span className="font-bold">{selectedTx.actual_weight || selectedTx.weight} kg</span>
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-800">
                        Rp {Number(selectedTx.total_reward || selectedTx.reward).toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}
                  {selectedTx.rejection_reason && (
                    <p className="mt-2 text-sm text-red-700">Alasan: {selectedTx.rejection_reason}</p>
                  )}
                </div>
              )}

              {selectedTx.status === "pending" && mode === "verify" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-200">Berat Real (Hasil Timbangan)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={actualWeight}
                        onChange={(event) => setActualWeight(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 pr-12 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="0.0"
                        disabled={isProcessing}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">kg</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Auto-Calculate</p>
                    <p className="mt-1 text-sm text-emerald-100">
                      {actualWeight || 0} kg x Rp {currentPrice.toLocaleString("id-ID")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-300">Rp {autoReward.toLocaleString("id-ID")}</p>
                    <p className="mt-1 text-[10px] text-emerald-200">Saldo nasabah akan bertambah otomatis</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleVerify}
                      disabled={!actualWeight || Number(actualWeight) <= 0 || isProcessing}
                      className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {isProcessing ? "Memproses..." : "Selesai & Tambah Saldo"}
                    </button>
                    <button
                      onClick={() => setMode("reject")}
                      disabled={isProcessing}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              )}

              {selectedTx.status === "pending" && mode === "reject" && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-200">Alasan Penolakan</label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Jelaskan alasan penolakan..."
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={!rejectReason || isProcessing}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isProcessing ? "Memproses..." : "Konfirmasi Tolak"}
                    </button>
                    <button
                      onClick={() => setMode("verify")}
                      disabled={isProcessing}
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/15 disabled:opacity-50"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
