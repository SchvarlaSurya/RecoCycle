"use client";

import { useEffect, useMemo, useState } from "react";
import { statusLabel, type Nasabah, type NasabahStatus } from "@/lib/types";
import { getAllUsers } from "@/app/actions/adminVerification";
import { getAllTransactionsAdmin, updateUserStatus, editUserBalance } from "@/app/actions/adminDashboard";

type NasabahTransaction = {
  id: number;
  tx_id: string | null;
  user_id: string | null;
  waste_type: string | null;
  estimated_weight: number | string | null;
  actual_weight: number | string | null;
  total_reward: number | string | null;
  status: string | null;
  created_at: string | Date;
};

type UserWithOptionalStatus = NonNullable<Awaited<ReturnType<typeof getAllUsers>>["users"]>[number] & {
  status?: NasabahStatus;
};

export default function NasabahPage() {
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [allTransactions, setAllTransactions] = useState<NasabahTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | NasabahStatus>("all");
  const [selectedNasabah, setSelectedNasabah] = useState<Nasabah | null>(null);
  const [editSaldo, setEditSaldo] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [editReason, setEditReason] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, txRes] = await Promise.all([getAllUsers(), getAllTransactionsAdmin()]);

      if (usersRes.success && usersRes.users) {
        const mapped: Nasabah[] = usersRes.users.map((userData) => {
          const user = userData as UserWithOptionalStatus;
          return {
            id: userData.userId,
            name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email,
            email: userData.email,
            phone: userData.phoneNumber || "-",
            address: userData.address || "-",
            ktp: "-",
            balance: userData.availableBalance,
            totalDeposits: userData.totalDeposits,
            totalWeight: userData.kumulatifSampahKg,
            status: user.status || "verified",
            joinedAt: "-",
          };
        });
        setNasabahList(mapped);
      }

      if (txRes.success && txRes.data) {
        setAllTransactions(txRes.data);
      }
    } catch (error) {
      console.error("Error loading nasabah data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filtered = useMemo(() => {
    return nasabahList.filter((nasabah) => {
      const query = search.toLowerCase();
      const matchSearch =
        nasabah.name.toLowerCase().includes(query) ||
        nasabah.email.toLowerCase().includes(query);
      const matchStatus = filterStatus === "all" || nasabah.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [filterStatus, nasabahList, search]);

  const nasabahTx = useMemo(() => {
    if (!selectedNasabah) return [];
    return allTransactions.filter((tx) => tx.user_id === selectedNasabah.id);
  }, [allTransactions, selectedNasabah]);

  const currentSelected = selectedNasabah
    ? nasabahList.find((nasabah) => nasabah.id === selectedNasabah.id) || null
    : null;

  const handleUpdateStatus = async (id: string, status: NasabahStatus) => {
    setIsProcessing(true);
    try {
      const res = await updateUserStatus(id, status);
      if (res.success) {
        await loadData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditBalance = async () => {
    if (!currentSelected || !newBalance || !editReason) return;
    setIsProcessing(true);
    try {
      const res = await editUserBalance(currentSelected.id, Number(newBalance), editReason);
      if (res.success) {
        await loadData();
        setEditSaldo(false);
        setNewBalance("");
        setEditReason("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusBadge = (status: NasabahStatus) => {
    const styles: Record<NasabahStatus, string> = {
      verified: "bg-emerald-100 text-emerald-800",
      pending: "bg-amber-100 text-amber-800",
      frozen: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}>
        {statusLabel[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manajemen Nasabah</h1>
          <p className="text-sm text-slate-300">Kelola akun, verifikasi, dan saldo nasabah Bank Sampah.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          Total: <span className="font-semibold text-white">{nasabahList.length}</span> nasabah
        </div>
      </div>

      <div className="glass-dark-panel flex flex-col gap-3 rounded-[28px] p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama atau email nasabah..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/45 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "verified", "pending", "frozen"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                filterStatus === status
                  ? "bg-white text-slate-950 shadow-sm"
                  : "border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10"
              }`}
            >
              {status === "all" ? "Semua" : statusLabel[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-dark-panel overflow-hidden rounded-[28px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/6 text-left">
                <th className="px-5 py-3 font-medium text-slate-400">Nasabah</th>
                <th className="hidden px-5 py-3 font-medium text-slate-400 sm:table-cell">Saldo</th>
                <th className="hidden px-5 py-3 font-medium text-slate-400 md:table-cell">Total Setoran</th>
                <th className="px-5 py-3 font-medium text-slate-400">Status</th>
                <th className="px-5 py-3 text-right font-medium text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filtered.map((nasabah) => (
                <tr key={nasabah.id} className="transition-colors hover:bg-white/5">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-medium text-slate-100">{nasabah.name}</p>
                      <p className="text-xs text-slate-400">{nasabah.email}</p>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <p className="font-semibold text-slate-100">Rp {nasabah.balance.toLocaleString("id-ID")}</p>
                  </td>
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <p className="text-slate-300">{nasabah.totalDeposits}x • {nasabah.totalWeight} kg</p>
                  </td>
                  <td className="px-5 py-3.5">{statusBadge(nasabah.status)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedNasabah(nasabah);
                          setEditSaldo(false);
                        }}
                        className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/15"
                      >
                        Detail
                      </button>
                      {nasabah.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(nasabah.id, "verified")}
                          disabled={isProcessing}
                          className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-200"
                        >
                          Verifikasi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Tidak ada nasabah ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {currentSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="glass-dark-panel w-full max-w-2xl overflow-y-auto rounded-[28px] bg-slate-950/92">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{currentSelected.name}</h3>
                <p className="text-sm text-slate-400">{currentSelected.email} • {currentSelected.phone}</p>
              </div>
              <button
                onClick={() => setSelectedNasabah(null)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                disabled={isProcessing}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Alamat</p>
                  <p className="mt-1 text-sm text-slate-100">{currentSelected.address}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</p>
                  <div className="mt-1">{statusBadge(currentSelected.status)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-200">Saldo</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">
                      Rp {currentSelected.balance.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditSaldo(!editSaldo);
                      setNewBalance(String(currentSelected.balance));
                    }}
                    disabled={isProcessing}
                    className="rounded-xl border border-emerald-400/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-white/15"
                  >
                    {editSaldo ? "Batal" : "Edit Saldo"}
                  </button>
                </div>
                {editSaldo && (
                  <div className="mt-4 space-y-3 border-t border-emerald-400/20 pt-4">
                    <div>
                      <label className="text-xs font-medium text-emerald-200">Saldo Baru (Rp)</label>
                      <input
                        type="number"
                        value={newBalance}
                        onChange={(event) => setNewBalance(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/30"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-emerald-200">Alasan Perubahan</label>
                      <input
                        type="text"
                        value={editReason}
                        onChange={(event) => setEditReason(event.target.value)}
                        placeholder="Contoh: Koreksi input duplikat"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-500/30"
                        disabled={isProcessing}
                      />
                    </div>
                    <button
                      onClick={handleEditBalance}
                      disabled={!newBalance || !editReason || isProcessing}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {isProcessing ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {currentSelected.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(currentSelected.id, "verified")}
                    disabled={isProcessing}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Verifikasi Akun
                  </button>
                )}
                {currentSelected.status === "verified" && (
                  <button
                    onClick={() => handleUpdateStatus(currentSelected.id, "frozen")}
                    disabled={isProcessing}
                    className="rounded-xl bg-red-100 px-4 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-200"
                  >
                    Bekukan Akun
                  </button>
                )}
                {currentSelected.status === "frozen" && (
                  <button
                    onClick={() => handleUpdateStatus(currentSelected.id, "verified")}
                    disabled={isProcessing}
                    className="rounded-xl bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-200"
                  >
                    Aktifkan Kembali
                  </button>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold text-white">Riwayat Setoran</h4>
                {nasabahTx.length > 0 ? (
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {nasabahTx.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/6 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{tx.waste_type}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(tx.created_at).toLocaleDateString("id-ID")} • {tx.actual_weight || tx.estimated_weight}kg • {tx.tx_id}
                          </p>
                        </div>
                        <div className="text-right">
                          {(tx.status === "verified" || tx.status === "Selesai") && (
                            <p className="text-sm font-semibold text-emerald-300">
                              + Rp {Number(tx.total_reward || 0).toLocaleString("id-ID")}
                            </p>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              tx.status === "pending"
                                ? "text-amber-400"
                                : tx.status === "verified" || tx.status === "Selesai"
                                  ? "text-emerald-400"
                                  : "text-red-400"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Belum ada riwayat setoran.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
