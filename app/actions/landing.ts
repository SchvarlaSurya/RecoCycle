"use server";

import { sql } from "@/lib/db";

export interface LandingStats {
  totalPickups: number;
  totalTonnageBulanIni: number;
  topWastes: { type: string; total_weight: number }[];
}

export async function getLandingStats(): Promise<LandingStats> {
  try {
    // 1. Total pickup selesai (semua waktu)
    const pickupRes = await sql`
      SELECT COUNT(id) as total
      FROM transactions
      WHERE status = 'verified' OR status = 'Selesai'
    `;
    const totalPickups = pickupRes.length > 0 ? Number(pickupRes[0].total) : 0;

    // 2. Total sampah terpilah bulan ini (dengan fallback jika kolom tidak ada)
    let totalWeight = 0;
    let topWastes: { type: string; total_weight: number }[] = [];

    try {
      // Coba dengan actual_weight
      const tonnageRes = await sql`
        SELECT SUM(COALESCE(actual_weight, 0)) as total_weight
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
          AND COALESCE(actual_weight, 0) > 0
      `;
      if (tonnageRes.length > 0 && tonnageRes[0].total_weight) {
        totalWeight = Number(tonnageRes[0].total_weight);
      }
    } catch {
      // Fallback ke weight
      const tonnageRes = await sql`
        SELECT SUM(weight) as total_weight
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
      `;
      if (tonnageRes.length > 0 && tonnageRes[0].total_weight) {
        totalWeight = Number(tonnageRes[0].total_weight);
      }
    }

    try {
      const topWastesRes = await sql`
        SELECT waste_type as type, SUM(COALESCE(actual_weight, 0)) as total_weight
        FROM transactions
        WHERE (status = 'verified' OR status = 'Selesai')
          AND COALESCE(actual_weight, 0) > 0
        GROUP BY waste_type
        ORDER BY total_weight DESC
        LIMIT 5
      `;
      topWastes = topWastesRes.map(row => ({
        type: String(row.type),
        total_weight: Number(row.total_weight)
      }));
    } catch {
      const topWastesRes = await sql`
        SELECT type, SUM(weight) as total_weight
        FROM transactions
        WHERE status = 'verified' OR status = 'Selesai'
        GROUP BY type
        ORDER BY total_weight DESC
        LIMIT 5
      `;
      topWastes = topWastesRes.map(row => ({
        type: String(row.type),
        total_weight: Number(row.total_weight)
      }));
    }

    const totalTonnageBulanIni = totalWeight / 1000;

    return {
      totalPickups,
      totalTonnageBulanIni,
      topWastes
    };
  } catch (error) {
    console.error("Gagal mengambil data landing:", error);
    return {
      totalPickups: 0,
      totalTonnageBulanIni: 0,
      topWastes: []
    };
  }
}
