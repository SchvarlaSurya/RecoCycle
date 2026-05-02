"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Coins, Leaf, Recycle, Sparkles, Truck } from "lucide-react";
import { getLandingStats } from "@/app/actions/landing";
import LandingPickupModal from "@/app/components/LandingPickupModal";
import OpenPickupButton from "@/app/components/OpenPickupButton";
import RecoCycleBrand from "@/app/components/RecoCycleBrand";
import { wasteCatalog } from "@/lib/catalog";

interface Stats {
  totalPickups: number;
  totalTonnageBulanIni: number;
  topWastes: { type: string; total_weight: number }[];
}

function AnimatedCounter({
  target,
  duration = 2000,
  suffix = "",
  decimals = 0,
}: {
  target: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    const node = ref.current;
    if (node) observer.observe(node);

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | undefined;
    let animationFrame = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(eased * target);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, hasStarted, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function WasteBar({
  waste,
  maxWeight,
  delay,
}: {
  waste: { type: string; total_weight: number };
  maxWeight: number;
  delay: number;
}) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    const node = ref.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const timeout = window.setTimeout(() => {
      setWidth((waste.total_weight / maxWeight) * 100);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, hasStarted, maxWeight, waste.total_weight]);

  const catalogRef = wasteCatalog.find((item) => item.name === waste.type) ?? wasteCatalog[0];

  return (
    <div ref={ref} className="group">
      <div className="mb-2 flex items-end justify-between">
        <span className="font-medium text-slate-900">{waste.type}</span>
        <span className="text-sm text-slate-600">{(waste.total_weight / 1000).toFixed(1)} ton</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-1000 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
        Rp {catalogRef.pricePerKg.toLocaleString("id-ID")} / kg
      </div>
    </div>
  );
}

function FloatingOrb({
  className,
  delay,
}: {
  className: string;
  delay: string;
}) {
  return (
    <div
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{ animationDelay: delay }}
    />
  );
}

