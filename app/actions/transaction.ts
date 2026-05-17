"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getUserDashboardData() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const userId = user.id;

  try {
    // 1. Fetch Transactions
    const transactions = await sql`
      SELECT id, tx_id as "idStr", type, weight, reward, date, status
      FROM transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // 2. Fetch Withdrawals
    const withdrawals = await sql`
      SELECT id, wd_id as "idStr", method, account_name as "accountName", account_number as "accountNumber", amount, date, status
      FROM withdrawals
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    // Calculate total balance from DB source of truth
    // Support both legacy and current "completed" statuses.
    const totalEarnings = transactions
      .filter((tx: any) => tx.status === "verified" || tx.status === "Selesai")
      .reduce((sum: number, tx: any) => sum + Number(tx.reward), 0);

    const totalWithdrawnAndPending = withdrawals
      .filter((w: any) => w.status !== "Ditolak")
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0);
    
    const realBalance = totalEarnings - totalWithdrawnAndPending;

    return {
      success: true,
      balance: realBalance,
      transactions: transactions.map((tx: any) => ({
        id: tx.idStr,
        type: tx.type,
        weight: Number(tx.weight),
        reward: Number(tx.reward),
        date: new Date(tx.date).toISOString().split('T')[0],
        status: tx.status
      })),
      withdrawals: withdrawals.map((w: any) => ({
        id: w.idStr,
        method: w.method,
        accountName: w.accountName,
        accountNumber: w.accountNumber,
        amount: Number(w.amount),
        date: new Date(w.date).toISOString().split('T')[0],
        status: w.status
      }))
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { success: false, error: String(error) };
  }
}

export async function submitDeposit(weight: number, type: string, reward: number, dateStr?: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
  const date = dateStr ? new Date(dateStr) : new Date();

  const pricePerKg = weight > 0 ? reward / weight : 0;

  try {
    // Initial status is 'pending' to require admin verification
    await sql`
      INSERT INTO transactions (user_id, tx_id, type, weight, reward, date, status, price_per_kg)
      VALUES (${user.id}, ${txId}, ${type}, ${weight}, ${reward}, ${date}, 'pending', ${pricePerKg})
    `;

    // Note: user_profiles update (XP/Cumulative) will be handled by admin verification
    
    revalidatePath("/dashboard");
    revalidatePath("/admin/transaksi");
    return { success: true, txId };
  } catch (error) {
    console.error("Error submitting deposit:", error);
    return { success: false, error: String(error) };
  }
}

export async function submitWithdrawal(method: string, accountName: string, accountNumber: string, amount: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const wdId = `WD-${Math.floor(1000 + Math.random() * 9000)}`;
  const date = new Date();

  try {
    await sql`
      INSERT INTO withdrawals (user_id, wd_id, method, account_name, account_number, amount, date, status)
      VALUES (${user.id}, ${wdId}, ${method}, ${accountName}, ${accountNumber}, ${amount}, ${date}, 'Menunggu Verifikasi')
    `;

    revalidatePath("/dashboard");
    return { success: true, wdId };
  } catch (error) {
    console.error("Error submitting withdrawal:", error);
    return { success: false, error: String(error) };
  }
}

export async function submitAIScanReward(trashType: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const txId = `AI-${Math.floor(10000 + Math.random() * 90000)}`;
  const date = new Date();
  
  try {
    // Catat transaksi dengan reward 0 agar tidak menambah saldo,
    // tapi tercatat sebagai 'Scan AI' untuk dihitung sebagai EXP secara dinamis.
    await sql`
      INSERT INTO transactions (user_id, tx_id, type, weight, reward, date, status, price_per_kg)
      VALUES (${user.id}, ${txId}, ${'Scan AI: ' + trashType}, 0, 0, ${date}, 'verified', 0)
    `;

    // Berikan 50 EXP secara langsung untuk update profile stats
    await sql`
      INSERT INTO user_profiles (user_id, total_xp, updated_at)
      VALUES (${user.id}, 50, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_profiles.total_xp + 50,
        updated_at = NOW()
    `;

    revalidatePath("/dashboard");
    revalidatePath("/admin/transaksi");
    return { success: true, txId };
  } catch (error) {
    console.error("Error submitting AI reward:", error);
    return { success: false, error: String(error) };
  }
}

export async function getGlobalWasteStats() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let distributionRaw: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let weeklyRaw: any[] = [];

    try {
      // Prioritaskan skema baru: hasil verifikasi admin memakai actual_weight + waste_type
      distributionRaw = await sql`
        SELECT
          waste_type as name,
          SUM(COALESCE(actual_weight, 0)) as value
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= date_trunc('month', NOW())
          AND COALESCE(actual_weight, 0) > 0
        GROUP BY waste_type
        ORDER BY value DESC
      `;

      weeklyRaw = await sql`
        SELECT
          DATE(date) as dt,
          SUM(COALESCE(actual_weight, 0)) as total
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= date_trunc('week', NOW())
          AND COALESCE(actual_weight, 0) > 0
        GROUP BY DATE(date)
        ORDER BY dt ASC
      `;
    } catch {
      // Fallback ke skema lama
      distributionRaw = await sql`
        SELECT type as name, SUM(weight) as value
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= date_trunc('month', NOW())
        GROUP BY type
        ORDER BY value DESC
      `;

      weeklyRaw = await sql`
        SELECT DATE(date) as dt, SUM(weight) as total
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= date_trunc('week', NOW())
        GROUP BY DATE(date)
        ORDER BY dt ASC
      `;
    }

    // Map distribution to numbers since NUMERIC comes out as string in postgres node drivers
    const distribution = distributionRaw.map((row: any) => ({
      name: row.name,
      value: Number(row.value)
    }));

    // Map weekly mapping to ensure consistent formatting for Bar Chart (Mon - Sun)
    const weeklyMap: Record<string, number> = {};
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const dStr = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      weeklyMap[dateStr] = 0;
    }

    weeklyRaw.forEach((row: any) => {
      // row.dt might be Date object, convert to string YYYY-MM-DD
      const dateStr = new Date(row.dt).toISOString().split('T')[0];
      if (weeklyMap[dateStr] !== undefined) {
        weeklyMap[dateStr] += Number(row.total);
      }
    });

    const weeklyTrend = Object.keys(weeklyMap).map((date: any) => {
      const parts = date.split("-");
      return {
        date: `${parts[2]}/${parts[1]}`, // DD/MM format
        weight: weeklyMap[date]
      };
    });

    return {
      success: true,
      distributionData: distribution,
      weeklyData: weeklyTrend
    };
  } catch (error) {
    console.error("Error fetching global stats:", error);
    return { success: false, error: String(error) };
  }
}

export async function getWasteCatalog(): Promise<{
  success: boolean;
  data?: {
    id: string;
    name: string;
    category: string;
    pricePerKg: number;
  }[];
  error?: string;
}> {
  try {
    const catalog = await sql`
      SELECT id, name, category, price_per_kg as "pricePerKg"
      FROM waste_catalog
      ORDER BY name ASC
    `;
    return {
      success: true,
      data: catalog.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        category: String(item.category),
        pricePerKg: Number(item.pricePerKg)
      }))
    };
  } catch (error) {
    console.error("Error fetching waste catalog:", error);
    return { success: false, error: String(error) };
  }
}
export async function getUserNotifications() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const notifications = await sql`
      SELECT id, title, message, type, is_read as "isRead", created_at as "createdAt"
      FROM notifications
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: String(error) };
  }
}

export async function markNotificationAsRead(id: number) {
  try {
    await sql`UPDATE notifications SET is_read = true WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
