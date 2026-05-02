"use server";

import { sql } from "@/lib/db";
import { currentUser, auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type UserTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface UserTierInfo {
  tier: UserTier;
  bonusPercentage: number;
  cumulativeWeight: number;
  nextTierWeight: number | null;
}

export interface DashboardTransaction {
  id: string;
  wasteType: string;
  wasteTypeId: string;
  estimatedWeight: number;
  actualWeight: number | null;
  pricePerKg: number;
  baseReward: number | null;
  tierBonus: number | null;
  totalReward: number | null;
  status: "pending" | "verified" | "rejected";
  date: string;
  createdAt: string;
}

export interface DashboardWithdrawal {
  id: string;
  method: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  lockedAmount: number;
  status: string;
  date: string;
}

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  type: "deposit" | "withdrawal" | "system";
  isRead: boolean;
  createdAt: string;
}

export interface LatestDashboardData {
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  transactions: DashboardTransaction[];
  withdrawals: DashboardWithdrawal[];
  notifications: DashboardNotification[];
  tierInfo: UserTierInfo;
  lastUpdated: string;
}

export interface LatestUserData {
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  transactions: DashboardTransaction[];
  withdrawals: DashboardWithdrawal[];
  notifications: DashboardNotification[];
  lastUpdated: string;
}

export interface AdminDashboardData {
  pendingTransactionsCount: number;
  pendingWithdrawalsCount: number;
  recentActivityLogs: ActivityLogEntry[];
  lastUpdated: string;
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  target: string;
  detail: string;
  adminName: string;
  createdAt: string;
}

export interface UserProfileData {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  tierInfo: UserTierInfo;
  balance: number;
  availableBalance: number;
  lastUpdated: string;
}

function calculateTierInfo(cumulativeWeight: number): UserTierInfo {
  let tier: UserTier = "Bronze";
  let bonusPercentage = 0;
  let nextTierWeight: number | null = null;

  if (cumulativeWeight >= 500) {
    tier = "Platinum";
    bonusPercentage = 10;
    nextTierWeight = null;
  } else if (cumulativeWeight >= 200) {
    tier = "Gold";
    bonusPercentage = 5;
    nextTierWeight = 500;
  } else if (cumulativeWeight >= 50) {
    tier = "Silver";
    bonusPercentage = 3;
    nextTierWeight = 200;
  } else {
    tier = "Bronze";
    bonusPercentage = 0;
    nextTierWeight = 50;
  }

  return {
    tier,
    bonusPercentage,
    cumulativeWeight,
    nextTierWeight,
  };
}

