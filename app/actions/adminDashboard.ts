"use server";

import { sql } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export interface AdminStats {
  totalBalance: number;
  todayWeight: number;
  pendingCount: number;
  activeNasabahCount: number;
  monthlyByCategory: { name: string; weight: number }[];
  weeklyData: { date: string; weight: number }[];
}

export async function getDashboardOverviewStats(): Promise<{ success: boolean; data?: AdminStats; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    // Total Balance Calculation (Calculated from transactions - withdrawals)
    const balanceResultRows = await sql`
      SELECT (
        (SELECT COALESCE(SUM(reward), 0) FROM transactions WHERE status = 'verified' OR status = 'Selesai') -
        (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status != 'Ditolak' AND status != 'rejected')
      ) as total
    `;
    const balanceResult = balanceResultRows as any[];

    // Today Weight
    const todayWeightResultRows = await sql`
      SELECT COALESCE(SUM(weight), 0) as total 
      FROM transactions 
      WHERE (status = 'verified' OR status = 'Selesai') AND DATE(date) = CURRENT_DATE
    `;
    const todayWeightResult = todayWeightResultRows as any[];

    // Pending Count
    const pendingResultRows = await sql`SELECT COUNT(*) as count FROM transactions WHERE status = 'pending' OR status = 'Menunggu Verifikasi'`;
    const pendingResult = pendingResultRows as any[];

    // Active Nasabah Count
    const activeNasabahResultRows = await sql`SELECT COUNT(*) as count FROM user_profiles`;
    const activeNasabahResult = activeNasabahResultRows as any[];

    // Monthly By Category
    const monthlyCategoryResultRows = await sql`
      SELECT type, COALESCE(SUM(weight), 0) as total
      FROM transactions
      WHERE (status = 'verified' OR status = 'Selesai') AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY type
      ORDER BY total DESC
    `;
    const monthlyCategoryResult = monthlyCategoryResultRows as any[];

    // Weekly Data
    const weeklyDataResultRows = await sql`
      SELECT DATE(date) as dt, COALESCE(SUM(weight), 0) as total
      FROM transactions
      WHERE (status = 'verified' OR status = 'Selesai') AND date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(date)
      ORDER BY dt ASC
    `;
    const weeklyDataResult = weeklyDataResultRows as any[];

    // Map weekly setting up empty days to zero if not found
    const weeklyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMap[dateStr] = 0;
    }

    weeklyDataResult.forEach((row: any) => {
      const dateStr = new Date(row.dt).toISOString().split('T')[0];
      if (weeklyMap[dateStr] !== undefined) {
        weeklyMap[dateStr] += Number(row.total);
      }
    });

    const weeklyTrend = Object.keys(weeklyMap).sort().map((date: any) => {
      const parts = date.split("-");
      return {
        date: `${parts[2]}/${parts[1]}`, // DD/MM format
        weight: weeklyMap[date]
      };
    });

    return {
      success: true,
      data: {
        totalBalance: Number(balanceResult[0]?.total || 0),
        todayWeight: Number(todayWeightResult[0]?.total || 0),
        pendingCount: Number(pendingResult[0]?.count || 0),
        activeNasabahCount: Number(activeNasabahResult[0]?.count || 0),
        monthlyByCategory: monthlyCategoryResult.map((c: any) => ({ name: c.type, weight: Number(c.total) })),
        weeklyData: weeklyTrend,
      }
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return { success: false, error: String(error) };
  }
}

export async function getAllTransactionsAdmin(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    // Ultra-simple query to isolate issues
    const transactions = await sql`
      SELECT 
        id, 
        tx_id, 
        user_id, 
        type as waste_type, 
        weight as estimated_weight, 
        reward as total_reward, 
        status, 
        notes,
        rejection_reason,
        actual_weight,
        price_per_kg,
        date as created_at 
      FROM transactions 
      ORDER BY date DESC
    `;

    console.log("ADMIN TX FETCHED (SIMPLE):", transactions.length);
    return { success: true, data: transactions };
  } catch (error) {
    console.error("Error fetching admin transactions:", error);
    return { success: false, error: String(error) };
  }
}

