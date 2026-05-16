import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const after = searchParams.get('after') ?? '1970-01-01'

  if (!roomId) {
    return Response.json({ error: 'roomId is required' }, { status: 400 })
  }

  const rows = await sql`
    SELECT * FROM chat_messages
    WHERE room_id = ${roomId}
    AND created_at > ${after}
    ORDER BY created_at ASC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  const { roomId, senderRole, senderName, content } = await req.json()

  if (!roomId || !senderRole || !senderName || !content) {
    return Response.json({ error: 'roomId, senderRole, senderName, and content are required' }, { status: 400 })
  }

  const msg = await sql`
    INSERT INTO chat_messages (room_id, sender_role, sender_name, content)
    VALUES (${roomId}, ${senderRole}, ${senderName}, ${content})
    RETURNING *
  `

  if (senderRole === 'user') {
    await sql`
      UPDATE chat_rooms
      SET last_message = ${content},
          last_message_at = NOW(),
          unread_admin = unread_admin + 1
      WHERE id = ${roomId}
    `
  } else {
    await sql`
      UPDATE chat_rooms
      SET last_message = ${content},
          last_message_at = NOW(),
          unread_user = unread_user + 1
      WHERE id = ${roomId}
    `
  }

  return Response.json(msg[0])
}