async function ensureWithdrawalColumns() {
  try {
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS locked_amount NUMERIC(12, 2) DEFAULT 0`;
  } catch (error) {
  }
}

async function ensureNotificationsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        is_read BOOLEAN DEFAULT FALSE,
        related_tx_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
  }
}

async function ensureActivityLogsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target VARCHAR(255),
        detail TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
  } catch (error) {
  }
}

export async function getLatestUserData() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureWithdrawalColumns();
    await ensureNotificationsTable();

    const earningsResultRows = await sql`SELECT COALESCE(SUM(total_reward), 0) as total FROM transactions WHERE user_id = ${user.id} AND status = 'verified'`;
    const lockedResultRows = await sql`SELECT COALESCE(SUM(locked_amount), 0) as locked FROM withdrawals WHERE user_id = ${user.id} AND status = 'Menunggu Verifikasi'`;
    const transactionsRows = await sql`
        SELECT id, tx_id, type as waste_type, waste_type_id, estimated_weight, actual_weight, price_per_kg, base_reward, tier_bonus, total_reward, status, date, created_at
        FROM transactions
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
    const withdrawalsRows = await sql`
        SELECT id, wd_id, method, account_name, account_number, COALESCE(amount, 0) as amount, COALESCE(locked_amount, 0) as locked_amount, status, date, created_at
        FROM withdrawals
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `;
    const notificationsRows = await sql`
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;

    const earningsResult = earningsResultRows as { total: number }[];
    const lockedResult = lockedResultRows as { locked: number }[];
    const transactions = transactionsRows as { id: number; tx_id: string; waste_type: string; waste_type_id: string; estimated_weight: number; actual_weight: number | null; price_per_kg: number; base_reward: number | null; tier_bonus: number | null; total_reward: number | null; status: string; date: Date; created_at: Date }[];
    const withdrawals = withdrawalsRows as { id: number; wd_id: string; method: string; account_name: string; account_number: string; amount: number; locked_amount: number; status: string; date: Date; created_at: Date }[];
    const notifications = notificationsRows as { id: number; title: string; message: string; type: string; is_read: boolean; created_at: Date }[];

    const totalEarnings = Number(earningsResult[0]?.total || 0);
    const lockedPending = Number(lockedResult[0]?.locked || 0);
    const balance = totalEarnings;
    const availableBalance = totalEarnings - lockedPending;

    const mappedTransactions: DashboardTransaction[] = transactions.map(tx => ({
      id: tx.tx_id,
      wasteType: tx.waste_type,
      wasteTypeId: tx.waste_type_id || "",
      estimatedWeight: Number(tx.estimated_weight),
      actualWeight: tx.actual_weight !== null ? Number(tx.actual_weight) : null,
      pricePerKg: Number(tx.price_per_kg),
      baseReward: tx.base_reward !== null ? Number(tx.base_reward) : null,
      tierBonus: tx.tier_bonus !== null ? Number(tx.tier_bonus) : null,
      totalReward: tx.total_reward !== null ? Number(tx.total_reward) : null,
      status: tx.status as "pending" | "verified" | "rejected",
      date: tx.date.toISOString().split("T")[0],
      createdAt: tx.created_at.toISOString(),
    }));

    const mappedWithdrawals: DashboardWithdrawal[] = withdrawals.map(w => ({
      id: w.wd_id,
      method: w.method,
      accountName: w.account_name,
      accountNumber: w.account_number,
      amount: Number(w.amount),
      lockedAmount: Number(w.locked_amount),
      status: w.status,
      date: w.date.toISOString().split("T")[0],
    }));

    const mappedNotifications: DashboardNotification[] = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as "deposit" | "withdrawal" | "system",
      isRead: n.is_read,
      createdAt: n.created_at.toISOString(),
    }));

    return {
      success: true,
      data: {
        balance,
        availableBalance,
        lockedBalance: lockedPending,
        transactions: mappedTransactions,
        withdrawals: mappedWithdrawals,
        notifications: mappedNotifications,
        lastUpdated: new Date().toISOString(),
      } satisfies LatestUserData
    };
  } catch (error) {
    console.error("Error fetching latest user data:", error);
    return { success: false, error: String(error) };
  }
}

export async function getLatestDashboardData() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureWithdrawalColumns();
    await ensureNotificationsTable();

    const [earningsResultRows, lockedResultRows, transactionsRows, withdrawalsRows, notificationsRows, profileResultRows] = await Promise.all([
      sql`SELECT COALESCE(SUM(total_reward), 0) as total FROM transactions WHERE user_id = ${user.id} AND status = 'verified'`,
      sql`SELECT COALESCE(SUM(locked_amount), 0) as locked FROM withdrawals WHERE user_id = ${user.id} AND status = 'Menunggu Verifikasi'`,
      sql`
        SELECT id, tx_id, type as waste_type, waste_type_id, estimated_weight, actual_weight, price_per_kg, base_reward, tier_bonus, total_reward, status, date, created_at
        FROM transactions
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      sql`
        SELECT id, wd_id, method, account_name, account_number, COALESCE(amount, 0) as amount, COALESCE(locked_amount, 0) as locked_amount, status, date, created_at
        FROM withdrawals
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      sql`SELECT kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${user.id}`
    ]);

    const earningsResult = earningsResultRows as { total: number }[];
    const lockedResult = lockedResultRows as { locked: number }[];
    const transactions = transactionsRows as { id: number; tx_id: string; waste_type: string; waste_type_id: string; estimated_weight: number; actual_weight: number | null; price_per_kg: number; base_reward: number | null; tier_bonus: number | null; total_reward: number | null; status: string; date: Date; created_at: Date }[];
    const withdrawals = withdrawalsRows as { id: number; wd_id: string; method: string; account_name: string; account_number: string; amount: number; locked_amount: number; status: string; date: Date; created_at: Date }[];
    const notifications = notificationsRows as { id: number; title: string; message: string; type: string; is_read: boolean; created_at: Date }[];
    const profileResult = profileResultRows as { kumulatif_sampah_kg: number }[];

    const totalEarnings = Number(earningsResult[0]?.total || 0);
    const lockedPending = Number(lockedResult[0]?.locked || 0);
    const balance = totalEarnings;
    const availableBalance = totalEarnings - lockedPending;

    const cumulativeWeight = profileResult.length > 0 && profileResult[0].kumulatif_sampah_kg !== null
      ? Number(profileResult[0].kumulatif_sampah_kg)
      : 0;
    const tierInfo = calculateTierInfo(cumulativeWeight);

    const mappedTransactions: DashboardTransaction[] = transactions.map(tx => ({
      id: tx.tx_id,
      wasteType: tx.waste_type,
      wasteTypeId: tx.waste_type_id || "",
      estimatedWeight: Number(tx.estimated_weight),
      actualWeight: tx.actual_weight !== null ? Number(tx.actual_weight) : null,
      pricePerKg: Number(tx.price_per_kg),
      baseReward: tx.base_reward !== null ? Number(tx.base_reward) : null,
      tierBonus: tx.tier_bonus !== null ? Number(tx.tier_bonus) : null,
      totalReward: tx.total_reward !== null ? Number(tx.total_reward) : null,
      status: tx.status as "pending" | "verified" | "rejected",
      date: tx.date.toISOString().split("T")[0],
      createdAt: tx.created_at.toISOString(),
    }));

    const mappedWithdrawals: DashboardWithdrawal[] = withdrawals.map(w => ({
      id: w.wd_id,
      method: w.method,
      accountName: w.account_name,
      accountNumber: w.account_number,
      amount: Number(w.amount),
      lockedAmount: Number(w.locked_amount),
      status: w.status,
      date: w.date.toISOString().split("T")[0],
    }));

    const mappedNotifications: DashboardNotification[] = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as "deposit" | "withdrawal" | "system",
      isRead: n.is_read,
      createdAt: n.created_at.toISOString(),
    }));

    return {
      success: true,
      data: {
        balance,
        availableBalance,
        lockedBalance: lockedPending,
        transactions: mappedTransactions,
        withdrawals: mappedWithdrawals,
        notifications: mappedNotifications,
        tierInfo,
        lastUpdated: new Date().toISOString(),
      } satisfies LatestDashboardData
    };
  } catch (error) {
    console.error("Error fetching latest dashboard data:", error);
    return { success: false, error: String(error) };
  }
}

export async function getLatestAdminData() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureWithdrawalColumns();
    await ensureActivityLogsTable();

    const [pendingTransactionsRows, pendingWithdrawalsRows, recentLogsRows] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'`,
      sql`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'Menunggu Verifikasi'`,
      sql`
        SELECT id, action, target, detail, created_at
        FROM activity_logs
        ORDER BY created_at DESC
        LIMIT 20
      `
    ]);

    const pendingTransactions = pendingTransactionsRows as { count: number }[];
    const pendingWithdrawals = pendingWithdrawalsRows as { count: number }[];
    const recentLogs = recentLogsRows as { id: number; action: string; target: string; detail: string; created_at: Date }[];

    const mappedLogs: ActivityLogEntry[] = recentLogs.map(log => ({
      id: log.id,
      action: log.action,
      target: log.target || "",
      detail: log.detail || "",
      adminName: "Admin",
      createdAt: log.created_at.toISOString(),
    }));

    return {
      success: true,
      data: {
        pendingTransactionsCount: Number(pendingTransactions[0]?.count || 0),
        pendingWithdrawalsCount: Number(pendingWithdrawals[0]?.count || 0),
        recentActivityLogs: mappedLogs,
        lastUpdated: new Date().toISOString(),
      } satisfies AdminDashboardData
    };
  } catch (error) {
    console.error("Error fetching latest admin data:", error);
    return { success: false, error: String(error) };
  }
}

