import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')

  try {
    let transactions
    if (status && type) {
      transactions = await sql`SELECT * FROM transactions WHERE status = ${status} AND type = ${type} ORDER BY created_at DESC LIMIT 100`
    } else if (status) {
      transactions = await sql`SELECT * FROM transactions WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`
    } else if (type) {
      transactions = await sql`SELECT * FROM transactions WHERE type = ${type} ORDER BY created_at DESC LIMIT 100`
    } else {
      transactions = await sql`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100`
    }
    return Response.json(transactions)
  } catch (error) {
    console.error('Fetch transactions error:', error)
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}