"use server";

import { sql } from "@/lib/db";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

interface TierConfigRow {
  id: number;
  tier_name: string;
  min_weight_kg: number;
  max_weight_kg: number | null;
  bonus_percentage: number;
}

interface UserProfileRow {
  user_id: string;
  tier: string;
  available_balance: number;
  kumulatif_sampah_kg: number;
  total_deposits: number;
  phone_number: string | null;
  address: string | null;
}

interface TransactionRow {
  id: number;
  tx_id: string;
  user_id: string;
  type: string;
  waste_type_id: string;
  estimated_weight: number;
  actual_weight: number | null;
  price_per_kg: number;
  base_reward: number | null;
  tier_bonus: number | null;
  total_reward: number | null;
  status: string;
}

interface WithdrawalRow {
  id: number;
  wd_id: string;
  user_id: string;
  amount: number;
  locked_amount: number;
  status: string;
}

interface AdminActivityLogRow {
  id: number;
  admin_user_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: Date;
}

async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: string
) {
  const admin = await currentUser();
  if (!admin) return;

  const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";

  await sql`
    INSERT INTO admin_activity_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
    VALUES (${admin.id}, ${adminName}, ${action}, ${targetType}, ${targetId}, ${details ?? null}, NOW())
  `;
}

async function createNotification(userId: string, title: string, message: string, type: string = "system") {
  await sql`
    INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
    VALUES (${userId}, ${title}, ${message}, ${type}, false, NOW())
  `;
}

async function calculateTierFromConfigs(cumulativeWeight: number): Promise<{ tier: string; bonusPercentage: number; nextTierWeight: number | null }> {
  const configsRows = await sql`SELECT * FROM tier_configs WHERE is_active = true ORDER BY min_weight_kg ASC`;
  const configs = configsRows as TierConfigRow[];
  
  if (configs.length === 0) {
    if (cumulativeWeight >= 500) return { tier: "Platinum", bonusPercentage: 10, nextTierWeight: null };
    if (cumulativeWeight >= 200) return { tier: "Gold", bonusPercentage: 5, nextTierWeight: 500 };
    if (cumulativeWeight >= 50) return { tier: "Silver", bonusPercentage: 3, nextTierWeight: 200 };
    return { tier: "Bronze", bonusPercentage: 0, nextTierWeight: 50 };
  }

  let currentTier = "Bronze";
  let bonusPercentage = 0;
  let nextTierWeight: number | null = null;

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    if (cumulativeWeight >= Number(config.min_weight_kg)) {
      currentTier = config.tier_name;
      bonusPercentage = Number(config.bonus_percentage);
      if (i + 1 < configs.length) {
        nextTierWeight = Number(configs[i + 1].min_weight_kg);
      } else {
        nextTierWeight = null;
      }
    }
  }

  return { tier: currentTier, bonusPercentage, nextTierWeight };
}

export async function verifyTransaction(
  txId: string,
  actualWeight: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const txRowsResult = await sql`SELECT * FROM transactions WHERE tx_id = ${txId} AND status = 'pending'`;
    const txRows = txRowsResult as TransactionRow[];
    
    if (txRows.length === 0) {
      return { success: false, error: "Transaction not found or not pending" };
    }

    const transaction = txRows[0];
    
    // Fetch latest price from master data (waste_catalog)
    const catalogRows = await sql`SELECT price_per_kg FROM waste_catalog WHERE name = ${transaction.type} LIMIT 1`;
    const pricePerKg = catalogRows.length > 0 
      ? Number(catalogRows[0].price_per_kg) 
      : Number(transaction.price_per_kg || 0);
    
    const profileRowsResult = await sql`SELECT * FROM user_profiles WHERE user_id = ${transaction.user_id}`;
    const profileRows = profileRowsResult as UserProfileRow[];
    
    let cumulativeWeight = 0;
    let currentTier = "Bronze";

    if (profileRows.length > 0) {
      cumulativeWeight = Number(profileRows[0].kumulatif_sampah_kg) || 0;
      currentTier = profileRows[0].tier || "Bronze";
    }

    // Calculate reward based on LATEST master data price
    const totalReward = actualWeight * pricePerKg;
    const newCumulativeWeight = cumulativeWeight + actualWeight;
    const newXP = actualWeight * 50; // Simple XP logic

    // Use a simple tiered system or calculateTierFromConfigs
    const tierData = await calculateTierFromConfigs(newCumulativeWeight);
    const newTier = tierData.tier;

    await sql`
      UPDATE transactions 
      SET actual_weight = ${actualWeight},
          reward = ${totalReward},
          status = 'verified'
      WHERE tx_id = ${txId}
    `;

    await sql`
      INSERT INTO user_profiles (user_id, kumulatif_sampah_kg, total_xp, tier, updated_at)
      VALUES (${transaction.user_id}, ${actualWeight}, ${newXP}, ${newTier}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        kumulatif_sampah_kg = user_profiles.kumulatif_sampah_kg + ${actualWeight},
        total_xp = user_profiles.total_xp + ${newXP},
        tier = ${newTier},
        updated_at = NOW()
    `;

    const result = { transaction, totalReward, newTier };

    await createNotification(
      result.transaction.user_id,
      "Transaksi Diverifikasi",
      `Transaksi Anda dengan ID ${txId} telah diverifikasi. Berat: ${actualWeight}kg, Reward: Rp${result.totalReward.toLocaleString("id-ID")}`,
      "deposit"
    );

    await logAdminAction("verify_transaction", "transaction", txId, 
      `Verified transaction ${txId} for user ${result.transaction.user_id}. Weight: ${actualWeight}kg, Reward: ${result.totalReward}`);

    revalidatePath("/admin/transaksi");
    revalidatePath("/admin/verifikasi");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return { success: false, error: String(error) };
  }
}

