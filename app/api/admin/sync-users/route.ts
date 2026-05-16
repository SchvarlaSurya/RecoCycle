import { clerkClient } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('x-admin-secret')
    if (authHeader !== ADMIN_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users from Clerk
    const users = await clerkClient.users.getUserList({ limit: 100 })

    let syncedCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        const userId = user.id
        const name = user.firstName || user.fullName || user.username || 'User'
        const email = user.primaryEmailAddress?.emailAddress || null

        // Check if user already exists to preserve exp
        const existingUser = await sql`SELECT exp FROM users WHERE id = ${userId}`
        const currentExp = existingUser.length > 0 ? parseInt(existingUser[0].exp) || 0 : 0

        // Insert or update user in users table - preserve existing exp
        await sql`
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
            name = COALESCE(${name}, users.name),
            email = COALESCE(${email}, users.email),
            updated_at = NOW()
        `
        syncedCount++
      } catch (e) {
        console.error(`Failed to sync user ${user.id}:`, e)
        errorCount++
      }
    }

    return Response.json({
      success: true,
      message: `Synced ${syncedCount} users from Clerk`,
      syncedCount,
      errorCount,
      totalClerkUsers: users.length
    })
  } catch (error) {
    console.error('Admin sync error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}