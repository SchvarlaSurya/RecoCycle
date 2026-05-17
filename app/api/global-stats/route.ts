import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(req: Request) {
  try {
    // Total kg from verified transactions (all users)
    const kgResult = await getSql()`
      SELECT COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kg
      FROM pickups
      WHERE status IN ('verified', 'Selesai', 'terverifikasi')
    `
    const totalKg = parseFloat(kgResult[0]?.total_kg) || 0

    // Total transactions count
    const txCountResult = await getSql()`
      SELECT COUNT(*) as count
      FROM pickups
      WHERE status IN ('verified', 'Selesai', 'terverifikasi')
    `
    const totalTransactions = parseInt(txCountResult[0]?.count) || 0

    // Total balance (all users combined)
    const balanceResult = await getSql()`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM user_balances
    `
    const totalBalance = parseFloat(balanceResult[0]?.total) || 0

    // Total exchanged (withdrawals)
    const exchangedResult = await getSql()`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM withdrawals
      WHERE status NOT IN ('Ditolak', 'rejected', 'pending')
    `
    const totalExchanged = parseFloat(exchangedResult[0]?.total) || 0

    // Weekly trend (all verified pickups in last 7 days)
    const weeklyRaw = await getSql()`
      SELECT DATE(created_at) as dt, SUM(CAST(weight_kg AS NUMERIC)) as kg
      FROM pickups
      WHERE status IN ('verified', 'Selesai', 'terverifikasi')
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY dt ASC
    `

    // Fill last 7 days with zeros
    const weeklyMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      weeklyMap[d.toISOString().split('T')[0]] = 0
    }
    weeklyRaw.forEach((row: any) => {
      const dateStr = typeof row.dt === 'string' ? row.dt.split('T')[0] : row.dt?.toISOString?.()?.split('T')[0] || ''
      if (weeklyMap[dateStr] !== undefined) {
        weeklyMap[dateStr] = parseFloat(row.kg) || 0
      }
    })
    const weeklyTrend = Object.keys(weeklyMap).sort().map(date => {
      const parts = date.split("-")
      return {
        date: `${parts[2]}/${parts[1]}`,
        kg: weeklyMap[date]
      }
    })

    // Distribution by waste type
    const distRaw = await getSql()`
      SELECT waste_name, SUM(CAST(weight_kg AS NUMERIC)) as kg
      FROM pickups
      WHERE status IN ('verified', 'Selesai', 'terverifikasi')
      GROUP BY waste_name
      ORDER BY kg DESC
      LIMIT 6
    `

    const totalDistKg = distRaw.reduce((sum: number, d: any) => sum + (parseFloat(d.kg) || 0), 0) || 1
    const colors = ['#10b981', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#d1fae5']
    const distribution = distRaw.map((d: any, i: number) => ({
      name: d.waste_name || 'Lainnya',
      kg: parseFloat(d.kg) || 0,
      percent: totalDistKg > 0 ? Math.round((parseFloat(d.kg) || 0) / totalDistKg * 100) : 0,
      color: colors[i % colors.length]
    }))

    // Top waste types
    const topWaste = distribution.slice(0, 3).map(d => ({
      name: d.name,
      kg: d.kg,
      percent: d.percent
    }))

    // Total active users
    const usersResult = await getSql()`SELECT COUNT(*) as count FROM users`
    const totalUsers = parseInt(usersResult[0]?.count) || 0

    return Response.json({
      totalKg,
      totalTransactions,
      balance: totalBalance,
      totalExchanged,
      weeklyTrend,
      distribution,
      topWaste,
      totalUsers
    })
  } catch (error) {
    console.error('Global stats error:', error)
    return Response.json({
      totalKg: 0,
      totalTransactions: 0,
      balance: 0,
      totalExchanged: 0,
      weeklyTrend: [],
      distribution: [],
      topWaste: [],
      totalUsers: 0,
      error: String(error)
    }, { status: 500 })
  }
}