export async function rejectTransaction(
  txId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const txRowsResult = await sql`SELECT * FROM transactions WHERE tx_id = ${txId} AND status = 'pending'`;
    const txRows = txRowsResult as TransactionRow[];
    
    if (txRows.length === 0) {
      return { success: false, error: "Transaction not found or not pending" };
    }

    const transaction = txRows[0];

    await sql`
      UPDATE transactions 
      SET status = 'rejected',
          rejection_reason = ${reason},
          processed_by = ${admin.id},
          processed_at = NOW()
      WHERE tx_id = ${txId}
    `;

    await createNotification(
      transaction.user_id,
      "Transaksi Ditolak",
      `Transaksi Anda dengan ID ${txId} telah ditolak. Alasan: ${reason}`,
      "system"
    );

    await logAdminAction("reject_transaction", "transaction", txId, 
      `Rejected transaction ${txId} for user ${transaction.user_id}. Reason: ${reason}`);

    revalidatePath("/admin/transaksi");
    revalidatePath("/admin/verifikasi");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting transaction:", error);
    return { success: false, error: String(error) };
  }
}

export async function approveWithdrawal(
  wdId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const wdRowsResult = await sql`SELECT * FROM withdrawals WHERE wd_id = ${wdId} AND status = 'Menunggu Verifikasi'`;
    const wdRows = wdRowsResult as WithdrawalRow[];
    
    if (wdRows.length === 0) {
      throw new Error("Withdrawal not found or not pending");
    }

    const withdrawal = wdRows[0];
    const amount = Number(withdrawal.amount);

    const profileRowsResult = await sql`SELECT * FROM user_profiles WHERE user_id = ${withdrawal.user_id}`;
    const profileRows = profileRowsResult as UserProfileRow[];
    const currentBalance = profileRows.length > 0 ? Number(profileRows[0].available_balance) : 0;

    if (currentBalance < amount) {
      throw new Error("Insufficient balance");
    }

    await sql`
      UPDATE withdrawals 
      SET status = 'Disetujui',
          processed_by = ${admin.id},
          processed_at = NOW()
      WHERE wd_id = ${wdId}
    `;

    await sql`
      UPDATE user_profiles
      SET available_balance = available_balance - ${amount},
          total_withdrawals = COALESCE(total_withdrawals, 0) + 1,
          updated_at = NOW()
      WHERE user_id = ${withdrawal.user_id}
    `;

    const result = { withdrawal, amount };

    await createNotification(
      result.withdrawal.user_id,
      "Penarikan Disetujui",
      `Penarikan Anda sebesar Rp${result.amount.toLocaleString("id-ID")} telah disetujui dan saldo telah dikurangkan.`,
      "withdrawal"
    );

    await logAdminAction("approve_withdrawal", "withdrawal", wdId, 
      `Approved withdrawal ${wdId} for user ${result.withdrawal.user_id}. Amount: ${result.amount}`);

    revalidatePath("/admin/withdrawal");

    return { success: true };
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    return { success: false, error: String(error) };
  }
}

