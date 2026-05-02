"use client";

import { useEffect, useState } from "react";
import { BadgeInfo, getUserBadges, evaluateBadges } from "@/app/actions/badges";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PencapaianPage() {
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      // Sekalian trigger pengecekan badge pas halamannya dbuka
      await evaluateBadges();
      const res = await getUserBadges();
      if (res.success && res.data) {
        setBadges(res.data);
      }
      setIsLoading(false);
    }
    loadBadges();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const unlockedCount = badges.filter(b => b.unlockedAt).length;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">Koleksi Lencana</h1>
        <p className="mt-2 text-stone-700">
          Selesaikan misi kelola sampah untuk mengumpulkan semua lencana pencapaian.
          Anda telah membuka <span className="font-semibold text-emerald-700">{unlockedCount} dari {badges.length}</span> lencana.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {badges.map((badge, index) => {
          const isUnlocked = !!badge.unlockedAt;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={badge.id}
              className={`relative overflow-hidden rounded-3xl border p-6 transition-all ${
                isUnlocked 
                  ? "border-emerald-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]" 
                  : "border-white/65 bg-white/72"
              }`}
            >
              <div 
                className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm ${
                  isUnlocked ? "bg-emerald-100 ring-4 ring-emerald-50" : "bg-stone-200 grayscale"
                }`}
              >
                {badge.icon}
              </div>
              
              <h3 className={`text-lg font-bold ${isUnlocked ? "text-stone-900" : "text-stone-500"}`}>
                {badge.name}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${isUnlocked ? "text-stone-700" : "text-stone-600"}`}>
                {badge.description}
              </p>

              <div className="mt-5">
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Terbuka
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    Terkunci
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
