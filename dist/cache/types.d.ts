/**
 * Cache entry with TTL and value
 *
 * This interface defines the core structure of a cache entry:
 * - The actual value being cached
 * - When the entry expires (TTL-based expiration)
 * - Optional extended expiration for stale-while-revalidate pattern
 *
 * The stale-while-revalidate pattern allows serving slightly outdated content
 * while refreshing the cache in the background, improving perceived performance.
 *
 * @template T - The type of the cached value
 */
export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    staleUntil?: number;
}
/**
 * Configuration options for the PersistentCache
 *
 * This interface defines all possible configuration options for a PersistentCache instance.
 * Most options are optional with reasonable defaults provided by the implementation.
 *
 * The options control:
 * - Cache size and TTL limits
 * - Storage location and persistence behavior
 * - Namespace configuration for persistence
 * - Security features like encryption
 */
export interface PersistentCacheOptions {
    /** Default TTL in milliseconds */
    defaultTTL?: number;
    /** Maximum number of entries in the cache */
    maxSize?: number;
    /**
     * Path to the storage directory.
     * Only used if persistenceManager is not provided.
     * Defaults to './storage/persistent_cache' relative to the current working directory.
     */
    storagePath?: string;
    /**
     * An instance of IPersistenceManager to handle disk operations.
     * If provided, storagePath is ignored. Allows injecting mocks for testing.
     */
    persistenceManager?: IPersistenceManager;
    /** Persistence strategy to use */
    persistenceStrategy?: PersistenceStrategy;
    /** Whether to load all entries on startup */
    eagerLoading?: boolean;
    /** Namespaces that should be persisted */
    persistentNamespaces?: string[];
    /** Namespaces that should be encrypted */
    encryptedNamespaces?: string[];
    /** Encryption key for sensitive data */
    encryptionKey?: string;
}
/**
 * Interface for persistence strategies
 *
 * Persistence strategies determine when and how cache entries are persisted to disk.
 * Different strategies can be implemented for different use cases:
 *
 * - Write-through: Persist immediately on write
 * - Periodic: Persist at regular intervals
 * - On-shutdown: Persist only when shutting down
 * - Hybrid: Combine multiple approaches
 *
 * Strategies control both the timing of persistence operations and which
 * entries are persisted.
 */
export interface PersistenceStrategy {
    /**
     * Determines if an entry should be persisted on set
     */
    shouldPersistOnSet(namespace: string, key: string, entry: CacheEntry<any>): boolean;
    /**
     * Determines if an entry should be persisted on get
     */
    shouldPersistOnGet(namespace: string, key: string, entry: CacheEntry<any>): boolean;
    /**
     * Gets the interval for periodic persistence in milliseconds
     * Returns null if periodic persistence is disabled
     */
    getPersistenceInterval(): number | null;
    /**
     * Called when the server is shutting down
     */
    onShutdown(): Promise<void>;
}
/**
 * Interface for the persistence manager
 *
 * The persistence manager handles the low-level details of storing and retrieving
 * cache entries from persistent storage (typically the filesystem).
 *
 * It provides methods for:
 * - Saving and loading individual entries
 * - Bulk operations for saving and loading all entries
 * - Clearing the persistent storage
 * - Removing specific entries
 *
 * This abstraction allows for different storage backends to be implemented
 * without changing the cache logic.
 */
export interface IPersistenceManager {
    /**
     * Saves a single cache entry to disk
     */
    saveEntry(namespace: string, key: string, entry: CacheEntry<any>): Promise<void>;
    /**
     * Loads a single cache entry from disk
     */
    loadEntry(namespace: string, key: string): Promise<CacheEntry<any> | undefined>;
    /**
     * Saves all cache entries to disk
     */
    saveAllEntries(entries: Map<string, Map<string, CacheEntry<any>>>): Promise<void>;
    /**
     * Loads all cache entries from disk
     */
    loadAllEntries(): Promise<Map<string, Map<string, CacheEntry<any>>>>;
    /**
     * Clears all persisted cache entries
     */
    clear(): Promise<void>;
    /**
     * Removes a single cache entry from disk
     */
    removeEntry(namespace: string, key: string): Promise<void>;
}
/**
 * Metadata for the persistent cache
 *
 * This interface defines the structure of the metadata file that accompanies
 * the persisted cache entries. It contains:
 *
 * - Version information for compatibility checking
 * - Timestamp of the last persistence operation
 * - Statistics about the cache contents
 *
 * This metadata is useful for monitoring, debugging, and ensuring compatibility
 * across versions.
 */
export interface CacheMetadata {
    version: string;
    lastPersisted: number;
    stats: {
        totalEntries: number;
        totalSize: number;
    };
}
/**
 * Persisted cache entry with additional metadata
 *
 * This interface extends the basic CacheEntry with additional metadata
 * needed for persistence. It includes:
 *
 * - The original key (for reference)
 * - The cached value
 * - Extended metadata for persistence management
 *
 * The additional metadata helps with storage management, diagnostics,
 * and content type handling.
 *
 * @template T - The type of the cached value
 */
export interface PersistedCacheEntry<T> {
    key: string;
    value: T;
    metadata: {
        createdAt: number;
        expiresAt: number;
        staleUntil?: number;
        size: number;
        contentType?: string;
    };
}
//# sourceMappingURL=types.d.ts.map