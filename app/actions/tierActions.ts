"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export type TierType = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface TierInfo {
  tier: TierType;
  bonusPercentage: number;
  cumulativeWeight: number;
  nextTierWeight: number | null;
  progressToNext: number;
}

export interface TierConfig {
  id: number;
  tierName: TierType;
  minWeightKg: number;
  maxWeightKg: number | null;
  bonusPercentage: number;
  description: string | null;
  isActive: boolean;
}

interface TierConfigRow {
  id: number;
  tier_name: string;
  min_weight_kg: number;
  max_weight_kg: number | null;
  bonus_percentage: number;
  description: string | null;
  is_active: boolean;
}

interface UserProfileRow {
  user_id: string;
  tier: string;
  kumulatif_sampah_kg: number;
}

async function getTierConfigs(): Promise<TierConfigRow[]> {
  try {
    const rows = await sql`SELECT * FROM tier_configs WHERE is_active = true ORDER BY min_weight_kg ASC`;
    return rows as TierConfigRow[];
  } catch {
    return [];
  }
}

async function calculateTierFromConfigs(
  cumulativeWeight: number
): Promise<{ tier: TierType; bonusPercentage: number; nextTierWeight: number | null }> {
  const configs = await getTierConfigs();
  
  if (configs.length === 0) {
    return calculateTierFallback(cumulativeWeight);
  }

  let currentTier: TierType = "Bronze";
  let bonusPercentage = 0;
  let nextTierWeight: number | null = null;

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    if (cumulativeWeight >= Number(config.min_weight_kg)) {
      currentTier = config.tier_name as TierType;
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

function calculateTierFallback(
  cumulativeWeight: number
): { tier: TierType; bonusPercentage: number; nextTierWeight: number | null } {
  if (cumulativeWeight >= 500) {
    return { tier: "Platinum", bonusPercentage: 10, nextTierWeight: null };
  } else if (cumulativeWeight >= 200) {
    return { tier: "Gold", bonusPercentage: 5, nextTierWeight: 500 };
  } else if (cumulativeWeight >= 50) {
    return { tier: "Silver", bonusPercentage: 3, nextTierWeight: 200 };
  } else {
    return { tier: "Bronze", bonusPercentage: 0, nextTierWeight: 50 };
  }
}

function calculateProgressToNext(
  cumulativeWeight: number,
  nextTierWeight: number | null
): number {
  if (nextTierWeight === null) {
    return 100;
  }

  const configs = [
    { minWeight: 0, nextWeight: 50 },
    { minWeight: 50, nextWeight: 200 },
    { minWeight: 200, nextWeight: 500 },
    { minWeight: 500, nextWeight: null },
  ];

  for (const config of configs) {
    if (nextTierWeight === config.nextWeight) {
      const range = config.nextWeight - config.minWeight;
      const progress = ((cumulativeWeight - config.minWeight) / range) * 100;
      return Math.min(Math.max(Math.round(progress), 0), 100);
    }
  }

  return 0;
}

export async function getUserTier(): Promise<{ success: boolean; data?: TierInfo; error?: string }> {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const profilesRows = await sql`SELECT user_id, tier, kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${user.id}`;
    const profiles = profilesRows as UserProfileRow[];
    
    let cumulativeWeight = 0;
    let currentTier: TierType = "Bronze";
    
    if (profiles.length > 0) {
      cumulativeWeight = Number(profiles[0].kumulatif_sampah_kg);
      currentTier = profiles[0].tier as TierType;
    }

    const tierData = await calculateTierFromConfigs(cumulativeWeight);
    const progressToNext = calculateProgressToNext(cumulativeWeight, tierData.nextTierWeight);

    return {
      success: true,
      data: {
        tier: tierData.tier,
        bonusPercentage: tierData.bonusPercentage,
        cumulativeWeight,
        nextTierWeight: tierData.nextTierWeight,
        progressToNext,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getTierInfo(): Promise<{ success: boolean; data?: TierConfig[]; error?: string }> {
  try {
    const configs = await getTierConfigs();
    
    if (configs.length === 0) {
      const defaultConfigs: TierConfig[] = [
        { id: 1, tierName: "Bronze", minWeightKg: 0, maxWeightKg: 50, bonusPercentage: 0, description: "Bronze tier", isActive: true },
        { id: 2, tierName: "Silver", minWeightKg: 50, maxWeightKg: 200, bonusPercentage: 3, description: "Silver tier", isActive: true },
        { id: 3, tierName: "Gold", minWeightKg: 200, maxWeightKg: 500, bonusPercentage: 5, description: "Gold tier", isActive: true },
        { id: 4, tierName: "Platinum", minWeightKg: 500, maxWeightKg: null, bonusPercentage: 10, description: "Platinum tier", isActive: true },
      ];
      return { success: true, data: defaultConfigs };
    }

    return {
      success: true,
      data: configs.map((row) => ({
        id: row.id,
        tierName: row.tier_name as TierType,
        minWeightKg: Number(row.min_weight_kg),
        maxWeightKg: row.max_weight_kg ? Number(row.max_weight_kg) : null,
        bonusPercentage: Number(row.bonus_percentage),
        description: row.description,
        isActive: row.is_active,
      })),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateUserTier(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profilesRows = await sql`SELECT user_id, tier, kumulatif_sampah_kg FROM user_profiles WHERE user_id = ${userId}`;
    const profiles = profilesRows as UserProfileRow[];
    
    if (profiles.length === 0) {
      return { success: false, error: "User profile not found" };
    }

    const cumulativeWeight = Number(profiles[0].kumulatif_sampah_kg);
    const tierData = await calculateTierFromConfigs(cumulativeWeight);

    await sql`UPDATE user_profiles SET tier = ${tierData.tier}, updated_at = NOW() WHERE user_id = ${userId}`;

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}