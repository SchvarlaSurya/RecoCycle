import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create pickups table
    await sql`
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

    // Add user_name column if not exists
    try {
      await sql`ALTER TABLE pickups ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'User'`
    } catch (e) {
      // Column might already exist
    }

    // Create withdrawals table
    await sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        method VARCHAR(50) NOT NULL,
        method_name VARCHAR(255) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        verified_by VARCHAR(255),
        verified_at TIMESTAMP,
        rejected_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Add missing columns to existing withdrawals table (for databases created with old schema)
    try {
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'User'`
    } catch (e) { /* column may already exist */ }

    try {
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS method_name VARCHAR(255)`
    } catch (e) { /* column may already exist */ }

    try {
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255)`
    } catch (e) { /* column may already exist */ }

    try {
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`
    } catch (e) { /* column may already exist */ }

    try {
      await sql`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejected_reason TEXT`
    } catch (e) { /* column may already exist */ }

    // Create user_balances table
    await sql`
      CREATE TABLE IF NOT EXISTS user_balances (
        user_id VARCHAR(255) PRIMARY KEY,
        balance DECIMAL(12,2) DEFAULT 0,
        total_setoran DECIMAL(12,2) DEFAULT 0,
        total_reward DECIMAL(12,2) DEFAULT 0,
        total_penarikan DECIMAL(12,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create transactions table
    await sql`
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

    // Create users table
    await sql`
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

    // Add exp column if not exists (for existing tables)
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0`
    } catch (e) {
      // Column might already exist
    }

    // Create notifications table
    await sql`
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

    // Create user_addresses table
    await sql`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        latitude DECIMAL(10,8) DEFAULT 0,
        longitude DECIMAL(11,8) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_pickups_user_id ON pickups(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_exp ON users(exp DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)`

    return Response.json({
      success: true,
      message: 'All database tables created successfully!',
      tables: ['pickups', 'withdrawals', 'user_balances', 'transactions', 'users', 'notifications']
    })
  } catch (error) {
    console.error('Setup error:', error)
    return Response.json({
      success: false,
      error: String(error),
      hint: 'Tables may already exist. Check database.'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check existing tables
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `
    return Response.json({
      existingTables: tables,
      message: 'Database schema info'
    })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}