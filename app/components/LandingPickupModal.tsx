"use client";

import { usePickupStore } from "@/store/pickupStore";
import { Sparkles, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { wasteCatalog } from "@/lib/catalog";

interface PickupFormData {
  name: string;
  phone: string;
  address: string;
  wasteType: string;
  weight: string;
  notes: string;
}

const initialForm: PickupFormData = {
  name: "",
  phone: "",
  address: "",
  wasteType: "",
  weight: "",
  notes: "",
};

export default function LandingPickupModal() {
  const { isOpen, closePickup } = usePickupStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState<PickupFormData>(initialForm);

  const selectedWaste = useMemo(
    () => wasteCatalog.find((item) => item.name === form.wasteType),
    [form.wasteType]
  );

  const estimatedReward = useMemo(() => {
    if (!selectedWaste || !form.weight) return 0;

    const parsedWeight = Number(form.weight);
    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) return 0;

    return parsedWeight * selectedWaste.pricePerKg;
  }, [form.weight, selectedWaste]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);

    window.setTimeout(() => {
      setIsSubmitted(false);
      closePickup();
      setForm(initialForm);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/40 bg-white/70 shadow-[0_30px_80px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/40 px-6 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/55 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Pickup Form
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">Form Pickup Sampah</h3>
            <p className="text-sm text-slate-600">Isi data untuk jadwal penjemputan pertama.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup form"
            onClick={closePickup}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/50 text-slate-700 transition hover:bg-white/75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {isSubmitted ? (
            <div className="rounded-[28px] border border-emerald-200/80 bg-emerald-50/90 p-6 text-center">
              <p className="text-lg font-semibold text-emerald-900">Permintaan diterima</p>
              <p className="mt-2 text-sm text-emerald-700">Tim operasional akan menghubungi Anda maksimal 1 x 24 jam.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                  placeholder="Nama lengkap"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nomor WhatsApp</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                    placeholder="08xx"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Estimasi berat (kg)</label>
                  <input
                    required
                    min="1"
                    type="number"
                    value={form.weight}
                    onChange={(event) => setForm({ ...form, weight: event.target.value })}
                    className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Jenis sampah</label>
                <select
                  required
                  value={form.wasteType}
                  onChange={(event) => setForm({ ...form, wasteType: event.target.value })}
                  className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">Pilih jenis sampah</option>
                  {wasteCatalog.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alamat lengkap</label>
                <textarea
                  required
                  rows={3}
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                  placeholder="Jalan, nomor rumah, RT/RW"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Catatan (opsional)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                  placeholder="Contoh: akses masuk dari gerbang timur"
                />
              </div>

            <div className="rounded-[24px] border border-white/50 bg-slate-950 p-4 text-sm text-white">
              <p className="text-white/65">Estimasi reward</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">Rp {estimatedReward.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-xs text-white/60">Nominal final mengikuti hasil timbang di lokasi.</p>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kirim Permintaan
            </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
