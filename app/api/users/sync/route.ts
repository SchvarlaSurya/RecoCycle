import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const { userId, userData } = await req.json()

    // Get user data from Clerk or use provided data
    const name = userData?.name || userData?.firstName || userData?.fullName || 'User'
    const email = userData?.email || null

    // Check if user already exists to preserve exp
    const existingUser = await sql`SELECT exp FROM users WHERE id = ${userId}`
    const currentExp = existingUser.length > 0 ? existingUser[0].exp : 0

    // Insert or update user in users table - preserve existing exp
    const result = await sql`
      INSERT INTO users (id, name, email, tier, exp, created_at, updated_at)
      VALUES (
        ${userId},
        ${name},
        ${email},
        'bronze',
        ${currentExp},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, users.name),
        email = COALESCE(EXCLUDED.email, users.email),
        updated_at = NOW()
      RETURNING *
    `

    return Response.json({
      success: true,
      data: result[0]
    })
  } catch (error) {
    console.error('Sync user error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const users = await sql`SELECT * FROM users ORDER BY exp DESC`

    return Response.json({
      success: true,
      users: users,
      totalUsers: users.length
    })
  } catch (error) {
    console.error('Get users error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}