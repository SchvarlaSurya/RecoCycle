import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

async function ensureColumns() {
  try {
    // Transactions table columns
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255)`
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`

    // Withdrawals table columns
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejected_reason TEXT`
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255)`
    await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`

    // Users table columns
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'bronze'`
  } catch (e) {
    // columns may already exist
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    let pickups

    // Map status filter to database values
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'Menunggu Verifikasi': 'pending',
      'pending_verification': 'pending',
      'verified': 'Selesai',
      'Selesai': 'Selesai',
      'terverifikasi': 'Selesai',
      'rejected': 'Ditolak',
      'Ditolak': 'Ditolak'
    }

    const dbStatus = status ? statusMap[status] || status : null

    if (dbStatus) {
      pickups = await sql`
        SELECT p.*, u.name as user_name, u.tier as user_tier, u.exp as user_exp
        FROM pickups p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.status = ${dbStatus}
        ORDER BY p.created_at DESC
        LIMIT 100
      `
    } else {
      pickups = await sql`
        SELECT p.*, u.name as user_name, u.tier as user_tier, u.exp as user_exp
        FROM pickups p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 100
      `
    }
    return Response.json(pickups)
  } catch (error) {
    console.error('Fetch pickups error:', error)
    return Response.json({ error: 'Failed to fetch pickups' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Ensure all columns exist
    await ensureColumns()

    const body = await req.json()
    const { id, action } = body

    if (action === 'verify') {
      const pickup = await sql`SELECT * FROM pickups WHERE id = ${id}`
      if (pickup.length === 0) {
        return Response.json({ success: false, error: 'Pickup not found' }, { status: 404 })
      }

      const pickupData = pickup[0]

      // Skip if already verified
      if (pickupData.status === 'Selesai') {
        return Response.json({ success: false, error: 'Pickup sudah diverifikasi sebelumnya' }, { status: 400 })
      }

      // Update pickup status to 'Selesai'
      await sql`
        UPDATE pickups
        SET status = 'Selesai',
            verified_by = 'admin',
            verified_at = NOW()
        WHERE id = ${id}
      `

      // Update transaction status to 'Selesai' so balance gets calculated correctly
      await sql`
        UPDATE transactions
        SET status = 'Selesai'
        WHERE (reference_id = ${id} OR reference_id = CAST(${id} AS TEXT)) AND type = 'setoran'
      `

      // Update user balance (add reward to user_balances)
      const rewardAmount = parseFloat(pickupData.estimated_reward) || 0
      console.log('=== PICKUP VERIFIED ===')
      console.log('Pickup ID:', id)
      console.log('User ID:', pickupData.user_id)
      console.log('Weight (kg):', pickupData.weight_kg)
      console.log('Estimated Reward:', pickupData.estimated_reward)
      console.log('Reward Amount (parsed):', rewardAmount)

      try {
        // First try to insert, if fails then update
        const existing = await sql`SELECT * FROM user_balances WHERE user_id = ${pickupData.user_id}`
        console.log('Existing balance record:', existing)

        if (existing.length === 0) {
          await sql`
            INSERT INTO user_balances (user_id, balance, total_setoran, updated_at)
            VALUES (${pickupData.user_id}, ${rewardAmount}, ${rewardAmount}, NOW())
          `
          console.log('Inserted new balance record')
        } else {
          await sql`
            UPDATE user_balances
            SET balance = balance + ${rewardAmount},
                total_setoran = total_setoran + ${rewardAmount},
                updated_at = NOW()
            WHERE user_id = ${pickupData.user_id}
          `
          console.log('Updated existing balance record')
        }

        // Verify the update
        const verify = await sql`SELECT * FROM user_balances WHERE user_id = ${pickupData.user_id}`
        console.log('Balance after update:', verify)
      } catch (balanceError) {
        console.error('Balance update error:', balanceError)
      }

      // Add EXP to user (10 exp per kg)
      const expEarned = Math.round(parseFloat(pickupData.weight_kg || 0) * 10)
      const currentUser = await sql`SELECT * FROM users WHERE id = ${pickupData.user_id}`
      const currentExp = currentUser.length > 0 ? parseInt(currentUser[0].exp) || 0 : 0
      const newExp = currentExp + expEarned

      // Determine new tier based on exp
      let newTier = 'bronze'
      if (newExp >= 5000) newTier = 'gold'
      else if (newExp >= 1000) newTier = 'silver'

      // Update user exp and tier
      if (currentUser.length > 0) {
        await sql`
          UPDATE users
          SET exp = exp + ${expEarned},
              tier = ${newTier},
              updated_at = NOW()
          WHERE id = ${pickupData.user_id}
        `
      } else {
        // User doesn't exist, insert with required fields
        const userName = pickupData.user_name || 'User'
        await sql`
          INSERT INTO users (id, name, exp, tier, created_at, updated_at)
          VALUES (${pickupData.user_id}, ${userName}, ${newExp}, ${newTier}, NOW(), NOW())
        `
      }

      // Create notification for user
      const previousTier = currentUser[0]?.tier || 'bronze'
      const tierMessage = newTier !== previousTier
        ? ` Tier Anda naik ke ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}!`
        : ''

      try {
        await sql`
          INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
          VALUES (
            ${pickupData.user_id},
            'pickup_verified',
            'Setoran Sampah Diverifikasi!',
            ${`Pickup sampah Anda telah diverifikasi. +${expEarned} EXP${tierMessage}`},
            false,
            NOW()
          )
        `
      } catch (e) {
        console.error('Failed to create notification:', e)
      }

      return Response.json({
        success: true,
        message: 'Pickup verified successfully',
        expEarned,
        newTier,
        newExp
      })
    }

    if (action === 'reject') {
      const pickup = await sql`SELECT * FROM pickups WHERE id = ${id}`
      if (pickup.length === 0) {
        return Response.json({ success: false, error: 'Pickup not found' }, { status: 404 })
      }

      await sql`
        UPDATE pickups
        SET status = 'Ditolak',
            verified_by = 'admin',
            verified_at = NOW()
        WHERE id = ${id}
      `

      // Update transaction to rejected
      await sql`
        UPDATE transactions
        SET status = 'Ditolak'
        WHERE (reference_id = ${id} OR reference_id = CAST(${id} AS TEXT)) AND type = 'setoran'
      `

      return Response.json({ success: true, message: 'Pickup rejected' })
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Update pickup error:', error)
    return Response.json({ success: false, error: 'Failed to update pickup: ' + String(error) }, { status: 500 })
  }
}