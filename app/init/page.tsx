"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function InitPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const initDatabase = async () => {
    setStatus('loading');
    setResults([]);
    setError("");

    try {
      const res = await fetch('/api/init');
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setResults(data.results || []);
      } else {
        setStatus('error');
        setError(data.error || 'Unknown error');
        setResults(data.results || []);
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Database Setup</h1>
          <p className="text-stone-600 mt-2">Inisialisasi semua tabel dan data untuk RecoCycle</p>
        </div>

        {status === 'idle' && (
          <button
            onClick={initDatabase}
            className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all"
          >
            🚀 Initialize Database
          </button>
        )}

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-stone-600">Setting up database...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <p className="text-emerald-700 font-semibold">✓ Setup Complete!</p>
            </div>

            <div className="bg-stone-50 rounded-xl p-4 mb-6 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <p key={i} className="text-sm text-stone-700 font-mono py-1">{r}</p>
              ))}
            </div>

            <div className="flex gap-3">
              <Link href="/admin" className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl text-center hover:bg-emerald-500 transition">
                Go to Admin Dashboard
              </Link>
              <button
                onClick={initDatabase}
                className="py-3 px-4 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 transition"
              >
                Re-run
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-700 font-semibold">✗ Setup Failed</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>

            {results.length > 0 && (
              <div className="bg-stone-50 rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                <p className="text-xs text-stone-500 mb-2">Partial results:</p>
                {results.map((r, i) => (
                  <p key={i} className="text-sm text-stone-700 font-mono py-1">{r}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={initDatabase}
                className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition"
              >
                Retry
              </button>
              <Link href="/admin" className="py-3 px-4 border border-stone-300 text-stone-600 rounded-xl text-center hover:bg-stone-50 transition">
                Skip
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}