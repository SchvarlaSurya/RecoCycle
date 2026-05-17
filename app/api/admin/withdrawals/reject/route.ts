import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

async function ensureWithdrawalColumns() {
  try {
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejected_reason TEXT`
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255)`
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`
  } catch (e) {
    // columns may already exist
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Ensure columns exist
    await ensureWithdrawalColumns()

    const body = await req.json()
    const { id, wdId } = body

    if (!id && !wdId) {
      return Response.json({ success: false, error: 'id or wdId is required' }, { status: 400 })
    }

    let withdrawal: any[] = []

    if (id) {
      try {
        withdrawal = await getSql()`SELECT * FROM withdrawals WHERE id = ${id}`
      } catch (e) {
        const idNum = parseInt(String(id))
        if (!isNaN(idNum)) {
          withdrawal = await getSql()`SELECT * FROM withdrawals WHERE id = ${idNum}`
        }
      }
    } else if (wdId) {
      withdrawal = await getSql()`SELECT * FROM withdrawals WHERE wd_id = ${wdId}`
    }

    if (withdrawal.length === 0) {
      return Response.json({ success: false, error: 'Withdrawal not found' }, { status: 404 })
    }

    const wd = withdrawal[0]

    if (wd.status === 'Ditolak') {
      return Response.json({ success: false, error: 'Penarikan sudah ditolak sebelumnya' }, { status: 400 })
    }

    const wdAmount = parseFloat(String(wd.amount).replace(/[^0-9.]/g, '')) || 0

    await getSql()`
      UPDATE withdrawals
      SET status = 'Ditolak',
          rejected_reason = 'Ditolak oleh admin',
          verified_by = 'admin',
          verified_at = NOW()
      WHERE id = ${wd.id}
    `

    try {
      await getSql()`
        UPDATE transactions
        SET status = 'Ditolak'
        WHERE user_id = ${wd.user_id}
          AND type = 'penarikan'
          AND CAST(amount AS NUMERIC) = ${wdAmount}
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (txError) {
      console.error('Transaction update error:', txError)
    }

    return Response.json({ success: true, message: 'Penarikan ditolak' })
  } catch (error) {
    console.error('Reject withdrawal error:', error)
    return Response.json({ success: false, error: 'Gagal menolak penarikan' }, { status: 500 })
  }
}
