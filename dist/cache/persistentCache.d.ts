import { Cache } from './cache.js';
import { CacheEntry, PersistentCacheOptions } from './types.js';
/**
 * Advanced cache implementation with disk persistence capabilities
 *
 * This cache extends the in-memory Cache with:
 * - Configurable disk persistence strategies
 * - Namespace-based organization of cached data
 * - Automatic recovery after restarts
 * - Graceful shutdown handling
 * - Optional eager loading of all entries on startup
 *
 * The PersistentCache maintains both an in-memory cache for performance
 * and a disk-based storage for durability. It uses various persistence
 * strategies to determine when and how to write data to disk.
 *
 * @see PersistenceStrategy for different persistence approaches
 * @see IPersistenceManager for the storage interface
 */
export declare class PersistentCache extends Cache {
    protected defaultTTL: number;
    private persistenceManager;
    private persistenceStrategy;
    private persistenceTimer;
    private namespaceCache;
    private isDirty;
    private isInitialized;
    private eagerLoading;
    /**
     * Creates a new PersistentCache
     *
     * @param options - Configuration options for the cache
     * @param options.defaultTTL - Default time-to-live in milliseconds
     * @param options.maxSize - Maximum number of entries before LRU eviction
     * @param options.storagePath - Path to store persistent cache files
     * @param options.persistenceStrategy - Strategy for when to persist entries
     * @param options.eagerLoading - Whether to load all entries on startup
     * @param options.persistentNamespaces - Namespaces to persist to disk
     */
    constructor(options?: PersistentCacheOptions);
    /**
     * Initializes the cache
     *
     * This method:
     * 1. Loads persisted entries from disk if eager loading is enabled
     * 2. Skips loading expired entries
     * 3. Populates both the namespace cache and in-memory cache
     * 4. Starts the persistence timer based on the strategy
     *
     * Eager loading improves startup performance for frequently accessed entries
     * but increases initial memory usage and startup time.
     *
     * @private
     */
    private initialize;
    /**
     * Registers shutdown handlers to ensure cache is persisted before exit
     *
     * This method sets up handlers for:
     * - Normal process exit
     * - SIGINT (Ctrl+C)
     * - SIGTERM (termination signal)
     * - Uncaught exceptions
     *
     * Each handler attempts to persist the cache to disk before exiting,
     * ensuring data durability even during abnormal termination.
     *
     * Special handling is provided for EPIPE errors, which can occur when
     * the parent process terminates unexpectedly.
     *
     * @private
     */
    private exitHandler;
    private sigintHandler;
    private sigtermHandler;
    private sighupHandler;
    private uncaughtExceptionHandler;
    private registerShutdownHandlers;
    /**
     * Starts the persistence timer if needed
     *
     * Based on the persistence strategy, this may:
     * - Set up a periodic timer to persist cache entries
     * - Skip timer creation if the strategy doesn't use periodic persistence
     *
     * The timer is configured to not prevent Node.js from exiting when it's
     * the only active handle (using unref()).
     *
     * @private
     */
    private startPersistenceTimer;
    /**
     * Stops the persistence timer
     *
     * Cancels any scheduled persistence operations.
     * Used during shutdown or when reconfiguring the cache.
     *
     * @private
     */
    private stopPersistenceTimer;
    /**
     * Generates a full cache key from namespace and key
     *
     * Creates a composite key in the format "namespace:key" that uniquely
     * identifies an entry across all namespaces.
     *
     * @param namespace - The namespace
     * @param key - The key within the namespace (this should be the HASHED key)
     * @returns The full cache key
     * @private
     */
    private generateFullKey;
    /**
     * Parses a full cache key into namespace and key components
     *
     * Splits a composite key in the format "namespace:key" into its
     * constituent parts. Handles edge cases like missing colons.
     *
     * @param fullKey - The full cache key (namespace:hashedKey)
     * @returns Object containing namespace and key (hashedKey)
     * @private
     */
    private parseFullKey;
    /**
     * Gets the total number of entries in the cache
     *
     * Counts entries across all namespaces in the namespace cache.
     * Used for statistics and monitoring.
     *
     * @returns The total number of entries
     * @private
     */
    private getEntryCount;
    /**
     * Sets a value in the cache with persistence support
     *
     * This method:
     * 1. Sets the value in the in-memory cache (via super.set)
     * 2. Updates the namespace cache for organization
     * 3. Persists to disk if required by the persistence strategy
     * 4. Marks the cache as dirty for periodic persistence
     *
     * @param fullKey - The full cache key (namespace:hashedKey)
     * @param entry - The cache entry
     * @protected - Available to subclasses but not external code
     */
    protected set(fullKey: string, entry: CacheEntry<any>): Promise<void>;
    /**
     * Gets a value from the cache with persistence support
     *
     * This method implements a multi-level lookup strategy:
     * 1. First checks the in-memory cache for performance
     * 2. If not found and not using eager loading, tries to load from disk
     * 3. If found on disk, adds to in-memory cache for future requests
     * 4. Optionally persists the entry if required by the strategy
     *
     * This approach provides a balance between performance and durability.
     *
     * @param fullKey - The full cache key (namespace:hashedKey)
     * @returns The cache entry, or undefined if not found
     * @private
     */
    private getWithPersistence;
    /**
     * Override the getOrCompute method to add persistence support
     *
     * This implementation:
     * 1. Waits for initialization to complete
     * 2. Uses the persistence-aware getWithPersistence method
     * 3. Handles stale-while-revalidate pattern
     * 4. Stores computed values with appropriate persistence
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
     * Override the revalidateInBackground method to add persistence
     *
     * This implementation ensures that background revalidation:
     * 1. Computes fresh values asynchronously
     * 2. Stores them in both memory and disk according to the persistence strategy
     * 3. Properly handles errors without affecting the main request flow
     *
     * @param namespace - The namespace of the entry
     * @param args - The arguments used to generate the key
     * @param key - The HASHED cache key (passed from getOrCompute)
     * @param computeFn - Function to recompute the value
     * @param options - Cache options for the revalidated entry
     * @protected - Available to subclasses but not external code
     */
    protected revalidateInBackground(namespace: string, args: any, // Keep args for potential future use, though key is already hashed
    key: string, // This is the HASHED key
    computeFn: () => Promise<any>, options?: {
        ttl?: number;
        staleTime?: number;
        staleWhileRevalidate?: boolean;
    }): Promise<void>;
    /**
     * Override the invalidate method to add persistence
     *
     * This implementation ensures that invalidation:
     * 1. Removes entries from the in-memory cache
     * 2. Removes entries from the namespace cache
     * 3. Removes entries from disk storage
     *
     * This provides complete invalidation across all storage layers.
     *
     * @param namespace - The namespace of the entry
     * @param args - The arguments used to generate the key
     */
    invalidate(namespace: string, args: any): Promise<void>;
    /**
     * Override the clear method to add persistence
     *
     * This implementation ensures that clearing:
     * 1. Removes all entries from the in-memory cache
     * 2. Removes all entries from the namespace cache
     * 3. Removes all entries from disk storage
     *
     * This provides a complete reset of the cache across all storage layers.
     */
    clear(): void;
    /**
     * Persists the cache to disk
     *
     * This method:
     * 1. Checks if the cache is dirty (has changes)
     * 2. Skips persistence if no changes have been made
     * 3. Uses the persistence manager to save all entries
     * 4. Resets the dirty flag after successful persistence
     *
     * @returns A promise that resolves when the cache is persisted
     */
    persistToDisk(): Promise<void>;
    /**
     * Persists the cache to disk synchronously
     *
     * This method is specifically designed for shutdown scenarios where
     * asynchronous operations might not complete before process termination.
     *
     * It uses synchronous file operations to ensure data is written to disk
     * before the process exits, even if it's being terminated.
     *
     * Implementation details:
     * 1. Uses Node.js fs synchronous methods instead of async ones
     * 2. Creates directories if they don't exist
     * 3. Writes each namespace and entry to disk
     * 4. Creates a metadata file with cache statistics
     *
     * @private
     */
    private persistSync;
    /**
     * Loads the cache from disk
     *
     * This method:
     * 1. Clears the current in-memory cache
     * 2. Loads all entries from disk using the persistence manager
     * 3. Filters out expired entries
     * 4. Populates both the namespace cache and in-memory cache
     *
     * @returns A promise that resolves when the cache is loaded
     */
    loadFromDisk(): Promise<void>;
    /**
     * Gets extended cache stats including persistence info
     *
     * Extends the base cache statistics with persistence-specific information:
     * - Whether the cache has unsaved changes (isDirty)
     * - Number of namespaces in the cache
     * - Number of entries that will be persisted
     *
     * @returns Extended statistics object
     */
    getStats(): any;
    /**
     * Cleans up resources when the cache is no longer needed
     *
     * This method:
     * 1. Stops the persistence timer to prevent further disk writes
     * 2. Attempts to persist any dirty entries before disposal
     * 3. Handles errors gracefully during shutdown
     *
     * Call this method when shutting down the application or
     * when the cache instance is no longer needed.
     */
    dispose(): Promise<void>;
    /**
     * Override evictLRUEntries to also remove from persistence
     * @param count Number of entries to evict
     * @protected - Changed from private in base class
     */
    protected evictLRUEntries(count: number): Promise<void>;
}
//# sourceMappingURL=persistentCache.d.ts.map