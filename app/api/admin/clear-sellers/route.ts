import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Clearing all entries from sellers table...')
    
    // First, let's check how many entries exist
    const { data: beforeCount, error: countError } = await supabaseAdmin
      .from('sellers')
      .select('id', { count: 'exact' })
    
    if (countError) {
      console.error('Error counting sellers:', countError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to count sellers: ' + countError.message 
      }, { status: 500 })
    }

    const totalCount = beforeCount?.length || 0
    console.log(`Found ${totalCount} sellers to delete`)
    
    if (totalCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Sellers table is already empty',
        deletedCount: 0 
      })
    }

    // Delete all sellers - much simpler approach
    const { error } = await supabaseAdmin
      .from('sellers')
      .delete()
      .gte('created_at', '1970-01-01') // Delete all records (everyone has a creation date after 1970)
    
    if (error) {
      console.error('Error deleting sellers:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete sellers: ' + error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ Successfully deleted ${totalCount} sellers`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleared all sellers table entries`,
      deletedCount: totalCount
    })
    
  } catch (error: any) {
    console.error('❌ Failed to clear sellers table:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 })
  }
}