function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[32px] border border-white/45 bg-white/28 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export default function StorytellingHome() {
  const [stats, setStats] = useState<Stats>({
    totalPickups: 0,
    totalTonnageBulanIni: 0,
    topWastes: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getLandingStats().then((data) => {
      setStats(data);
      setLoaded(true);
    });
  }, []);

  const displayTopWastes =
    stats.topWastes.length > 0
      ? stats.topWastes.slice(0, 5)
      : wasteCatalog.slice(0, 5).map((item) => ({ type: item.name, total_weight: 0 }));

  const maxWeight = Math.max(...displayTopWastes.map((item) => item.total_weight), 1);
  const indonesiaWastePerDay = 175000;
  const recycledPercent = 12;

  const solutionCards = [
    {
      icon: Truck,
      title: "Pickup Rumah Tangga",
      desc: "Jadwalkan pickup langsung dari rumah. Tidak perlu repot mengantar ke bank sampah.",
      stat: "Mudah",
    },
    {
      icon: Coins,
      title: "Reward Transparan",
      desc: "Dapat bayaran fair untuk setiap kg sampah terpilah. Saldo masuk langsung ke akun.",
      stat: "Adil",
    },
    {
      icon: Leaf,
      title: "Dampak Terukur",
      desc: "Lacak kontribusi Anda untuk lingkungan. Setiap kg berarti bagi bumi.",
      stat: "Berkah",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Jadwalkan Pickup",
      desc: "Pilih jenis sampah dan estimasi berat. Tentukan waktu pickup yang nyaman untuk Anda.",
    },
    {
      step: "02",
      title: "Kurir Datang & Timbang",
      desc: "Kurir profesional datang, verifikasi, dan timbang sampah Anda dengan transparan.",
    },
    {
      step: "03",
      title: "Saldo Masuk",
      desc: "Reward langsung masuk ke akun. Lacak dampak Anda di dashboard pribadi.",
    },
  ];

  return (
    <main className="overflow-x-hidden bg-[#dfeee8] text-slate-900">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_40%),linear-gradient(180deg,#0f172a_0%,#102d2b_18%,#dfeee8_56%,#edf6f2_100%)]" />
        <div className="section-grid absolute inset-0 opacity-[0.08]" />
        <FloatingOrb className="-left-16 top-20 h-72 w-72 bg-emerald-300/35 animate-float-slow" delay="0s" />
        <FloatingOrb className="right-[-5rem] top-10 h-96 w-96 bg-cyan-300/25 animate-float-slow" delay="1.4s" />
        <FloatingOrb className="bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] bg-lime-200/30 animate-float-slow" delay="0.7s" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 px-4 py-4">
        <GlassPanel className="brand-mesh-light mx-auto flex max-w-6xl items-center justify-between bg-white/40 px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <RecoCycleBrand size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-white/60 bg-white/55 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/80"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="brand-button rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Daftar
            </Link>
          </div>
        </GlassPanel>
      </header>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-28">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/12 to-slate-950/38" />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <GlassPanel className="overflow-hidden border-white/30 bg-slate-950/52 px-6 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.3)] sm:px-10 sm:py-12">
            <div className="brand-mesh-dark absolute inset-0 opacity-90" />
            <div className="section-grid absolute inset-0 opacity-[0.05]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%)]" />
            <div className="relative text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/14 px-4 py-2 text-sm font-medium uppercase tracking-[0.2em] text-emerald-50 shadow-[0_10px_25px_rgba(0,0,0,0.16)]">
                <Sparkles className="h-4 w-4" />
                Fakta yang Perlu Kita Sadari
              </div>

              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Setiap Hari, Indonesia
                <br />
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-200 bg-clip-text text-transparent">
                  Menghasilkan {indonesiaWastePerDay.toLocaleString("id-ID")} Ton
                </span>
                <br />
                Sampah
              </h1>

              <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.3)] sm:text-xl">
                Bayangkan. Tumpukan sampah setinggi gunung. Mencemari tanah, laut, dan udara yang kita hirup.
                <br className="hidden sm:block" />
                <span className="font-semibold text-emerald-100">Hanya {recycledPercent}%</span> yang berhasil didaur ulang.
              </p>

              <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <GlassPanel className="brand-mesh-dark border-white/25 bg-slate-950/48 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-8">
                  <div className="text-4xl font-bold text-emerald-300 sm:text-5xl">
                    {indonesiaWastePerDay.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-50 sm:text-base">Ton sampah per hari</div>
                </GlassPanel>
                <GlassPanel className="brand-mesh-dark border-white/25 bg-slate-950/48 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-8">
                  <div className="text-4xl font-bold text-amber-300 sm:text-5xl">{recycledPercent}%</div>
                  <div className="mt-2 text-sm font-semibold text-slate-50 sm:text-base">Yang didaur ulang</div>
                </GlassPanel>
                <GlassPanel className="brand-mesh-dark border-white/25 bg-slate-950/48 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-8">
                  <div className="text-4xl font-bold text-rose-300 sm:text-5xl">{100 - recycledPercent}%</div>
                  <div className="mt-2 text-sm font-semibold text-slate-50 sm:text-base">Terbuang sia-sia</div>
                </GlassPanel>
              </div>

              <div className="mt-14 inline-flex animate-bounce items-center justify-center rounded-full border border-white/30 bg-white/10 p-3 text-slate-200">
                <ArrowDown className="h-5 w-5" />
              </div>
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Dampak di Sekitar Kita</p>
            <h2 className="mb-6 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">Sampah Bukan Hanya Angka</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Setiap ton sampah yang tidak terkelola adalah peluang yang terbuang.
              <br />
              Tapi perubahan dimulai dari langkah kecil.
            </p>
          </div>

          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="relative">
              <GlassPanel className="overflow-hidden bg-gradient-to-br from-emerald-700/80 to-teal-700/70 p-8 text-white">
                <div className="brand-mesh-dark absolute inset-0" />
                <div className="relative">
                  <div className="mb-2 text-sm font-medium text-emerald-100">Kontribusi Komunitas RecoCycle</div>
                  <div className="mb-4 text-5xl font-bold sm:text-6xl">
                    <AnimatedCounter target={stats.totalTonnageBulanIni} duration={2500} decimals={2} suffix=" ton" />
                  </div>
                  <div className="mb-6 text-emerald-100">Sampah terpilah bulan ini</div>
                  <div className="border-t border-white/20 pt-6">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold">
                        <AnimatedCounter target={stats.totalPickups} duration={2000} suffix="+" />
                      </div>
                      <div className="text-sm text-emerald-100">Pickup berhasil</div>
                    </div>
                  </div>
                </div>
              </GlassPanel>

              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-300/35 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-emerald-400/25 blur-2xl" />
            </div>

            <GlassPanel className="brand-mesh-light bg-white/72 p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Sampah Paling Sering Disetor</h3>
                  <p className="mt-2 text-sm text-slate-500">Data dari komunitas RecoCycle</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700">
                  <Recycle className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {displayTopWastes.map((waste, idx) =>
                  loaded && waste.total_weight > 0 ? (
                    <WasteBar key={waste.type} waste={waste} maxWeight={maxWeight} delay={idx * 200} />
                  ) : (
                    <div key={waste.type} className="opacity-50">
                      <div className="mb-2 flex items-end justify-between">
                        <span className="font-medium text-slate-900">{waste.type}</span>
                        <span className="text-sm text-slate-600">Menunggu data</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/60" />
                    </div>
                  )
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Solusi Dimulai Dari Sini</p>
            <h2 className="mb-6 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
              RecoCycle: Mengubah Masalah Jadi Berkah
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Kami percaya sampah bukan sekadar limbah. Sampah adalah sumber daya yang menunggu untuk dikelola dengan benar.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {solutionCards.map(({ icon: Icon, title, desc, stat }) => (
              <GlassPanel
                key={title}
                className="brand-mesh-light group relative overflow-hidden bg-white/72 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
              >
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-2xl bg-emerald-500/12 p-4 text-emerald-700">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
                  <p className="mb-4 leading-relaxed text-slate-600">{desc}</p>
                  <div className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm">{stat}</span>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Proses Sederhana</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">3 Langkah Menuju Perubahan</h2>
          </div>

          <div className="relative">
            <div className="absolute bottom-0 left-8 top-0 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-emerald-500 md:left-1/2" />

            {steps.map((item, idx) => (
              <div
                key={item.step}
                className={`relative mb-12 flex items-center gap-8 last:mb-0 ${idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                <div className={`flex-1 pl-20 md:pl-0 ${idx % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <GlassPanel className={`brand-mesh-light inline-block bg-white/76 p-6 ${idx % 2 === 0 ? "md:ml-auto" : "md:mr-auto"} max-w-sm`}>
                    <div className="mb-2 text-4xl font-bold text-emerald-600">{item.step}</div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </GlassPanel>
                </div>

                <div className="absolute left-8 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-emerald-500 shadow md:left-1/2" />
                <div className="hidden flex-1 md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-24">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-400/18 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <GlassPanel className="overflow-hidden bg-gradient-to-br from-emerald-900/70 via-teal-800/60 to-emerald-950/75 px-6 py-10 text-center sm:px-8">
            <div className="brand-mesh-dark absolute inset-0" />
            <div className="section-grid absolute inset-0 opacity-[0.05]" />
            <div className="relative">
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl md:text-5xl">Siap Jadi Bagian Perubahan?</h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-emerald-100">
                Bergabunglah dengan ribuan warga yang sudah mengubah sampah jadi berkah. Mulai hari ini, tanpa biaya
                pendaftaran.
              </p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <OpenPickupButton className="brand-button inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold text-white transition hover:brightness-105">
                  Jadwalkan Pickup Pertama
                </OpenPickupButton>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/50 bg-white/10 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/16"
                >
                  Buat Akun Gratis
                </Link>
              </div>

              <p className="mt-8 text-sm text-emerald-200">Tanpa biaya tersembunyi • Pickup terjadwal • Reward transparan</p>
            </div>
          </GlassPanel>
        </div>
      </section>

      <footer className="px-4 pb-8">
        <GlassPanel className="brand-mesh-dark mx-auto flex max-w-6xl flex-col justify-between gap-5 bg-slate-950/75 px-4 py-8 text-slate-200 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-sm font-medium">RecoCycle Indonesia</p>
            <p className="mt-1 text-sm text-slate-400">Program pengelolaan sampah berbasis layanan jemput kawasan.</p>
          </div>
          <div className="text-sm text-slate-400">© 2026 RecoCycle. All rights reserved.</div>
        </GlassPanel>
      </footer>

      <LandingPickupModal />

      <style jsx global>{`
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-24px) scale(1.04);
          }
        }

        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
