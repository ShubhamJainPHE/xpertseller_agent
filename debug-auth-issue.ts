import { supabaseAdmin } from './lib/database/connection'

async function debugAuth() {
  console.log('🔍 AGGRESSIVE AUTH DEBUG')
  console.log('========================\n')
  
  // Check if active_sessions table exists
  try {
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('active_sessions')
      .select('*')
      .order('login_time', { ascending: false })
      
    if (sessionsError) {
      console.log('❌ active_sessions table error:', sessionsError.message)
      if (sessionsError.code === '42P01') {
        console.log('🚨 CRITICAL: active_sessions table MISSING!')
        console.log('   This is why auth is failing after login')
      }
    } else {
      console.log(`📊 ACTIVE SESSIONS (${sessions?.length || 0} total):`)
      sessions?.forEach((session, i) => {
        console.log(`   ${i + 1}. ${session.email}`)
        console.log(`      Session ID: ${session.session_id}`)
        console.log(`      Login Time: ${session.login_time}`)
        console.log(`      Expires: ${session.expires_at}`)
        console.log('')
      })
    }
  } catch (error) {
    console.log('❌ Error checking sessions:', error)
  }
  
  // Check seller data
  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, last_login_at')
    .eq('email', 'shubhjjj66@gmail.com')
    .single()
    
  if (seller) {
    console.log('👤 SELLER DATA:')
    console.log(`   ID: ${seller.id}`)
    console.log(`   Amazon ID: ${seller.amazon_seller_id}`)
    console.log(`   Last Login: ${seller.last_login_at || 'Never'}`)
    console.log(`   Connected: ${seller.amazon_seller_id && seller.amazon_seller_id !== 'PENDING' ? 'YES' : 'NO'}`)
  }
  
  // Check all tables
  console.log('\n🗂️ CHECKING ALL TABLES:')
  const tables = ['sellers', 'products', 'orders', 'active_sessions']
  
  for (const table of tables) {
    try {
      const { count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      console.log(`   ${table}: ${count} records`)
    } catch (error: any) {
      console.log(`   ${table}: ERROR - ${error.message}`)
    }
  }
}

debugAuth().then(() => process.exit(0))