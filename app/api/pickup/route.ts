import { neon } from '@neondatabase/serverless'
import { z } from 'zod'

const ADMIN_SECRET = 'reocycle_admin_secret_2024_secure'

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
};

const wasteTypePrices: Record<string, { name: string; price: number }> = {
  baterai: { name: "Baterai Rumah Tangga", price: 10094 },
  elektronik: { name: "Elektronik Kecil", price: 13596 },
  kardus: { name: "Kertas dan Kardus", price: 5150 },
  logam: { name: "Logam Ringan", price: 7828 },
  plastik: { name: "Plastik Campur", price: 4326 },
  organik: { name: "Sisa Organik Kering", price: 1751 },
}

const schema = z.object({
  wasteType: z.string().min(1),
  wasteName: z.string().optional(),
  weight: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  address: z.string().min(10),
  notes: z.string().optional(),
  userId: z.string().min(1),
  userName: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Validate weight on server side
    const weight = parseFloat(data.weight)
    if (isNaN(weight) || weight <= 0 || weight > 1000) {
      return Response.json({
        success: false,
        error: 'Estimasi berat tidak valid. Minimal 0.1 kg, maksimal 1.000 kg.'
      }, { status: 400 })
    }

    // Get waste type info
    const wasteInfo = wasteTypePrices[data.wasteType] || { name: data.wasteName || data.wasteType, price: 5000 }
    const safeWeight = Math.min(Math.max(weight, 0), 1000)
    const reward = safeWeight * wasteInfo.price

    const result = await getSql()`
      INSERT INTO pickups (
        user_id,
        user_name,
        waste_type,
        waste_name,
        weight_kg,
        pickup_date,
        time_slot,
        address,
        notes,
        status,
        estimated_reward,
        created_at
      ) VALUES (
        ${data.userId},
        ${data.userName || 'User'},
        ${data.wasteType},
        ${wasteInfo.name},
        ${parseFloat(data.weight)},
        ${data.date},
        ${data.timeSlot},
        ${data.address},
        ${data.notes || ''},
        'pending',
        ${reward},
        NOW()
      )
      RETURNING *
    `

    // Also create a transaction record
    try {
      await getSql()`
        INSERT INTO transactions (
          user_id,
          user_name,
          type,
          description,
          amount,
          reward,
          status,
          reference_id,
          created_at
        ) VALUES (
          ${data.userId},
          ${data.userName || 'User'},
          'setoran',
          ${`Setor ${wasteInfo.name} - ${data.weight} kg`},
          ${reward},
          ${reward},
          'pending',
          ${result[0].id},
          NOW()
        )
      `
    } catch (txError) {
      console.error('Failed to create transaction:', txError)
    }

    return Response.json({
      success: true,
      message: 'Pickup berhasil diajukan!',
      data: result[0]
    })
  } catch (error) {
    console.error('Pickup API error:', error)
    return Response.json({
      success: false,
      error: error instanceof z.ZodError ? error.issues : 'Terjadi kesalahan'
    }, { status: 400 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const pickups = await getSql()`
      SELECT * FROM pickups
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    return Response.json(pickups)
  } catch (error) {
    console.error('Fetch pickups error:', error)
    return Response.json({ error: 'Failed to fetch pickups' }, { status: 500 })
  }
}
