import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const user = await getSql()`SELECT * FROM user_balances WHERE user_id = ${id}`
    if (user.length > 0) {
      return Response.json(user[0])
    }
    // Return default balance if user not found
    return Response.json({
      user_id: id,
      balance: 1213100, // Default mock balance
      total_setoran: 1870000,
      total_reward: 157000,
      total_penarikan: 775900
    })
  } catch (error) {
    console.error('Fetch user error:', error)
    // Return mock data if database fails
    return Response.json({
      user_id: id,
      balance: 1213100,
      total_setoran: 1870000,
      total_reward: 157000,
      total_penarikan: 775900
    })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  try {
    const { balance, action, amount } = body

    if (action === 'add') {
      await getSql()`
        INSERT INTO user_balances (user_id, balance, total_setoran, updated_at)
        VALUES (${id}, ${balance || 0}, ${amount || 0}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          balance = user_balances.balance + ${amount || 0},
          total_setoran = user_balances.total_setoran + ${amount || 0},
          updated_at = NOW()
      `
    }

    if (action === 'deduct') {
      await getSql()`
        INSERT INTO user_balances (user_id, balance, total_penarikan, updated_at)
        VALUES (${id}, 0, 0, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          balance = user_balances.balance - ${amount || 0},
          total_penarikan = user_balances.total_penarikan + ${amount || 0},
          updated_at = NOW()
      `
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
