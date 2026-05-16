"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import RecoCycleBrand from "@/app/components/RecoCycleBrand";

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

interface PendingCounts {
  pickups: number;
  withdrawals: number;
  chat: number;
}

const navigation = [
  {
    name: "Overview",
    href: "/admin",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    name: "Verifikasi Setoran",
    href: "/admin/pickups",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    badgeKey: 'pickups' as keyof PendingCounts,
  },
  {
    name: "Verifikasi Penarikan",
    href: "/admin/withdrawals",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badgeKey: 'withdrawals' as keyof PendingCounts,
  },
  {
    name: "Chat Support",
    href: "/admin/chat",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    badgeKey: 'chat' as keyof PendingCounts,
  },
  {
    name: "Nasabah",
    href: "/admin/nasabah",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    name: "Master Data",
    href: "/admin/master-data",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    name: "Transaksi",
    href: "/admin/transaksi",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  {
    name: "Laporan",
    href: "/admin/laporan",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    name: "Log Aktivitas",
    href: "/admin/log",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: "Pengaturan",
    href: "/admin/settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.604.096.855.05 1.142-.04.273-.25.523-.587.59-.34.07-.632.11-.974.3-.342.19-.593.44-.675.84-.07.356-.09.735-.04 1.102l.003 1.629c.076.628.233 1.205.456 1.758.225.552.517.989.974 1.273.456.273.985.52 1.558.658.57.135.987.39 1.2.758.214.369.304.778.29 1.193-.014.398-.17.758-.464 1.046-.293.288-.64.47-1.05.58-.41.11-.83.15-1.276.15-.47 0-.89-.04-1.276-.15-.41-.11-.757-.292-1.05-.58-.573-.168-.984-.426-1.558-.658-.573-.169-1.004-.445-1.2-.758-.213-.368-.276-.825-.29-1.193-.014-.398.14-.758.464-1.046.293-.288.64-.47 1.05-.58.41-.11.83-.15 1.276-.15h-.064m8.25-15.75l-2.625-2.625m-1.625 2.625c-.093.093-.187.18-.28.255a6.12 6.12 0 01-.374.54m2.25-6.75c.093.093.187.18.28.255a6.12 6.12 0 00.374.54M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    pickups: 0,
    withdrawals: 0,
    chat: 0
  });

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        const pickupsRes = await fetch('/api/admin/pickups?status=pending', {
          headers: { 'x-admin-secret': ADMIN_SECRET }
        });
        const pickups = pickupsRes.ok ? await pickupsRes.json() : [];
        const pendingPickups = Array.isArray(pickups) ? pickups.length : 0;

        const withdrawalsRes = await fetch('/api/withdrawal?status=Menunggu%20Verifikasi', {
          headers: { 'x-admin-secret': ADMIN_SECRET }
        });
        const withdrawals = withdrawalsRes.ok ? await withdrawalsRes.json() : [];
        const pendingWithdrawals = Array.isArray(withdrawals) ? withdrawals.length : 0;

        const chatRes = await fetch('/api/admin/chat/rooms', {
          headers: { 'x-admin-secret': ADMIN_SECRET }
        });
        const chatRooms = chatRes.ok ? await chatRes.json() : [];
        const activeChats = Array.isArray(chatRooms)
          ? chatRooms.filter((r: any) => r.status === 'open').length
          : 0;

        setPendingCounts({
          pickups: pendingPickups,
          withdrawals: pendingWithdrawals,
          chat: activeChats
        });
      } catch (e) {
        console.error('Failed to fetch pending counts:', e);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPending = pendingCounts.pickups + pendingCounts.withdrawals + pendingCounts.chat;

  const renderNavLinks = () => {
    return navigation.map((item) => {
      const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
      const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] : 0;

      return (
        <Link
          key={item.name}
          href={item.href}
          prefetch={true}
          onClick={() => setMobileMenuOpen(false)}
          className={`group relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
              : "border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500" />}
          <div className={`transition-colors duration-200 ${isActive ? "text-emerald-600" : "text-stone-400 group-hover:text-emerald-600"}`}>
            {item.icon}
          </div>
          {item.name}
          {badgeCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
        </Link>
      );
    });
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-stone-200 bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="relative flex h-20 items-center justify-between border-b border-stone-100 px-6">
          <RecoCycleBrand size="sm" showTagline />
          <button onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="relative space-y-2 overflow-y-auto px-4 py-6">
          {renderNavLinks()}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-stone-100 p-4">
          <a href="/admin/settings" className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.604.096.855.05 1.142-.04.273-.25.523-.587.59-.34.07-.632.11-.974.3-.342.19-.593.44-.675.84-.07.356-.09.735-.04 1.102l.003 1.629c.076.628.233 1.205.456 1.758.225.552.517.989.974 1.273.456.273.985.52 1.558.658.57.135.987.39 1.2.758.214.369.304.778.29 1.193-.014.398-.17.758-.464 1.046-.293.288-.64.47-1.05.58-.41.11-.83.15-1.276.15-.47 0-.89-.04-1.276-.15-.41-.11-.757-.292-1.05-.58-.573-.168-.984-.426-1.558-.658-.573-.169-1.004-.445-1.2-.758-.213-.368-.276-.825-.29-1.193-.014-.398.14-.758.464-1.046.293-.288.64-.47 1.05-.58.41-.11.83-.15 1.276-.15h-.064" />
            </svg>
            Pengaturan & Logout
          </a>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="relative hidden w-[280px] flex-col border-r border-stone-200 bg-white/75 backdrop-blur-xl md:flex">
        <div className="relative flex h-20 items-center border-b border-stone-100 px-6">
          <RecoCycleBrand size="sm" showTagline />
          {totalPending > 0 && (
            <div className="ml-auto flex items-center gap-1 rounded-full bg-red-100 px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-600">{totalPending} pending</span>
            </div>
          )}
        </div>
        <nav className="relative flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {renderNavLinks()}
        </nav>
        <div className="relative z-10 border-t border-stone-100 p-4">
          <a href="/admin/settings" className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.604.096.855.05 1.142-.04.273-.25.523-.587.59-.34.07-.632.11-.974.3-.342.19-.593.44-.675.84-.07.356-.09.735-.04 1.102l.003 1.629c.076.628.233 1.205.456 1.758.225.552.517.989.974 1.273.456.273.985.52 1.558.658.57.135.987.39 1.2.758.214.369.304.778.29 1.193-.014.398-.17.758-.464 1.046-.293.288-.64.47-1.05.58-.41.11-.83.15-1.276.15-.47 0-.89-.04-1.276-.15-.41-.11-.757-.292-1.05-.58-.573-.168-.984-.426-1.558-.658-.573-.169-1.004-.445-1.2-.758-.213-.368-.276-.825-.29-1.193-.014-.398.14-.758.464-1.046.293-.288.64-.47 1.05-.58.41-.11.83-.15 1.276-.15h-.064" />
            </svg>
            Pengaturan & Logout
          </a>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 focus:outline-none relative"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {totalPending > 9 ? '9+' : totalPending}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900">RecoCycle</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Admin</span>
            </div>
          </div>
          <a href="/admin/settings" className="rounded-full border border-stone-200 bg-stone-50 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.604.096.855.05 1.142-.04.273-.25.523-.587.59-.34.07-.632.11-.974.3-.342.19-.593.44-.675.84-.07.356-.09.735-.04 1.102l.003 1.629c.076.628.233 1.205.456 1.758.225.552.517.989.974 1.273.456.273.985.52 1.558.658.57.135.987.39 1.2.758.214.369.304.778.29 1.193-.014.398-.17.758-.464 1.046-.293.288-.64.47-1.05.58-.41.11-.83.15-1.276.15-.47 0-.89-.04-1.276-.15-.41-.11-.757-.292-1.05-.58-.573-.168-.984-.426-1.558-.658-.573-.169-1.004-.445-1.2-.758-.213-.368-.276-.825-.29-1.193-.014-.398.14-.758.464-1.046.293-.288.64-.47 1.05-.58.41-.11.83-.15 1.276-.15h-.064" />
            </svg>
          </a>
        </header>
      </div>
    </>
  );
}