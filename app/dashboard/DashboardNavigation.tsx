"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import RecoCycleBrand from "@/app/components/RecoCycleBrand";

const navigation = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )
  },
  { 
    name: "Setor Sampah", 
    href: "/dashboard/setor", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    name: "Tarik Saldo", 
    href: "/dashboard/tarik", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    )
  },
  { 
    name: "Riwayat Pickup", 
    href: "/dashboard/riwayat", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    name: "Leaderboard XP", 
    href: "/dashboard/peringkat", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
    )
  },
  { 
    name: "Pengaturan", 
    href: "/dashboard/pengaturan", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  { 
    name: "Pencapaian", 
    href: "/dashboard/pencapaian", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    )
  },
  { 
    name: "Claim Reward", 
    href: "/dashboard/rewards", 
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    )
  },
];

export default function DashboardNavigation({ claimableCount = 0 }: { claimableCount?: number }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/dashboard/rewards" && claimableCount > 0) {
      localStorage.setItem("seen_reward_count", String(claimableCount));
    }
  }, [pathname, claimableCount]);

  const seenCount = typeof window !== "undefined" ? localStorage.getItem("seen_reward_count") : null;

  const renderNavLinks = () => {
    return navigation.map((item) => {
      const isActive = pathname === item.href;
      const isRewardLink = item.name === "Claim Reward";
      const showIndicator = isRewardLink && claimableCount > 0 && String(claimableCount) !== seenCount;

      return (
        <Link
          key={item.name}
          href={item.href}
          prefetch={true}
          onClick={() => setMobileMenuOpen(false)}
          className={`relative group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 hover:-translate-y-1 active:scale-95 border border-transparent ${
            isActive
              ? "brand-mesh-light border-white/70 bg-white/82 text-emerald-900 shadow-[0_10px_24px_rgba(16,185,129,0.10)] backdrop-blur-md"
              : "text-stone-700 hover:border-white/60 hover:bg-white/72 hover:text-stone-950 hover:shadow-sm"
          }`}
        >
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-emerald-500 to-cyan-400" />}
          <div className={`transition-all duration-300 transform group-hover:scale-110 ${isActive ? "text-emerald-700" : "text-stone-400 group-hover:text-emerald-600"}`}>
            {item.icon}
          </div>
          {item.name}
          
          {/* Tanda (Badge/Red Dot) */}
          {showIndicator && (
            <span className="absolute right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
              {claimableCount > 9 ? "9+" : claimableCount}
            </span>
          )}
        </Link>
      );
    });
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-md md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-white/45 bg-white/72 shadow-[20px_0_50px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="brand-mesh-light absolute inset-0 opacity-70" />
        <div className="flex h-20 items-center justify-between border-b border-white/45 px-6">
          <RecoCycleBrand size="sm" showTagline />
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-white/60 bg-white/75 p-2 text-stone-700 transition hover:bg-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="relative space-y-2 px-4 py-6">
          {renderNavLinks()}
        </nav>
      </div>

      <aside className="relative z-30 hidden w-72 flex-col border-r border-white/45 bg-white/62 backdrop-blur-2xl shadow-[8px_0_28px_rgba(15,23,42,0.06)] md:flex">
        <div className="brand-mesh-light absolute inset-0 opacity-70" />
        <div className="flex h-20 items-center border-b border-white/45 px-6">
          <RecoCycleBrand size="sm" showTagline />
        </div>
        <nav className="relative flex-1 space-y-2 px-4 py-8">
          {renderNavLinks()}
        </nav>
      </aside>

      <div className="md:hidden">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/45 bg-white/55 px-4 backdrop-blur-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-full border border-white/50 bg-white/55 p-2 text-stone-600 transition-all hover:bg-white active:scale-90 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div>
              <span className="block font-semibold text-stone-900">RecoCycle</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-500">Dashboard</span>
            </div>
          </div>
          <div>
            <UserButton />
          </div>
        </header>
      </div>
    </>
  );
}
