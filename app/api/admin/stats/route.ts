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
    // Get user count
    const userCount = await getSql()`SELECT COUNT(*) as count FROM users`

    // Get total pickups
    const pickupCount = await getSql()`SELECT COUNT(*) as count FROM pickups`

    // Get pending pickups
    const pendingPickups = await getSql()`SELECT COUNT(*) as count FROM pickups WHERE status = 'pending'`

    // Get pending withdrawals
    const pendingWithdrawals = await getSql()`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'`

    return Response.json({
      totalUsers: parseInt(userCount[0]?.count) || 0,
      totalPickups: parseInt(pickupCount[0]?.count) || 0,
      pendingPickups: parseInt(pendingPickups[0]?.count) || 0,
      pendingWithdrawals: parseInt(pendingWithdrawals[0]?.count) || 0
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
