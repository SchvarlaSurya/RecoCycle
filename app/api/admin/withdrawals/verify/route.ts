import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, wdId } = body

    console.log('Verify withdrawal request:', { id, wdId })

    if (!id && !wdId) {
      return Response.json({ success: false, error: 'id or wdId is required' }, { status: 400 })
    }

    // Find withdrawal
    let withdrawal: any[] = []

    if (id) {
      // Try as UUID first
      try {
        withdrawal = await sql`SELECT * FROM withdrawals WHERE id = ${id}`
      } catch (e) {
        console.log('UUID query failed, trying as integer:', e)
        // Try as integer
        const idNum = parseInt(String(id))
        if (!isNaN(idNum)) {
          withdrawal = await sql`SELECT * FROM withdrawals WHERE id = ${idNum}`
        }
      }
    } else if (wdId) {
      withdrawal = await sql`SELECT * FROM withdrawals WHERE wd_id = ${wdId}`
    }

    console.log('Found withdrawal:', withdrawal)

    if (withdrawal.length === 0) {
      return Response.json({ success: false, error: 'Withdrawal not found' }, { status: 404 })
    }

    const wd = withdrawal[0]

    // Check if already processed
    if (wd.status === 'Selesai') {
      return Response.json({ success: false, error: 'Penarikan sudah diverifikasi sebelumnya' }, { status: 400 })
    }

    // Update status to Selesai
    const updateResult = await sql`
      UPDATE withdrawals
      SET status = 'Selesai'
      WHERE id = ${wd.id}
      RETURNING *
    `

    if (updateResult.length === 0) {
      return Response.json({ success: false, error: 'Failed to update withdrawal status' }, { status: 500 })
    }

    // Deduct from user balance
    const amountValue = parseFloat(String(wd.amount).replace(/[^0-9.]/g, '')) || 0

    try {
      await sql`
        UPDATE user_balances
        SET balance = balance - ${amountValue},
            total_penarikan = COALESCE(total_penarikan, 0) + ${amountValue},
            updated_at = NOW()
        WHERE user_id = ${wd.user_id}
      `
    } catch (balanceError) {
      console.error('Balance update error (non-critical):', balanceError)
    }

    // Update the pending transaction to Selesai
    try {
      await sql`
        UPDATE transactions
        SET status = 'Selesai'
        WHERE user_id = ${wd.user_id}
          AND type = 'penarikan'
          AND CAST(amount AS NUMERIC) = ${amountValue}
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (txError) {
      console.error('Transaction update error (non-critical):', txError)
    }

    console.log('Verification successful for:', wd.id)
    return Response.json({
      success: true,
      message: 'Penarikan berhasil diverifikasi!',
      amount: amountValue,
      user_id: wd.user_id
    })
  } catch (error) {
    console.error('Verify withdrawal error:', error)
    return Response.json({ success: false, error: 'Failed to verify withdrawal: ' + String(error) }, { status: 500 })
  }
}