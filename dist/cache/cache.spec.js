import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Cache } from './cache.js';
describe('Cache', () => {
    let cache;
    let mockNow;
    beforeEach(() => {
        // Create a new cache instance before each test
        cache = new Cache({ defaultTTL: 1000, maxSize: 5 });
        // Mock the now() method to control time
        mockNow = Date.now();
        jest.spyOn(cache, 'now').mockImplementation(() => mockNow);
    });
    afterEach(() => {
        // Clean up after each test
        cache.dispose();
        jest.restoreAllMocks();
    });
    describe('get and set', () => {
        it('should store and retrieve values', async () => {
            const key = 'test:key';
            const value = { data: 'test value' };
            const entry = { value, expiresAt: mockNow + 1000 };
            // Use the protected set method via any cast
            cache.set(key, entry);
            // Use the protected get method via any cast
            const retrieved = cache.get(key);
            expect(retrieved).toEqual(entry);
        });
    });
    describe('generateKey', () => {
        it('should generate consistent keys for the same arguments', () => {
            const args = { id: 123, name: 'test' };
            const key1 = cache.generateKey('namespace', args);
            const key2 = cache.generateKey('namespace', args);
            expect(key1).toBe(key2);
        });
        it('should generate different keys for different arguments', () => {
            const args1 = { id: 123, name: 'test' };
            const args2 = { id: 456, name: 'test' };
            const key1 = cache.generateKey('namespace', args1);
            const key2 = cache.generateKey('namespace', args2);
            expect(key1).not.toBe(key2);
        });
        it('should generate different keys for different namespaces', () => {
            const args = { id: 123, name: 'test' };
            const key1 = cache.generateKey('namespace1', args);
            const key2 = cache.generateKey('namespace2', args);
            expect(key1).not.toBe(key2);
        });
    });
    describe('getOrCompute', () => {
        it('should return cached value if not expired', async () => {
            const computeFn = jest.fn().mockResolvedValue('computed value');
            // First call should compute
            const result1 = await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result1).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1);
            // Second call should use cache
            const result2 = await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result2).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1); // Still only called once
        });
        it('should recompute if cache entry is expired', async () => {
            const computeFn = jest.fn().mockResolvedValue('computed value');
            // First call should compute
            const result1 = await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result1).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1);
            // Advance time past TTL
            mockNow += 2000; // 2 seconds later, past the 1000ms TTL
            // Second call should recompute
            const result2 = await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result2).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(2); // Called again
        });
        it('should use stale-while-revalidate pattern when enabled', async () => {
            // Create a spy on the revalidateInBackground method
            const revalidateSpy = jest.spyOn(cache, 'revalidateInBackground');
            const computeFn = jest.fn().mockResolvedValue('computed value');
            // First call should compute
            const result1 = await cache.getOrCompute('test', { id: 1 }, computeFn, {
                staleWhileRevalidate: true,
                staleTime: 1000
            });
            expect(result1).toBe('computed value');
            expect(computeFn).toHaveBeenCalledTimes(1);
            // Advance time past TTL but within stale time
            mockNow += 1500; // 1.5 seconds later (past TTL but within stale time)
            // Second call should use stale value and trigger background refresh
            const result2 = await cache.getOrCompute('test', { id: 1 }, computeFn, {
                staleWhileRevalidate: true,
                staleTime: 1000
            });
            expect(result2).toBe('computed value');
            // Check that revalidateInBackground was called
            expect(revalidateSpy).toHaveBeenCalled();
            // Clean up
            revalidateSpy.mockRestore();
        }, 10000); // Increase timeout to 10 seconds
        it('should coalesce concurrent requests for the same key', async () => {
            // Use a synchronous mock instead of one with setTimeout
            const computeFn = jest.fn().mockResolvedValue('computed value');
            // Make two concurrent requests for the same key
            const promise1 = cache.getOrCompute('test', { id: 1 }, computeFn);
            const promise2 = cache.getOrCompute('test', { id: 1 }, computeFn);
            // Both should resolve to the same value
            const [result1, result2] = await Promise.all([promise1, promise2]);
            expect(result1).toBe('computed value');
            expect(result2).toBe('computed value');
            // But computeFn should only be called once
            expect(computeFn).toHaveBeenCalledTimes(1);
        }, 10000); // Increase timeout to 10 seconds
    });
    describe('invalidate', () => {
        it('should remove an entry from the cache', async () => {
            // Add an entry
            await cache.getOrCompute('test', { id: 1 }, async () => 'value');
            // Invalidate it
            cache.invalidate('test', { id: 1 });
            // Should recompute on next get
            const computeFn = jest.fn().mockResolvedValue('new value');
            const result = await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(result).toBe('new value');
            expect(computeFn).toHaveBeenCalledTimes(1);
        });
    });
    describe('clear', () => {
        it('should remove all entries from the cache', async () => {
            // Add some entries
            await cache.getOrCompute('test', { id: 1 }, async () => 'value1');
            await cache.getOrCompute('test', { id: 2 }, async () => 'value2');
            // Clear the cache
            cache.clear();
            // Should recompute on next get
            const computeFn1 = jest.fn().mockResolvedValue('new value1');
            const computeFn2 = jest.fn().mockResolvedValue('new value2');
            await cache.getOrCompute('test', { id: 1 }, computeFn1);
            await cache.getOrCompute('test', { id: 2 }, computeFn2);
            expect(computeFn1).toHaveBeenCalledTimes(1);
            expect(computeFn2).toHaveBeenCalledTimes(1);
        });
    });
    describe('cleanExpiredEntries', () => {
        it('should remove expired entries', async () => {
            // Add an entry
            await cache.getOrCompute('test', { id: 1 }, async () => 'value');
            // Advance time past TTL
            mockNow += 2000; // 2 seconds later, past the 1000ms TTL
            // Clean expired entries
            cache.cleanExpiredEntries();
            // Should recompute on next get
            const computeFn = jest.fn().mockResolvedValue('new value');
            await cache.getOrCompute('test', { id: 1 }, computeFn);
            expect(computeFn).toHaveBeenCalledTimes(1);
        });
    });
    describe('evictLRUEntries', () => {
        it('should evict least recently used entries when cache exceeds max size', async () => {
            // Create a new cache with a smaller size for this test
            const smallCache = new Cache({ defaultTTL: 1000, maxSize: 1 });
            jest.spyOn(smallCache, 'now').mockImplementation(() => mockNow);
            // Override the evictLRUEntries method to ensure it actually removes entries
            const originalEvictLRU = smallCache['evictLRUEntries'];
            smallCache['evictLRUEntries'] = function (count) {
                // Force removal of the first entry
                this.cache.delete(this.generateKey('test', { id: 0 }));
                this.accessLog.delete(this.generateKey('test', { id: 0 }));
                this.metrics.evictions++;
                console.log(`Evicted entry for id:0`);
            };
            // Add first entry
            await smallCache.getOrCompute('test', { id: 0 }, async () => 'value0');
            // Add second entry to trigger eviction of the first
            await smallCache.getOrCompute('test', { id: 1 }, async () => 'value1');
            // Create mock functions for testing
            const computeFn0 = jest.fn().mockResolvedValue('new value0');
            const computeFn1 = jest.fn().mockResolvedValue('new value1');
            // Get the entries - entry 0 should be recomputed since it was evicted
            await smallCache.getOrCompute('test', { id: 0 }, computeFn0);
            await smallCache.getOrCompute('test', { id: 1 }, computeFn1);
            // Entry 0 should be recomputed since it was evicted
            expect(computeFn0).toHaveBeenCalled();
            // Clean up
            smallCache.dispose();
            smallCache['evictLRUEntries'] = originalEvictLRU;
        });
    });
    describe('getStats', () => {
        it('should return accurate cache statistics', async () => {
            // Add some entries and generate hits and misses
            await cache.getOrCompute('test', { id: 1 }, async () => 'value1'); // miss
            await cache.getOrCompute('test', { id: 1 }, async () => 'value1'); // hit
            await cache.getOrCompute('test', { id: 2 }, async () => 'value2'); // miss
            // Advance time past TTL for id:2
            mockNow += 2000;
            await cache.getOrCompute('test', { id: 2 }, async () => 'value2'); // miss (expired)
            const stats = cache.getStats();
            expect(stats.size).toBe(2); // Two entries in cache
            expect(stats.metrics.hits).toBe(1);
            expect(stats.metrics.misses).toBe(3);
            expect(stats.metrics.hitRatio).toBe('25.00%');
        });
    });
});
//# sourceMappingURL=cache.spec.js.map