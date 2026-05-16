import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  const authHeader = req.headers.get('x-admin-secret')
  const isAdmin = authHeader === ADMIN_SECRET

  try {
    // Admin can fetch all withdrawals
    if (isAdmin) {
      let query
      if (status && status.trim() !== '') {
        query = sql`SELECT * FROM withdrawals WHERE status = ${status} ORDER BY created_at DESC LIMIT 100`
      } else {
        query = sql`SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 100`
      }
      const withdrawals = await query

      // Fetch user names for each withdrawal
      const enrichedWithdrawals = await Promise.all(
        withdrawals.map(async (w: any) => {
          try {
            const user = await sql`SELECT name FROM users WHERE id = ${w.user_id}`
            return {
              ...w,
              user_name: user.length > 0 ? user[0].name : 'Unknown User'
            }
          } catch (e) {
            return { ...w, user_name: 'Unknown User' }
          }
        })
      )

      return Response.json(enrichedWithdrawals)
    }

    // Regular users need userId
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    let query
    if (status) {
      query = sql`SELECT * FROM withdrawals WHERE user_id = ${userId} AND status = ${status} ORDER BY created_at DESC`
    } else {
      query = sql`SELECT * FROM withdrawals WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
    }

    const withdrawals = await query
    return Response.json(withdrawals)
  } catch (error) {
    console.error('Get withdrawals error:', error)
    return Response.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body: any = {}

  try {
    body = await req.json()
  } catch (e) {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { userId, userName, method, methodName, accountName, accountNumber, amount } = body

  // Validate required fields
  if (!userId) {
    return Response.json({ success: false, error: 'User belum login. Silakan refresh halaman.' }, { status: 400 })
  }

  if (!method || !accountName || !accountNumber || !amount) {
    return Response.json({ success: false, error: 'Lengkapi semua field yang diperlukan' }, { status: 400 })
  }

  // Parse amount (remove formatting like dots and spaces)
  const cleanAmount = String(amount).replace(/\./g, '').replace(/\s/g, '')
  const rawAmount = parseInt(cleanAmount) || 0

  console.log('Withdrawal request:', { userId, method, amount, rawAmount })

  if (rawAmount < 50000) {
    return Response.json({
      success: false,
      error: 'Minimal penarikan Rp 50.000'
    }, { status: 400 })
  }

  // ======================================
  // BALANCE VALIDATION - Critical fix
  // ======================================
  try {
    // Calculate actual balance from transactions (setoran + reward - penarikan)
    const balanceCalc = await sql`
      SELECT
        type,
        SUM(ABS(CAST(amount AS NUMERIC))) as total
      FROM transactions
      WHERE user_id = ${userId} AND status = 'Selesai'
      GROUP BY type
    `

    let totalEarnings = 0
    let totalPenarikan = 0

    balanceCalc.forEach((row: any) => {
      const type = (row.type || '').toLowerCase()
      const amount = parseFloat(row.total) || 0
      if (type.includes('setoran') || type.includes('reward') || type.includes('bonus')) {
        totalEarnings += amount
      } else if (type.includes('penarikan')) {
        totalPenarikan += amount
      }
    })

    const availableBalance = totalEarnings - totalPenarikan

    console.log('Balance check:', { userId, totalEarnings, totalPenarikan, availableBalance, requested: rawAmount })

    if (availableBalance < rawAmount) {
      return Response.json({
        success: false,
        error: `Saldo tidak mencukupi. Saldo tersedia: Rp ${availableBalance.toLocaleString('id-ID')}, Minimal penarikan: Rp 50.000`
      }, { status: 400 })
    }
  } catch (balanceError) {
    console.error('Balance calculation error:', balanceError)
    return Response.json({
      success: false,
      error: 'Gagal menghitung saldo. Silakan coba lagi.'
    }, { status: 500 })
  }
  // ======================================
  // END BALANCE VALIDATION
  // ======================================

  // Generate unique wd_id
  const wdId = `WD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  // Get method display name
  const methodDisplayNames: Record<string, string> = {
    bca: 'Bank BCA',
    mandiri: 'Bank Mandiri',
    bni: 'Bank BNI',
    bri: 'Bank BRI',
    bjb: 'Bank BJB',
    gopay: 'GoPay',
    dana: 'DANA',
    ovo: 'OVO'
  }
  const displayMethodName = methodDisplayNames[method.toLowerCase()] || method.toUpperCase()

  try {
    // Try to insert withdrawal
    const result = await sql`
      INSERT INTO withdrawals (
        user_id,
        wd_id,
        method,
        account_name,
        account_number,
        amount,
        status,
        date,
        created_at
      ) VALUES (
        ${userId},
        ${wdId},
        ${method},
        ${accountName},
        ${accountNumber},
        ${rawAmount},
        'Menunggu Verifikasi',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    // Create transaction record - DON'T deduct balance yet, just record pending
    try {
      await sql`
        INSERT INTO transactions (
          user_id,
          user_name,
          type,
          description,
          amount,
          status,
          created_at
        ) VALUES (
          ${userId},
          ${userName || 'User'},
          'penarikan',
          ${`Penarikan ${displayMethodName} - ${String(accountNumber).slice(-4)}`},
          ${rawAmount},
          'pending',
          NOW()
        )
      `
    } catch (txError) {
      console.error('Failed to create transaction record:', txError)
    }

    return Response.json({
      success: true,
      message: 'Penarikan berhasil diajukan! Menunggu verifikasi admin.',
      data: result[0]
    })
  } catch (insertError: any) {
    console.error('Withdrawal insert error:', insertError)

    // Check if it's a constraint error
    const errorMsg = String(insertError)

    if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
      return Response.json({
        success: false,
        error: 'ID penarikan duplikat. Silakan coba lagi.'
      }, { status: 400 })
    }

    if (errorMsg.includes('user_balances')) {
      // Try to create user_balances entry first
      try {
        await sql`
          INSERT INTO user_balances (user_id, balance, total_setoran, updated_at)
          VALUES (${userId}, 0, 0, NOW())
          ON CONFLICT (user_id) DO NOTHING
        `
      } catch (e) {
        console.error('Failed to create user_balances:', e)
      }

      // Retry withdrawal
      try {
        const result = await sql`
          INSERT INTO withdrawals (
            user_id, wd_id, method, account_name, account_number, amount, status, date, created_at
          ) VALUES (
            ${userId}, ${wdId}, ${method}, ${accountName}, ${accountNumber}, ${rawAmount}, 'Menunggu Verifikasi', NOW(), NOW()
          )
          RETURNING *
        `

        return Response.json({
          success: true,
          message: 'Penarikan berhasil diajukan!',
          data: result[0]
        })
      } catch (retryError: any) {
        return Response.json({
          success: false,
          error: 'Gagal membuat penarikan: ' + String(retryError).substring(0, 100)
        }, { status: 500 })
      }
    }

    return Response.json({
      success: false,
      error: 'Gagal submit penarikan: ' + String(insertError).substring(0, 100)
    }, { status: 500 })
  }
}