export async function getUserProfile() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureWithdrawalColumns();

    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Unknown";
    const email = user.emailAddresses[0]?.emailAddress || "";

    const [profileResultRows, balanceResultRows, lockedResultRows] = await Promise.all([
      sql`
        SELECT phone_number, address, kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${user.id}
      `,
      sql`SELECT COALESCE(SUM(total_reward), 0) as total FROM transactions WHERE user_id = ${user.id} AND status = 'verified'`,
      sql`SELECT COALESCE(SUM(locked_amount), 0) as locked FROM withdrawals WHERE user_id = ${user.id} AND status = 'Menunggu Verifikasi'`
    ]);

    const profileResult = profileResultRows as { phone_number: string; address: string; kumulatif_sampah_kg: number }[];
    const balanceResult = balanceResultRows as { total: number }[];
    const lockedResult = lockedResultRows as { locked: number }[];

    const totalEarnings = Number(balanceResult[0]?.total || 0);
    const lockedPending = Number(lockedResult[0]?.locked || 0);

    const profile = profileResult.length > 0 ? profileResult[0] : null;
    const cumulativeWeight = profile?.kumulatif_sampah_kg !== undefined && profile?.kumulatif_sampah_kg !== null
      ? Number(profile?.kumulatif_sampah_kg)
      : 0;

    const tierInfo = calculateTierInfo(cumulativeWeight);

    return {
      success: true,
      data: {
        userId: user.id,
        name,
        email,
        phoneNumber: profile?.phone_number || "",
        address: profile?.address || "",
        tierInfo,
        balance: totalEarnings,
        availableBalance: totalEarnings - lockedPending,
        lastUpdated: new Date().toISOString(),
      } satisfies UserProfileData
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { success: false, error: String(error) };
  }
}

