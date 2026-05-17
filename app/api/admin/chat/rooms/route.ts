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

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  // Only show open rooms by default (exclude deleted ones)
  if (status === 'all') {
    const rows = await getSql()`SELECT * FROM chat_rooms WHERE status != 'deleted' ORDER BY last_message_at DESC`
    return Response.json(rows)
  }

  // Default: only open rooms
  const rows = await getSql()`SELECT * FROM chat_rooms WHERE status = 'open' ORDER BY last_message_at DESC`
  return Response.json(rows)
}

export async function DELETE(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')

  if (!roomId) {
    return Response.json({ error: 'roomId is required' }, { status: 400 })
  }

  try {
    // Soft delete: update status instead of hard delete
    await getSql()`UPDATE chat_rooms SET status = 'deleted' WHERE id = ${roomId}`

    return Response.json({ success: true, message: 'Chat session deleted successfully' })
  } catch (error) {
    console.error('Delete chat room error:', error)
    return Response.json({ error: 'Failed to delete chat room' }, { status: 500 })
  }
}
