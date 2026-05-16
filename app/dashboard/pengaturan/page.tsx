"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import { Camera, Check, MapPin, Shield, Smartphone, Monitor, Download, Trash2, ChevronRight, User, Lock, Loader2, AlertCircle } from "lucide-react";
import { useWasteStore } from "@/store/useWasteStore";
import { cn } from "@/lib/utils";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const profileSchema = z.object({
  firstName: z.string().min(1, "Nama depan wajib diisi"),
  lastName: z.string().min(1, "Nama belakang wajib diisi"),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
});

const addressSchema = z.object({
  address: z.string().min(10, "Alamat minimal 10 karakter"),
  latitude: z.number(),
  longitude: z.number(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type AddressFormData = z.infer<typeof addressSchema>;

const tierColors: Record<string, { bg: string; text: string; badge: string }> = {
  bronze: { bg: "bg-amber-100", text: "text-amber-700", badge: "🥉" },
  silver: { bg: "bg-stone-200", text: "text-stone-600", badge: "🥈" },
  gold: { bg: "bg-yellow-100", text: "text-yellow-700", badge: "🥇" },
};

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { userTier, userExp } = useWasteStore();
  const [selectedTab, setSelectedTab] = useState<"profil" | "alamat" | "keamanan">("profil");
  const [memberSince, setMemberSince] = useState("Loading...");

  // States for profile
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // States for address
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState<any>(null);

  const tierInfo = tierColors[userTier] || tierColors.bronze;
  const tierName = userTier.charAt(0).toUpperCase() + userTier.slice(1);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: "",
      latitude: -6.2088,
      longitude: 106.8456,
    },
  });

  // Load user data
  useEffect(() => {
    if (user) {
      profileForm.setValue("firstName", user.firstName || "");
      profileForm.setValue("lastName", user.lastName || "");
      profileForm.setValue("phone", user.phoneNumbers?.[0]?.phoneNumber || "");
    }
  }, [user, profileForm]);

  useEffect(() => {
    if (user?.createdAt) {
      const date = new Date(user.createdAt);
      setMemberSince(date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
    }
  }, [user?.createdAt]);

  // Fetch saved address
  useEffect(() => {
    const fetchAddress = async () => {
      if (!user) return
      try {
        const res = await fetch(`/api/user/address?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data && !data.error) {
            setSavedAddress(data)
            addressForm.setValue("address", data.address || "")
            addressForm.setValue("latitude", data.latitude || -6.2088)
            addressForm.setValue("longitude", data.longitude || 106.8456)
          }
        }
      } catch (e) {
        console.error('Failed to fetch address:', e)
      }
    }
    fetchAddress()
  }, [user, addressForm])

  const watchedLat = addressForm.watch("latitude");
  const watchedLng = addressForm.watch("longitude");

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return

    setIsSavingProfile(true)
    setProfileError(null)

    try {
      await user.update({
        firstName: data.firstName,
        lastName: data.lastName,
      })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (error: any) {
      console.error('Profile update error:', error)
      setProfileError(error.message || 'Gagal menyimpan profil')
    } finally {
      setIsSavingProfile(false)
    }
  };

  const onAddressSubmit = async (data: AddressFormData) => {
    if (!user) return

    setIsSavingAddress(true)
    setAddressError(null)

    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        })
      })

      const result = await res.json()
      if (res.ok && result.success) {
        setSavedAddress({ ...data, user_id: user.id })
        setAddressSuccess(true)
        setTimeout(() => setAddressSuccess(false), 3000)
      } else {
        setAddressError(result.error || 'Gagal menyimpan alamat')
      }
    } catch (error) {
      console.error('Address save error:', error)
      setAddressError('Gagal menyimpan alamat')
    } finally {
      setIsSavingAddress(false)
    }
  };

  const handleExportData = async () => {
    if (!user) return

    try {
      const userData = {
        profile: {
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
          email: user.emailAddresses?.[0]?.emailAddress,
          phone: user.phoneNumbers?.[0]?.phoneNumber,
          memberSince: memberSince,
          tier: userTier,
          exp: userExp,
        },
        address: savedAddress,
      }

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reocycle-data-${user.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  };

  const handleDeleteAccount = () => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.")) {
      return
    }
    alert("Untuk menghapus akun, silakan hubungi support@reocycle.com")
  };

  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "email@example.com";
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "User";
  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || user?.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-stone-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-stone-600">Kelola informasi akun dan preferensi Anda.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex rounded-2xl border border-stone-200 bg-stone-50 p-1 w-fit">
        {(["profil", "alamat", "keamanan"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            className={cn(
              "rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
              selectedTab === tab
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            {tab === "profil" ? "Profil" : tab === "alamat" ? "Alamat" : "Keamanan"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {selectedTab === "profil" && (
          <>
            {/* Profil Anda */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <User className="h-5 w-5 text-emerald-600" />
                Profil Anda
              </h2>

              <div className="mt-6 flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                    {isLoaded ? initials : "..."}
                  </div>
                  <button
                    type="button"
                    onClick={() => openUserProfile()}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    title="Ubah Foto"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{isLoaded ? fullName : "Memuat..."}</h3>
                  <p className="text-sm text-stone-600">Member sejak {memberSince}</p>
                  <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tierInfo.bg, tierInfo.text)}>
                    {tierInfo.badge} {tierName} Tier
                  </span>
                  <p className="mt-1 text-xs text-stone-500">
                    {userExp.toLocaleString('id-ID')} XP
                  </p>
                </div>
              </div>
            </div>

            {/* Informasi Pribadi */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <User className="h-5 w-5 text-emerald-600" />
                Informasi Pribadi
              </h2>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="mt-6 space-y-4">
                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600">
                    <Check className="h-4 w-4" />
                    Profil berhasil disimpan!
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {profileError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Nama Depan</label>
                    <input
                      {...profileForm.register("firstName")}
                      type="text"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-stone-700">Nama Belakang</label>
                    <input
                      {...profileForm.register("lastName")}
                      type="text"
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Nomor Handphone</label>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700">+62</span>
                    <input
                      {...profileForm.register("phone")}
                      type="tel"
                      className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  {profileForm.formState.errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Simpan Profil
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {selectedTab === "alamat" && (
          <>
            {/* Alamat Penjemputan - Full Width */}
            <div className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Alamat Penjemputan
              </h2>

              <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="mt-6 space-y-4">
                {addressSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-600">
                    <Check className="h-4 w-4" />
                    Alamat berhasil disimpan!
                  </div>
                )}

                {addressError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {addressError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Alamat Lengkap</label>
                  <textarea
                    {...addressForm.register("address")}
                    rows={3}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {addressForm.formState.errors.address && (
                    <p className="mt-1 text-xs text-red-600">{addressForm.formState.errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">Pin Lokasi Peta</label>
                  <div className="h-72 overflow-hidden rounded-2xl border border-stone-200">
                    <MapPicker
                      position={{ lat: watchedLat, lng: watchedLng }}
                      onChange={(pos) => {
                        addressForm.setValue("latitude", pos.lat);
                        addressForm.setValue("longitude", pos.lng);
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    Koordinat: {watchedLat?.toFixed(6)}, {watchedLng?.toFixed(6)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Simpan Alamat
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {selectedTab === "keamanan" && (
          <>
            {/* Keamanan & Akun */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <Shield className="h-5 w-5 text-emerald-600" />
                Keamanan & Akun
              </h2>

              <div className="mt-6 space-y-4">
                {/* Email */}
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 p-4">
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

                {/* Password Change */}
                <div className="flex w-full items-center justify-between rounded-2xl border border-stone-200 p-4 hover:bg-stone-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">Kata Sandi</p>
                      <p className="text-sm text-stone-500">Klik untuk ubah kata sandi</p>
                    </div>
                  </div>
                  <UserButton />
                </div>

                {/* 2FA */}
                <div className="flex w-full items-center justify-between rounded-2xl border border-stone-200 p-4 hover:bg-stone-50 transition">
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

                {/* Devices */}
                <div className="flex w-full items-center justify-between rounded-2xl border border-stone-200 p-4 hover:bg-stone-50 transition">
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

              <p className="mt-4 text-xs text-stone-500 text-center">
                Klik tombol di atas untuk membuka pengaturan keamanan di Clerk
              </p>
            </div>

            {/* Aksi Akun */}
            <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <Shield className="h-5 w-5 text-emerald-600" />
                Aksi Akun
              </h2>

              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex w-full items-center justify-between rounded-2xl border border-stone-200 p-4 text-left hover:bg-stone-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-stone-900">Unduh Data Saya</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stone-400" />
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-left hover:bg-red-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-700">Hapus Akun</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-red-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}