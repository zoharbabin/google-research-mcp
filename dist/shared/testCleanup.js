/**
 * Test cleanup utilities to prevent resource leaks and lock file conflicts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
/**
 * Removes stale lock directories that may be left behind by tests
 */
export async function cleanupStaleLocks(basePath = 'storage') {
    try {
        const lockDirs = await findLockDirectories(basePath);
        for (const lockDir of lockDirs) {
            try {
                await fs.rmdir(lockDir, { recursive: true });
                console.log(`🧹 Cleaned up stale lock directory: ${lockDir}`);
            }
            catch (error) {
                console.warn(`⚠️ Could not remove lock directory ${lockDir}:`, error.message);
            }
        }
    }
    catch (error) {
        console.warn('⚠️ Error during lock cleanup:', error.message);
    }
}
/**
 * Recursively finds all .lock directories
 */
async function findLockDirectories(basePath) {
    const lockDirs = [];
    try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(basePath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.endsWith('.lock')) {
                    lockDirs.push(fullPath);
                }
                else {
                    // Recursively search subdirectories
                    const subLocks = await findLockDirectories(fullPath);
                    lockDirs.push(...subLocks);
                }
            }
        }
    }
    catch (error) {
        // Ignore errors for non-existent directories
        if (error.code !== 'ENOENT') {
            console.warn(`⚠️ Error reading directory ${basePath}:`, error.message);
        }
    }
    return lockDirs;
}
/**
 * Creates isolated test storage directories to prevent conflicts
 */
export function createTestStoragePaths(testSuiteName) {
    const testId = `${testSuiteName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const basePath = path.resolve('storage', 'test_temp', testId);
    return {
        cachePath: path.join(basePath, 'cache'),
        eventPath: path.join(basePath, 'events'),
        requestQueuesPath: path.join(basePath, 'queues')
    };
}
/**
 * Cleanup test storage directories
 */
export async function cleanupTestStorage(testPaths) {
    const basePath = path.dirname(testPaths.cachePath);
    try {
        await fs.rmdir(basePath, { recursive: true });
        console.log(`🧹 Cleaned up test storage: ${basePath}`);
    }
    catch (error) {
        console.warn(`⚠️ Could not cleanup test storage ${basePath}:`, error.message);
    }
}
/**
 * Force cleanup of all test temporary directories
 */
export async function cleanupAllTestStorage() {
    const testTempPath = path.resolve('storage', 'test_temp');
    try {
        await fs.rmdir(testTempPath, { recursive: true });
        console.log(`🧹 Cleaned up all test storage: ${testTempPath}`);
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`⚠️ Could not cleanup test storage ${testTempPath}:`, error.message);
        }
    }
}
/**
 * Enhanced cleanup for Jest tests - handles timers and async operations
 */
export async function cleanupJestTestEnvironment() {
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }
    // Give async cleanup operations time to complete
    await new Promise(resolve => setTimeout(resolve, 10)); // Reduced from 50ms to 10ms
}
/**
 * Check for and cleanup any remaining open file handles
 */
export async function cleanupOpenHandles() {
    try {
        // Clean up any remaining lock files
        await cleanupStaleLocks();
        // Clean up test storage
        await cleanupAllTestStorage();
        // Enhanced Jest environment cleanup
        await cleanupJestTestEnvironment();
    }
    catch (error) {
        console.warn('⚠️ Error during open handles cleanup:', error.message);
    }
}
//# sourceMappingURL=testCleanup.js.map