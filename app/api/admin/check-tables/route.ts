import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  try {
    // Check what tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (error) {
      console.error('Error checking tables:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const existingTables = tables?.map(t => t.table_name) || []
    
    // Required tables for our app
    const requiredTables = [
      'sellers', 
      'products', 
      'sales_data', 
      'financial_performance',
      'fba_inventory',
      'market_intelligence',
      'recommendations'
    ]
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table))
    
    return NextResponse.json({
      success: true,
      existingTables,
      requiredTables,
      missingTables,
      needsMigration: missingTables.length > 0
    })
    
  } catch (error) {
    console.error('Table check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check tables',
      details: error.message 
    }, { status: 500 })
  }
}