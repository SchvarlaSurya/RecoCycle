"use client";

import { useEffect, useMemo, useState } from "react";
import { useWasteStore, useUserTier } from "@/store/useWasteStore";
import { QRCodeCanvas } from "qrcode.react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { sendBalanceNotificationEmail } from "@/app/actions/notification";
import { submitDeposit, getWasteCatalog } from "@/app/actions/transaction";

type WasteCatalogItem = {
  id: string;
  name: string;
  category: string;
  pricePerKg: number;
};

export default function SetorSampahPage() {
  const { user } = useUser();
  const { bonusPercentage, tier } = useUserTier();
  const [dbCatalog, setDbCatalog] = useState<WasteCatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<"pickup" | "dropoff">("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSubmittedWeight, setLastSubmittedWeight] = useState(0);
  const [form, setForm] = useState({
    wasteType: "",
    weight: "",
    address: "",
    date: "",
    notes: "",
  });

  const addTransaction = useWasteStore((state) => state.addTransaction);
  const currentBalance = useWasteStore((state) => state.balance);

  useEffect(() => {
    async function loadCatalog() {
      const res = await getWasteCatalog();
      if (res.success && res.data) {
        setDbCatalog(res.data);
      }
    }

    void loadCatalog();
  }, []);

  const wasteCatalog = useMemo(() => {
    return dbCatalog.map((item) => ({
      ...item,
      pricePerKg: Number(item.pricePerKg) + Number(item.pricePerKg) * (bonusPercentage / 100),
    }));
  }, [bonusPercentage, dbCatalog]);

  const selectedWaste = useMemo(
    () => wasteCatalog.find((item) => item.name === form.wasteType),
    [form.wasteType, wasteCatalog]
  );

  const estimatedReward = useMemo(() => {
    if (!selectedWaste || !form.weight) return 0;
    const weight = Number(form.weight);
    if (Number.isNaN(weight) || weight <= 0) return 0;
    return weight * selectedWaste.pricePerKg;
  }, [form.weight, selectedWaste]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await submitDeposit(
        Number(form.weight),
        form.wasteType,
        estimatedReward,
        form.date
      );

      if (res.success) {
        addTransaction({
          type: form.wasteType,
          weight: Number(form.weight),
          reward: estimatedReward,
          date: form.date,
        });

        setLastSubmittedWeight(Number(form.weight));
        setIsSuccess(true);

        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-stone-900">Setoran Diajukan</span>
            <span className="text-xs text-stone-600">
              Menunggu verifikasi admin untuk memproses saldo.
            </span>
          </div>,
          { duration: 5000 }
        );

        if (user?.primaryEmailAddress?.emailAddress) {
          void sendBalanceNotificationEmail({
            email: user.primaryEmailAddress.emailAddress,
            name: user.fullName || user.username || "Eco Warrior",
            amount: estimatedReward,
            type: "deposit",
            balance: currentBalance,
          });
        }

        setForm({ wasteType: "", weight: "", address: "", date: "", notes: "" });
        setTimeout(() => setIsSuccess(false), 10000);
      } else {
        toast.error("Gagal menyimpan ke server database.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <header className="glass-panel flex flex-col gap-1 rounded-[30px] px-5 py-4 sm:px-7 sm:py-5">
            <h1 className="text-2xl font-semibold text-stone-900">Jadwalkan Setor Sampah</h1>
            <p className="text-sm text-stone-700">Pilih metode penyerahan sampah Anda.</p>

            <div className="mt-4 flex rounded-2xl border border-white/60 bg-white/55 p-1.5 shadow-inner shadow-white/30">
              <button
                onClick={() => setActiveTab("pickup")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === "pickup"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:bg-white/40 hover:text-stone-700"
                }`}
              >
                Penjemputan Ekspedisi
              </button>
              <button
                onClick={() => setActiveTab("dropoff")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  activeTab === "dropoff"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:bg-white/40 hover:text-stone-700"
                }`}
              >
                Setor Langsung (QR Drop-off)
              </button>
            </div>
          </header>

          <div className="glass-panel overflow-hidden rounded-[30px] p-5 sm:p-7">
            {activeTab === "dropoff" ? (
              <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                <div className="mb-4 rounded-full border border-emerald-200 bg-emerald-100/90 p-4 shadow-sm">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-stone-900">QR Code Drop-off Anda</h3>
                <p className="mx-auto mb-8 mt-1 max-w-sm text-sm text-stone-700">
                  Bawa sampah Anda ke agen Drop-off point terdekat dan tunjukkan kode QR ini kepada petugas untuk discan.
                </p>

                <div className="inline-block rounded-[28px] border-2 border-dashed border-emerald-300 bg-white/90 p-4 shadow-[0_12px_30px_rgba(16,185,129,0.10)]">
                  <QRCodeCanvas
                    value={`wastebank://scan/${user?.id || "mock_user_id"}`}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#064e3b"
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="mt-8 w-full rounded-2xl border border-white/60 bg-white/72 p-4 text-left shadow-sm">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-xs text-stone-600">i</span>
                    Cara Kerja
                  </h4>
                  <ul className="list-inside list-disc space-y-2 px-1 text-sm text-stone-700">
                    <li>Datangi mitra pengepul terdekat.</li>
                    <li>Tunjukkan layar HP Anda ke petugas administrasi.</li>
                    <li>Petugas akan menscan, menimbang sampah Anda, dan otomatis saldo serta XP Anda akan bertambah.</li>
                  </ul>
                </div>
              </div>
            ) : isSuccess ? (
              <div className="rounded-[28px] border border-emerald-200/70 bg-emerald-50/90 p-6 text-center shadow-[0_16px_40px_rgba(16,185,129,0.08)]">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <p className="text-lg font-semibold text-emerald-800">Setoran Berhasil Diajukan</p>
                <p className="mt-2 text-sm text-emerald-700">
                  Status saat ini: <strong>Menunggu Verifikasi Admin</strong>. Saldo Anda akan bertambah setelah petugas memverifikasi berat dan jenis sampah Anda.
                </p>

                <div className="mt-6 rounded-2xl border border-emerald-100/80 bg-white/90 p-5 shadow-sm">
                  <h3 className="mb-3 border-b border-emerald-100 pb-2 text-sm font-semibold uppercase tracking-wide text-emerald-900">
                    Dampak Positif Anda Hari Ini
                  </h3>
                  <p className="text-sm leading-relaxed text-emerald-800">
                    Luar biasa! Dengan menyetor <strong className="text-lg">{lastSubmittedWeight} kg</strong> sampah, Anda ikut mencegah pencemaran lingkungan, menurunkan emisi karbon, dan aksi ini setara dengan menghemat energi listrik yang cukup untuk <strong>{lastSubmittedWeight * 2} hari</strong> penerangan di sebuah rumah. Bumi sangat berterima kasih atas aksi nyata Anda.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Jenis Sampah</label>
                    <select
                      required
                      value={form.wasteType}
                      onChange={(event) => setForm({ ...form, wasteType: event.target.value })}
                      className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30"
                    >
                      <option value="">-- Pilih Jenis --</option>
                      {wasteCatalog.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Estimasi Berat (kg)</label>
                    <input
                      required
                      min="1"
                      type="number"
                      value={form.weight}
                      onChange={(event) => setForm({ ...form, weight: event.target.value })}
                      className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30"
                      placeholder="Contoh: 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Tanggal Penjemputan</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Alamat Tempat Jemput</label>
                  <textarea
                    required
                    rows={3}
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                    className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                    placeholder="Rincian alamat rumah/kantor..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Catatan Khusus (opsional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    className="w-full rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/30"
                    placeholder="Contoh: Titip di satpam"
                  />
                </div>

                <div className="rounded-[26px] border border-white/60 bg-white/82 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-sm font-medium text-stone-700">Estimasi Reward Saldo</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-800">Rp {estimatedReward.toLocaleString("id-ID")}</p>
                  <p className="mt-1 text-xs text-stone-600">Angka ini sekadar estimasi. Total akhir bergantung pada timbangan asli kurir.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:transform-none"
                  >
                    {isSubmitting ? "Memproses Permintaan..." : "Ajukan Pickup Sekarang"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel overflow-hidden rounded-[30px]">
            <div className="border-b border-white/55 bg-white/45 px-5 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Katalog Harga (Live)
              </h3>
              <p className="mt-1 text-xs text-stone-600">Estimasi nilai jual sampah per kilogram terkini.</p>
            </div>
            <div className="divide-y divide-white/55 p-2 sm:p-3">
              {wasteCatalog.map((item) => (
                <div
                  key={item.id}
                  className="group flex cursor-default items-center justify-between rounded-2xl border border-transparent px-3 py-3 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-100 hover:bg-emerald-50/40 hover:shadow-sm"
                >
                  <div className="flex flex-col transition-transform group-hover:translate-x-1">
                    <span className="text-sm font-medium text-stone-800 transition-colors group-hover:text-emerald-900">{item.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {item.category === "organik" && <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />}
                      {item.category === "anorganik" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      {item.category === "khusus" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                      {item.category}
                    </span>
                  </div>
                  <span className="flex flex-col items-end text-sm font-bold text-emerald-700">
                    <span>Rp {item.pricePerKg.toLocaleString("id-ID")}</span>
                    {bonusPercentage > 0 && (
                      <span className="mt-0.5 rounded-sm bg-emerald-100/80 px-1 py-0.5 text-[9px] font-bold text-emerald-600">
                        Bonus Tier {tier} +{bonusPercentage}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
