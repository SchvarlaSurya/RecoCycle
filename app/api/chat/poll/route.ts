import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const after = searchParams.get('after') ?? new Date().toISOString()

  if (!roomId) {
    return Response.json({ error: 'roomId is required' }, { status: 400 })
  }

  const deadline = Date.now() + 20000

  while (Date.now() < deadline) {
    const rows = await sql`
      SELECT * FROM chat_messages
      WHERE room_id = ${roomId}
      AND created_at > ${after}
      ORDER BY created_at ASC
      LIMIT 10
    `
    if (rows.length > 0) return Response.json(rows)
    await new Promise(r => setTimeout(r, 1500))
  }

  return Response.json([])
}