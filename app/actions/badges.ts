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
  },
  {
    id: "metal_master",
    name: "Master Logam",
    description: "Menyetor minimal 20kg logam.",
    icon: "🔩",
  },
  {
    id: "eco_warrior",
    name: "Pahlawan Ekologi",
    description: "Total setoran mencapai 100kg.",
    icon: "🏆",
  }
];

export async function getUserBadges() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_badges (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          badge_id VARCHAR(50) NOT NULL,
          unlocked_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, badge_id)
        )
      `
    } catch (e) {
      // Table might already exist
    }

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
    // If error, return default badges (not unlocked)
    const badges: BadgeInfo[] = BADGE_CATALOG.map(b => ({
      ...b,
      unlockedAt: null
    }));
    return { success: true, data: badges };
  }
}

// Fungsi ini akan dipanggil untuk mengecek dan meng-unlock badge baru
export async function evaluateBadges() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) return { success: false, badgesUnlocked: [] };

  try {
    // 1. Ambil data dari pickups table (new schema)
    let totalWeight = 0;
    let totalKardus = 0;
    let activeMonths = 0;

    try {
      // Get total weight from pickups
      const pickupsRes = await sql`
        SELECT COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kg,
               COUNT(DISTINCT DATE_TRUNC('month', created_at)) as active_months
        FROM pickups
        WHERE user_id = ${userId} AND status IN ('verified', 'selesai', 'terverifikasi')
      `;
      if (pickupsRes.length > 0) {
        totalWeight = Number(pickupsRes[0].total_kg) || 0;
        activeMonths = Number(pickupsRes[0].active_months) || 0;
      }

      // Get kardus total
      const kardusRes = await sql`
        SELECT COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kardus
        FROM pickups
        WHERE user_id = ${userId} AND waste_name ILIKE '%kertas%' AND status IN ('verified', 'selesai', 'terverifikasi')
      `;
      totalKardus = kardusRes.length > 0 ? Number(kardusRes[0].total_kardus) || 0 : 0;

      // Get metal total
      const metalRes = await sql`
        SELECT COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_metal
        FROM pickups
        WHERE user_id = ${userId} AND waste_name ILIKE '%logam%' AND status IN ('verified', 'selesai', 'terverifikasi')
      `;
      const totalMetal = metalRes.length > 0 ? Number(metalRes[0].total_metal) || 0 : 0;

      // Kumpulkan badge yang eligible
      const eligibleBadges: string[] = [];
      if (totalWeight >= 10) eligibleBadges.push("first_10kg");
      if (totalKardus >= 25) eligibleBadges.push("cardboard_king");
      if (activeMonths >= 3) eligibleBadges.push("earth_savior");
      if (totalMetal >= 20) eligibleBadges.push("metal_master");
      if (totalWeight >= 100) eligibleBadges.push("eco_warrior");

      if (eligibleBadges.length === 0) return { success: true, badgesUnlocked: [] };

      // Ensure table exists
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS user_badges (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            badge_id VARCHAR(50) NOT NULL,
            unlocked_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, badge_id)
          )
        `
      } catch (e) {
        // Table might already exist
      }

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

    } catch (dbError) {
      console.error("Badge evaluation DB error:", dbError);
      return { success: true, badgesUnlocked: [] };
    }

  } catch (error: any) {
    console.error("Evaluate Badges Error:", error);
    return { success: false, error: error.message };
  }
}
