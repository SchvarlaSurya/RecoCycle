import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, type, title, message } = body

    const res = await sql`
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      ) VALUES (
        ${userId},
        ${type || 'announcement'},
        ${title},
        ${message},
        false,
        NOW()
      )
      RETURNING *
    `

    return Response.json({ success: true, notification: res[0] })
  } catch (error) {
    console.error('Create notification error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const isRead = searchParams.get('isRead')

  try {
    let query
    if (userId && isRead !== null) {
      query = sql`SELECT * FROM notifications WHERE user_id = ${userId} AND is_read = ${isRead === 'true'} ORDER BY created_at DESC LIMIT 50`
    } else if (userId) {
      query = sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
    } else {
      return Response.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const notifications = await query
    const unreadCount = await sql`SELECT COUNT(*) as count FROM notifications WHERE user_id = ${userId} AND is_read = false`

    return Response.json({
      success: true,
      notifications,
      unreadCount: parseInt(unreadCount[0]?.count) || 0
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ success: false, error: 'userId is required' }, { status: 400 })
  }

  try {
    // Mark all notifications as read
    await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId} AND is_read = false`
    return Response.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}