"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Leaf,
  Recycle,
  FileText,
  Wallet,
  Star,
  ChevronRight,
  Camera,
  Package,
  ArrowDownLeft,
  Gift,
  Trophy,
} from "lucide-react";
import { useWasteStore, useUserTier } from "@/store/useWasteStore";

const userData = null // Will be fetched from API

const quickActions = [
  { title: "Setor Sampah", subtitle: "Jadwalkan setoran", icon: Recycle, color: "bg-emerald-100 text-emerald-600", href: "/dashboard/setor" },
  { title: "Tarik Saldo", subtitle: "Pindahkan saldo", icon: Wallet, color: "bg-blue-100 text-blue-600", href: "/dashboard/tarik" },
  { title: "Riwayat Pickup", subtitle: "Lihat riwayat", icon: Trophy, color: "bg-emerald-100 text-emerald-600", href: "/dashboard/riwayat" },
  { title: "Leaderboard XP", subtitle: "Lihat peringkat", icon: Trophy, color: "bg-amber-100 text-amber-600", href: "/dashboard/peringkat" },
  { title: "Claim Reward", subtitle: "Tukar hadiah", icon: Gift, color: "bg-orange-100 text-orange-600", href: "/dashboard/rewards" },
];

// Tier calculation based on EXP
function calculateTierFromExp(exp: number): { tier: string; bonus: number; expForNextTier: number } {
  if (exp >= 5000) {
    return { tier: 'gold', bonus: 10, expForNextTier: 0 }
  } else if (exp >= 1000) {
    return { tier: 'silver', bonus: 3, expForNextTier: 5000 }
  } else {
    return { tier: 'bronze', bonus: 0, expForNextTier: 1000 }
  }
}

const statusColors: Record<string, string> = {
  TERVERIFIKASI: "bg-emerald-100 text-emerald-700",
  SELESAI: "bg-stone-200 text-stone-600",
  PENDING: "bg-amber-100 text-amber-700",
};

