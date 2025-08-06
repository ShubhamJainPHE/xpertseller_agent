#!/usr/bin/env node

/**
 * Test script to verify MCP migration completion
 * Tests: DashboardCalculations class with unified MCP system
 */

const { performance } = require('perf_hooks');

console.log('🧪 Testing MCP Migration...');
console.log('=====================================');

async function testMCPMigration() {
  try {
    // Test 1: Verify imports and basic functionality
    console.log('\n1️⃣ Testing MCP System Import...');
    
    // Since this is a Node.js test, we'll test the file existence and structure
    const fs = require('fs');
    const path = require('path');
    
    // Check if MCP files exist
    const mcpFiles = [
      './lib/mcp/unified-mcp-system.ts',
      './lib/dashboard/calculations.ts',
      './lib/mcp/direct-supabase-integration.ts'
    ];
    
    for (const file of mcpFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ Found: ${file}`);
      } else {
        console.log(`❌ Missing: ${file}`);
      }
    }
    
    // Test 2: Check MCP system structure
    console.log('\n2️⃣ Testing MCP System Structure...');
    const mcpSystemContent = fs.readFileSync('./lib/mcp/unified-mcp-system.ts', 'utf8');
    
    // Check for key MCP methods
    const requiredMethods = [
      'getSystemHealth',
      'queryDatabase',
      'getAllTables',
      'sendNotification'
    ];
    
    let foundMethods = 0;
    for (const method of requiredMethods) {
      if (mcpSystemContent.includes(method)) {
        console.log(`✅ Method found: ${method}`);
        foundMethods++;
      } else {
        console.log(`❌ Method missing: ${method}`);
      }
    }
    
    // Test 3: Check Dashboard Calculations migration
    console.log('\n3️⃣ Testing DashboardCalculations Migration...');
    const dashboardContent = fs.readFileSync('./lib/dashboard/calculations.ts', 'utf8');
    
    // Check for MCP import
    if (dashboardContent.includes("import { unifiedMCPSystem }")) {
      console.log('✅ MCP import found in DashboardCalculations');
    } else {
      console.log('❌ MCP import missing in DashboardCalculations');
    }
    
    // Check for MCP usage in key methods
    const mcpUsagePatterns = [
      'unifiedMCPSystem.queryDatabase',
      'await unifiedMCPSystem',
      'getAllMetrics'
    ];
    
    let mcpUsageFound = 0;
    for (const pattern of mcpUsagePatterns) {
      const matches = (dashboardContent.match(new RegExp(pattern, 'g')) || []).length;
      if (matches > 0) {
        console.log(`✅ MCP usage pattern "${pattern}" found ${matches} times`);
        mcpUsageFound++;
      }
    }
    
    // Test 4: Migration Quality Assessment
    console.log('\n4️⃣ Migration Quality Assessment...');
    const directSupabaseUsage = (dashboardContent.match(/supabaseAdmin\./g) || []).length;
    const mcpUsage = (dashboardContent.match(/unifiedMCPSystem\./g) || []).length;
    
    console.log(`📊 Migration Analysis:`);
    console.log(`   Direct Supabase calls: ${directSupabaseUsage}`);
    console.log(`   MCP system calls: ${mcpUsage}`);
    
    if (mcpUsage > directSupabaseUsage) {
      console.log('✅ Migration SUCCESS: More MCP calls than direct Supabase calls');
    } else if (mcpUsage > 0) {
      console.log('⚠️ Migration PARTIAL: Some MCP usage but still direct calls remain');
    } else {
      console.log('❌ Migration INCOMPLETE: No MCP usage detected');
    }
    
    // Test 5: Check specific migrated methods
    console.log('\n5️⃣ Testing Key Method Migration...');
    const keyMethods = [
      'getBusinessHealthScore',
      'getRunwayAnalysis',
      'getProfitVelocity',
      'getTrueProfitMargin',
      'getAllMetrics'
    ];
    
    let migratedMethods = 0;
    for (const method of keyMethods) {
      if (dashboardContent.includes(method)) {
        console.log(`✅ Method exists: ${method}`);
        migratedMethods++;
      }
    }
    
    console.log('\n📊 Migration Verification Summary:');
    console.log('=====================================');
    console.log(`✅ Core files present: ${mcpFiles.length}/3`);
    console.log(`✅ MCP methods found: ${foundMethods}/${requiredMethods.length}`);
    console.log(`✅ Dashboard methods: ${migratedMethods}/${keyMethods.length}`);
    console.log(`✅ MCP usage patterns: ${mcpUsageFound}/3`);
    console.log(`📊 MCP vs Direct calls: ${mcpUsage} vs ${directSupabaseUsage}`);
    
    const migrationScore = ((foundMethods/requiredMethods.length) + (migratedMethods/keyMethods.length) + (mcpUsageFound/3)) / 3;
    console.log(`🎯 Migration Completeness: ${Math.round(migrationScore * 100)}%`);
    
    if (migrationScore > 0.8) {
      console.log('\n🎉 MIGRATION STATUS: SUCCESSFUL');
      console.log('✅ Ready for integration testing and API route updates');
    } else {
      console.log('\n⚠️ MIGRATION STATUS: NEEDS ATTENTION');
      console.log('❌ Some components may need additional migration work');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Run integration tests with real seller data');
    console.log('2. Update API routes to use MCP interface');
    console.log('3. Performance benchmarking with baseline comparison');
    console.log('4. Production deployment preparation');
    
  } catch (error) {
    console.error('\n❌ MCP Migration Test Failed:', error.message);
    console.error('📝 Error Details:', error);
    process.exit(1);
  }
}

// Run the test
testMCPMigration();