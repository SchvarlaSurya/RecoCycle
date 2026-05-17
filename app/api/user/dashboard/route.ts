import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// Get timestamp in Indonesia timezone (WIB = UTC+7)
function getISTDate() {
  const date = new Date()
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const wibOffset = 7 * 60 * 60000
  return new Date(utc + wibOffset)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    // Get user balance from user_balances table
    const balanceResult = await getSql()`
      SELECT * FROM user_balances WHERE user_id = ${userId}
    `

    let balance = 0
    let total_setoran = 0
    let total_reward = 0
    let total_penarikan = 0

    if (balanceResult.length > 0) {
      const bal = balanceResult[0]
      balance = parseFloat(bal.balance) || 0
      total_setoran = parseFloat(bal.total_setoran) || 0
      total_reward = parseFloat(bal.total_reward) || 0
      total_penarikan = parseFloat(bal.total_penarikan) || 0
    }

    // Get pending withdrawals to calculate available balance
    // (withdrawals with status 'Menunggu Verifikasi' are locked but not yet deducted)
    const pendingWithdrawals = await getSql()`
      SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
      FROM withdrawals
      WHERE user_id = ${userId} AND status = 'Menunggu Verifikasi'
    `
    const lockedAmount = parseFloat(pendingWithdrawals[0]?.total) || 0
    const availableBalance = Math.max(0, balance - lockedAmount)

    // Get all transactions for history
    const transactionsResult = await getSql()`
      SELECT * FROM transactions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get pending withdrawals
    const pendingResult = await getSql()`
      SELECT * FROM withdrawals
      WHERE user_id = ${userId} AND status = 'Menunggu Verifikasi'
    `

    const pendingWithdrawal = pendingResult.reduce((sum: number, w: any) => {
      const amount = parseFloat(String(w.amount).replace(/[^0-9.]/g, '')) || 0
      return sum + amount
    }, 0)

    return Response.json({
      balance,
      total_setoran,
      total_reward,
      total_penarikan,
      transactions: transactionsResult.map((tx: any) => {
        const isPenarikan = (tx.type || '').toLowerCase().includes('penarikan')
        const amount = parseFloat(String(tx.amount).replace(/[^0-9.]/g, '')) || 0
        return {
          id: tx.id,
          type: tx.type,
          description: tx.description,
          amount: isPenarikan ? -amount : amount, // Always negative for penarikan
          status: tx.status,
          created_at: tx.created_at
        }
      }),
      pendingWithdrawal
    })
  } catch (error) {
    console.error('User dashboard API error:', error)
    return Response.json({
      balance: 0,
      total_setoran: 0,
      total_reward: 0,
      total_penarikan: 0,
      transactions: [],
      pendingWithdrawal: 0
    })
  }
}
