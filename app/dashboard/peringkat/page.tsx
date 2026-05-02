"use client";

import { useWasteStore } from "@/store/useWasteStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { getRegisteredUsers } from "@/app/actions/leaderboard";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

type Competitor = {
  id: string;
  name: string;
  avatar: string;
  xp: number;
};

export default function LeaderboardPage() {
  const transactions = useWasteStore((state) => state.transactions);
  const { user, isLoaded } = useUser();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeToMonthEnd, setTimeToMonthEnd] = useState("");
  const xpGuideRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const localMonthlyXp = transactions
    .filter((tx) => new Date(tx.date) >= startOfMonth)
    .reduce((acc, tx) => {
      if (tx.type.startsWith("Scan AI:")) {
        return acc + 100;
      }
      return acc + tx.weight * 50;
    }, 0);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      try {
        const data = await getRegisteredUsers();
        setCompetitors(data);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const currentDate = new Date();
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const diff = Math.max(0, endOfMonth.getTime() - currentDate.getTime());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeToMonthEnd(
        `${days} Hari ${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const leaderboardParams = useMemo(() => {
    if (!isLoaded) return { top10: [] as Competitor[], myRank: 0, myXpDisplay: 0 };

    const allUsers = [...competitors];
    const myId = user?.id || "me";

    const meIndex = allUsers.findIndex((entry) => entry.id === myId);
    if (meIndex >= 0) {
      allUsers[meIndex].name = "Anda (Current User)";
    } else {
      allUsers.push({
        id: myId,
        name: "Anda (Current User)",
        xp: localMonthlyXp,
        avatar: user?.imageUrl || "",
      });
    }

    allUsers.sort((a, b) => b.xp - a.xp);
    const top10 = allUsers.slice(0, 10);
    const myRank = allUsers.findIndex((entry) => entry.id === myId) + 1;
    const myXpDisplay = allUsers.find((entry) => entry.id === myId)?.xp ?? localMonthlyXp;

    return { top10, myRank, myXpDisplay };
  }, [competitors, isLoaded, localMonthlyXp, user]);

  const { top10, myRank, myXpDisplay } = leaderboardParams;

  const scrollToXpGuide = () => {
    xpGuideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="glass-panel flex flex-col gap-2 rounded-3xl px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-stone-900">
              Top Eco-Warriors
            </h1>
            <p className="mt-1 text-sm text-stone-700">
              Setor sampah rutin, kumpulkan XP, dan raih posisi puncak. Peringkat
              1 setiap bulan akan mendapatkan hadiah eksklusif.
            </p>
          </div>
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Total XP Anda
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {myXpDisplay} <span className="text-lg">XP</span>
            </span>
            <span className="mt-0.5 text-sm font-medium text-stone-700">
              {isLoading || !isLoaded ? "Menghitung..." : `Peringkat #${myRank}`}
            </span>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="glass-panel min-h-[400px] overflow-hidden rounded-3xl">
            <div className="flex flex-col justify-between gap-3 border-b border-white/55 bg-white/55 px-6 py-4 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <h2 className="font-semibold text-stone-800">Papan Peringkat Bulan Ini</h2>
                <div className="flex w-fit items-center gap-2 rounded-md border border-stone-200 bg-white px-2 py-1 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-semibold text-stone-700">
                    Reset Bulanan:
                    <span className="ml-1 font-mono tracking-tight text-emerald-700">
                      {timeToMonthEnd}
                    </span>
                  </span>
                </div>
              </div>
              <span className="hidden text-xs font-medium uppercase tracking-widest text-stone-700 sm:block">
                Top 10
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {isLoading || !isLoaded ? (
                <div className="flex h-64 items-center justify-center text-stone-400">
                  <div className="flex animate-pulse items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-500" />
                    Memuat daftar pemain asli...
                  </div>
                </div>
              ) : (
                top10.map((boardUser, index) => {
                  const isMe = boardUser.id === user?.id || boardUser.id === "me";
                  let rankStyle = "bg-stone-100 text-stone-500";

                  if (index === 0) rankStyle = "scale-110 transform bg-yellow-400 text-yellow-900 shadow-md";
                  else if (index === 1) rankStyle = "bg-stone-300 text-stone-700 shadow-sm";
                  else if (index === 2) rankStyle = "bg-amber-600/30 text-amber-900 shadow-sm";

                  return (
                    <div
                      key={boardUser.id}
                      className={`group relative flex items-center justify-between px-6 py-4 transition-all duration-300 hover:bg-stone-50 ${isMe ? "bg-emerald-50/50" : ""}`}
                    >
                      {isMe && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-lg bg-emerald-500" />}

                      <div className="flex items-center gap-4">
                        <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white ${rankStyle}`}>
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          {boardUser.avatar ? (
                            <Image
                              src={boardUser.avatar}
                              alt={boardUser.name}
                              width={40}
                              height={40}
                              unoptimized
                              className={`h-10 w-10 rounded-full object-cover ${isMe ? "ring-2 ring-emerald-500 shadow-sm" : ""}`}
                            />
                          ) : (
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isMe ? "bg-emerald-600 text-white shadow-sm" : "bg-stone-200 text-stone-600"}`}>
                              {boardUser.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className={`text-sm font-semibold transition-colors group-hover:text-emerald-700 ${isMe ? "text-emerald-900" : "text-stone-800"}`}>
                              {boardUser.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-black ${isMe ? "text-emerald-700" : "text-stone-700 group-hover:text-stone-900"}`}>
                          {boardUser.xp} <span className="text-sm font-semibold opacity-70">XP</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-dark-panel group relative overflow-hidden rounded-3xl p-6 text-white transition-all duration-300 hover:-translate-y-1">
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl transition-all duration-500 group-hover:bg-emerald-400/30" />

            <div className="relative z-10">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                Luminous Prize
              </span>
              <h3 className="mb-2 text-xl font-bold tracking-tight text-white">Reward Peringkat #1</h3>
              <p className="mb-5 text-sm leading-relaxed text-stone-300">
                Pemain di posisi puncak pada akhir bulan akan memenangkan merchandise
                eksklusif kami.
              </p>

              <ul className="mb-6 space-y-3">
                <li className="flex items-center gap-2 text-sm text-stone-200">
                  <span className="text-emerald-400">OK</span> T-Shirt &quot;Eco-Warrior&quot; Gratis
                </li>
                <li className="flex items-center gap-2 text-sm text-stone-200">
                  <span className="text-emerald-400">OK</span> Bonus Saldo Rp 100.000
                </li>
                <li className="flex items-center gap-2 text-sm text-stone-200">
                  <span className="text-emerald-400">OK</span> Badge Digital Emas
                </li>
              </ul>

              <button
                type="button"
                onClick={scrollToXpGuide}
                className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-500 active:scale-95"
              >
                Cara Mengumpulkan XP
              </button>
            </div>
          </div>

          <div ref={xpGuideRef} className="glass-panel rounded-3xl p-6">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-900">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Level System Info
            </h3>
            <div className="mt-3 space-y-3 text-sm text-emerald-800">
              <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                <span>1 kg sampah terverifikasi</span>
                <span className="font-bold">+50 XP</span>
              </div>
              <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                <span>1x Scan AI berhasil</span>
                <span className="font-bold">+100 XP</span>
              </div>
              <div className="rounded-2xl bg-emerald-50/70 px-3 py-3 text-xs leading-5 text-emerald-900">
                XP bulanan saat ini dihitung dari setoran yang sudah terverifikasi dan hasil scan AI yang berhasil disimpan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
