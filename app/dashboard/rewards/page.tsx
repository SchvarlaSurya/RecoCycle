"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2, Trophy, Gift, Star, Zap, Check, Lock, ChevronDown } from "lucide-react";

type Reward = {
  id: string;
  title: string;
  description: string;
  xp: number;
  status: "claimed" | "available" | "locked";
  icon: React.ReactNode;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
};

export default function RewardsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<"hadiah" | "pencapaian">("hadiah");
  const [xp, setXp] = useState(0);
  const [tier, setTier] = useState("bronze");
  const [totalKg, setTotalKg] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const maxXp = 5000;
  const currentXp = xp;
  const progressPercent = Math.min((currentXp / maxXp) * 100, 100);
  const xpNeeded = Math.max(maxXp - currentXp, 0);

  useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      try {
        const res = await fetch(`/api/exp?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setXp(data.user?.exp || 0)
          setTier(data.user?.tier || 'bronze')
        }

        // Fetch total kg
        const userRes = await fetch(`/api/user-dashboard?userId=${user.id}`)
        if (userRes.ok) {
          const userData = await userRes.json()
          setTotalKg(userData.totalKg || 0)
        }
      } catch (e) {
        console.error('Failed to fetch user data:', e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const tierNames: Record<string, string> = {
    bronze: 'Pemula Hijau',
    silver: 'Eco Warrior',
    gold: 'Eco Champion'
  }

  const tierBadges: Record<string, string> = {
    bronze: '🌱',
    silver: '🌿',
    gold: '🏆'
  }

  // Calculate reward status based on XP
  const rewards: Reward[] = [
    {
      id: "1",
      title: "Pemula Beruntung",
      description: "Bonus saldo Rp 5.000",
      xp: 150,
      status: xp >= 150 ? "claimed" : "locked",
      icon: <Star className="h-6 w-6" />,
    },
    {
      id: "2",
      title: "Stiker Eksklusif",
      description: "Stiker Hologram RecoCycle",
      xp: 400,
      status: xp >= 400 ? "claimed" : xp >= 150 ? "available" : "locked",
      icon: <Gift className="h-6 w-6" />,
    },
    {
      id: "3",
      title: "Saldo Peduli Lingkungan",
      description: "Bonus Rp 15.000",
      xp: 1000,
      status: xp >= 1000 ? "claimed" : xp >= 400 ? "available" : "locked",
      icon: <Zap className="h-6 w-6" />,
    },
    {
      id: "4",
      title: "Tote Bag Premium",
      description: "Tas kain daur ulang eksklusif",
      xp: 2500,
      status: xp >= 2500 ? "claimed" : xp >= 1000 ? "available" : "locked",
      icon: <Trophy className="h-6 w-6" />,
    },
  ];

  // Calculate achievements based on real data
  const achievements: Achievement[] = [
    {
      id: "a1",
      title: "Pemula Hebat",
      description: "Menyetor 10kg sampah pertama",
      unlocked: totalKg >= 10,
      icon: "🌱",
    },
    {
      id: "a2",
      title: "Raja Kardus",
      description: "Menyetor 50kg kardus",
      unlocked: totalKg >= 50,
      icon: "📦",
    },
    {
      id: "a3",
      title: "Penyelamat Bumi",
      description: "Menyetor 100kg total",
      unlocked: totalKg >= 100,
      icon: "🌍",
    },
    {
      id: "a4",
      title: "Master Recycler",
      description: "Menyetor 500kg total",
      unlocked: totalKg >= 500,
      icon: "♻️",
    },
    {
      id: "a5",
      title: "Eco Champion",
      description: "Peringkat 1 bulanan",
      unlocked: false,
      icon: "🏆",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Top Section */}
      <div className="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <span className="text-3xl">{tierBadges[tier] || '🏆'}</span>
              </div>
              <div>
                <p className="text-sm text-stone-600">{tier.toUpperCase()} TIER</p>
                <h2 className="text-2xl font-bold text-stone-900">{tierNames[tier] || 'Eco Contributor'}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <span className="text-lg">🎁</span>
                  </div>
                  <span className="text-sm text-stone-700">Total XP: {currentXp.toLocaleString("id-ID")} / {maxXp.toLocaleString("id-ID")} XP</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-stone-700">Progress XP</span>
                <span className="font-bold text-emerald-700">{currentXp} / {maxXp} XP</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-2">🎁</div>
              <p className="text-sm text-stone-600">Hadiah Menunggu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl border border-stone-200 bg-stone-50 p-1 w-fit">
        <button
          onClick={() => setActiveTab("hadiah")}
          className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
            activeTab === "hadiah"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Hadiah
        </button>
        <button
          onClick={() => setActiveTab("pencapaian")}
          className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
            activeTab === "pencapaian"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          Pencapaian
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "hadiah" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 transition-all ${
                reward.status === "claimed"
                  ? "border-emerald-200 bg-emerald-50/50 opacity-75"
                  : reward.status === "available"
                  ? "border-emerald-300 bg-white shadow-[0_8px_30px_rgba(16,185,129,0.12)]"
                  : "border-stone-200 bg-white"
              }`}
            >
              {/* Badge */}
              {reward.status === "claimed" && (
                <div className="absolute right-3 top-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Check className="h-3 w-3" />
                    Sudah Diklaim
                  </span>
                </div>
              )}

              <div>
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  reward.status === "locked"
                    ? "bg-stone-200 grayscale"
                    : reward.status === "available"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {reward.icon}
                </div>
                <h3 className={`text-lg font-bold ${reward.status === "locked" ? "text-stone-400" : "text-stone-900"}`}>
                  {reward.title}
                </h3>
                <p className={`mt-1 text-sm ${reward.status === "locked" ? "text-stone-500" : "text-stone-600"}`}>
                  {reward.description}
                </p>
              </div>

              <div className="mt-5">
                {reward.status === "claimed" ? (
                  <button disabled className="w-full rounded-xl bg-stone-200 py-2.5 text-sm font-semibold text-stone-600 flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" />
                    Diklaim
                  </button>
                ) : reward.status === "available" ? (
                  <button className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                    Klaim Sekarang
                  </button>
                ) : (
                  <div className="w-full rounded-xl bg-stone-100 py-2.5 text-center text-sm font-medium text-stone-500">
                    Butuh {xpNeeded} XP lagi
                  </div>
                )}
                <p className="mt-2 text-center text-xs text-stone-500">{reward.xp} XP</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-900">Pencapaian Anda</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative flex items-start gap-4 rounded-2xl border p-4 transition-all ${
                  achievement.unlocked
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-stone-200 bg-stone-50"
                }`}
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
                  achievement.unlocked ? "bg-emerald-100" : "bg-stone-200 grayscale"
                }`}>
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${achievement.unlocked ? "text-stone-900" : "text-stone-500"}`}>
                      {achievement.title}
                    </h4>
                    {achievement.unlocked ? (
                      <span className="rounded-full bg-emerald-100 p-0.5">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </span>
                    ) : (
                      <Lock className="h-4 w-4 text-stone-400" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}