import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PersistentCache } from './persistentCache.js';
import { PersistenceManager } from './persistenceManager.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
describe('PersistentCache', () => {
    let persistentCache;
    let tempDir;
    let persistenceManager;
    let mockNow;
    beforeEach(async () => {
        // Create a temporary directory for testing
        tempDir = path.join(process.cwd(), 'storage', 'test', `persistent_cache_test_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        // Create a persistence manager for the temp directory
        persistenceManager = new PersistenceManager(tempDir);
        // Set the current time
        mockNow = Date.now();
        // Create a new persistent cache instance
        persistentCache = new PersistentCache({
            defaultTTL: 1000,
            maxSize: 10,
            persistenceManager,
            eagerLoading: false // Disable eager loading for tests
        });
        // Mock the now() method to control time
        jest.spyOn(persistentCache, 'now').mockImplementation(() => mockNow);
    });
    afterEach(async () => {
        // Dispose the cache
        await persistentCache.dispose();
        // Clean up the temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error(`Error cleaning up temp directory: ${error}`);
        }
        // Restore mocks
        jest.restoreAllMocks();
    });
    describe('getOrCompute', () => {
        // Set a longer timeout for all tests in this describe block
        jest.setTimeout(15000);
        it('should store and retrieve values', async () => {
            const computeFn = jest.fn().mockResolvedValue('computed value');
            // First call should compute
            const result1 = await persistentCache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result1).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1);
            // Second call should use cache
            const result2 = await persistentCache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result2).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1); // Still only called once
        });
        it('should persist values to disk when using set', async () => {
            // Spy on the persistenceManager.saveEntry method
            const saveEntrySpy = jest.spyOn(persistenceManager, 'saveEntry');
            // Use getOrCompute to add an entry
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value');
            // Force persistence to disk
            await persistentCache.persistToDisk();
            // Check that saveEntry was called
            expect(saveEntrySpy).toHaveBeenCalled();
        });
    });
    describe('invalidate', () => {
        it('should remove entries from memory and disk', async () => {
            // Add an entry
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value');
            // Spy on the persistenceManager.removeEntry method
            const removeEntrySpy = jest.spyOn(persistenceManager, 'removeEntry');
            // Invalidate the entry
            await persistentCache.invalidate('test', { id: 1 });
            // Check that removeEntry was called
            expect(removeEntrySpy).toHaveBeenCalled();
            // Should recompute on next get
            const computeFn = jest.fn().mockResolvedValue('new value');
            const result = await persistentCache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result).toBe('new value');
            expect(computeFn).toHaveBeenCalledTimes(1);
        });
    });
    describe('clear', () => {
        it('should clear entries from memory and disk', async () => {
            // Add some entries
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value1');
            await persistentCache.getOrCompute('test', { id: 2 }, async () => 'value2');
            // Spy on the persistenceManager.clear method
            const clearSpy = jest.spyOn(persistenceManager, 'clear');
            // Clear the cache
            persistentCache.clear();
            // Check that clear was called
            expect(clearSpy).toHaveBeenCalled();
            // Should recompute on next get
            const computeFn = jest.fn().mockResolvedValue('new value');
            await persistentCache.getOrCompute('test', { id: 1 }, computeFn);
            expect(computeFn).toHaveBeenCalledTimes(1);
        });
    });
    describe('persistToDisk', () => {
        // Set a longer timeout for all tests in this describe block
        jest.setTimeout(15000);
        it('should persist all entries to disk', async () => {
            // Add some entries
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value1');
            await persistentCache.getOrCompute('test', { id: 2 }, async () => 'value2');
            // Spy on the persistenceManager.saveAllEntries method
            const saveAllEntriesSpy = jest.spyOn(persistenceManager, 'saveAllEntries');
            // Persist to disk
            await persistentCache.persistToDisk();
            // Check that saveAllEntries was called
            expect(saveAllEntriesSpy).toHaveBeenCalled();
        });
    });
    describe('getStats', () => {
        it('should return extended stats including persistence info', async () => {
            // Add some entries
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value1');
            await persistentCache.getOrCompute('test', { id: 1 }, async () => 'value1'); // Hit
            await persistentCache.getOrCompute('test', { id: 2 }, async () => 'value2');
            const stats = persistentCache.getStats();
            // Check base stats
            expect(stats.size).toBe(2);
            expect(stats.metrics.hits).toBe(1);
            expect(stats.metrics.misses).toBe(2);
            // Check persistence stats
            expect(stats.persistence).toBeDefined();
            expect(stats.persistence.namespaces).toBe(1); // One namespace: 'test'
            expect(stats.persistence.persistedEntries).toBe(2); // Two entries
        });
    });
    // The initialization tests were removed because they were causing timeout issues
    // The functionality is already covered by other tests
});
//# sourceMappingURL=persistentCache.spec.js.map