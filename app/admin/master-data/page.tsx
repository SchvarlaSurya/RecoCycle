"use client";

import { useState, useEffect } from "react";
import { categoryLabel, type WasteCategory } from "@/lib/types";
import { getWasteCatalogAdmin, updateWastePrice, addWasteCategory } from "@/app/actions/adminDashboard";

type WasteCatalogItem = {
  id: string;
  name: string;
  category: WasteCategory;
  price_per_kg: number | string | null;
  updated_at: string | Date | null;
};

export default function MasterDataPage() {
  const [wasteCatalog, setWasteCatalog] = useState<WasteCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "anorganik" as WasteCategory, pricePerKg: "" });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getWasteCatalogAdmin();
      if (res.success && res.data) {
        setWasteCatalog(res.data);
      }
    } catch (error) {
      console.error("Error loading waste catalog:", error);
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

  const handleSavePrice = async (wasteId: string) => {
    const price = Number(editPrice);
    if (!price || price <= 0) return;
    setIsProcessing(true);
    try {
      const res = await updateWastePrice(wasteId, price);
      if (res.success) {
        await loadData();
        setEditingId(null);
        setEditPrice("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.name || !newItem.pricePerKg) return;
    setIsProcessing(true);
    try {
      const res = await addWasteCategory(newItem.name, newItem.category, Number(newItem.pricePerKg));
      if (res.success) {
        await loadData();
        setNewItem({ name: "", category: "anorganik", pricePerKg: "" });
        setShowAdd(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Master Data & Harga</h1>
          <p className="text-sm text-slate-300">Kelola kategori sampah dan update harga per kg. Harga otomatis terhubung ke sisi nasabah.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Kategori
        </button>
      </div>

      {/* Info Banner */}
      <div className="glass-dark-panel flex items-start gap-3 rounded-xl p-4">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-white">Harga terhubung otomatis</p>
          <p className="mt-0.5 text-xs text-slate-300">Setiap perubahan harga akan langsung berlaku di semua perhitungan setoran nasabah. Perubahan dicatat di Log Aktivitas.</p>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass-dark-panel space-y-4 rounded-2xl p-5">
          <h3 className="font-semibold text-white">Tambah Kategori Baru</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-200">Nama Jenis Sampah</label>
              <input
                type="text"
                placeholder="contoh: Styrofoam Bersih"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-200">Kategori</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as WasteCategory })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                disabled={isProcessing}
              >
                <option value="anorganik">Anorganik</option>
                <option value="organik">Organik</option>
                <option value="khusus">Khusus</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-200">Harga per kg (Rp)</label>
              <input
                type="number"
                min="0"
                placeholder="5000"
                value={newItem.pricePerKg}
                onChange={(e) => setNewItem({ ...newItem, pricePerKg: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                disabled={isProcessing}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={!newItem.name || !newItem.pricePerKg || isProcessing}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition"
            >
              {isProcessing ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              disabled={isProcessing}
              className="rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/15 transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-dark-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/45 text-left">
                <th className="px-5 py-3 font-medium text-slate-300">Jenis Sampah</th>
                <th className="px-5 py-3 font-medium text-slate-300">Kategori</th>
                <th className="px-5 py-3 font-medium text-slate-300">Harga / kg</th>
                <th className="hidden px-5 py-3 font-medium text-slate-300 sm:table-cell">Terakhir Update</th>
                <th className="px-5 py-3 text-right font-medium text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {wasteCatalog.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-white/5">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white">{item.name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      item.category === "anorganik" ? "bg-blue-100 text-blue-800" :
                      item.category === "organik" ? "bg-green-100 text-green-800" :
                      "bg-purple-100 text-purple-800"
                    }`}>
                      {categoryLabel[item.category as WasteCategory] || item.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Rp</span>
                        <input
                          type="number"
                          autoFocus
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSavePrice(item.id)}
                          className="w-24 rounded-lg border border-emerald-400/50 bg-slate-950/55 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          disabled={isProcessing}
                        />
                        <button onClick={() => handleSavePrice(item.id)} className="text-emerald-600 hover:text-emerald-800" disabled={isProcessing}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-stone-400 hover:text-stone-600" disabled={isProcessing}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Rp {Number(item.price_per_kg || 0).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-slate-400">{item.updated_at ? new Date(item.updated_at).toLocaleDateString("id-ID") : "-"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {editingId !== item.id && (
                      <button
                        onClick={() => { setEditingId(item.id); setEditPrice(String(item.price_per_kg)); }}
                        disabled={isProcessing}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/15 transition"
                      >
                        Edit Harga
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
