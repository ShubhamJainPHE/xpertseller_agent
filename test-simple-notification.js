// Test just the database part of notifications without external APIs
const { createClient } = require('@supabase/supabase-js');

async function testSimpleNotification() {
  try {
    console.log('📧 Testing notification system (database only)...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const sellerId = 'e25aabe7-c9ff-4987-a50b-0120747071dc';
    
    // Get seller info
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, preferences')
      .eq('id', sellerId)
      .single();
      
    console.log('✅ Seller found:', seller?.email);
    console.log('📋 Notification channels:', seller?.preferences?.notification_channels);
    
    // Try to log a test notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        seller_id: sellerId,
        title: 'Test Notification',
        message: 'Testing the notification system',
        urgency: 'normal',
        data: { test: true },
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .select();
    
    if (error) {
      console.log('❌ Notification logging failed:', error.message);
      
      // Maybe the notifications table has different schema, let's check
      console.log('🔍 Checking notifications table schema...');
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);
      
      if (existingNotifs) {
        console.log('📋 Existing notifications structure:', existingNotifs[0] ? Object.keys(existingNotifs[0]) : 'empty table');
      }
    } else {
      console.log('✅ Notification logged successfully:', notification?.[0]?.id);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

require('dotenv').config({ path: '.env.local' });
testSimpleNotification();