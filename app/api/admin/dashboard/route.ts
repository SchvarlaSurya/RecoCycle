import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // PARALLEL QUERIES - Run all stats queries simultaneously
    const [
      usersResult,
      pickupsStats,
      withdrawalsStats,
      weeklyData,
      distributionRaw,
      balanceStats
    ] = await Promise.all([
      // 1. Get all users count
      getSql()`SELECT COUNT(*) as count FROM users`,

      // 2. Get all pickups stats
      getSql()`
        SELECT
          COUNT(*) as total_pickups,
          COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kg,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_pickups
        FROM pickups
      `,

      // 3. Get pending withdrawals count
      getSql()`
        SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount
        FROM withdrawals WHERE status = 'Menunggu Verifikasi'
      `,

      // 4. Get weekly trend
      getSql()`
        SELECT DATE(created_at) as date, SUM(CAST(weight_kg AS NUMERIC)) as kg
        FROM pickups
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,

      // 5. Get waste type distribution
      getSql()`
        SELECT waste_name, SUM(CAST(weight_kg AS NUMERIC)) as kg
        FROM pickups
        WHERE status IN ('verified', 'selesai', 'terverifikasi')
        GROUP BY waste_name
        ORDER BY kg DESC
        LIMIT 6
      `,

      // 6. Total balance across all users
      getSql()`SELECT COALESCE(SUM(balance), 0) as total_balance FROM user_balances`
    ])

    // Parse results
    const totalUsers = parseInt(usersResult[0]?.count) || 0
    const totalPickups = parseInt(pickupsStats[0]?.total_pickups) || 0
    const totalKg = parseFloat(pickupsStats[0]?.total_kg) || 0
    const pendingPickups = parseInt(pickupsStats[0]?.pending_pickups) || 0
    const pendingWithdrawals = parseInt(withdrawalsStats[0]?.count) || 0
    const pendingWithdrawalAmount = parseFloat(withdrawalsStats[0]?.total_amount) || 0
    const totalBalance = parseFloat(balanceStats[0]?.total_balance) || 0

    // Generate weekly trend
    const now = new Date()
    const weeklyTrend = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const found = weeklyData.find((x: any) => {
        const dbDate = typeof x.date === 'string' ? x.date.split('T')[0] : x.date?.toISOString?.()?.split('T')[0] || ''
        return dbDate === dateStr
      })
      weeklyTrend.push({
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }),
        kg: found ? parseFloat(found.kg) || 0 : 0
      })
    }

    // Process distribution
    const totalDistributionKg = distributionRaw.reduce((sum: number, d: any) => sum + parseFloat(d.kg) || 0, 0) || 1
    const colors = ['#10b981', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#d1fae5']
    const distribution = distributionRaw.map((d: any, i: number) => ({
      name: d.waste_name || 'Lainnya',
      kg: parseFloat(d.kg) || 0,
      percent: totalDistributionKg > 0 ? Math.round((parseFloat(d.kg) || 0) / totalDistributionKg * 100) : 0,
      color: colors[i % colors.length]
    }))
    const topWaste = distribution.slice(0, 3).map((d: any) => ({
      name: d.name,
      kg: d.kg,
      percent: d.percent
    }))

    // Helper to parse amount
    const parseAmount = (val: any): number => {
      if (typeof val === 'number') return val
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.,]/g, '').replace(/,/g, '.')
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    // PARALLEL QUERIES - Get transactions and pending lists
    const [
      recentTx,
      pendingPickupListRaw,
      pendingWithdrawalListRaw
    ] = await Promise.all([
      // Recent transactions with user names
      getSql()`
        SELECT
          t.*,
          u.name as db_user_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `,

      // Pending pickups for verification
      getSql()`
        SELECT p.*, u.name as db_user_name
        FROM pickups p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
        LIMIT 5
      `,

      // Pending withdrawals for verification
      getSql()`
        SELECT w.*, u.name as db_user_name
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE w.status = 'Menunggu Verifikasi'
        ORDER BY w.created_at DESC
        LIMIT 5
      `
    ])

    const recentTransactions = recentTx.map((tx: any) => ({
      id: tx.id,
      user_id: tx.user_id,
      user_name: tx.db_user_name || tx.user_name || 'Unknown',
      type: tx.type,
      description: tx.description,
      amount: parseAmount(tx.amount || tx.reward),
      status: tx.status,
      created_at: tx.created_at
    }))

    const pendingPickupList = pendingPickupListRaw.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      user_name: p.user_name || p.db_user_name || 'Unknown',
      waste_name: p.waste_name,
      weight_kg: p.weight_kg,
      pickup_date: p.pickup_date,
      time_slot: p.time_slot,
      address: p.address,
      estimated_reward: parseAmount(p.estimated_reward),
      status: p.status,
      created_at: p.created_at
    }))

    const pendingWithdrawalList = pendingWithdrawalListRaw.map((w: any) => ({
      id: w.id,
      user_id: w.user_id,
      user_name: w.user_name || w.db_user_name || 'Unknown',
      method: w.method,
      account_number: w.account_number,
      amount: parseAmount(w.amount),
      status: w.status,
      created_at: w.created_at,
      method_name: w.method?.toUpperCase() || 'Unknown'
    }))

    return Response.json({
      stats: {
        totalUsers,
        totalPickups,
        totalKg,
        pendingPickups,
        pendingWithdrawals,
        pendingWithdrawalAmount,
        totalBalance
      },
      weeklyTrend,
      distribution,
      topWaste,
      recentTransactions,
      pendingPickups: pendingPickupList,
      pendingWithdrawals: pendingWithdrawalList
    })
  } catch (error) {
    console.error('Admin dashboard API error:', error)
    return Response.json({ error: 'Failed to fetch admin dashboard' }, { status: 500 })
  }
}
