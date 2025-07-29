const { createClient } = require('@supabase/supabase-js');

async function testDatabase() {
  try {
    console.log('🗄️ Testing database connection and schema...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('✅ Supabase client initialized');
    
    // Test 1: Check if sellers table exists and has expected structure
    console.log('👤 Testing sellers table...');
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, email, preferences')
      .limit(1);
    
    if (sellersError) {
      console.log('❌ Sellers table error:', sellersError.message);
    } else {
      console.log('✅ Sellers table accessible, sample count:', sellers?.length || 0);
      if (sellers?.[0]) {
        console.log('📋 Sample seller structure:', Object.keys(sellers[0]));
      }
    }
    
    // Test 2: Check what tables actually exist
    console.log('📋 Checking available tables...');
    
    // Try common table names
    const tablesToCheck = ['products', 'recommendations', 'sales_data', 'notifications'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${tableName}' exists with columns:`, data?.[0] ? Object.keys(data[0]) : 'No data');
        } else {
          console.log(`❌ Table '${tableName}' error: ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ Table '${tableName}' does not exist or is inaccessible:`, e.message);
      }
    }
    
    // Test 3: Try to use sellers table for notification tracking instead
    console.log('📝 Testing notification fallback using sellers table...');
    
    if (sellers?.[0]) {
      const testSeller = sellers[0];
      console.log(`🎯 Using seller: ${testSeller.email} (ID: ${testSeller.id})`);
      console.log('📋 Seller preferences:', testSeller.preferences);
      
      // This shows what we'd need for notifications to work
      const hasEmail = !!testSeller.email;
      const hasWhatsapp = testSeller.preferences?.whatsapp_number;
      
      console.log('✅ Email capability:', hasEmail ? 'Available' : 'Missing');
      console.log('📱 WhatsApp capability:', hasWhatsapp ? 'Available' : 'Missing'); 
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Load environment
require('dotenv').config({ path: '.env.local' });
testDatabase();