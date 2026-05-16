import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // Get users from database
    let query = sql`
      SELECT * FROM users
      WHERE 1=1
    `

    if (search) {
      query = sql`
        SELECT * FROM users
        WHERE name ILIKE ${'%' + search + '%'}
           OR email ILIKE ${'%' + search + '%'}
        ORDER BY exp DESC
      `
    } else {
      query = sql`
        SELECT * FROM users
        ORDER BY exp DESC
        LIMIT 100
      `
    }

    const dbUsers = await query

    // Enrich with pickup stats
    const enrichedUsers = await Promise.all(
      dbUsers.map(async (user: any) => {
        // Get pickup stats
        const statsResult = await sql`
          SELECT
            COUNT(*) as total_pickups,
            COALESCE(SUM(CAST(weight_kg AS NUMERIC)), 0) as total_kg,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_pickups
          FROM pickups
          WHERE user_id = ${user.id}
        `

        const stats = statsResult[0] || {}
        const totalPickups = parseInt(stats.total_pickups) || 0
        const totalKg = parseFloat(stats.total_kg) || 0

        return {
          id: user.id,
          name: user.name || 'User',
          email: user.email,
          tier: user.tier || 'bronze',
          exp: parseInt(user.exp) || 0,
          totalSetoran: totalKg * 5000, // Estimate based on kg
          totalPickups,
          totalKg,
          status: 'verified',
          joinDate: user.created_at,
          lastPickup: user.updated_at
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      totalUsers: enrichedUsers.length
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    // Delete user data (soft delete - just mark as frozen)
    await sql`
      UPDATE users
      SET tier = 'frozen'
      WHERE id = ${userId}
    `

    return NextResponse.json({
      success: true,
      message: 'User frozen successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { userId, name, tier } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    // Update user in database
    if (name || tier) {
      await sql`
        UPDATE users
        SET
          name = COALESCE(${name || null}, name),
          tier = COALESCE(${tier || null}, tier),
          updated_at = NOW()
        WHERE id = ${userId}
      `
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}