import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  const rows = await sql`
    SELECT * FROM chat_rooms WHERE user_id = ${userId} LIMIT 1
  `
  return Response.json(rows[0] ?? null)
}

export async function POST(req: Request) {
  const { userId, userName, userEmail } = await req.json()

  if (!userId || !userName || !userEmail) {
    return Response.json({ error: 'userId, userName, and userEmail are required' }, { status: 400 })
  }

  // Check if room already exists for this user
  const existingRoom = await sql`
    SELECT * FROM chat_rooms WHERE user_id = ${userId} LIMIT 1
  `

  if (existingRoom.length > 0) {
    return Response.json(existingRoom[0])
  }

  // Create new room only if none exists
  const rows = await sql`
    INSERT INTO chat_rooms (user_id, user_name, user_email)
    VALUES (${userId}, ${userName}, ${userEmail})
    RETURNING *
  `
  return Response.json(rows[0])
}