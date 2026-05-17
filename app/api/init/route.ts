import { neon } from '@neondatabase/serverless'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// No auth required - this is for initial setup
export async function GET(req: Request) {

  const results: string[] = []

  try {
    // 1. Create users table
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
    results.push('✓ users table created')

    // 2. Create waste_catalog table
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
    results.push('✓ waste_catalog table created')

    // 3. Seed waste_catalog data
    // Add missing columns if they don't exist in existing table
    try {
      await getSql()`ALTER TABLE waste_catalog ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`
    } catch (e) {}
    try {
      await getSql()`ALTER TABLE waste_catalog ADD COLUMN IF NOT EXISTS previous_price DECIMAL(12,2)`
    } catch (e) {}

    // Ensure primary key exists for ON CONFLICT to work
    try {
      await getSql()`ALTER TABLE waste_catalog ADD PRIMARY KEY (id)`
    } catch (e) {}

    // Delete existing data and reinsert fresh
    try {
      await getSql()`DELETE FROM waste_catalog`
    } catch (e) {}

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
    `
    results.push('✓ waste_catalog seeded (8 items)')

    // 4. Create tier_configs table (add missing columns if table exists but is incomplete)
    try {
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
    } catch (e) {}

    // Add missing columns to existing tier_configs table
    try {
      await getSql()`ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS description TEXT`
    } catch (e) {}
    try {
      await getSql()`ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`
    } catch (e) {}
    try {
      await getSql()`ALTER TABLE tier_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`
    } catch (e) {}
    try {
      await getSql()`ALTER TABLE tier_configs ALTER COLUMN description SET DEFAULT NULL`
    } catch (e) {}

    results.push('✓ tier_configs table created')

    // 5. Seed tier_configs data
    // Delete existing data first to avoid ON CONFLICT issues
    try {
      await getSql()`DELETE FROM tier_configs`
    } catch (e) {}

    await getSql()`
      INSERT INTO tier_configs (tier_name, min_weight_kg, max_weight_kg, bonus_percentage, description, is_active) VALUES
        ('bronze', 0, 49, 0, 'Bronze tier: 0-49kg', true),
        ('silver', 50, 199, 3, 'Silver tier: 50-199kg', true),
        ('gold', 200, 499, 5, 'Gold tier: 200-499kg', true),
        ('platinum', 500, NULL, 10, 'Platinum tier: 500+kg', true)
    `
    results.push('✓ tier_configs seeded (4 tiers)')

    // 6. Create pickups table
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
    results.push('✓ pickups table created')

    // 7. Create user_balances table
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
    results.push('✓ user_balances table created')

    // 8. Create transactions table
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
    results.push('✓ transactions table created')

    // 9. Create notifications table
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
    results.push('✓ notifications table created')

    // 10. Create user_badges table
    await getSql()`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        badge_id VARCHAR(50) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      )
    `
    results.push('✓ user_badges table created')

    // 11. Create withdrawals table
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
    results.push('✓ withdrawals table created')

    // 12. Create indexes
    await getSql()`CREATE INDEX IF NOT EXISTS idx_pickups_user_id ON pickups(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_users_exp ON users(exp DESC)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)`
    results.push('✓ indexes created')

    // Verify waste_catalog has data
    const wasteCheck = await getSql()`SELECT COUNT(*) as cnt FROM waste_catalog`
    results.push(`✓ Database check: ${wasteCheck[0].cnt} waste items in catalog`)

    return Response.json({
      success: true,
      message: 'All tables created and seeded!',
      results: results
    })

  } catch (error: any) {
    return Response.json({
      success: false,
      error: String(error),
      results: results
    }, { status: 500 })
  }
}