import { neon } from '@neondatabase/serverless'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function POST() {
  try {
    // Create pickups table
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

    // Add user_name column if not exists
    try {
      await getSql()`ALTER TABLE pickups ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'User'`
    } catch (e) {
      // Column might already exist
    }

    // Create withdrawals table
    await getSql()`
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
      await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'User'`
    } catch (e) { /* column may already exist */ }

    try {
      await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS method_name VARCHAR(255)`
    } catch (e) { /* column may already exist */ }

    try {
      await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255)`
    } catch (e) { /* column may already exist */ }

    try {
      await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`
    } catch (e) { /* column may already exist */ }

    try {
      await getSql()`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS rejected_reason TEXT`
    } catch (e) { /* column may already exist */ }

    // Create user_balances table
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

    // Create transactions table
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

    // Create users table
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

    // Add exp column if not exists (for existing tables)
    try {
      await getSql()`ALTER TABLE users ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0`
    } catch (e) {
      // Column might already exist
    }

    // Create notifications table
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

    // Create user_addresses table
    await getSql()`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        latitude DECIMAL(10,8) DEFAULT 0,
        longitude DECIMAL(11,8) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create waste_catalog table
    await getSql()`
      CREATE TABLE IF NOT EXISTS waste_catalog (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price_per_kg DECIMAL(12,2) NOT NULL,
        previous_price DECIMAL(12,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create tier_configs table
    await getSql()`
      CREATE TABLE IF NOT EXISTS tier_configs (
        id SERIAL PRIMARY KEY,
        tier_name VARCHAR(50) UNIQUE NOT NULL,
        min_weight_kg DECIMAL(12,2) NOT NULL,
        max_weight_kg DECIMAL(12,2),
        bonus_percentage DECIMAL(5,2) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Seed waste_catalog data
    await getSql()`
      INSERT INTO waste_catalog (id, name, category, price_per_kg, is_active) VALUES
        ('plastic', 'Plastik Campur', 'anorganik', 4200, true),
        ('paper', 'Kertas dan Kardus', 'anorganik', 2800, true),
        ('metal', 'Logam Ringan', 'anorganik', 7600, true),
        ('organic', 'Sisa Organik Kering', 'organik', 1700, true),
        ('battery', 'Baterai Rumah Tangga', 'khusus', 9800, true),
        ('electronics', 'Elektronik Kecil', 'khusus', 13200, true),
        ('glass', 'Botol Kaca', 'anorganik', 3500, true),
        ('oil', 'Minyak Jelantah', 'organik', 4000, true)
      ON CONFLICT (id) DO NOTHING
    `

    // Seed tier_configs data
    await getSql()`
      INSERT INTO tier_configs (tier_name, min_weight_kg, max_weight_kg, bonus_percentage, description, is_active) VALUES
        ('bronze', 0, 49, 0, 'Bronze tier: 0-49kg', true),
        ('silver', 50, 199, 3, 'Silver tier: 50-199kg', true),
        ('gold', 200, 499, 5, 'Gold tier: 200-499kg', true),
        ('platinum', 500, NULL, 10, 'Platinum tier: 500+kg', true)
      ON CONFLICT (tier_name) DO NOTHING
    `

    // Create indexes
    await getSql()`CREATE INDEX IF NOT EXISTS idx_pickups_user_id ON pickups(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_users_exp ON users(exp DESC)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)`

    return Response.json({
      success: true,
      message: 'All database tables created successfully!',
      tables: ['pickups', 'withdrawals', 'user_balances', 'transactions', 'users', 'notifications', 'waste_catalog', 'tier_configs', 'user_addresses']
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
    const tables = await getSql()`
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
