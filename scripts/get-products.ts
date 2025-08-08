import { supabaseAdmin } from '../lib/database/connection'

async function getSellerProducts() {
  console.log('🔍 Checking seller and products data...')
  
  // First get seller info
  const { data: sellers } = await supabaseAdmin
    .from('sellers')
    .select('id, email, amazon_seller_id, marketplace_ids')
    
  if (!sellers || sellers.length === 0) {
    console.log('❌ No sellers found in database')
    return
  }
  
  console.log('👤 Found sellers:')
  sellers.forEach((seller, index) => {
    console.log(`  ${index + 1}. ${seller.email} (${seller.amazon_seller_id})`)
    console.log(`     Marketplace: ${seller.marketplace_ids}`)
  })
  
  // Get all products
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('❌ Error fetching products:', error)
    return
  }
  
  console.log(`\n📦 Total products found: ${products?.length || 0}`)
  
  if (products && products.length > 0) {
    console.log('\n📋 PRODUCT LIST:')
    console.log('=' .repeat(80))
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.title || 'Untitled Product'}`)
      console.log(`   ASIN: ${product.asin || 'N/A'}`)
      console.log(`   SKU: ${product.sku || 'N/A'}`)
      console.log(`   Price: ${product.price || 'N/A'}`)
      console.log(`   Status: ${product.status || 'N/A'}`)
      console.log(`   Created: ${product.created_at}`)
      if (product.description) {
        console.log(`   Description: ${product.description.substring(0, 100)}...`)
      }
    })
  } else {
    console.log('\n📭 No products found in database')
  }
}

getSellerProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })