import { SecureSessionManager } from './lib/auth/secure-session.js';

async function testLoginFlow() {
  try {
    console.log('🧪 Testing login flow locally...');
    
    // Step 1: Create a session (simulate successful OTP)
    console.log('\n1️⃣ Creating session...');
    const session = await SecureSessionManager.createSession(
      '134629c6-98a6-4e46-a6bc-865bc29cda2c', // test seller ID
      'test@example.com'
    );
    
    console.log('✅ Session created:');
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Access token length: ${session.accessToken.length}`);
    console.log(`   Access token preview: ${session.accessToken.substring(0, 50)}...`);
    
    // Step 2: Create cookies
    console.log('\n2️⃣ Creating cookies...');
    const cookies = SecureSessionManager.createSecureCookies(
      session.accessToken,
      session.refreshToken
    );
    
    console.log('✅ Cookies created:');
    console.log(`   Access cookie: ${cookies.accessCookie}`);
    console.log(`   Refresh cookie: ${cookies.refreshCookie}`);
    
    // Step 3: Test validation with the token
    console.log('\n3️⃣ Testing token validation...');
    const validation = await SecureSessionManager.validateSession(session.accessToken);
    
    console.log('✅ Validation result:');
    console.log(`   Valid: ${validation.valid}`);
    console.log(`   Error: ${validation.error || 'None'}`);
    console.log(`   Session data: ${validation.sessionData ? 'Present' : 'Missing'}`);
    
    if (validation.sessionData) {
      console.log(`   Email: ${validation.sessionData.email}`);
      console.log(`   Seller ID: ${validation.sessionData.sellerId}`);
    }
    
    // Step 4: Clean up
    console.log('\n4️⃣ Cleaning up test session...');
    await SecureSessionManager.invalidateSession(session.sessionId);
    console.log('✅ Test session invalidated');
    
    console.log('\n🎉 Login flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Login flow test failed:', error);
  }
}

testLoginFlow();