export async function rejectWithdrawal(
  wdId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const wdRowsResult = await sql`SELECT * FROM withdrawals WHERE wd_id = ${wdId} AND status = 'Menunggu Verifikasi'`;
    const wdRows = wdRowsResult as WithdrawalRow[];
    
    if (wdRows.length === 0) {
      throw new Error("Withdrawal not found or not pending");
    }

    const withdrawal = wdRows[0];
    const lockedAmount = Number(withdrawal.locked_amount) || Number(withdrawal.amount);

    await sql`
      UPDATE withdrawals 
      SET status = 'Ditolak',
          rejection_reason = ${reason},
          processed_by = ${admin.id},
          processed_at = NOW()
      WHERE wd_id = ${wdId}
    `;

    await sql`
      INSERT INTO user_profiles (user_id, available_balance, updated_at)
      VALUES (${withdrawal.user_id}, ${lockedAmount}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        available_balance = user_profiles.available_balance + ${lockedAmount},
        updated_at = NOW()
    `;

    const result = { withdrawal, lockedAmount };

    await createNotification(
      result.withdrawal.user_id,
      "Penarikan Ditolak",
      `Penarikan Anda sebesar Rp${Number(result.withdrawal.amount).toLocaleString("id-ID")} telah ditolak. Alasan: ${reason}`,
      "withdrawal"
    );

    await logAdminAction("reject_withdrawal", "withdrawal", wdId, 
      `Rejected withdrawal ${wdId} for user ${result.withdrawal.user_id}. Reason: ${reason}. Restored amount: ${result.lockedAmount}`);

    revalidatePath("/admin/withdrawal");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    return { success: false, error: String(error) };
  }
}

interface UserWithProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  availableBalance: number;
  kumulatifSampahKg: number;
  totalDeposits: number;
  tier: string;
}

export async function getAllUsers(): Promise<{ success: boolean; users?: UserWithProfile[]; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({ limit: 100 });
    const userIds = clerkUsers.data.map((u: any) => u.id);
    
    // Fetch profiles (with only existing columns)
    const profileRowsResult = await sql`SELECT * FROM user_profiles WHERE user_id = ANY(${userIds})`;
    const profileRows = profileRowsResult as UserProfileRow[];
    
    // Fetch individual balances and stats from transactions/withdrawals
    const statsRows = await sql`
      SELECT 
        user_id,
        COUNT(*) FILTER (WHERE status = 'verified' OR status = 'Selesai') as deposits_count,
        SUM(reward) FILTER (WHERE status = 'verified' OR status = 'Selesai') as total_earnings
      FROM transactions
      WHERE user_id = ANY(${userIds})
      GROUP BY user_id
    `;

    const withdrawalRows = await sql`
      SELECT 
        user_id,
        SUM(amount) FILTER (WHERE status != 'Ditolak' AND status != 'rejected') as total_withdrawn
      FROM withdrawals
      WHERE user_id = ANY(${userIds})
      GROUP BY user_id
    `;

    const profileMap = new Map<string, UserProfileRow>();
    profileRows.forEach((p: any) => profileMap.set(p.user_id, p));

    const statsMap = new Map<string, any>();
    statsRows.forEach((s: any) => statsMap.set(s.user_id, s));

    const withdrawalMap = new Map<string, any>();
    withdrawalRows.forEach((w: any) => withdrawalMap.set(w.user_id, w));

    const users: UserWithProfile[] = clerkUsers.data.map((u: any) => {
      const profile = profileMap.get(u.id);
      const stats = statsMap.get(u.id);
      const wd = withdrawalMap.get(u.id);
      
      const earnings = Number(stats?.total_earnings || 0);
      const withdrawn = Number(wd?.total_withdrawn || 0);
      const balance = earnings - withdrawn;

      return {
        id: u.id,
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.emailAddresses[0]?.emailAddress || "Unknown",
        phoneNumber: profile?.phone_number || null,
        address: profile?.address || null,
        availableBalance: balance,
        kumulatifSampahKg: profile ? Number(profile.kumulatif_sampah_kg) : 0,
        totalDeposits: Number(stats?.deposits_count || 0),
        tier: profile?.tier || "Bronze",
      };
    });

    return { success: true, users };
  } catch (error) {
    console.error("Error fetching all users:", error);
    return { success: false, error: String(error) };
  }
}

interface ActivityLogEntry {
  id: number;
  adminUserId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: Date;
}

