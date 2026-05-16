import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// EXP and tier configuration
const TIER_CONFIG = {
  bronze: { minExp: 0, maxExp: 999, bonus: 0 },
  silver: { minExp: 1000, maxExp: 4999, bonus: 3 },
  gold: { minExp: 5000, maxExp: Infinity, bonus: 10 },
}

// EXP earned per kg of waste
const EXP_PER_KG = 10

function calculateTier(exp: number): { tier: string; bonus: number; nextTier: string | null; expNeeded: number } {
  if (exp >= 5000) {
    return {
      tier: 'gold',
      bonus: 10,
      nextTier: null,
      expNeeded: 0
    }
  } else if (exp >= 1000) {
    return {
      tier: 'silver',
      bonus: 3,
      nextTier: 'gold',
      expNeeded: 5000 - exp
    }
  } else {
    return {
      tier: 'bronze',
      bonus: 0,
      nextTier: 'silver',
      expNeeded: 1000 - exp
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const top = searchParams.get('top')

  try {
    if (top === '5') {
      // Get top 5 users by exp
      const users = await sql`
        SELECT id, name, tier, exp,
               COALESCE((SELECT SUM(weight_kg) FROM pickups WHERE user_id = users.id AND status = 'verified'), 0) as total_kg,
               COALESCE((SELECT COUNT(*) FROM pickups WHERE user_id = users.id AND status = 'verified'), 0) as total_pickups
        FROM users
        WHERE exp > 0
        ORDER BY exp DESC
        LIMIT 5
      `
      return Response.json({
        success: true,
        leaderboard: users.map((u, i) => ({
          rank: i + 1,
          id: u.id,
          name: u.name,
          tier: u.tier,
          exp: parseInt(u.exp) || 0,
          totalKg: parseFloat(u.total_kg) || 0,
          totalPickups: parseInt(u.total_pickups) || 0
        }))
      })
    }

    if (userId) {
      const user = await sql`SELECT * FROM users WHERE id = ${userId}`
      if (user.length === 0) {
        return Response.json({
          success: true,
          user: null,
          tierInfo: calculateTier(0)
        })
      }
      const u = user[0]
      const exp = parseInt(u.exp) || 0
      return Response.json({
        success: true,
        user: {
          id: u.id,
          name: u.name,
          tier: u.tier,
          exp: exp
        },
        tierInfo: calculateTier(exp)
      })
    }

    // Get all users
    const users = await sql`SELECT * FROM users ORDER BY exp DESC`
    return Response.json({
      success: true,
      users: users.map(u => ({
        ...u,
        exp: parseInt(u.exp) || 0,
        tierInfo: calculateTier(parseInt(u.exp) || 0)
      }))
    })
  } catch (error) {
    console.error('Get exp error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { userId, action, weightKg } = await req.json()

    if (action === 'add_exp') {
      // Calculate EXP earned (10 exp per kg)
      const expEarned = Math.round((weightKg || 0) * EXP_PER_KG)

      // Get current user data
      const current = await sql`SELECT * FROM users WHERE id = ${userId}`
      const currentExp = current.length > 0 ? parseInt(current[0].exp) || 0 : 0
      const newExp = currentExp + expEarned

      // Calculate new tier
      const tierInfo = calculateTier(newExp)

      // Update user with new exp and tier
      await sql`
        INSERT INTO users (id, exp, tier, updated_at)
        VALUES (${userId}, ${newExp}, ${tierInfo.tier}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          exp = users.exp + ${expEarned},
          tier = ${tierInfo.tier},
          updated_at = NOW()
      `

      return Response.json({
        success: true,
        expEarned,
        totalExp: newExp,
        tierInfo
      })
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Update exp error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}