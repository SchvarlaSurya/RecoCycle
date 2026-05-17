"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export type Withdrawal = {
  id: number;
  wdId: string;
  userId: string;
  method: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  lockedAmount: number;
  bankName: string | null;
  status: string;
  rejectionReason: string | null;
  date: Date;
  createdAt: Date;
  idempotencyKey?: string | null;
};

export type WithdrawalWithUser = Withdrawal & {
  userName: string;
  userEmail: string;
};

export type WithdrawalStats = {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  pendingAmount: number;
  approvedAmount: number;
};

async function ensureWithdrawalColumns() {
  try {
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS locked_amount NUMERIC(12, 2) DEFAULT 0`;
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`;
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejection_reason TEXT`;
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64) UNIQUE`;
  } catch (error) {
    console.error("Error ensuring withdrawal columns:", error);
  }
}

export async function getUserWithdrawals() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await ensureWithdrawalColumns();

  try {
    const withdrawals = await sql`
      SELECT 
        id, wd_id as "wdId", user_id as "userId", method, 
        account_name as "accountName", account_number as "accountNumber",
        COALESCE(amount, 0) as amount, COALESCE(locked_amount, 0) as "lockedAmount",
        bank_name as "bankName", status, rejection_reason as "rejectionReason",
        date, created_at as "createdAt"
      FROM withdrawals
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return {
      success: true,
      withdrawals: withdrawals.map((w: any) => ({
        ...w,
        amount: Number(w.amount),
        lockedAmount: Number(w.lockedAmount),
        date: new Date(w.date),
        createdAt: new Date(w.createdAt)
      }))
    };
  } catch (error) {
    console.error("Error fetching user withdrawals:", error);
    return { success: false, error: String(error), withdrawals: [] };
  }
}

export async function getPendingWithdrawals() {
  await ensureWithdrawalColumns();

  try {
    const withdrawals = await sql`
      SELECT 
        w.id, w.wd_id as "wdId", w.user_id as "userId", w.method,
        w.account_name as "accountName", w.account_number as "accountNumber",
        COALESCE(w.amount, 0) as amount, COALESCE(w.locked_amount, 0) as "lockedAmount",
        w.bank_name as "bankName", w.status, w.date, w.created_at as "createdAt",
        u.first_name || ' ' || COALESCE(u.last_name, '') as "userName",
        u.email_addresses->0->>'email_address' as "userEmail"
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.status = 'Menunggu Verifikasi'
      ORDER BY w.created_at ASC
    `;

    return {
      success: true,
      withdrawals: withdrawals.map((w: any) => ({
        ...w,
        amount: Number(w.amount),
        lockedAmount: Number(w.lockedAmount),
        date: new Date(w.date),
        createdAt: new Date(w.createdAt)
      }))
    };
  } catch (error) {
    console.error("Error fetching pending withdrawals:", error);
    return { success: false, error: String(error), withdrawals: [] };
  }
}

export async function getWithdrawalById(wdId: string) {
  await ensureWithdrawalColumns();

  try {
    const withdrawals = await sql`
      SELECT 
        id, wd_id as "wdId", user_id as "userId", method,
        account_name as "accountName", account_number as "accountNumber",
        COALESCE(amount, 0) as amount, COALESCE(locked_amount, 0) as "lockedAmount",
        bank_name as "bankName", status, rejection_reason as "rejectionReason",
        date, created_at as "createdAt"
      FROM withdrawals
      WHERE wd_id = ${wdId}
      LIMIT 1
    `;

    if (withdrawals.length === 0) {
      return { success: false, error: "Withdrawal not found" };
    }

    const w = withdrawals[0];
    return {
      success: true,
      withdrawal: {
        ...w,
        amount: Number(w.amount),
        lockedAmount: Number(w.lockedAmount),
        date: new Date(w.date),
        createdAt: new Date(w.createdAt)
      }
    };
  } catch (error) {
    console.error("Error fetching withdrawal by ID:", error);
    return { success: false, error: String(error) };
  }
}

export async function calculateAvailableBalance(userId?: string) {
  const user = userId ? null : await currentUser();
  const targetUserId = userId || (user ? user.id : null);
  
  if (!targetUserId) {
    throw new Error("Unauthorized");
  }

  await ensureWithdrawalColumns();

  try {
    const earningsResult = await sql`
      SELECT COALESCE(SUM(reward), 0) as total
      FROM transactions
      WHERE user_id = ${targetUserId} AND status = 'Selesai'
    `;
    const totalEarnings = Number(earningsResult[0]?.total || 0);

    const lockedResult = await sql`
      SELECT COALESCE(SUM(locked_amount), 0) as locked
      FROM withdrawals
      WHERE user_id = ${targetUserId} AND status = 'Menunggu Verifikasi'
    `;
    const lockedPending = Number(lockedResult[0]?.locked || 0);

    const availableBalance = totalEarnings - lockedPending;

    return {
      success: true,
      totalEarnings,
      lockedPending,
      availableBalance
    };
  } catch (error) {
    console.error("Error calculating available balance:", error);
    return { success: false, error: String(error), availableBalance: 0, totalEarnings: 0, lockedPending: 0 };
  }
}

export async function createWithdrawal(
  method: string,
  accountName: string,
  accountNumber: string,
  amount: number,
  bankName?: string,
  idempotencyKey?: string
) {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (amount <= 0) {
    return { success: false, error: "Amount must be greater than 0" };
  }

  if (amount < 10000) {
    return { success: false, error: "Minimum withdrawal amount is Rp 10,000" };
  }

  await ensureWithdrawalColumns();

  try {
    if (idempotencyKey) {
      const existing = await sql`
        SELECT wd_id FROM withdrawals 
        WHERE idempotency_key = ${idempotencyKey} 
        LIMIT 1
      `;
      if (existing.length > 0) {
        return { success: true, wdId: existing[0].wd_id, duplicate: true };
      }
    }

    const balanceResult = await calculateAvailableBalance(user.id);
    if (!balanceResult.success) {
      return { success: false, error: "Failed to calculate balance" };
    }

    if (balanceResult.availableBalance < amount) {
      return { success: false, error: `Insufficient available balance. Available: Rp ${balanceResult.availableBalance.toLocaleString("id-ID")}` };
    }

    const wdId = `WD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const date = new Date();

    await sql`
      INSERT INTO withdrawals (user_id, wd_id, method, account_name, account_number, amount, locked_amount, bank_name, date, status, idempotency_key)
      VALUES (${user.id}, ${wdId}, ${method}, ${accountName}, ${accountNumber}, ${amount}, ${amount}, ${bankName || null}, ${date}, 'Menunggu Verifikasi', ${idempotencyKey || null})
    `;

    revalidatePath("/dashboard");
    return { success: true, wdId };
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return { success: false, error: String(error) };
  }
}

export async function getWithdrawalStats() {
  await ensureWithdrawalColumns();

  try {
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Menunggu Verifikasi') as "totalPending",
        COUNT(*) FILTER (WHERE status = 'Disetujui') as "totalApproved",
        COUNT(*) FILTER (WHERE status = 'Ditolak') as "totalRejected",
        COALESCE(SUM(amount) FILTER (WHERE status = 'Menunggu Verifikasi'), 0) as "pendingAmount",
        COALESCE(SUM(amount) FILTER (WHERE status = 'Disetujui'), 0) as "approvedAmount"
      FROM withdrawals
    `;

    const s = stats[0];
    return {
      success: true,
      stats: {
        totalPending: Number(s?.totalPending || 0),
        totalApproved: Number(s?.totalApproved || 0),
        totalRejected: Number(s?.totalRejected || 0),
        pendingAmount: Number(s?.pendingAmount || 0),
        approvedAmount: Number(s?.approvedAmount || 0)
      }
    };
  } catch (error) {
    console.error("Error fetching withdrawal stats:", error);
    return { success: false, error: String(error), stats: null };
  }
}