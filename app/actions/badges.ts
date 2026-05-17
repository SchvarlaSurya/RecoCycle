"use server";

import { sql } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

const BADGE_CATALOG = [
  {
    id: "first_10kg",
    name: "Pemula Hebat",
    description: "Berhasil menyetorkan 10kg sampah pertama.",
    icon: "🌱",
  },
  {
    id: "cardboard_king",
    name: "Raja Kardus",
    description: "Disiplin mengelola limbah kertas dan kardus (Min 25kg).",
    icon: "📦",
  },
  {
    id: "earth_savior",
    name: "Penyelamat Bumi",
    description: "Rutin menyetor sampah selama 3 bulan.",
    icon: "🌍",
  }
];

export async function getUserBadges() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const unlocked = await sql`
      SELECT badge_id, unlocked_at 
      FROM user_badges 
      WHERE user_id = ${userId}
    `;

    const unlockedMap = new Map(unlocked.map((b: any) => [b.badge_id, b.unlocked_at]));

    const badges: BadgeInfo[] = BADGE_CATALOG.map((b: any) => ({
      ...b,
      unlockedAt: (unlockedMap.get(b.id) as string | undefined) || null
    }));

    return { success: true, data: badges };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Fungsi ini akan dipanggil untuk mengecek dan meng-unlock badge baru
export async function evaluateBadges() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, badgesUnlocked: [] };

  try {
    // 1. Ambil data profil (untuk ngecek 10kg pertama)
    const profileRes = await sql`SELECT kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${userId}`;
    const totalWeight = profileRes.length > 0 ? Number(profileRes[0].kumulatif_sampah_kg) : 0;

    // 2. Ambil akumulasi kardus
    const cardboxRes = await sql`
      SELECT SUM(weight) as total_kardus 
      FROM transactions 
      WHERE user_id = ${userId} AND type = 'Kertas dan Kardus' AND status = 'Selesai'
    `;
    const totalKardus = cardboxRes.length > 0 && cardboxRes[0].total_kardus ? Number(cardboxRes[0].total_kardus) : 0;

    // 3. Ambil data bulan transaksi
    const monthsRes = await sql`
      SELECT COUNT(DISTINCT DATE_TRUNC('month', date)) as active_months 
      FROM transactions 
      WHERE user_id = ${userId} AND status = 'Selesai'
    `;
    const activeMonths = monthsRes.length > 0 ? Number(monthsRes[0].active_months) : 0;

    // Kumpulkan badge yang eligible
    const eligibleBadges: string[] = [];
    if (totalWeight >= 10) eligibleBadges.push("first_10kg");
    if (totalKardus >= 25) eligibleBadges.push("cardboard_king");
    if (activeMonths >= 3) eligibleBadges.push("earth_savior");

    if (eligibleBadges.length === 0) return { success: true, badgesUnlocked: [] };

    // Cek badge mana yang belum di-unlock
    const existingRes = await sql`SELECT badge_id FROM user_badges WHERE user_id = ${userId}`;
    const existingBadges = new Set(existingRes.map((r: any) => r.badge_id));

    const newlyUnlocked: any[] = [];
    
    for (const badge of eligibleBadges) {
      if (!existingBadges.has(badge)) {
        await sql`INSERT INTO user_badges (user_id, badge_id) VALUES (${userId}, ${badge})`;
        const badgeDetails = BADGE_CATALOG.find(b => b.id === badge);
        if (badgeDetails) newlyUnlocked.push(badgeDetails);
      }
    }

    return { success: true, badgesUnlocked: newlyUnlocked };

  } catch (error: any) {
    console.error("Evaluate Badges Error:", error);
    return { success: false, error: error.message };
  }
}
