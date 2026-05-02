"use client";

import { useEffect, useMemo, useState } from "react";
import { getActivityLog } from "@/app/actions/adminVerification";
import { actionLabel as actionLabelMap, type ActivityAction } from "@/lib/types";

type ActivityLogItem = NonNullable<Awaited<ReturnType<typeof getActivityLog>>["logs"]>[number];

export default function LogPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<"all" | ActivityAction>("all");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getActivityLog(100);
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (error) {
      console.error("Error loading activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((log) => log.action));
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const query = search.toLowerCase();
      const matchSearch =
        log.adminName.toLowerCase().includes(query) ||
        (log.targetId || "").toLowerCase().includes(query) ||
        (log.details || "").toLowerCase().includes(query);
      const matchAction = filterAction === "all" || log.action === filterAction;

      return matchSearch && matchAction;
    });
  }, [logs, search, filterAction]);

  const formatTimestamp = (ts: Date | string | number | null) => {
    if (!ts) return "-";

    try {
      const date = new Date(ts);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(ts);
    }
  };

  const actionColor = (action: string) => {
    const colors: Record<string, string> = {
      verify_transaction: "bg-emerald-100 text-emerald-800",
      reject_transaction: "bg-red-100 text-red-800",
      verify_account: "bg-blue-100 text-blue-800",
      freeze_account: "bg-red-100 text-red-800",
      unfreeze_account: "bg-blue-100 text-blue-800",
      edit_balance: "bg-amber-100 text-amber-800",
      update_price: "bg-violet-100 text-violet-800",
      add_category: "bg-cyan-100 text-cyan-800",
      delete_category: "bg-stone-100 text-stone-800",
    };

    return colors[action] || "bg-stone-100 text-stone-800";
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "verify_transaction":
      case "verify_account":
        return "OK";
      case "reject_transaction":
        return "NO";
      case "freeze_account":
        return "FR";
      case "unfreeze_account":
        return "UN";
      case "edit_balance":
        return "ED";
      case "update_price":
        return "UP";
      case "add_category":
        return "+";
      case "delete_category":
        return "-";
      default:
        return ".";
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex h-[50vh] w-full max-w-7xl items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-white">Log Aktivitas</h1>
        <p className="text-sm text-slate-300">
          Audit trail lengkap semua aksi admin: siapa, kapan, dan apa yang diubah.
        </p>
      </div>

      <div className="glass-dark-panel flex items-start gap-3 rounded-xl p-4">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-white">Catatan audit tidak dapat dihapus</p>
          <p className="mt-0.5 text-xs text-slate-300">Semua aksi admin secara otomatis tercatat untuk mencegah kecurangan internal dan menjaga transparansi operasional.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Cari admin, target, atau detail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="glass-dark-panel w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <select
          value={filterAction}
          onChange={(event) => setFilterAction(event.target.value as "all" | ActivityAction)}
          className="glass-dark-panel rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
        >
          <option value="all">Semua Aksi</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {actionLabelMap[action as ActivityAction] || action}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} catatan ditemukan</p>

      <div className="space-y-3">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="glass-dark-panel group rounded-2xl p-4 transition-all hover:border-white/15 hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold ${actionColor(log.action)}`}>
                  {actionIcon(log.action)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${actionColor(log.action)}`}>
                      {actionLabelMap[log.action as ActivityAction] || log.action}
                    </span>
                    <span className="text-xs text-slate-400">oleh</span>
                    <span className="text-xs font-semibold text-slate-100">{log.adminName}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-100">
                    {log.targetType}: {log.targetId}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-300">{log.details}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-slate-400">{formatTimestamp(log.createdAt)}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">ID: {log.id}</p>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-dark-panel rounded-2xl p-8 text-center">
            <p className="text-slate-400">Tidak ada log aktivitas ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
