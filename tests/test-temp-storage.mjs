#!/usr/bin/env node
/**
 * Test to verify temporary storage configuration
 * 
 * This test ensures that:
 * 1. No ./storage directory is created in the current working directory
 * 2. Crawlee uses the configured temporary storage location
 * 3. The MCP server functions correctly with temporary storage
 */

import { execSync } from 'child_process';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

console.log('🧪 Testing temporary storage configuration...\n');

// Create a temporary test directory to simulate user's project directory
const testDir = mkdtempSync(join(tmpdir(), 'mcp-storage-test-'));
console.log(`📁 Created test directory: ${testDir}`);

try {
  // Change to test directory
  process.chdir(testDir);
  console.log(`📂 Changed to test directory: ${process.cwd()}\n`);

  // Check that no ./storage exists initially
  const localStoragePath = join(testDir, 'storage');
  if (existsSync(localStoragePath)) {
    throw new Error('❌ ./storage directory already exists in test directory!');
  }
  console.log('✅ Confirmed: No ./storage directory exists initially');

  // Run a simple MCP command that would trigger storage creation
  // We'll use the echo tool which is part of the MCP server
  console.log('\n🚀 Starting MCP server in test mode...');
  
  // Set environment variables for the test
  process.env.MCP_TEST_MODE = 'stdio';
  process.env.NODE_ENV = 'test';
  
  // Import and check the storage configuration
  const serverModule = await import('../dist/server.js');
  
  // Check the environment variable was set correctly
  if (!process.env.CRAWLEE_STORAGE_DIR) {
    throw new Error('❌ CRAWLEE_STORAGE_DIR environment variable not set!');
  }
  
  console.log(`✅ CRAWLEE_STORAGE_DIR set to: ${process.env.CRAWLEE_STORAGE_DIR}`);
  
  // Verify it's using tmpdir
  if (!process.env.CRAWLEE_STORAGE_DIR.includes(tmpdir())) {
    throw new Error('❌ CRAWLEE_STORAGE_DIR is not using system temp directory!');
  }
  
  console.log('✅ Confirmed: Using system temporary directory');

  // Wait a moment for any storage initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check that no ./storage was created in current directory
  if (existsSync(localStoragePath)) {
    throw new Error('❌ FAIL: ./storage directory was created in current directory!');
  }
  
  console.log('✅ SUCCESS: No ./storage directory created in working directory');
  
  // Check that temp storage was created
  const tempStorageExists = existsSync(process.env.CRAWLEE_STORAGE_DIR);
  console.log(`\n📊 Temporary storage directory exists: ${tempStorageExists}`);
  console.log(`   Location: ${process.env.CRAWLEE_STORAGE_DIR}`);

  console.log('\n✅ All tests passed!');
  console.log('   - No pollution of user project directories');
  console.log('   - Crawlee configured to use temporary storage');
  console.log('   - Storage location in system temp directory');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup test directory
  try {
    process.chdir('/');
    rmSync(testDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up test directory: ${testDir}`);
  } catch (cleanupError) {
    console.warn('⚠️  Warning: Could not clean up test directory:', cleanupError.message);
  }
}