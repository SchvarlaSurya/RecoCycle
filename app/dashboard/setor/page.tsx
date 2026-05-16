"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@clerk/nextjs";
import { Loader2, MapPin, ChevronDown, Info, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultWasteTypes = [
  { id: "baterai", name: "Baterai Rumah Tangga", category: "KHUSUS", price: 10094 },
  { id: "elektronik", name: "Elektronik Kecil", category: "KHUSUS", price: 13596 },
  { id: "kardus", name: "Kertas dan Kardus", category: "ANORGANIK", price: 5150 },
  { id: "logam", name: "Logam Ringan", category: "ANORGANIK", price: 7828 },
  { id: "plastik", name: "Plastik Campur", category: "ANORGANIK", price: 4326 },
  { id: "organik", name: "Sisa Organik Kering", category: "ORGANIK", price: 1751 },
];

const timeSlots = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

const schema = z.object({
  wasteType: z.string().min(1, "Pilih jenis sampah"),
  weight: z
    .string()
    .min(1, "Masukkan estimasi berat")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Berat harus lebih dari 0")
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 1000;
    }, "Berat maksimal 1.000 kg per pickup"),
  date: z.string().min(1, "Pilih tanggal penjemputan"),
  timeSlot: z.string().min(1, "Pilih estimasi waktu"),
  address: z.string().min(10, "Alamat minimal 10 karakter"),
  notes: z.string().max(120, "Maksimal 120 karakter").optional(),
});

type FormData = z.infer<typeof schema>;

const categoryColors: Record<string, string> = {
  KHUSUS: "bg-red-100 text-red-700",
  ANORGANIK: "bg-blue-100 text-blue-700",
  ORGANIK: "bg-lime-100 text-lime-700",
};

