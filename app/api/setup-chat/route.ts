import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create chat_rooms table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        last_message TEXT,
        last_message_at TIMESTAMP DEFAULT NOW(),
        unread_admin INTEGER DEFAULT 0,
        unread_user INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create chat_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_role VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at)`

    return Response.json({ success: true, message: 'Chat tables created successfully!' })
  } catch (error) {
    console.error('Setup error:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ message: 'Chat setup API - POST to create tables' })
}