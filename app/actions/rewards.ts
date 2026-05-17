"use server";

import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  type: "balance" | "merch";
  amount?: number;
  requiredXp: number;
  icon: string;
}

type RewardClaimRow = {
  reward_id: string;
};

async function getMonthlyXp(userId: string) {
  const rows = await sql`
    SELECT
      SUM(
        CASE
          WHEN type LIKE 'Scan AI:%' THEN 100
          ELSE COALESCE(weight, 0) * 50
        END
      ) as total_xp
    FROM transactions
    WHERE user_id = ${userId}
      AND status IN ('verified', 'Selesai')
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
  `;

  return rows.length > 0 && rows[0].total_xp ? Number(rows[0].total_xp) : 0;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

const REWARDS_CATALOG: RewardCatalogItem[] = [
  {
    id: "level_1_reward",
    title: "Pemula Beruntung",
    description: "Bonus saldo senilai Rp 5.000",
    type: "balance",
    amount: 5000,
    requiredXp: 150,
    icon: "💰"
  },
  {
    id: "level_2_reward",
    title: "Stiker Eksklusif",
    description: "Stiker Hologram RecoCycle",
    type: "merch",
    requiredXp: 400,
    icon: "✨"
  },
  {
    id: "level_3_reward",
    title: "Saldo Peduli Lingkungan",
    description: "Bonus saldo tunai Rp 15.000",
    type: "balance",
    amount: 15000,
    requiredXp: 1000,
    icon: "💸"
  },
  {
    id: "level_4_reward",
    title: "Tote Bag Premium",
    description: "Tas kain daur ulang ramah lingkungan",
    type: "merch",
    requiredXp: 2500,
    icon: "🛍️"
  }
];

export async function getRewardsStatus() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // 1. Dapatkan EXP user bulan ini, termasuk hasil scan AI
    const userXp = await getMonthlyXp(userId);

    // 2. Dapatkan daftar hadiah yang sudah diklaim di bulan ini
    const claimsRes = await sql`
      SELECT reward_id 
      FROM claimed_rewards 
      WHERE user_id = ${userId}
        AND claimed_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    const claimedSet = new Set((claimsRes as RewardClaimRow[]).map((claim) => claim.reward_id));

    // 3. Gabungkan status untuk UI
    const catalogWithStatus = REWARDS_CATALOG.map((reward: any) => {
      const isClaimed = claimedSet.has(reward.id);
      const canClaim = !isClaimed && userXp >= reward.requiredXp;
      
      return {
        ...reward,
        isClaimed,
        canClaim
      };
    });

    const claimableCount = catalogWithStatus.filter((r: any) => r.canClaim).length;

    return { 
      success: true, 
      userXp, 
      rewards: catalogWithStatus,
      claimableCount
    };
  } catch (error: unknown) {
    console.error("Gagal mendapatkan status rewards:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function claimReward(rewardId: string) {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // Verifikasi apakah reward valid
    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) throw new Error("Reward tidak ditemukan.");

    // Cek EXP bulan ini, termasuk hasil scan AI
    const userXp = await getMonthlyXp(userId);
    if (userXp < reward.requiredXp) throw new Error("EXP tidak cukup untuk hadiah ini.");

    // Cek apakah sudah diklaim di bulan ini
    const existingClaim = await sql`
      SELECT id FROM claimed_rewards 
      WHERE user_id = ${userId} 
        AND reward_id = ${rewardId}
        AND claimed_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    if (existingClaim.length > 0) throw new Error("Hadiah sudah diklaim sebelumnya.");

    // Mulai "Transaksi DB" dengan eksekusi beruntun (karena serverless, jalankan 1 per 1 untuk aman)
    // 1. Simpan history klaim
    await sql`
      INSERT INTO claimed_rewards (user_id, reward_id) VALUES (${userId}, ${rewardId})
    `;

    // 2. Jika hadiahnya berbentuk saldo, insert transaksi palsu bernilai positif
    if (reward.type === "balance" && reward.amount) {
      const txId = "RWD-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      await sql`
        INSERT INTO transactions (user_id, tx_id, type, weight, reward, date, status)
        VALUES (${userId}, ${txId}, 'Bonus Reward', 0, ${reward.amount}, NOW(), 'Selesai')
      `;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Gagal klaim hadiah:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