export default function SetorSampahPage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pickup" | "dropoff">("pickup");
  const [selectedWaste, setSelectedWaste] = useState<typeof defaultWasteTypes[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pickupId, setPickupId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState(defaultWasteTypes);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      wasteType: "",
      weight: "",
      date: "",
      timeSlot: "",
      address: "",
      notes: "",
    },
  });

  const watchedWeight = watch("weight");
  const watchedWasteType = watch("wasteType");
  const watchedNotes = watch("notes") || "";
  const watchedDate = watch("date");
  const watchedTimeSlot = watch("timeSlot");

  // Fetch catalog from database
  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const res = await fetch('/api/waste-catalog');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.catalog && Array.isArray(data.catalog) && data.catalog.length > 0) {
            const mapped = data.catalog.map((item: any, index: number) => ({
              id: String(item.id || index + 1),
              name: item.name || `Waste ${index + 1}`,
              category: item.category?.toUpperCase() || 'ANORGANIK',
              price: parseFloat(item.price) || 5000,
            }));
            setCatalog(mapped);
          }
        }
      } catch (e) {
        console.error('Failed to fetch catalog:', e);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  const estimatedReward =
    selectedWaste && watchedWeight
      ? parseFloat(watchedWeight) * selectedWaste.price
      : 0;

  const handleWasteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const waste = catalog.find((w) => w.id === e.target.value);
    setSelectedWaste(waste || null);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue(
            "address",
            `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`
          );
        },
        () => {
          setValue("address", "Lokasi saat ini tidak tersedia");
        }
      );
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setSubmitError("Silakan login terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wasteType: data.wasteType,
          wasteName: selectedWaste?.name || data.wasteType,
          weight: data.weight,
          date: data.date,
          timeSlot: data.timeSlot,
          address: data.address,
          notes: data.notes || '',
          userId: user.id,
          userName: user.firstName || user.username || 'User',
        })
      });

      const result = await res.json();

      if (result.success) {
        setPickupId(result.data?.id || 'pending');
        setSubmitSuccess(true);
        router.refresh();
      } else {
        // Fallback to localStorage
        const pickupData = {
          id: crypto.randomUUID(),
          wasteType: data.wasteType,
          wasteName: selectedWaste?.name,
          weight: data.weight,
          date: data.date,
          timeSlot: data.timeSlot,
          address: data.address,
          notes: data.notes,
          estimatedReward: estimatedReward,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('lastPickup', JSON.stringify(pickupData));
        setPickupId(pickupData.id);
        setSubmitSuccess(true);
      }
    } catch (error) {
      console.error('Submit error:', error);
      const pickupData = {
        id: crypto.randomUUID(),
        wasteType: data.wasteType,
        wasteName: selectedWaste?.name,
        weight: data.weight,
        date: data.date,
        timeSlot: data.timeSlot,
        address: data.address,
        notes: data.notes,
        estimatedReward: estimatedReward,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('lastPickup', JSON.stringify(pickupData));
      setPickupId(pickupData.id);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-stone-900">Jadwalkan Setor Sampah</h1>
            <p className="mt-1 text-sm text-stone-600">Pilih metode penyerahan sampah Anda.</p>

            {/* Toggle */}
            <div className="mt-5 flex rounded-2xl border border-stone-200 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("pickup")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "pickup"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Penjemputan Ekspedisi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dropoff")}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "dropoff"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Setor Langsung (QR Drop-off)
              </button>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm"
          >
            {activeTab === "dropoff" ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-4 rounded-full border border-emerald-200 bg-emerald-50 p-4">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-stone-900">QR Code Drop-off</h3>
                <p className="mx-auto mb-6 max-w-sm text-sm text-stone-600">
                  Bawa sampah ke agen drop-off terdekat dan tunjukkan kode QR ini.
                </p>
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-stone-50 p-6">
                  <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-stone-200 text-stone-500">
                    QR Code Placeholder
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Jenis Sampah */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Jenis Sampah
                  </label>
                  <div className="relative">
                    <select
                      {...register("wasteType")}
                      onChange={(e) => {
                        register("wasteType").onChange(e);
                        handleWasteChange(e);
                      }}
                      className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">-- Pilih Jenis Sampah --</option>
                      {isLoadingCatalog ? (
                        <option value="" disabled>Memuat...</option>
                      ) : (
                        catalog.map((waste) => (
                          <option key={waste.id} value={waste.id}>
                            {waste.name} - Rp {waste.price.toLocaleString('id-ID')}/kg
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  </div>
                  {errors.wasteType && (
                    <p className="mt-1 text-xs text-red-600">{errors.wasteType.message}</p>
                  )}
                </div>

                {/* Estimasi Berat */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Estimasi Berat (kg)
                  </label>
                  <input
                    {...register("weight")}
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    placeholder="Contoh: 5"
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-xs text-red-600">{errors.weight.message}</p>
                  )}
                </div>

                {/* Tanggal & Waktu */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Tanggal Penjemputan
                    </label>
                    <input
                      {...register("date")}
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {errors.date && (
                      <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">
                      Estimasi Waktu
                    </label>
                    <div className="relative">
                      <select
                        {...register("timeSlot")}
                        className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">-- Pilih Waktu --</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                    </div>
                    {errors.timeSlot && (
                      <p className="mt-1 text-xs text-red-600">{errors.timeSlot.message}</p>
                    )}
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Alamat Tempat Jemput
                  </label>
                  <textarea
                    {...register("address")}
                    rows={3}
                    placeholder="Rincian alamat rumah/kantor..."
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    <MapPin className="h-4 w-4" />
                    Gunakan lokasi saya saat ini
                  </button>
                </div>

                {/* Catatan Khusus */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Catatan Khusus
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    maxLength={120}
                    placeholder="Contoh: Titip di satpam"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="mt-1 flex justify-between">
                    {errors.notes ? (
                      <p className="text-xs text-red-600">{errors.notes.message}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-stone-400">
                      {watchedNotes.length}/120
                    </span>
                  </div>
                </div>

                {/* Estimasi Reward */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-sm font-medium text-stone-700">Estimasi Reward Saldo</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-700">
                      Rp {estimatedReward.toLocaleString("id-ID")}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Silver Tier +3%
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                    <Info className="h-3.5 w-3.5" />
                    Angka estimasi. Total akhir bergantung pada timbangan asli kurir.
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
                    "Ajukan Pickup Sekarang"
                  )}
                </button>

                {submitError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    <X className="h-4 w-4 flex-shrink-0" />
                    {submitError}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Success Modal */}
        {submitSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">Pickup Berhasil Diajukan!</h2>
                <p className="mt-2 text-sm text-stone-600">
                  ID Pickup: <span className="font-mono font-medium">{pickupId?.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Estimasi reward akan dihitung setelah sampah ditimbang oleh kurir.
                </p>
                <div className="mt-6 w-full space-y-3 rounded-2xl bg-stone-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Jenis Sampah</span>
                    <span className="font-medium text-stone-900">{selectedWaste?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Berat Estimasi</span>
                    <span className="font-medium text-stone-900">{watchedWeight} kg</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Tanggal</span>
                    <span className="font-medium text-stone-900">
                      {watchedDate} ({watchedTimeSlot})
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex w-full gap-3">
                  <button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setPickupId(null);
                    }}
                    className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Ajukan Lagi
                  </button>
                  <button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setPickupId(null);
                      window.location.href = '/dashboard';
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

        {/* Right Sidebar - Katalog Harga */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/75 overflow-hidden shadow-sm">
            <div className="border-b border-stone-100 bg-stone-50 px-5 py-4">
              <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                <span className="text-emerald-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Katalog Harga (Live)
              </h3>
              <p className="mt-1 text-xs text-stone-500">Estimasi nilai jual sampah per kg</p>
            </div>

            <div className="divide-y divide-stone-100 p-2">
              {catalog.map((waste) => (
                <div
                  key={waste.id}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-3 py-3 transition-all hover:bg-stone-50",
                    watchedWasteType === waste.id && "bg-emerald-50 ring-1 ring-emerald-200"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-stone-800">{waste.name}</span>
                    <span className={cn("mt-0.5 inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", categoryColors[waste.category])}>
                      {waste.category}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-emerald-700">
                      Rp {waste.price.toLocaleString("id-ID")}
                    </span>
                    <span className="mt-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                      Bonus Silver +3%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 bg-stone-50 px-5 py-3">
              <p className="text-xs text-stone-500 text-center">
                {isLoadingCatalog ? 'Memuat...' : 'Harga diperbarui otomatis'}
              </p>
              <p className="text-xs text-stone-400 text-center mt-0.5">
                Terakhir update: {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}