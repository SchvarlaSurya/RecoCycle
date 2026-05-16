"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Trophy, Gift, Zap, Clock, ChevronDown, Users, Crown, Medal, RefreshCw } from "lucide-react";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface LeaderboardUser {
  rank: number
  id: string
  name: string
  tier: string
  exp: number
  totalKg: number
  totalPickups: number
}

interface MyRankData {
  rank: number
  exp: number
  tier: string
  totalKg: number
}

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  silver: { bg: 'bg-stone-200', text: 'text-stone-600', border: 'border-stone-400' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' },
}

const tierBadges: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

const xpActions = [
  { action: "Setor sampah (per kg)", xp: 10 },
  { action: "Pickup terverifikasi admin", xp: 5 },
  { action: "Scan AI berhasil", xp: 20 },
  { action: "Ajak teman bergabung", xp: 100 },
];

const rewardPrizes = [
  "Kaos \"Eco-Warrior\" Gratis",
  "Bonus Saldo Rp 100.000",
  "Badge Digital Eksklusif",
];

const rankColors: Record<number, string> = {
  1: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30",
  2: "bg-gradient-to-br from-stone-300 to-stone-400 text-white",
  3: "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
};

export default function LeaderboardPage() {
  const { user } = useUser()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [myRank, setMyRank] = useState<MyRankData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState("Mei 2026")
  const [timeLeft, setTimeLeft] = useState({ days: 16, hours: 12, minutes: 35, seconds: 22 })

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      // Fetch top 5 leaderboard
      const res = await fetch('/api/exp?top=5')
      let leaderboardData: LeaderboardUser[] = []
      if (res.ok) {
        const data = await res.json()
        leaderboardData = data.leaderboard || []
        setLeaderboard(leaderboardData)
      }

      // Fetch my rank if logged in
      if (user) {
        const myRes = await fetch(`/api/exp?userId=${user.id}`)
        if (myRes.ok) {
          const myData = await myRes.json()
          if (myData.user) {
            // Calculate my rank
            const myPosition = leaderboardData.findIndex((u) => u.id === user.id)
            setMyRank({
              rank: myPosition >= 0 ? myPosition + 1 : leaderboardData.length + 1,
              exp: myData.user.exp || 0,
              tier: myData.tierInfo?.tier || 'bronze',
              totalKg: 0
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else if (days > 0) {
          days--
          hours = 23
          minutes = 59
          seconds = 59
        }
        return { days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (value: number) => value.toString().padStart(2, "0")

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Top Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm">
          <p className="text-sm text-stone-600">Total XP Anda</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {myRank ? `${myRank.exp.toLocaleString("id-ID")} XP` : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm">
          <p className="text-sm text-stone-600">Peringkat Anda</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              #{myRank?.rank || '—'}
            </span>
            {myRank?.tier && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tierColors[myRank.tier].bg} ${tierColors[myRank.tier].text}`}>
                {myRank.tier.charAt(0).toUpperCase() + myRank.tier.slice(1)} Tier
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-700 p-5 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <p className="text-sm text-emerald-100">Reset dalam</p>
          </div>
          <div className="mt-2 flex gap-2">
            {[
              { val: timeLeft.days, label: "Hari" },
              { val: timeLeft.hours, label: "Jam" },
              { val: timeLeft.minutes, label: "Menit" },
              { val: timeLeft.seconds, label: "Detik" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-2xl font-bold">{formatTime(item.val)}</span>
                <span className="text-xs text-emerald-200">{item.label}</span>
                {i < 3 && <span className="text-sm text-emerald-200">:</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Papan Peringkat */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/75 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-stone-900">Top 5 Leaderboard</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchLeaderboard}
                  className="p-2 rounded-lg hover:bg-stone-200 transition"
                >
                  <RefreshCw className={`h-4 w-4 text-stone-500 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none rounded-xl border border-stone-200 bg-white px-4 py-2 pr-10 text-sm outline-none transition focus:border-emerald-500"
                  >
                    <option>Mei 2026</option>
                    <option>April 2026</option>
                    <option>Maret 2026</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                </div>
              </div>
            </div>

            {/* Top 3 Podium */}
            <div className="bg-gradient-to-b from-stone-100 to-white p-6">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg font-bold ${rankColors[2]}`}>
                      2
                    </div>
                    <div className="mt-2 h-20 w-20 rounded-full bg-gradient-to-br from-stone-300 to-stone-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                      {leaderboard[1].name.charAt(0)}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-stone-700">{leaderboard[1].name}</p>
                    <p className="text-xs text-stone-500">{leaderboard[1].exp.toLocaleString()} XP</p>
                    <div className="mt-1 rounded-full bg-stone-200 px-2 py-0.5 text-xs">
                      {tierBadges[leaderboard[1].tier] || '🥉'} {leaderboard[1].tier}
                    </div>
                    <div className="h-16 w-full bg-gradient-to-t from-stone-300 to-stone-200 rounded-t-lg mt-2" />
                  </div>
                )}

                {/* 1st Place */}
                {leaderboard[0] && (
                  <div className="flex flex-col items-center">
                    <Crown className="h-8 w-8 text-amber-500 mb-1" />
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl font-bold ${rankColors[1]}`}>
                      1
                    </div>
                    <div className="mt-2 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-amber-500/30">
                      {leaderboard[0].name.charAt(0)}
                    </div>
                    <p className="mt-2 text-sm font-bold text-stone-800">{leaderboard[0].name}</p>
                    <p className="text-sm font-bold text-amber-600">{leaderboard[0].exp.toLocaleString()} XP</p>
                    <div className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      {tierBadges[leaderboard[0].tier] || '🥇'} {leaderboard[0].tier}
                    </div>
                    <div className="h-20 w-full bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-lg mt-2" />
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg font-bold ${rankColors[3]}`}>
                      3
                    </div>
                    <div className="mt-2 h-16 w-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {leaderboard[2].name.charAt(0)}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-stone-700">{leaderboard[2].name}</p>
                    <p className="text-xs text-stone-500">{leaderboard[2].exp.toLocaleString()} XP</p>
                    <div className="mt-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs">
                      {tierBadges[leaderboard[2].tier] || '🥉'} {leaderboard[2].tier}
                    </div>
                    <div className="h-12 w-full bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg mt-2" />
                  </div>
                )}
              </div>
            </div>

            {/* Rest of leaderboard */}
            <div className="divide-y divide-stone-100">
              {leaderboard.slice(3).map((user, index) => {
                const rank = index + 4
                const isMe = user.id === (typeof window !== 'undefined' ? localStorage.getItem('userId') : '')

                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between px-5 py-4 transition-all hover:bg-stone-50 ${
                      isMe ? "bg-emerald-50 border-l-4 border-l-emerald-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-500">
                        {rank}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-stone-800">{user.name}</span>
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <span>{user.totalKg.toFixed(1)} kg</span>
                            <span>•</span>
                            <span className={`${tierColors[user.tier]?.text || 'text-stone-500'}`}>
                              {tierBadges[user.tier]} {user.tier}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-stone-700">
                      {user.exp.toLocaleString("id-ID")} XP
                    </span>
                  </div>
                )
              })}

              {leaderboard.length === 0 && (
                <div className="py-12 text-center text-stone-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada data leaderboard</p>
                  <p className="text-sm">Mulai setor sampah untuk masuk ke ranking!</p>
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 bg-stone-50 px-5 py-3">
              <p className="text-xs text-stone-500">Update real-time saat ada setoran baru</p>
            </div>
          </div>
        </div>

        {/* Right - Cards */}
        <div className="space-y-4">
          {/* Hadiah Utama */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5" />
              <span className="text-sm font-semibold text-amber-100">Hadiah Akhir Bulan</span>
            </div>
            <h3 className="text-lg font-bold">Peringkat #1</h3>
            <p className="mt-2 text-sm text-amber-100">Raih hadiah eksklusif untuk top performer:</p>
            <ul className="mt-4 space-y-2">
              {rewardPrizes.map((prize, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
                  {prize}
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-white/10 rounded-xl">
              <p className="text-xs text-amber-100">Peringkat 2-5 juga mendapat bonus saldo!</p>
            </div>
          </div>

          {/* Tier Info */}
          <div className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Medal className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-stone-900">Tier System</h3>
            </div>
            <div className="space-y-3">
              {[
                { tier: 'Bronze', range: '0-999 XP', bonus: '+0%', color: 'bg-amber-100 text-amber-700' },
                { tier: 'Silver', range: '1.000-4.999 XP', bonus: '+3%', color: 'bg-stone-200 text-stone-600' },
                { tier: 'Gold', range: '5.000+ XP', bonus: '+10%', color: 'bg-yellow-100 text-yellow-700' },
              ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between p-2 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${t.color}`}>
                      {t.tier}
                    </span>
                    <span className="text-xs text-stone-500">{t.range}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{t.bonus}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cara Mengumpulkan XP */}
          <div className="rounded-3xl border border-white/60 bg-white/75 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-stone-900">Cara Mengumpulkan XP</h3>
            </div>
            <div className="space-y-3">
              {xpActions.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0">
                  <span className="text-sm text-stone-700">{item.action}</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                    +{item.xp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}