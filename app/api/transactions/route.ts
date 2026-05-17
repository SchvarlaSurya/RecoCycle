import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type')

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    let transactions
    if (type) {
      transactions = await getSql()`SELECT * FROM transactions WHERE user_id = ${userId} AND type = ${type} ORDER BY created_at DESC LIMIT 50`
    } else {
      transactions = await getSql()`SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
    }
    return Response.json(transactions)
  } catch (error) {
    console.error('Get transactions error:', error)
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
