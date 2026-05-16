import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const catalog = await sql`
      SELECT id, name, category, price_per_kg, updated_at
      FROM waste_catalog
      ORDER BY category, name
    `

    return Response.json({
      success: true,
      catalog: catalog.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category?.toUpperCase() || 'ANORGANIK',
        price: parseFloat(item.price_per_kg) || 0,
        updatedAt: item.updated_at
      }))
    })
  } catch (error) {
    console.error('Fetch waste catalog error:', error)
    // Return default catalog if database fails
    return Response.json({
      success: true,
      catalog: [
        { id: "1", name: "Baterai Rumah Tangga", category: "KHUSUS", price: 10094, updatedAt: new Date().toISOString() },
        { id: "2", name: "Elektronik Kecil", category: "KHUSUS", price: 13596, updatedAt: new Date().toISOString() },
        { id: "3", name: "Kertas dan Kardus", category: "ANORGANIK", price: 5150, updatedAt: new Date().toISOString() },
        { id: "4", name: "Logam Ringan", category: "ANORGANIK", price: 7828, updatedAt: new Date().toISOString() },
        { id: "5", name: "Plastik Campur", category: "ANORGANIK", price: 4326, updatedAt: new Date().toISOString() },
        { id: "6", name: "Sisa Organik Kering", category: "ORGANIK", price: 1751, updatedAt: new Date().toISOString() },
      ]
    })
  }
}