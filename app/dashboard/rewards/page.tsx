"use client";

import { useEffect, useState } from "react";
import { getRewardsStatus, claimReward } from "@/app/actions/rewards";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type RewardStatusItem = NonNullable<Awaited<ReturnType<typeof getRewardsStatus>>["rewards"]>[number];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardStatusItem[]>([]);
  const [userXp, setUserXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    const res = await getRewardsStatus();
    if (res.success && res.rewards) {
      setRewards(res.rewards);
      setUserXp(res.userXp);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleClaim = async (rewardId: string) => {
    setIsClaiming(rewardId);
    try {
      const res = await claimReward(rewardId);
      if (res.success) {
        // Efek Confetti!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#fbbf24', '#ffffff']
        });
        toast.success("Hadiah berhasil diklaim!");
        // Refresh data agar status pindah ke 'isClaimed'
        await loadData();
      } else {
        toast.error(res.error || "Gagal mengklaim hadiah.");
      }
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setIsClaiming(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Tentukan progress bar berdasarkan hadiah tertinggi yang ada
  const maxRequiredXp = Math.max(...rewards.map(r => r.requiredXp));
  const progressPercent = Math.min((userXp / maxRequiredXp) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-900">Pusat Hadiah</h1>
          <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            Edisi Bulan Ini
          </span>
        </div>
        <p className="mt-2 text-stone-700">
          Kumpulkan EXP dengan rutin menyetor sampah bulan ini. Progress dan ketersediaan hadiah akan secara otomatis di-reset pada tanggal 1 setiap bulannya!
        </p>

        {/* Progress Bar Area */}
        <div className="glass-panel mt-6 rounded-3xl p-6">
          <div className="flex items-end justify-between font-medium">
            <span className="text-sm text-stone-700 uppercase tracking-widest font-semibold">EXP Bulan Ini</span>
            <span className="text-3xl font-black text-emerald-700">{userXp.toLocaleString("id-ID")} <span className="text-base font-medium tracking-normal text-stone-600">XP</span></span>
          </div>
          <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-stone-100">
            <div 
              className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => {
          const isClaimed = reward.isClaimed;
          const canClaim = reward.canClaim;
          
          return (
            <div
              key={reward.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all ${
                isClaimed 
                  ? "border-emerald-200 bg-emerald-50 opacity-70 grayscale-[20%]" 
                  : canClaim
                    ? "border-emerald-300 bg-white shadow-[0_8px_30px_rgb(16,185,129,0.12)] scale-[1.02]"
                    : "glass-panel-soft"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm ${
                    canClaim || isClaimed ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 grayscale"
                  }`}>
                    {reward.icon}
                  </div>
                  <div className="rounded-full bg-stone-200/70 px-3 py-1 text-xs font-bold tracking-wider text-stone-700">
                    {reward.requiredXp} XP
                  </div>
                </div>
                
                <h3 className={`text-lg font-bold ${canClaim || isClaimed ? "text-stone-900" : "text-stone-500"}`}>
                  {reward.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${canClaim || isClaimed ? "text-stone-700" : "text-stone-600"}`}>
                  {reward.description}
                </p>
              </div>

              <div className="mt-8">
                {isClaimed ? (
                  <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-200 py-3 text-sm font-semibold text-stone-700">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Sudah Diklaim
                  </button>
                ) : canClaim ? (
                  <button 
                    onClick={() => handleClaim(reward.id)}
                    disabled={isClaiming === reward.id}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition active:scale-95 shadow-md flex justify-center items-center gap-2"
                  >
                    {isClaiming === reward.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : "Klaim Sekarang"}
                  </button>
                ) : (
                  <div className="w-full rounded-xl bg-stone-200/60 py-3 text-center text-sm font-semibold text-stone-700">
                    Butuh {reward.requiredXp - userXp} XP lagi
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
