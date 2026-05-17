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

  if (!userId) {
    return Response.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    const balance = await getSql()`
      SELECT * FROM user_balances WHERE user_id = ${userId}
    `

    if (balance.length === 0) {
      return Response.json({
        userId,
        balance: 0,
        totalSetoran: 0,
        totalPenarikan: 0,
        isNew: true
      })
    }

    return Response.json({
      userId,
      balance: parseFloat(balance[0].balance) || 0,
      totalSetoran: parseFloat(balance[0].total_setoran) || 0,
      totalPenarikan: parseFloat(balance[0].total_penarikan) || 0,
      updatedAt: balance[0].updated_at
    })
  } catch (error) {
    console.error('Get balance error:', error)
    return Response.json({ error: 'Failed to get balance' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    // Get total setoran from transactions
    let totalSetoran = 0
    try {
      const setoranResult = await getSql()`
        SELECT COALESCE(SUM(ABS(CAST(reward AS NUMERIC))), 0) as total
        FROM transactions
        WHERE user_id = ${userId}
          AND status = 'verified'
          AND reward IS NOT NULL
          AND CAST(reward AS NUMERIC) > 0
      `
      totalSetoran = parseFloat(setoranResult[0]?.total) || 0
    } catch (e) {
      console.error('Setoran query error:', e)
      totalSetoran = 0
    }

    // Get total penarikan
    let totalPenarikan = 0
    try {
      const penarikanResult = await getSql()`
        SELECT COALESCE(SUM(ABS(CAST(amount AS NUMERIC))), 0) as total
        FROM transactions
        WHERE user_id = ${userId}
          AND type = 'penarikan'
          AND status IN ('verified', 'Selesai')
      `
      totalPenarikan = parseFloat(penarikanResult[0]?.total) || 0
    } catch (e) {
      console.error('Penarikan query error:', e)
      totalPenarikan = 0
    }

    const balance = totalSetoran - totalPenarikan

    // Upsert balance
    await getSql()`
      INSERT INTO user_balances (user_id, balance, total_setoran, total_penarikan, updated_at)
      VALUES (${userId}, ${balance}, ${totalSetoran}, ${totalPenarikan}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        balance = ${balance},
        total_setoran = ${totalSetoran},
        total_penarikan = ${totalPenarikan},
        updated_at = NOW()
    `

    return Response.json({
      success: true,
      userId,
      balance,
      totalSetoran,
      totalPenarikan
    })
  } catch (error) {
    console.error('Balance sync error:', error)
    return Response.json({ error: 'Failed to sync balance: ' + String(error).substring(0, 100) }, { status: 500 })
  }
}