const typeColors: Record<string, string> = {
  Setoran: "bg-emerald-50 text-emerald-600",
  Reward: "bg-amber-50 text-amber-600",
  Penarikan: "bg-red-50 text-red-600",
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        setValue(Math.round(easedProgress * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [isVisible, target, duration, delay]);

  return { value, ref };
}

function AnimatedStatCard({ title, value, suffix, prefix, subtitle, icon: Icon, delay = 0 }: {
  title: string; value: number; suffix?: string; prefix?: string; subtitle?: string; icon: typeof Leaf; delay?: number;
}) {
  const { value: count, ref } = useCountUp(value, 1000, delay);
  const [iconHovered, setIconHovered] = useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:shadow-green-100/50 hover:border-green-200",
        "hover:-translate-y-0.5"
      )}
    >
      <div>
        <p className="text-sm text-stone-600">{title}</p>
        <p className="mt-1 text-2xl font-bold text-stone-900">
          {count.toLocaleString("id-ID")}{suffix}
        </p>
        {subtitle && <p className="mt-1 text-xs text-emerald-600">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600",
            "transition-all duration-300",
            iconHovered && "bg-green-100 scale-110 rotate-6"
          )}
          onMouseEnter={() => setIconHovered(true)}
          onMouseLeave={() => setIconHovered(false)}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function AnimatedQuickAction({ title, subtitle, icon: Icon, color, href, delay = 0 }: {
  title: string; subtitle: string; icon: typeof Recycle; color: string; href: string; delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white/75 p-5 shadow-sm",
        "transition-all duration-250 ease-out cursor-pointer",
        "hover:border-green-300 hover:bg-green-50/50 hover:shadow-md hover:-translate-y-1",
        "opacity-0 translate-y-4"
      )}
      style={{
        animation: `fade-in-up 0.5s ease-out forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
          color,
          isHovered && "scale-125 rotate-12"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
      <ChevronRight
        className={cn(
          "h-5 w-5 text-stone-400 transition-all duration-200",
          isHovered && "translate-x-1.5"
        )}
      />
    </Link>
  );
}

function AnimatedTransaction({ tx, delay = 0 }: { tx: any; delay?: number }) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine type from transaction
  const type = tx.type === 'penarikan' ? 'Penarikan' : tx.type === 'reward' || tx.type === 'bonus' ? 'Reward' : 'Setoran';
  const category = tx.description || tx.waste_name || tx.category || type;
  const weight = tx.weight ? `${tx.weight} kg` : '-';
  const amount = Math.abs(parseFloat(tx.amount) || 0);
  const status = tx.status?.toUpperCase() || 'PENDING';
  const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex items-center justify-between rounded-xl border border-stone-100 p-3",
        "transition-all duration-200",
        isHovered && "bg-stone-50 border-l-2 border-green-400 pl-2"
      )}
      style={{
        animation: `fade-in-left 0.4s ease-out forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${typeColors[type] || typeColors.Setoran}`}>
          {type === "Setoran" ? <ArrowDownLeft className="h-4 w-4" /> : type === "Penarikan" ? <ArrowDownLeft className="h-4 w-4 rotate-180" /> : <Gift className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium text-stone-900">{category}</p>
          <p className="text-xs text-stone-500">{weight} • {String(tx.id || '').slice(0, 8)}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
          statusColors[status] || statusColors.PENDING
        )}>
          {status === "TERVERIFIKASI" || status === "SELESAI" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          ) : null}
          {status}
        </span>
        <p className={cn(
          "mt-1 text-sm transition-all duration-150",
          type === 'Penarikan' ? (isHovered ? "text-red-700 font-semibold" : "font-semibold text-red-600") : (isHovered ? "text-green-700 font-semibold" : "font-semibold text-emerald-700")
        )}>
          {type === 'Penarikan' ? '-' : '+'}Rp {amount.toLocaleString("id-ID")}
        </p>
        <p className="text-xs text-stone-400">{date}</p>
      </div>
    </div>
  );
}

function MembershipCard({ userExp }: { userExp: number }) {
  const [isShimmering, setIsShimmering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate tier from prop instead of Zustand
  const tierInfo = calculateTierFromExp(userExp)
  const tier = tierInfo.tier
  const bonusPercentage = tierInfo.bonus
  const expForNextTier = tierInfo.expForNextTier
  const exp = userExp

  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const nextTierName = tier === 'bronze' ? 'Silver' : tier === 'silver' ? 'Gold' : null;

  // Tier badge based on tier
  const tierBadge = tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉';

  // Dynamic colors based on tier
  const tierGradients: Record<string, { from: string; to: string; text: string; bg: string }> = {
    bronze: { from: 'from-amber-700', to: 'to-amber-900', text: 'text-amber-100', bg: 'bg-amber-500' },
    silver: { from: 'from-stone-500', to: 'to-stone-700', text: 'text-stone-100', bg: 'bg-stone-400' },
    gold: { from: 'from-yellow-500', to: 'to-yellow-700', text: 'text-yellow-100', bg: 'bg-yellow-400' },
  };

  const colors = tierGradients[tier] || tierGradients.bronze;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsShimmering(true)}
      onMouseLeave={() => setIsShimmering(false)}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white",
        `bg-gradient-to-br ${colors.from} ${colors.to}`,
        "before:absolute before:inset-0 before:-skew-x-12",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        "before:translate-x-[-200%] before:transition-transform before:duration-700",
        isShimmering && "before:translate-x-[200%]"
      )}
    >
      <div className="absolute -right-8 -bottom-8 opacity-20">
        <Leaf className="h-40 w-40" />
      </div>
      <div className="relative z-10">
        <p className={cn("text-xs font-semibold uppercase tracking-widest", colors.text)}>Status Membership</p>
        <div className="mt-3 flex items-baseline gap-3">
          <h2 className="text-3xl font-bold">{tierBadge} {tierName} Tier</h2>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold animate-bounce-slow", colors.bg, "text-white")}>
            +{bonusPercentage}% BONUS
          </span>
        </div>
        <div className="mt-6">
          <div className={cn("flex justify-between text-sm mb-2", colors.text)}>
            <span>{exp.toLocaleString('id-ID')}/{expForNextTier.toLocaleString('id-ID')} XP</span>
            <span>{Math.round(expForNextTier > 0 ? (exp / expForNextTier) * 100 : 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
              style={{ width: `${expForNextTier > 0 ? Math.min((exp / expForNextTier) * 100, 100) : 100}%` }}
            />
          </div>
          {nextTierName ? (
            <p className={cn("mt-3 text-sm", colors.text)}>Menuju {nextTierName} Tier</p>
          ) : (
            <p className={cn("mt-3 text-sm", colors.text)}>Tier Tertinggi!</p>
          )}
        </div>
        <p className={cn("mt-4 text-sm", colors.text)}>
          {nextTierName
            ? `Kumpulkan ${(expForNextTier - exp).toLocaleString('id-ID')} XP lagi untuk naik ke ${nextTierName} Tier dan dapatkan bonus lebih tinggi.`
            : "Selamat! Anda sudah mencapai tier tertinggi dengan bonus maksimal!"}
        </p>
        <button className="mt-4 rounded-xl border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95">
          Lihat Progress
        </button>
      </div>
    </div>
  );
}

function AIScannerCard() {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<{ name: string; percent: number; color: string }[]>([]);
  const [confirmedWaste, setConfirmedWaste] = useState<{ name: string; percent: number } | null>(null);
  const [scanTime, setScanTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

  const wasteTypes = [
    { name: 'Plastik', color: '#3b82f6' },
    { name: 'Kertas', color: '#22c55e' },
    { name: 'Logam', color: '#6b7280' },
    { name: 'Kaca', color: '#06b6d4' },
    { name: 'Organik', color: '#84cc16' },
    { name: 'Lainnya', color: '#a855f7' },
  ];

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 500);
  };

  const openCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    setConfirmedWaste(null);
    setScanResults([]);
    setScanTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setIsCameraLoading(false);
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
      setIsCameraLoading(false);
    }
  };

  // Play video when camera opens & start scanning
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
      scanStartTimeRef.current = Date.now();

      // Start simulated scanning
      scanIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - scanStartTimeRef.current) / 1000);
        setScanTime(elapsed);

        if (elapsed >= 5 && !confirmedWaste) {
          // Generate random percentages that converge
          const results = wasteTypes.map((wt, i) => {
            let basePercent = Math.random() * 30;
            if (i === 0) basePercent += 40; // Boost first type
            return {
              ...wt,
              percent: Math.min(Math.round(basePercent + elapsed * 3), 100)
            };
          });

          // Normalize to 100%
          const total = results.reduce((sum, r) => sum + r.percent, 0);
          results.forEach(r => r.percent = Math.round((r.percent / total) * 100));

          // Re-normalize properly
          const sorted = results.sort((a, b) => b.percent - a.percent);
          sorted[0].percent = 70 + Math.floor(Math.random() * 30);
          let remaining = 100 - sorted[0].percent;
          for (let i = 1; i < sorted.length; i++) {
            sorted[i].percent = Math.floor(remaining / (sorted.length - i));
            remaining -= sorted[i].percent;
          }

          setScanResults(sorted);

          // Check if any reaches 70%
          const confirmed = sorted.find(r => r.percent >= 70);
          if (confirmed) {
            setConfirmedWaste({ name: confirmed.name, percent: confirmed.percent });
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }
          }
        } else if (!confirmedWaste) {
          // Generate random results during scan
          const results = wasteTypes.map(wt => ({
            ...wt,
            percent: Math.floor(Math.random() * 60) + 10
          }));
          const total = results.reduce((sum, r) => sum + r.percent, 0);
          results.forEach(r => r.percent = Math.round((r.percent / total) * 100));

          // Final normalize
          const sorted = results.sort((a, b) => b.percent - a.percent);
          const confirmed = sorted.find(r => r.percent >= 70);
          if (confirmed) {
            setConfirmedWaste({ name: confirmed.name, percent: confirmed.percent });
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }
          } else {
            setScanResults(results);
          }
        }
      }, 500);
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isCameraOpen]);

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraOpen(false);
    setScanResults([]);
    setConfirmedWaste(null);
    setCameraError(null);
    setScanTime(0);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  if (isCameraOpen) {
    const sortedResults = [...scanResults].sort((a, b) => b.percent - a.percent);

    return (
      <div className="rounded-3xl border border-stone-200 bg-white/75 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900">AI Trash Scanner</h2>
          <div className="flex items-center gap-2">
            {!confirmedWaste && scanTime > 0 && (
              <span className="text-sm text-stone-500">{scanTime}s / 5s</span>
            )}
            <button
              onClick={closeCamera}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Live Camera Feed */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/60 rounded-2xl" />
          </div>

          {/* Scanning Overlay */}
          {!confirmedWaste && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 flex items-center justify-center">
              <div className="px-4 py-2 bg-black/50 rounded-full">
                <span className="text-white text-sm font-medium">
                  {scanResults.length > 0 ? 'Menganalisis...' : 'Arahkan ke sampah...'}
                </span>
              </div>
            </div>
          )}

          {/* Confirmed Result Overlay */}
          {confirmedWaste && (
            <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-2">✓</div>
                <div className="text-2xl font-bold">{confirmedWaste.name}</div>
                <div className="text-lg">{confirmedWaste.percent}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Detection Results */}
        {scanResults.length > 0 && !confirmedWaste && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-stone-700">Hasil Deteksi:</h3>
            <div className="space-y-1.5">
              {sortedResults.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-stone-600">{item.name}</span>
                    <span className={cn(
                      "font-medium",
                      item.percent >= 70 ? "text-emerald-600" : "text-stone-700"
                    )}>
                      {item.percent}%
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        item.percent >= 70 ? "bg-emerald-500" : ""
                      )}
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.percent >= 70 ? '#10b981' : item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {confirmedWaste && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setConfirmedWaste(null);
                setScanResults([]);
                setScanTime(0);
                scanStartTimeRef.current = Date.now();
              }}
              className="px-6 py-2 bg-white text-emerald-600 border border-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-colors"
            >
              Pindai Lagi
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-stone-200 bg-white/75 p-6 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold text-stone-900">AI Trash Scanner</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">ℹ</span>
      </div>
      <p className="text-sm text-stone-600 mb-4">Pindai sampah untuk identifikasi otomatis dan estimasi nilai.</p>
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8",
          "transition-all duration-300",
          isHovered && "border-green-400 bg-green-50/30"
        )}
      >
        <div className={cn(
          "rounded-full bg-emerald-100 p-4 mb-4",
          "animate-float"
        )}>
          <Camera className={cn(
            "h-8 w-8 text-emerald-600 transition-all duration-200",
            isHovered && "scale-110 text-green-600"
          )} />
        </div>
        <p className="text-sm font-medium text-stone-700">Arahkan kamera ke sampah</p>
        <p className="mt-1 text-xs text-stone-500">Foto akan diproses secara otomatis</p>
      </div>
      <button
        onClick={openCamera}
        disabled={isCameraLoading}
        className="relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-70"
      >
        {isCameraLoading ? (
          <>
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Membuka kamera...
          </>
        ) : (
          <>
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute rounded-full bg-white/30"
                style={{
                  left: ripple.x - 50,
                  top: ripple.y - 50,
                  width: 100,
                  height: 100,
                  animation: "ripple 0.5s ease-out forwards",
                }}
              />
            ))}
            Mulai Pindai
          </>
        )}
      </button>
      {cameraError && (
        <p className="mt-2 text-center text-xs text-red-500">{cameraError}</p>
      )}
    </div>
  );
}

function AnimatedTopWasteCard({ topWasteData }: { topWasteData: any[] }) {
  const [isHovered, setIsHovered] = useState(false);

  // Default data if no API data
  const displayData = topWasteData && topWasteData.length > 0 ? topWasteData : [
    { name: "Logam Ringan", kg: 0, percent: 0 },
    { name: "Kertas & Kardus", kg: 0, percent: 0 },
    { name: "Plastik Campur", kg: 0, percent: 0 },
  ];

  return (
    <div
      className="rounded-3xl border border-stone-200 bg-white/75 p-6 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `fade-in-up 0.5s ease-out 300ms forwards`,
        opacity: 0,
      }}
    >
      <h2 className="text-lg font-semibold text-stone-900">Sampah Paling Sering Disetor</h2>
      <p className="text-xs text-stone-500 mt-1">Data 7 hari terakhir</p>
      <div className="mt-4 space-y-4">
        {displayData.map((waste, i) => (
          <div key={waste.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-stone-400" />
                <span className="text-sm font-medium text-stone-800">{waste.name}</span>
              </div>
              <span className="text-sm font-semibold text-stone-700">{waste.kg || waste.count || 0} kg</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                style={{
                  width: isHovered ? `${waste.percent}%` : "0%",
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const userName = user?.firstName || user?.username || user?.fullName || "User";
  const [userExp, setUserExp] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>({
    totalKg: 0,
    totalTransactions: 0,
    balance: 0,
    totalExchanged: 0,
    weeklyTrend: [],
    distribution: [],
    topWaste: [],
    recentTransactions: []
  })
  const [isLoading, setIsLoading] = useState(true)

  // Responsive chart dimensions based on screen size
  const [chartDims, setChartDims] = useState({ width: 400, height: 280 });
  const [isMobile, setIsMobile] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const updateChartDims = useCallback(() => {
    if (chartContainerRef.current) {
      const containerWidth = chartContainerRef.current.offsetWidth;
      setChartDims({
        width: Math.max(containerWidth - 48, 200),
        height: Math.min(Math.max(containerWidth * 0.5, 200), 300),
      });
    }
    setIsMobile(window.innerWidth < 640);
  }, []);

  useEffect(() => {
    updateChartDims();
    window.addEventListener("resize", updateChartDims);
    return () => window.removeEventListener("resize", updateChartDims);
  }, [updateChartDims]);

  // Fetch real data from API
  useEffect(() => {
    if (!user) return

    const fetchDashboardData = async () => {
      try {
        // Fetch EXP from /api/exp
        const expRes = await fetch(`/api/exp?userId=${user.id}`)
        if (expRes.ok) {
          const expData = await expRes.json()
          setUserExp(expData.user?.exp || 0)
        }

        // Fetch USER-SPECIFIC data from /api/user/dashboard (this is the source of truth for user balance)
        const userRes = await fetch(`/api/user/dashboard?userId=${user.id}`)
        let userBalance = 0
        if (userRes.ok) {
          const userData = await userRes.json()
          userBalance = userData.balance || 0
        }

        // Fetch GLOBAL stats for aggregate data (excluding user-specific balance)
        const globalRes = await fetch('/api/global-stats')
        if (globalRes.ok) {
          const globalData = await globalRes.json()
          setDashboardData({
            totalKg: globalData.totalKg || 0,
            totalTransactions: globalData.totalTransactions || 0,
            balance: userBalance, // Use USER balance, not global
            totalExchanged: globalData.totalExchanged || 0,
            weeklyTrend: globalData.weeklyTrend || weeklyTrendData,
            distribution: globalData.distribution || distributionData,
            topWaste: globalData.topWaste || [],
            recentTransactions: globalData.recentTransactions || []
          })
        } else {
          // Even if global stats fail, still set user balance
          setDashboardData((prev: typeof dashboardData) => ({
            ...prev,
            balance: userBalance
          }))
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  // Default weekly trend for empty state
  const weeklyTrendData = [
    { date: "8 Mei", kg: 0 },
    { date: "9 Mei", kg: 0 },
    { date: "10 Mei", kg: 0 },
    { date: "11 Mei", kg: 0 },
    { date: "12 Mei", kg: 0 },
    { date: "13 Mei", kg: 0 },
    { date: "14 Mei", kg: 0 },
  ];

  // Default distribution for empty state
  const distributionData = [
    { name: "Logam Ringan", kg: 0, percent: 0, color: "#10b981" },
    { name: "Kertas & Kardus", kg: 0, percent: 0, color: "#22c55e" },
    { name: "Plastik Campur", kg: 0, percent: 0, color: "#4ade80" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div
        className="mb-2"
        style={{ animation: `fade-in-up 0.5s ease-out forwards` }}
      >
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-80 animate-pulse rounded-md bg-stone-200" />
            <div className="h-4 w-96 animate-pulse rounded-md bg-stone-100" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-stone-900">
              Selamat datang kembali, <span className="text-emerald-600">{userName}</span>! 🌿
            </h1>
            <p className="mt-1 text-sm text-stone-600">Terus kumpulkan kebaikan untuk lingkungan yang lebih bersih.</p>
          </>
        )}
      </div>

      {/* Section 1: Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
                <div className="h-4 w-32 rounded bg-stone-200" />
                <div className="mt-2 h-8 w-24 rounded bg-stone-100" />
              </div>
            ))}
          </>
        ) : (
          <>
            <AnimatedStatCard title="Total Sampah Dikumpulkan" value={dashboardData.totalKg} suffix=" kg" subtitle="Total seluruh setoran" icon={Recycle} delay={0} />
            <AnimatedStatCard title="Total Transaksi" value={dashboardData.totalTransactions} suffix=" kali" subtitle="Jumlah setoran" icon={FileText} delay={100} />
            <AnimatedStatCard title="Saldo Tersedia" value={dashboardData.balance} prefix="Rp " subtitle="Siap ditarik" icon={Wallet} delay={200} />
            <AnimatedStatCard title="Saldo Ditukar" value={dashboardData.totalExchanged} prefix="Rp " subtitle="Sudah ditukar" icon={Star} delay={300} />
          </>
        )}
      </section>

      {/* Section 2: 3 columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MembershipCard userExp={userExp} />
        <AIScannerCard />
        <AnimatedTopWasteCard topWasteData={dashboardData.topWaste || []} />
      </div>

      {/* Section 3: Charts */}
      <div ref={chartContainerRef} className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Trend */}
        <div
          className="rounded-3xl border border-stone-200 bg-white/75 p-4 sm:p-6 shadow-sm"
          style={{ animation: `fade-in-up 0.5s ease-out 400ms forwards`, opacity: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">Tren Setoran Mingguan (kg)</h2>
            <select className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
              <option>7 Hari Terakhir</option>
            </select>
          </div>
          <div style={{ height: chartDims.height, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: "#78716c" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 9 : 11, fill: "#78716c" }} domain={[0, 40]} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="kg"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorKg)"
                  animationBegin={0}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Distribution */}
        <div
          className="rounded-3xl border border-stone-200 bg-white/75 p-4 sm:p-6 shadow-sm"
          style={{ animation: `fade-in-up 0.5s ease-out 500ms forwards`, opacity: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">Distribusi Sampah Bulanan (kg)</h2>
            <select className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
              <option>Mei 2026</option>
            </select>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-6">
            {/* Donut Chart */}
            <div className="relative w-full lg:w-auto flex-shrink-0 order-1 lg:order-2">
              <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="kg"
                      animationBegin={0}
                      animationDuration={1200}
                    >
                      {dashboardData.distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-stone-900">{dashboardData.totalKg}</p>
                    <p className="text-[10px] sm:text-xs text-stone-500">kg total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend - Responsive */}
            <div className="flex-1 w-full order-2 lg:order-1">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-1.5">
                {dashboardData.distribution.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] sm:text-sm text-stone-600 truncate">{item.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
                      <span className="font-medium text-stone-900 text-[11px] sm:text-sm">{item.kg} kg</span>
                      <span className="text-stone-400 text-[10px] sm:text-xs">({item.percent}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div
          className="rounded-3xl border border-stone-200 bg-white/75 p-4 sm:p-6 shadow-sm"
          style={{ animation: `fade-in-up 0.5s ease-out 600ms forwards`, opacity: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">Transaksi Terbaru</h2>
            <Link href="/dashboard/riwayat" className="relative text-xs sm:text-sm text-emerald-600 hover:text-green-700 transition-colors duration-200 group">
              Lihat Semua
              <span className="absolute bottom-0 left-0 h-px w-0 bg-green-600 transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {(dashboardData.recentTransactions || []).length > 0 ? (
              dashboardData.recentTransactions.map((tx: any, i: number) => (
                <AnimatedTransaction key={tx.id || i} tx={tx} delay={i * 50} />
              ))
            ) : (
              <div className="text-center py-8 text-stone-500">
                <p className="text-sm">Belum ada transaksi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Quick Actions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Aksi Cepat</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {quickActions.map((action, i) => (
            <AnimatedQuickAction key={action.title} {...action} delay={i * 100} />
          ))}
        </div>
      </div>
    </div>
  );
}