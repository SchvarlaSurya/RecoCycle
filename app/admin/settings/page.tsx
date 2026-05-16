"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import { Shield, Monitor, Smartphone, Key, Bell, Database, LogOut, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

export default function AdminSettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<"akun" | "keamanan" | "sistem">("akun");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [systemStats, setSystemStats] = useState<any>(null);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "admin@reocycle.com";
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "Admin";
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || user?.username?.[0]?.toUpperCase() || "A";

  const fetchSystemStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch system stats');
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const handleSyncExp = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/sync-exp', {
        method: 'POST',
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage({ type: 'success', text: `Berhasil sync EXP untuk ${data.users?.length || 0} user` });
        fetchSystemStats();
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Gagal sync EXP' });
      }
    } catch (e) {
      setSyncMessage({ type: 'error', text: 'Gagal sync EXP' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Apakah Anda yakin ingin logout?')) {
      await signOut({ redirectUrl: '/' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Pengaturan Admin</h1>
          <p className="mt-1 text-sm text-stone-600">Kelola akun dan konfigurasi sistem</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-xl border border-stone-200 bg-white p-1 w-fit">
        {(["akun", "keamanan", "sistem"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            )}
          >
            {tab === "akun" ? "Akun" : tab === "keamanan" ? "Keamanan" : "Sistem"}
          </button>
        ))}
      </div>

      {activeTab === "akun" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profil Admin */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Shield className="h-5 w-5 text-emerald-600" />
              Profil Administrator
            </h2>

            <div className="mt-6 flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                {isLoaded ? initials : "..."}
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">{isLoaded ? fullName : "Memuat..."}</h3>
                <p className="text-sm text-stone-500">{userEmail}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Administrator
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Key className="h-5 w-5 text-emerald-600" />
              Aksi Cepat
            </h2>

            <div className="mt-6 space-y-4">
              <button
                onClick={handleSyncExp}
                disabled={isSyncing}
                className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left transition hover:bg-stone-50 hover:border-emerald-300 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Sync EXP Semua User</p>
                    <p className="text-xs text-stone-500">Update EXP berdasarkan pickup terverifikasi</p>
                  </div>
                </div>
                {isSyncing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                ) : (
                  <Check className="h-5 w-5 text-stone-400" />
                )}
              </button>

              {syncMessage && (
                <div className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                  syncMessage.type === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {syncMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {syncMessage.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "keamanan" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Keamanan */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Shield className="h-5 w-5 text-emerald-600" />
              Keamanan & Akun
            </h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Email</p>
                    <p className="text-sm text-stone-500">{userEmail}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <Check className="h-3 w-3 inline mr-1" />
                  Terverifikasi
                </span>
              </div>

              <div className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200 text-stone-600">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Kata Sandi</p>
                    <p className="text-sm text-stone-500">Klik untuk ubah kata sandi</p>
                  </div>
                </div>
                <UserButton />
              </div>

              <div className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Autentikasi Dua Faktor</p>
                    <p className="text-sm text-stone-500">Klik untuk atur 2FA</p>
                  </div>
                </div>
                <UserButton />
              </div>

              <div className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Perangkat Terhubung</p>
                    <p className="text-sm text-stone-500">Klik untuk lihat perangkat</p>
                  </div>
                </div>
                <UserButton />
              </div>
            </div>
          </div>

          {/* Notifikasi */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Bell className="h-5 w-5 text-emerald-600" />
              Notifikasi
            </h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-stone-900">Email Notifications</p>
                    <p className="text-sm text-stone-500">Terima notifikasi via email</p>
                  </div>
                </div>
                <button className="relative h-6 w-11 rounded-full bg-emerald-500 transition-colors">
                  <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-stone-900">Pending Alerts</p>
                    <p className="text-sm text-stone-500">Notifikasi saat ada pending baru</p>
                  </div>
                </div>
                <button className="relative h-6 w-11 rounded-full bg-emerald-500 transition-colors">
                  <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sistem" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Stats */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Database className="h-5 w-5 text-emerald-600" />
              Statistik Sistem
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Total User</p>
                <p className="mt-1 text-2xl font-bold text-stone-900">{systemStats?.totalUsers || 0}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Total Pickup</p>
                <p className="mt-1 text-2xl font-bold text-stone-900">{systemStats?.totalPickups || 0}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-600">Pending Pickup</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{systemStats?.pendingPickups || 0}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-600">Pending Withdrawal</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{systemStats?.pendingWithdrawals || 0}</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <LogOut className="h-5 w-5 text-red-600" />
              Keluar
            </h2>

            <div className="mt-6">
              <p className="text-sm text-stone-600 mb-4">
                Keluar dari panel admin. Anda akan diarahkan ke halaman utama.
              </p>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
