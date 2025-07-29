const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTables() {
  console.log('📊 Checking existing database structure...');
  
  // Check sellers table
  const { data: sellers } = await supabase.from('sellers').select('*').limit(1);
  console.log('✅ Sellers table:', sellers ? 'EXISTS' : 'MISSING');
  
  // Check if products table exists
  const { data: products, error: prodError } = await supabase.from('products').select('*').limit(1);
  console.log('📦 Products table:', !prodError ? 'EXISTS' : 'MISSING');
  if (prodError) console.log('   Error:', prodError.message);
  
  // Check if sales_data exists  
  const { data: sales, error: salesError } = await supabase.from('sales_data').select('*').limit(1);
  console.log('💰 Sales_data table:', !salesError ? 'EXISTS' : 'MISSING');
  if (salesError) console.log('   Error:', salesError.message);
  
  // Check if advertising_data exists
  const { data: ads, error: adsError } = await supabase.from('advertising_data').select('*').limit(1);
  console.log('📈 Advertising_data table:', !adsError ? 'EXISTS' : 'MISSING');
  if (adsError) console.log('   Error:', adsError.message);
  
  // Check fact_stream (this should exist)
  const { data: facts, error: factError } = await supabase.from('fact_stream').select('*').limit(1);
  console.log('📋 Fact_stream table:', !factError ? 'EXISTS' : 'MISSING');
  if (factError) console.log('   Error:', factError.message);
  
  // Check recommendations
  const { data: recs, error: recError } = await supabase.from('recommendations').select('*').limit(1);
  console.log('💡 Recommendations table:', !recError ? 'EXISTS' : 'MISSING');
  if (recError) console.log('   Error:', recError.message);
}

checkTables().catch(console.error);