import AdminNavigation from "./AdminNavigation";
import { UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "Admin Panel - RecoCycle",
  description: "Panel administrasi RecoCycle untuk manajemen nasabah, transaksi, dan inventaris.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0f1720]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_28%),linear-gradient(180deg,#07111a_0%,#0f1720_42%,#14212b_100%)]" />
        <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/12 blur-[120px]" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <AdminNavigation />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 hidden px-6 py-4 md:flex md:px-8">
          <div className="glass-dark-panel flex w-full items-center justify-between rounded-[28px] px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-300">
                Role: <span className="font-semibold text-white">Administrator</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1 text-sm text-slate-300">
                Status: <span className="font-medium text-emerald-300">Online</span>
              </div>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 md:p-8 md:pt-4">
          <div className="glass-dark-shell mx-auto w-full max-w-7xl rounded-[34px] p-3 sm:p-4 md:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
