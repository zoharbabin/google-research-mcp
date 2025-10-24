/**
 * Removes stale lock directories that may be left behind by tests
 */
export declare function cleanupStaleLocks(basePath?: string): Promise<void>;
/**
 * Creates isolated test storage directories to prevent conflicts
 */
export declare function createTestStoragePaths(testSuiteName: string): {
    cachePath: string;
    eventPath: string;
    requestQueuesPath: string;
};
/**
 * Cleanup test storage directories
 */
export declare function cleanupTestStorage(testPaths: {
    cachePath: string;
    eventPath: string;
    requestQueuesPath: string;
}): Promise<void>;
/**
 * Force cleanup of all test temporary directories
 */
export declare function cleanupAllTestStorage(): Promise<void>;
/**
 * Enhanced cleanup for Jest tests - handles timers and async operations
 */
export declare function cleanupJestTestEnvironment(): Promise<void>;
/**
 * Check for and cleanup any remaining open file handles
 */
export declare function cleanupOpenHandles(): Promise<void>;
//# sourceMappingURL=testCleanup.d.ts.map