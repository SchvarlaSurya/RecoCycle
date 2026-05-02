"use client";

import { useState, useMemo } from "react";
import { getWasteCatalog } from "@/app/actions/enhancedTransaction";
import { getUserById, createAdminTransaction } from "@/app/actions/adminVerification";
import { parseQRCode } from "@/app/actions/qrParser";

interface WasteCatalogItem {
  id: string;
  name: string;
  category: string;
  pricePerKg: number;
  updatedAt: string;
}

interface UserData {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  tierInfo: {
    tier: string;
    bonusPercentage: number;
    cumulativeWeight: number;
    nextTierWeight: number | null;
  };
  availableBalance: number;
}

export default function ScannerPage() {
  const [scanInput, setScanInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [catalog, setCatalog] = useState<WasteCatalogItem[]>([]);
  const [selectedWasteType, setSelectedWasteType] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCatalog = async () => {
    const result = await getWasteCatalog();
    if (result.success && result.catalog) {
      setCatalog(result.catalog);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const qrResult = parseQRCode(scanInput.trim());
      if (!qrResult.success) {
        setError(qrResult.error || "Format QR tidak valid");
        setIsLoading(false);
        return;
      }

      const userId = qrResult.userId!;
      const result = await getUserById(userId);
      
      if (!result.success) {
        setError(result.error || "Tidak dapat mengambil data pengguna");
        return;
      }

      if (!result.user) {
        setError("Pengguna tidak ditemukan. Pastikan ID benar.");
        return;
      }

      const user = result.user;
      const userDataFormatted: UserData = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        tierInfo: user.tierInfo,
        availableBalance: user.availableBalance,
      };

      await loadCatalog();
      setUserData(userDataFormatted);
      setSelectedWasteType("");
      setWeight("");
    } catch {
      setError("Terjadi kesalahan saat mencari pengguna");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWaste = useMemo(() => {
    return catalog.find(w => w.id === selectedWasteType);
  }, [catalog, selectedWasteType]);

  const calculation = useMemo(() => {
    if (!selectedWaste || !weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      return null;
    }

    const weightNum = Number(weight);
    const baseReward = weightNum * selectedWaste.pricePerKg;
    const tierBonus = userData ? baseReward * (userData.tierInfo.bonusPercentage / 100) : 0;
    const totalReward = baseReward + tierBonus;

    return {
      baseReward,
      tierBonus,
      totalReward,
      pricePerKg: selectedWaste.pricePerKg,
    };
  }, [selectedWaste, weight, userData]);

  const handleSubmit = async () => {
    if (!userData || !selectedWasteType || !weight || !calculation) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createAdminTransaction(
        userData.userId,
        selectedWasteType,
        Number(weight),
        calculation.totalReward
      );

      if (result.success) {
        setSuccess(`Transaksi berhasil! Total reward: Rp${calculation.totalReward.toLocaleString("id-ID")}`);
        setUserData(null);
        setSelectedWasteType("");
        setWeight("");
        setScanInput("");
      } else {
        setError(result.error || "Gagal memproses transaksi");
      }
    } catch {
      setError("Terjadi kesalahan saat memproses transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUserData(null);
    setSelectedWasteType("");
    setWeight("");
    setError(null);
    setSuccess(null);
    setScanInput("");
  };

  const tierBadgeColor = (tier: string) => {
    switch (tier) {
      case "Platinum":
        return "bg-gradient-to-r from-slate-400 to-slate-500 text-white";
      case "Gold":
        return "bg-gradient-to-r from-amber-400 to-yellow-500 text-white";
      case "Silver":
        return "bg-gradient-to-r from-stone-300 to-stone-400 text-stone-800";
      default:
        return "bg-gradient-to-r from-orange-700 to-orange-800 text-white";
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scanner QR Admin</h1>
          <p className="text-sm text-slate-300">Proses deposit sampah dari pelanggan datang langsung.</p>
        </div>
      </div>

      {!userData && (
        <div className="glass-dark-panel rounded-xl p-6">
          <h2 className="mb-4 text-lg font-medium text-white">Scan QR Code atau Masukkan ID</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                QR Code / User ID
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="wastebank://scan/{user_id} atau user_id"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={isLoading || !scanInput.trim()}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Mencari..." : "Scan"}
            </button>
          </div>
        </div>
      )}

      {userData && (
        <div className="space-y-4">
          <button
            onClick={resetForm}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Scan Ulang
          </button>

          <div className="glass-dark-panel rounded-xl p-6">
            <h2 className="mb-4 text-lg font-medium text-white">Informasi Nasabah</h2>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-stone-900">{userData.firstName} {userData.lastName}</p>
                <p className="text-sm text-slate-300">{userData.email}</p>
                <p className="text-sm text-slate-300">{userData.phoneNumber || "No telepon tidak ada"}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tierBadgeColor(userData.tierInfo.tier)}`}>
                  {userData.tierInfo.tier}
                </span>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  Rp{userData.availableBalance.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-300">Saldo Tersedia</p>
              </div>
            </div>
          </div>

          <div className="glass-dark-panel rounded-xl p-6">
            <h2 className="mb-4 text-lg font-medium text-white">Input Sampah</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Jenis Sampah
                </label>
                <select
                  value={selectedWasteType}
                  onChange={(e) => setSelectedWasteType(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Pilih Jenis Sampah</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - Rp{item.pricePerKg.toLocaleString("id-ID")}/kg
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Berat Aktual (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Masukkan berat dalam kg"
                  min="0"
                  step="0.1"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {calculation && (
                <div className="rounded-lg bg-white/8 p-4">
                  <h3 className="mb-3 text-sm font-medium text-white">Pratinjau Reward</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Base Reward:</span>
                      <span className="font-medium text-stone-900">
                        Rp{calculation.baseReward.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">
                        Tier Bonus ({userData.tierInfo.bonusPercentage}%):
                      </span>
                      <span className="font-medium text-emerald-600">
                        +Rp{calculation.tierBonus.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-stone-200 pt-2">
                      <span className="font-medium text-stone-900">Total Reward:</span>
                      <span className="text-lg font-bold text-emerald-600">
                        Rp{calculation.totalReward.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !selectedWasteType ||
                  !weight ||
                  Number(weight) <= 0 ||
                  !calculation
                }
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : "Simpan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm text-emerald-600">{success}</p>
        </div>
      )}
    </div>
  );
}
