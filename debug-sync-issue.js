const { supabaseAdmin } = require('./lib/database/connection');

async function debugSyncIssue() {
  try {
    console.log('🔍 Debugging SP-API to Supabase sync issue...\n');
    
    // Step 1: Test Supabase connection
    console.log('1. Testing Supabase connection...');
    const { data: sellers, error: sellersError } = await supabaseAdmin
      .from('sellers')
      .select('id, email, sp_api_credentials, onboarding_completed, status')
      .limit(5);
    
    if (sellersError) {
      console.error('❌ Supabase connection error:', sellersError);
      return;
    }
    
    console.log('✅ Supabase connected successfully');
    console.log(`📊 Found ${sellers?.length || 0} sellers\n`);
    
    if (!sellers || sellers.length === 0) {
      console.log('❌ No sellers found in database. Data sync can\'t work without seller records.');
      return;
    }
    
    // Step 2: Check seller credentials
    console.log('2. Checking seller credentials...');
    for (const seller of sellers) {
      console.log(`\nSeller: ${seller.email}`);
      console.log(`- ID: ${seller.id}`);
      console.log(`- Status: ${seller.status}`);
      console.log(`- Onboarding completed: ${seller.onboarding_completed}`);
      console.log(`- Has SP-API credentials: ${!!seller.sp_api_credentials}`);
      
      if (seller.sp_api_credentials) {
        const creds = seller.sp_api_credentials;
        console.log(`- Has clientId: ${!!creds.clientId}`);
        console.log(`- Has clientSecret: ${!!creds.clientSecret}`);
        console.log(`- Has refreshToken: ${!!creds.refreshToken}`);
        console.log(`- Needs auth: ${creds.needsAuth || false}`);
      }
    }
    
    // Step 3: Check existing products
    console.log('\n3. Checking existing products...');
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, asin, title, seller_id, created_at')
      .limit(5);
    
    if (productsError) {
      console.error('❌ Products query error:', productsError);
    } else {
      console.log(`✅ Found ${products?.length || 0} existing products`);
      if (products && products.length > 0) {
        console.log('Sample products:');
        products.forEach(p => {
          console.log(`- ${p.asin}: ${p.title} (${p.created_at})`);
        });
      }
    }
    
    // Step 4: Check fact_stream events
    console.log('\n4. Checking recent sync events...');
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('fact_stream')
      .select('event_type, event_category, timestamp, asin')
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (eventsError) {
      console.error('❌ Events query error:', eventsError);
    } else {
      console.log(`✅ Found ${events?.length || 0} recent events`);
      if (events && events.length > 0) {
        console.log('Recent sync events:');
        events.forEach(e => {
          console.log(`- ${e.timestamp}: ${e.event_type} (${e.event_category}) ${e.asin || ''}`);
        });
      }
    }
    
    // Step 5: Test UUID generation
    console.log('\n5. Testing UUID generation...');
    try {
      const { data: uuidTest, error: uuidError } = await supabaseAdmin
        .rpc('select', { sql: 'SELECT gen_random_uuid() as test_uuid' });
      
      if (uuidError) {
        console.error('❌ UUID generation error:', uuidError);
      } else {
        console.log('✅ UUID generation working');
      }
    } catch (uuidErr) {
      console.log('UUID test skipped (function not available)');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    const validSellers = sellers.filter(s => 
      s.status === 'active' && 
      s.onboarding_completed && 
      s.sp_api_credentials && 
      !s.sp_api_credentials.needsAuth
    );
    
    console.log(`- Sellers ready for sync: ${validSellers.length}/${sellers.length}`);
    console.log(`- Products in database: ${products?.length || 0}`);
    console.log(`- Recent sync events: ${events?.length || 0}`);
    
    if (validSellers.length === 0) {
      console.log('\n❌ ISSUE FOUND: No sellers are ready for sync.');
      console.log('   Check that sellers have completed onboarding and valid SP-API credentials.');
    } else if ((products?.length || 0) === 0 && (events?.length || 0) === 0) {
      console.log('\n❌ ISSUE FOUND: No products or sync events found.');
      console.log('   The sync process may not be running or may be failing silently.');
    } else {
      console.log('\n✅ Database structure looks good. Issue may be in sync logic.');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

debugSyncIssue().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });