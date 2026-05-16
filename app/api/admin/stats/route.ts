import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user count
    const userCount = await sql`SELECT COUNT(*) as count FROM users`

    // Get total pickups
    const pickupCount = await sql`SELECT COUNT(*) as count FROM pickups`

    // Get pending pickups
    const pendingPickups = await sql`SELECT COUNT(*) as count FROM pickups WHERE status = 'pending'`

    // Get pending withdrawals
    const pendingWithdrawals = await sql`SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'`

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