import { CacheEntry } from "./types.js";
/**
 * Generic in-memory cache implementation with advanced features
 *
 * This cache provides:
 * - Time-to-live (TTL) expiration for entries
 * - Promise coalescing to prevent cache stampedes
 * - Stale-while-revalidate pattern for improved performance
 * - Least Recently Used (LRU) eviction policy
 * - Automatic cleanup of expired entries
 * - Comprehensive metrics for monitoring
 *
 * Cache stampede prevention: When multiple requests for the same uncached key arrive
 * simultaneously, only one computation is performed while others wait for the result.
 *
 * @see https://en.wikipedia.org/wiki/Cache_stampede
 * @see https://web.dev/stale-while-revalidate/ for stale-while-revalidate pattern
 */
export declare class Cache {
    protected cache: Map<string, CacheEntry<any>>;
    private pendingPromises;
    protected defaultTTL: number;
    private maxSize;
    protected accessLog: Map<string, number>;
    protected metrics: {
        hits: number;
        misses: number;
        errors: number;
        evictions: number;
    };
    private cleanupIntervalId;
    /**
     * Returns the current time in milliseconds.
     * Can be overridden in tests to control time.
     * @protected
     */
    protected now(): number;
    /**
     * Creates a new Cache instance
     *
     * @param options - Configuration options
     * @param options.defaultTTL - Default time-to-live in milliseconds (default: 5 minutes)
     * @param options.maxSize - Maximum number of entries before LRU eviction (default: 1000)
     */
    constructor(options?: {
        defaultTTL?: number;
        maxSize?: number;
    });
    /**
     * Generate a deterministic cache key from function arguments
     *
     * Creates a SHA-256 hash of the stringified arguments to ensure:
     * - Consistent key generation for the same arguments
     * - Keys of reasonable length regardless of argument size
     * - Support for complex nested objects as arguments
     *
     * @param namespace - The namespace to scope this key to
     * @param args - The arguments to hash
     * @returns A unique cache key string
     */
    generateKey(namespace: string, args: any): string;
    /**
     * Get a value from cache or compute it if not present
     *
     * This is the core method of the cache, implementing:
     * 1. Cache lookup with TTL checking
     * 2. Stale-while-revalidate pattern when enabled
     * 3. Promise coalescing to prevent cache stampedes
     * 4. Automatic storage of computed values
     *
     * The stale-while-revalidate pattern allows serving stale content while
     * refreshing the cache in the background, improving perceived performance.
     *
     * @param namespace - The namespace to scope this key to
     * @param args - The arguments to generate the cache key
     * @param computeFn - Function to compute the value if not in cache
     * @param options - Additional options for this specific cache operation
     * @returns The cached or computed value
     */
    getOrCompute<T>(namespace: string, args: any, computeFn: () => Promise<T>, options?: {
        ttl?: number;
        staleWhileRevalidate?: boolean;
        staleTime?: number;
    }): Promise<T>;
    /**
     * Revalidate a cache entry in the background without blocking
     *
     * This is a key part of the stale-while-revalidate pattern:
     * 1. The main request thread returns stale data immediately
     * 2. This method runs asynchronously to refresh the cache
     * 3. Future requests get fresh data without waiting
     *
     * @param namespace - The namespace of the entry
     * @param args - The arguments used to generate the key
     * @param key - The cache key
     * @param computeFn - Function to recompute the value
     * @param options - Cache options for the revalidated entry
     */
    protected revalidateInBackground(namespace: string, args: any, key: string, computeFn: () => Promise<any>, options?: {
        ttl?: number;
        staleTime?: number;
        staleWhileRevalidate?: boolean;
    }): Promise<void>;
    /**
     * Manually invalidate a cache entry
     *
     * Removes an entry from the cache, forcing the next request to recompute it.
     * Useful for clearing stale data after updates or when data is known to be invalid.
     *
     * @param namespace - The namespace of the entry
     * @param args - The arguments used to generate the key
     */
    invalidate(namespace: string, args: any): void;
    /**
     * Clear all cache entries
     *
     * Completely empties the cache while preserving cumulative metrics.
     * Use this when you need to reset the cache state but keep historical statistics.
     */
    clear(): void;
    /**
     * Clean expired entries from the cache
     *
     * Automatically removes entries that have exceeded their TTL.
     * This runs periodically to prevent memory leaks from abandoned entries.
     *
     * @protected - Changed from private
     */
    protected cleanExpiredEntries(): void;
    /**
     * Evict least recently used entries
     *
     * Implements the LRU (Least Recently Used) eviction policy:
     * 1. Sorts entries by last access time
     * 2. Removes the oldest accessed entries first
     * 3. Typically removes 20% of entries when cache size limit is reached
     *
     * This prevents unbounded growth of the cache while keeping the most useful entries.
     *
     * @param count - Number of entries to evict
     * @protected - Allow subclasses to override or call
     */
    protected evictLRUEntries(count: number): void;
    /**
     * Get comprehensive cache statistics
     *
     * Returns detailed metrics about cache performance:
     * - Current size (number of entries)
     * - Number of pending promises (in-flight computations)
     * - Hit count and miss count
     * - Error count
     * - Eviction count
     * - Hit ratio as a percentage
     *
     * Useful for monitoring cache effectiveness and diagnosing performance issues.
     *
     * @returns Object containing cache statistics
     */
    getStats(): {
        size: number;
        pendingPromises: number;
        metrics: {
            hits: number;
            misses: number;
            errors: number;
            evictions: number;
            hitRatio: string;
        };
    };
    /**
     * Set a value in the cache
     *
     * Stores an entry in the cache and updates the access log.
     * Triggers LRU eviction if the cache exceeds its maximum size.
     *
     * @param key - The cache key
     * @param entry - The cache entry with value and expiration
     * @protected - Available to subclasses but not external code
     */
    protected set(key: string, entry: CacheEntry<any>): void;
    /**
     * Get a value from the cache
     *
     * Retrieves an entry and updates its access time for LRU tracking.
     * Does not check expiration - that's handled by getOrCompute.
     *
     * @param key - The cache key
     * @returns The cache entry, or undefined if not found
     * @protected - Available to subclasses but not external code
     */
    protected get(key: string): CacheEntry<any> | undefined;
    /**
     * Dispose of the cache, clearing any timers or intervals
     *
     * Should be called when the cache is no longer needed to prevent resource leaks.
     */
    dispose(): void;
}
//# sourceMappingURL=cache.d.ts.map