export async function getActivityLog(limit: number = 50): Promise<{ success: boolean; logs?: ActivityLogEntry[]; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const logsRows = await sql`
      SELECT * FROM admin_activity_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    const logs = logsRows as AdminActivityLogRow[];

    return {
      success: true,
      logs: logs.map((l: any) => ({
        id: l.id,
        adminUserId: l.admin_user_id,
        adminName: l.admin_name,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: l.details,
        createdAt: l.created_at,
      }))
    };
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return { success: false, error: String(error) };
  }
}

interface UserWithProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  availableBalance: number;
  kumulatifSampahKg: number;
  totalDeposits: number;
  tier: string;
}

export async function getUserById(userId: string): Promise<{ success: boolean; user?: UserWithProfile & { tierInfo: { tier: string; bonusPercentage: number; cumulativeWeight: number; nextTierWeight: number | null } }; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const profileRowsResult = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    const profileRows = profileRowsResult as UserProfileRow[];
    const profile = profileRows[0] || null;

    const cumulativeWeight = profile ? Number(profile.kumulatif_sampah_kg) || 0 : 0;
    const tierData = await calculateTierFromConfigs(cumulativeWeight);

    const balanceRowsResult = await sql`SELECT COALESCE(SUM(total_reward), 0) as total FROM transactions WHERE user_id = ${userId} AND status = 'verified'`;
    const balanceRows = balanceRowsResult as { total: number }[];
    const balance = Number(balanceRows[0]?.total || 0);

    const user: UserWithProfile & { tierInfo: { tier: string; bonusPercentage: number; cumulativeWeight: number; nextTierWeight: number | null } } = {
      id: clerkUser.id,
      userId: clerkUser.id,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      email: clerkUser.emailAddresses[0]?.emailAddress || "Unknown",
      phoneNumber: profile?.user_id ? (profile as unknown as { phone_number?: string }).phone_number || null : null,
      address: profile?.user_id ? (profile as unknown as { address?: string }).address || null : null,
      availableBalance: balance,
      kumulatifSampahKg: profile ? Number(profile.kumulatif_sampah_kg) : 0,
      totalDeposits: profile ? Number(profile.total_deposits) : 0,
      tier: profile?.tier || "Bronze",
      tierInfo: {
        tier: tierData.tier,
        bonusPercentage: tierData.bonusPercentage,
        cumulativeWeight,
        nextTierWeight: tierData.nextTierWeight,
      },
    };

    return { success: true, user };
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return { success: false, error: String(error) };
  }
}

export async function createAdminTransaction(
  userId: string,
  wasteTypeId: string,
  actualWeight: number,
  totalReward: number
): Promise<{ success: boolean; error?: string }> {
  const admin = await currentUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";

  try {
    const wasteRowsResult = await sql`SELECT name, price_per_kg FROM waste_catalog WHERE id = ${wasteTypeId}`;
    const wasteRows = wasteRowsResult as { name: string; price_per_kg: number }[];
    
    if (wasteRows.length === 0) {
      return { success: false, error: "Waste type not found" };
    }

    const wasteType = wasteRows[0].name;
    const pricePerKg = Number(wasteRows[0].price_per_kg);
    const baseReward = actualWeight * pricePerKg;

    const profileRowsResult = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
    const profileRows = profileRowsResult as UserProfileRow[];
    const cumulativeWeight = profileRows[0] ? Number(profileRows[0].kumulatif_sampah_kg) || 0 : 0;
    const tierData = await calculateTierFromConfigs(cumulativeWeight);
    const tierBonus = baseReward * (tierData.bonusPercentage / 100);
    const calculatedTotalReward = baseReward + tierBonus;
    const newCumulativeWeight = cumulativeWeight + actualWeight;
    const newTierData = await calculateTierFromConfigs(newCumulativeWeight);

    const txId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await sql`
      INSERT INTO transactions (
        tx_id, user_id, type, waste_type_id, estimated_weight, actual_weight,
        price_per_kg, base_reward, tier_bonus, total_reward, status, processed_by, processed_at
      )
      VALUES (
        ${txId}, ${userId}, ${wasteType}, ${wasteTypeId}, ${actualWeight}, ${actualWeight},
        ${pricePerKg}, ${baseReward}, ${tierBonus}, ${calculatedTotalReward}, 'verified', ${admin.id}, NOW()
      )
    `;

    await sql`
      INSERT INTO user_profiles (user_id, available_balance, kumulatif_sampah_kg, total_deposits, tier, updated_at)
      VALUES (${userId}, ${calculatedTotalReward}, ${actualWeight}, 1, ${newTierData.tier}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        available_balance = user_profiles.available_balance + ${calculatedTotalReward},
        kumulatif_sampah_kg = user_profiles.kumulatif_sampah_kg + ${actualWeight},
        total_deposits = user_profiles.total_deposits + 1,
        tier = ${newTierData.tier},
        updated_at = NOW()
    `;

    const result = { txId, totalReward: calculatedTotalReward };

    await sql`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES (
        ${userId},
        "Deposit Diterima",
        ${`Deposit sampah Anda telah diverifikasi. Berat: ${actualWeight}kg, Reward: Rp${result.totalReward.toLocaleString("id-ID")}`},
        "deposit",
        false,
        NOW()
      )
    `;

    await logAdminAction("create_transaction", "transaction", result.txId, 
      `Created verified transaction ${result.txId} for user ${userId}. Weight: ${actualWeight}kg, Reward: ${result.totalReward}`);

    revalidatePath("/admin/transaksi");
    revalidatePath("/admin/nasabah");

    return { success: true };
  } catch (error) {
    console.error("Error creating admin transaction:", error);
    return { success: false, error: String(error) };
  }
}