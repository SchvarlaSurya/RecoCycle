import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    // Get user balance from user_balances table
    let balance = 0
    let totalSetoran = 0
    let totalPenarikan = 0

    try {
      const userData = await getSql()`SELECT * FROM user_balances WHERE user_id = ${userId}`
      if (userData.length > 0) {
        const row = userData[0]
        balance = parseFloat(row.balance) || 0
        totalSetoran = parseFloat(row.total_setoran) || 0
        totalPenarikan = parseFloat(row.total_penarikan) || 0
      }
    } catch (e) {
      console.error('Balance query failed:', e)
    }

    // Get total weight and count from verified pickups
    let totalKg = 0
    let totalTransactions = 0

    try {
      const pickupsTotal = await getSql()`
        SELECT COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kg, COUNT(*) as total_count
        FROM pickups
        WHERE user_id = ${userId} AND status IN ('verified', 'selesai', 'terverifikasi')
      `
      totalKg = parseFloat(pickupsTotal[0]?.total_kg) || 0
      totalTransactions = parseInt(pickupsTotal[0]?.total_count) || 0
    } catch (e) {
      console.error('Pickups query failed:', e)
    }

    // Get weekly trend (last 7 days) - use verified_at for real verification date
    const now = new Date()
    const weeklyTrend = []
    try {
      const weeklyData = await getSql()`
        SELECT DATE(COALESCE(verified_at, created_at)) as date, SUM(CAST(weight_kg AS NUMERIC)) as kg
        FROM pickups
        WHERE user_id = ${userId}
          AND (verified_at >= NOW() - INTERVAL '7 days' OR (verified_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'))
          AND status IN ('verified', 'selesai', 'terverifikasi')
        GROUP BY DATE(COALESCE(verified_at, created_at))
        ORDER BY date ASC
      `

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        // Handle both date objects and string formats from database
        const found = weeklyData.find((x: any) => {
          const dbDate = typeof x.date === 'string' ? x.date.split('T')[0] : x.date.toISOString().split('T')[0]
          return dbDate === dateStr
        })
        weeklyTrend.push({
          date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          kg: found ? parseFloat(found.kg) || 0 : 0
        })
      }
    } catch (e) {
      console.error('Weekly trend query failed:', e)
      // Return empty 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        weeklyTrend.push({
          date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          kg: 0
        })
      }
    }

    // Get waste type distribution
    let distribution: any[] = []
    let topWaste: any[] = []
    try {
      const distributionRaw = await getSql()`
        SELECT waste_name, SUM(CAST(weight_kg AS NUMERIC)) as kg
        FROM pickups
        WHERE user_id = ${userId}
          AND status IN ('verified', 'selesai', 'terverifikasi')
        GROUP BY waste_name
        ORDER BY kg DESC
        LIMIT 6
      `

      const totalDistributionKg = distributionRaw.reduce((sum: number, d: any) => sum + parseFloat(d.kg), 0) || 1
      const colors = ['#10b981', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#d1fae5']
      distribution = distributionRaw.map((d: any, i: number) => ({
        name: d.waste_name || 'Lainnya',
        kg: parseFloat(d.kg) || 0,
        percent: Math.round((parseFloat(d.kg) / totalDistributionKg) * 100),
        color: colors[i % colors.length]
      }))
      topWaste = distribution.slice(0, 3).map((d: any) => ({
        name: d.name,
        kg: d.kg,
        percent: d.percent
      }))
    } catch (e) {
      console.error('Distribution query failed:', e)
    }

    // Get recent transactions
    let recentTransactions: any[] = []
    try {
      const recentTx = await getSql()`
        SELECT id, type, reward, amount, status, created_at
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 5
      `
      recentTransactions = recentTx.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount || tx.reward) || 0,
        reward: parseFloat(tx.reward || tx.amount) || 0,
        status: tx.status,
        created_at: tx.created_at
      }))
    } catch (e) {
      console.error('Transactions query failed:', e)
    }

    return Response.json({
      balance,
      totalKg,
      totalTransactions,
      totalSetoran,
      totalPenarikan,
      weeklyTrend,
      distribution,
      topWaste,
      recentTransactions
    })
  } catch (error) {
    console.error('User Dashboard API error:', error)
    return Response.json({
      balance: 0,
      totalKg: 0,
      totalTransactions: 0,
      totalSetoran: 0,
      totalPenarikan: 0,
      weeklyTrend: [],
      distribution: [],
      topWaste: [],
      recentTransactions: []
    })
  }
}
