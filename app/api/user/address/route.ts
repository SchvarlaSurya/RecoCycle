import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const result = await sql`
      SELECT * FROM user_addresses WHERE user_id = ${userId} LIMIT 1
    `
    return Response.json(result[0] || null)
  } catch (error) {
    console.error('Get address error:', error)
    return Response.json(null)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, address, latitude, longitude } = body

    if (!userId || !address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO user_addresses (user_id, address, latitude, longitude, updated_at)
      VALUES (${userId}, ${address}, ${latitude || 0}, ${longitude || 0}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        address = ${address},
        latitude = ${latitude || 0},
        longitude = ${longitude || 0},
        updated_at = NOW()
      RETURNING *
    `

    return Response.json({ success: true, data: result[0] })
  } catch (error) {
    console.error('Save address error:', error)
    return Response.json({ error: String(error) }, { status: 500 })
  }
}
