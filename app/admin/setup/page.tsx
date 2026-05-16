"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { setUserAsAdmin } from "@/app/actions/adminSetup";
import Link from "next/link";

export default function AdminSetupPage() {
  const { user } = useUser();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handlePromote = async () => {
    setStatus("loading");
    try {
      const res = await setUserAsAdmin(user?.id || "");
      if (res.success) {
        setStatus("success");
        setMessage(res.message || "Berhasil menjadi admin!");
      } else {
        setStatus("error");
        setMessage(res.error || "Gagal mempromosikan akun.");
      }
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Admin Account Setup</h1>
        <p className="text-sm text-stone-500 mb-8">
          Klik tombol di bawah untuk memberikan akses Administrator ke akun yang sedang login saat ini di Clerk metadata.
        </p>

        {status === "idle" && (
          <button
            onClick={handlePromote}
            className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 active:scale-95"
          >
            Promosikan Saya Jadi Admin
          </button>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-medium text-stone-600">Sedang memproses...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-800 font-medium">{message}</p>
            <p className="text-xs text-stone-500">Anda sekarang bisa mengakses semua fitur admin dengan role "admin".</p>
            <Link
              href="/admin"
              className="inline-block mt-4 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Kembali ke Dashboard Admin
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{message}</p>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm font-semibold text-stone-600 hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}