export async function getWasteCatalogAdmin(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const catalog = await sql`SELECT * FROM waste_catalog ORDER BY category, name`;

    // If catalog is empty, seed default data
    if (catalog.length === 0) {
      await sql`
        INSERT INTO waste_catalog (id, name, category, price_per_kg, is_active) VALUES
          ('plastic', 'Plastik Campur', 'anorganik', 4200, true),
          ('paper', 'Kertas dan Kardus', 'anorganik', 2800, true),
          ('metal', 'Logam Ringan', 'anorganik', 7600, true),
          ('organic', 'Sisa Organik Kering', 'organik', 1700, true),
          ('battery', 'Baterai Rumah Tangga', 'khusus', 9800, true),
          ('electronics', 'Elektronik Kecil', 'khusus', 13200, true),
          ('glass', 'Botol Kaca', 'anorganik', 3500, true),
          ('oil', 'Minyak Jelantah', 'organik', 4000, true)
        ON CONFLICT (id) DO NOTHING
      `
      // Fetch again after seeding
      const seededCatalog = await sql`SELECT * FROM waste_catalog ORDER BY category, name`
      return { success: true, data: seededCatalog }
    }

    return { success: true, data: catalog };
  } catch (error) {
    console.error("Error fetching waste catalog:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateUserStatus(userId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    // Try to ensure status column exists (safe to run multiple times)
    try {
      await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'verified'`;
    } catch (e) {
      // Ignore if it fails (not supported in neon serverless environment or already exists)
    }

    await sql`
      UPDATE user_profiles 
      SET status = ${newStatus}, updated_at = NOW() 
      WHERE user_id = ${userId}
    `;

    const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";
    const actionLabel = newStatus === 'frozen' ? 'freeze_account' : newStatus === 'verified' ? 'verify_account' : 'unfreeze_account';
    
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
      VALUES (${admin.id}, ${adminName}, ${actionLabel}, 'nasabah', ${userId}, ${`Status changed to ${newStatus}`}, NOW())
    `;

    revalidatePath("/admin/nasabah");
    return { success: true };
  } catch (error) {
    console.error("Error updating user status:", error);
    return { success: false, error: String(error) };
  }
}

export async function editUserBalance(userId: string, newBalance: number, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    await sql`
      UPDATE user_profiles 
      SET available_balance = ${newBalance}, updated_at = NOW() 
      WHERE user_id = ${userId}
    `;

    const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";
    
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
      VALUES (${admin.id}, ${adminName}, 'edit_balance', 'nasabah', ${userId}, ${`Balance updated to ${newBalance}. Reason: ${reason}`}, NOW())
    `;

    revalidatePath("/admin/nasabah");
    return { success: true };
  } catch (error) {
    console.error("Error editing user balance:", error);
    return { success: false, error: String(error) };
  }
}

export async function updateWastePrice(id: string, newPrice: number): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    await sql`
      UPDATE waste_catalog 
      SET price_per_kg = ${newPrice}, updated_at = NOW()
      WHERE id = ${id}
    `;

    const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";
    
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
      VALUES (${admin.id}, ${adminName}, 'update_price', 'waste_catalog', ${id}, ${`Price updated to ${newPrice}`}, NOW())
    `;

    revalidatePath("/admin/master-data");
    return { success: true };
  } catch (error) {
    console.error("Error updating waste price:", error);
    return { success: false, error: String(error) };
  }
}

export async function addWasteCategory(name: string, category: string, price: number): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await currentUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const newId = `WC-${Date.now()}`;

    await sql`
      INSERT INTO waste_catalog (id, name, category, price_per_kg, updated_at)
      VALUES (${newId}, ${name}, ${category}, ${price}, NOW())
    `;

    const adminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.username || "Admin";
    
    await sql`
      INSERT INTO admin_activity_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
      VALUES (${admin.id}, ${adminName}, 'add_category', 'waste_catalog', ${newId}, ${`Added ${name} at ${price}/kg`}, NOW())
    `;

    revalidatePath("/admin/master-data");
    return { success: true };
  } catch (error) {
    console.error("Error adding waste category:", error);
    return { success: false, error: String(error) };
  }
}

