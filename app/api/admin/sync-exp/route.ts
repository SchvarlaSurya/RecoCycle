import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// This API syncs EXP for all users based on their verified pickups
export async function POST(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all users
    const users = await getSql()`SELECT id, name FROM users`

    const results = []

    for (const user of users) {
      // Calculate total EXP from verified pickups
      const pickups = await getSql()`
        SELECT COALESCE(SUM(weight_kg::numeric), 0) as total_kg
        FROM pickups
        WHERE user_id = ${user.id} AND status = 'verified'
      `

      const totalKg = parseFloat(pickups[0]?.total_kg) || 0
      const expEarned = Math.round(totalKg * 10) // 10 EXP per kg

      // Calculate new tier based on EXP
      let newTier = 'bronze'
      if (expEarned >= 5000) newTier = 'gold'
      else if (expEarned >= 1000) newTier = 'silver'

      // Update user with calculated EXP
      await getSql()`
        UPDATE users
        SET exp = ${expEarned},
            tier = ${newTier},
            updated_at = NOW()
        WHERE id = ${user.id}
      `

      results.push({
        userId: user.id,
        name: user.name,
        totalKg,
        exp: expEarned,
        tier: newTier
      })
    }

    return Response.json({
      success: true,
      message: `Synced EXP for ${results.length} users`,
      users: results
    })
  } catch (error) {
    console.error('Sync EXP error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
