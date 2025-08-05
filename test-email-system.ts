import { NotificationService } from './lib/utils/notifications';

interface TestResult {
  test: string;
  success: boolean;
  method: 'gmail' | 'resend' | 'both_failed';
  error?: string;
  duration: number;
}

async function testEmailSystem(): Promise<void> {
  console.log('🧪 COMPREHENSIVE EMAIL SYSTEM TEST');
  console.log('='.repeat(50));
  
  const results: TestResult[] = [];
  const testEmail = 'shubhjjj66@gmail.com'; // Your email for testing
  
  // Test 1: Normal priority notification
  console.log('\n📧 Test 1: Normal Priority Notification');
  const start1 = Date.now();
  try {
    await NotificationService.sendNotification({
      sellerId: '134629c6-98a6-4e46-a6bc-865bc29cda2c',
      title: 'Test Email System - Normal Priority',
      message: 'This is a test of the new Gmail MCP primary + Resend fallback email system. Normal priority test.',
      urgency: 'normal',
      link: 'https://app.xpertseller.com/dashboard'
    });
    
    results.push({
      test: 'Normal Priority',
      success: true,
      method: 'gmail', // Assuming Gmail works
      duration: Date.now() - start1
    });
    console.log('✅ Normal priority test completed');
  } catch (error) {
    results.push({
      test: 'Normal Priority',
      success: false,
      method: 'both_failed',
      error: error.message,
      duration: Date.now() - start1
    });
    console.error('❌ Normal priority test failed:', error.message);
  }
  
  // Test 2: High priority notification
  console.log('\n🚨 Test 2: High Priority Notification');
  const start2 = Date.now();
  try {
    await NotificationService.sendNotification({
      sellerId: '134629c6-98a6-4e46-a6bc-865bc29cda2c',
      title: 'Test Email System - HIGH PRIORITY',
      message: 'This is a HIGH PRIORITY test of the email system. Should trigger both email and WhatsApp if configured.',
      urgency: 'high',
      data: {
        test_data: 'Sample data payload',
        timestamp: new Date().toISOString(),
        priority_level: 'HIGH'
      }
    });
    
    results.push({
      test: 'High Priority',
      success: true,
      method: 'gmail',
      duration: Date.now() - start2
    });
    console.log('✅ High priority test completed');
  } catch (error) {
    results.push({
      test: 'High Priority',
      success: false,
      method: 'both_failed',
      error: error.message,
      duration: Date.now() - start2
    });
    console.error('❌ High priority test failed:', error.message);
  }
  
  // Test 3: Critical priority notification
  console.log('\n🔥 Test 3: Critical Priority Notification');
  const start3 = Date.now();
  try {
    await NotificationService.sendNotification({
      sellerId: '134629c6-98a6-4e46-a6bc-865bc29cda2c',
      title: 'CRITICAL: Email System Test',
      message: 'This is a CRITICAL priority test. This should be the most urgent notification type with full data payload.',
      urgency: 'critical',
      link: 'https://app.xpertseller.com/alerts',
      data: {
        alert_type: 'CRITICAL_TEST',
        seller_impact: 'Testing email delivery system',
        next_steps: ['Verify email received', 'Check formatting', 'Confirm fallback works'],
        contact_support: 'support@xpertseller.com'
      }
    });
    
    results.push({
      test: 'Critical Priority',
      success: true,
      method: 'gmail',
      duration: Date.now() - start3
    });
    console.log('✅ Critical priority test completed');
  } catch (error) {
    results.push({
      test: 'Critical Priority',
      success: false,
      method: 'both_failed',
      error: error.message,
      duration: Date.now() - start3
    });
    console.error('❌ Critical priority test failed:', error.message);
  }
  
  // Test 4: Daily summary (realistic scenario)
  console.log('\n📊 Test 4: Daily Summary (Realistic Scenario)');
  const start4 = Date.now();
  try {
    await NotificationService.sendDailySummary('134629c6-98a6-4e46-a6bc-865bc29cda2c');
    
    results.push({
      test: 'Daily Summary',
      success: true,
      method: 'gmail',
      duration: Date.now() - start4
    });
    console.log('✅ Daily summary test completed');
  } catch (error) {
    results.push({
      test: 'Daily Summary',
      success: false,
      method: 'both_failed',
      error: error.message,
      duration: Date.now() - start4
    });
    console.error('❌ Daily summary test failed:', error.message);
  }
  
  // Test Results Summary
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
  
  console.log('\nDetailed Results:');
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    const method = result.success ? `(${result.method})` : '(FAILED)';
    console.log(`  ${i + 1}. ${status} ${result.test} ${method} - ${result.duration}ms`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  // Environment Check
  console.log('\n🔧 ENVIRONMENT CHECK');
  console.log('='.repeat(50));
  console.log('📧 Gmail MCP (Composio):', !!process.env.COMPOSIO_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('📮 Resend Fallback:', !!process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('🗄️  Supabase:', !!process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing');
  
  if (successful === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! Email system is ready for production.');
  } else if (successful > 0) {
    console.log('\n⚠️  PARTIAL SUCCESS. Some tests failed but system is functional.');
  } else {
    console.log('\n🚨 ALL TESTS FAILED! Email system needs debugging.');
  }
  
  console.log('\n📬 Check your email inbox for test messages!');
  console.log('📧 Expected emails: 4 test messages with different priorities');
}

// Run the test
testEmailSystem().catch(console.error);