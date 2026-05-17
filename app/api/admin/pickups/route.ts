import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// Ensure all required tables and columns exist
async function ensureSchema() {
  try {
    // Create pickups table if not exists
    await getSql()`
      CREATE TABLE IF NOT EXISTS pickups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) DEFAULT 'User',
        waste_type VARCHAR(100) NOT NULL,
        waste_name VARCHAR(255) NOT NULL,
        weight_kg DECIMAL(10,2) NOT NULL,
        pickup_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        estimated_reward DECIMAL(12,2) DEFAULT 0,
        actual_reward DECIMAL(12,2),
        verified_by VARCHAR(255),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create user_balances table if not exists
    await getSql()`
      CREATE TABLE IF NOT EXISTS user_balances (
        user_id VARCHAR(255) PRIMARY KEY,
        balance DECIMAL(12,2) DEFAULT 0,
        total_setoran DECIMAL(12,2) DEFAULT 0,
        total_reward DECIMAL(12,2) DEFAULT 0,
        total_penarikan DECIMAL(12,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create transactions table if not exists
    await getSql()`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        reference_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create users table if not exists
    await getSql()`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        balance DECIMAL(12,2) DEFAULT 0,
        tier VARCHAR(50) DEFAULT 'bronze',
        exp INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create notifications table if not exists
    await getSql()`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'announcement',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
  } catch (e) {
    console.log('Schema check skipped:', e)
  }
}

async function ensureColumns() {
  try {
    // Transactions table columns
    await getSql()`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255)`
    await getSql()`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)`

    // Withdrawals table columns
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejected_reason TEXT`
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255)`
    await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`

    // Users table columns
    await getSql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0`
    await getSql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'bronze'`
  } catch (e) {
    // columns may already exist
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-admin-secret')

  if (authHeader !== ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Ensure schema exists
    await ensureSchema()
    await ensureColumns()

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
      pickups = await getSql()`
        SELECT p.*, u.name as user_name, u.tier as user_tier, u.exp as user_exp
        FROM pickups p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.status = ${dbStatus}
        ORDER BY p.created_at DESC
        LIMIT 100
      `
    } else {
      // Fetch ALL pickups - no filter
      pickups = await getSql()`
        SELECT p.*, u.name as user_name, u.tier as user_tier, u.exp as user_exp
        FROM pickups p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 100
      `
    }

    // Log for debugging
    console.log('Admin pickups API response:', pickups.length, 'pickups')
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
    // Ensure all tables and columns exist
    await ensureSchema()
    await ensureColumns()

    const body = await req.json()
    const { id, action } = body

    if (action === 'verify') {
      // Try to find by id (UUID) or wd_id (string)
      let pickup: any[] = []
      try {
        pickup = await getSql()`SELECT * FROM pickups WHERE id = ${id}`
      } catch (e) {
        // Try as text
        pickup = await getSql()`SELECT * FROM pickups WHERE CAST(id AS TEXT) = ${String(id)}`
      }

      if (pickup.length === 0) {
        return Response.json({ success: false, error: 'Pickup not found with id: ' + id }, { status: 404 })
      }

      const pickupData = pickup[0]
      console.log('Found pickup:', pickupData)
      console.log('Current status:', pickupData.status)

      // Update pickup status to 'Selesai' (regardless of current status)
      await getSql()`
        UPDATE pickups
        SET status = 'Selesai',
            verified_by = 'admin',
            verified_at = NOW()
        WHERE id = ${pickupData.id}
      `

      // Update transaction status to 'Selesai' so balance gets calculated correctly
      await getSql()`
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
        const existing = await getSql()`SELECT * FROM user_balances WHERE user_id = ${pickupData.user_id}`
        console.log('Existing balance record:', existing)

        if (existing.length === 0) {
          await getSql()`
            INSERT INTO user_balances (user_id, balance, total_setoran, updated_at)
            VALUES (${pickupData.user_id}, ${rewardAmount}, ${rewardAmount}, NOW())
          `
          console.log('Inserted new balance record')
        } else {
          await getSql()`
            UPDATE user_balances
            SET balance = balance + ${rewardAmount},
                total_setoran = total_setoran + ${rewardAmount},
                updated_at = NOW()
            WHERE user_id = ${pickupData.user_id}
          `
          console.log('Updated existing balance record')
        }

        // Verify the update
        const verify = await getSql()`SELECT * FROM user_balances WHERE user_id = ${pickupData.user_id}`
        console.log('Balance after update:', verify)
      } catch (balanceError) {
        console.error('Balance update error:', balanceError)
      }

      // Add EXP to user (10 exp per kg)
      const expEarned = Math.round(parseFloat(pickupData.weight_kg || 0) * 10)
      const currentUser = await getSql()`SELECT * FROM users WHERE id = ${pickupData.user_id}`
      const currentExp = currentUser.length > 0 ? parseInt(currentUser[0].exp) || 0 : 0
      const newExp = currentExp + expEarned

      // Determine new tier based on exp
      let newTier = 'bronze'
      if (newExp >= 5000) newTier = 'gold'
      else if (newExp >= 1000) newTier = 'silver'

      // Update user exp and tier
      if (currentUser.length > 0) {
        await getSql()`
          UPDATE users
          SET exp = exp + ${expEarned},
              tier = ${newTier},
              updated_at = NOW()
          WHERE id = ${pickupData.user_id}
        `
      } else {
        // User doesn't exist, insert with required fields
        const userName = pickupData.user_name || 'User'
        await getSql()`
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
        await getSql()`
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
      const pickup = await getSql()`SELECT * FROM pickups WHERE id = ${id}`
      if (pickup.length === 0) {
        return Response.json({ success: false, error: 'Pickup not found' }, { status: 404 })
      }

      await getSql()`
        UPDATE pickups
        SET status = 'Ditolak',
            verified_by = 'admin',
            verified_at = NOW()
        WHERE id = ${id}
      `

      // Update transaction to rejected
      await getSql()`
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