export async function refreshUserBalance() {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureWithdrawalColumns();

    const [earningsResultRows, lockedResultRows, profileResultRows] = await Promise.all([
      sql`SELECT COALESCE(SUM(total_reward), 0) as total FROM transactions WHERE user_id = ${user.id} AND status = 'verified'`,
      sql`SELECT COALESCE(SUM(locked_amount), 0) as locked FROM withdrawals WHERE user_id = ${user.id} AND status = 'Menunggu Verifikasi'`,
      sql`
        SELECT kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${user.id}
      `
    ]);

    const earningsResult = earningsResultRows as { total: number }[];
    const lockedResult = lockedResultRows as { locked: number }[];
    const profileResult = profileResultRows as { kumulatif_sampah_kg: number }[];

    const totalEarnings = Number(earningsResult[0]?.total || 0);
    const lockedPending = Number(lockedResult[0]?.locked || 0);
    const balance = totalEarnings;
    const availableBalance = totalEarnings - lockedPending;
    const lockedBalance = lockedPending;

    const cumulativeWeight = profileResult.length > 0 && profileResult[0].kumulatif_sampah_kg !== null
      ? Number(profileResult[0].kumulatif_sampah_kg)
      : 0;

    const tierInfo = calculateTierInfo(cumulativeWeight);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/riwayat");
    revalidatePath("/dashboard/penarikan");

    return {
      success: true,
      data: {
        balance,
        availableBalance,
        lockedBalance,
        tierInfo,
        lastUpdated: new Date().toISOString(),
      }
    };
  } catch (error) {
    console.error("Error refreshing user balance:", error);
    return { success: false, error: String(error) };
  }
}