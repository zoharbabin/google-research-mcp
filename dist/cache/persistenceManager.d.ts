import { CacheEntry, IPersistenceManager } from './types.js';
/**
 * Manages persistence of cache entries to disk
 *
 * This class handles the low-level details of storing and retrieving cache entries
 * from the filesystem. It provides:
 *
 * - Namespace-based organization of cache entries
 * - Safe file operations with error handling
 * - Atomic writes using temporary files
 * - Serialization and deserialization of cache entries
 * - Metadata tracking for cache statistics
 *
 * The persistence manager is used by the PersistentCache but can also be
 * used independently for custom persistence implementations.
 *
 * @implements IPersistenceManager
 */
export declare class PersistenceManager implements IPersistenceManager {
    readonly storagePath: string;
    private metadataPath;
    private namespacesPath;
    private directoriesEnsured;
    /**
     * Creates a new PersistenceManager
     *
     * @param storagePath - Path to the storage directory
     *                     Defaults to 'storage/persistent_cache' in the current working directory
     */
    constructor(storagePath?: string);
    /**
     * Ensures that the storage directories exist
     *
     * Creates the main storage directory and the namespaces subdirectory
     * if they don't already exist. This is called before any file operation
     * to ensure the filesystem is ready for cache operations.
     *
     * @private
     */
    private ensureDirectoriesExist;
    /**
     * Hashes a key to create a safe filename
     *
     * Uses SHA-256 to create a deterministic, filesystem-safe representation
     * of any key, regardless of its original format or characters.
     *
     * This ensures:
     * - No invalid characters in filenames
     * - Consistent length filenames
     * - No collisions between different keys
     *
     * @param key - The key to hash
     * @returns The hashed key as a hex string
     * @private
     */
    private hashKey;
    /**
     * Gets the path to a namespace directory
     *
     * Converts a namespace name to a filesystem path, ensuring it's
     * properly encoded for safe filesystem use.
     *
     * @param namespace - The namespace
     * @returns The path to the namespace directory
     * @private
     */
    private getNamespacePath;
    /**
     * Gets the path to a cache entry file
     *
     * Combines the namespace path with a hashed key to create
     * the full path to a cache entry file.
     *
     * @param namespace - The namespace
     * @param key - The key
     * @returns The path to the cache entry file
     * @private
     */
    private getEntryPath;
    /**
     * Serializes a cache entry for storage
     *
     * Converts a cache entry to a format suitable for persistent storage,
     * adding metadata such as:
     * - Creation timestamp
     * - Content size
     * - Content type
     * - Original key (for reference)
     *
     * @param key - The original key
     * @param entry - The cache entry
     * @returns The serialized entry with metadata
     * @private
     */
    private serializeEntry;
    /**
     * Deserializes a persisted cache entry
     *
     * Converts a persisted entry back to the format expected by the cache,
     * extracting the value and expiration information.
     *
     * @param persistedEntry - The persisted entry with metadata
     * @returns The cache entry
     * @private
     */
    private deserializeEntry;
    /**
     * Saves a cache entry to disk
     *
     * This method:
     * 1. Creates the namespace directory if it doesn't exist
     * 2. Serializes the entry with metadata
     * 3. Writes to a temporary file first
     * 4. Renames the temporary file to the final name (atomic operation)
     *
     * The atomic write pattern ensures that entries are never partially written,
     * which could happen if the process crashes during a write operation.
     *
     * @param namespace - The namespace
     * @param key - The key
     * @param entry - The cache entry
     */
    saveEntry<T>(namespace: string, key: string, entry: CacheEntry<T>): Promise<void>;
    /**
     * Loads a cache entry from disk
     *
     * This method:
     * 1. Determines the file path based on namespace and key
     * 2. Reads and parses the JSON file
     * 3. Deserializes the entry
     * 4. Handles file-not-found gracefully
     *
     * @param namespace - The namespace
     * @param key - The key
     * @returns The cache entry, or undefined if not found
     */
    loadEntry<T>(namespace: string, key: string): Promise<CacheEntry<T> | undefined>;
    /**
     * Saves all cache entries to disk
     *
     * This method:
     * 1. Creates a list of save operations for all entries
     * 2. Executes them in parallel for performance
     * 3. Updates the metadata file with statistics
     *
     * This is used for bulk persistence operations, such as
     * periodic persistence or shutdown persistence.
     *
     * @param entries - Map of namespaces to maps of keys to entries
     */
    saveAllEntries(entries: Map<string, Map<string, CacheEntry<any>>>): Promise<void>;
    /**
     * Updates the cache metadata
     *
     * Creates or updates a metadata file with:
     * - Version information
     * - Timestamp of last persistence
     * - Statistics about the cache (entry count, size)
     *
     * This metadata is useful for monitoring and debugging.
     *
     * @param entries - Map of namespaces to maps of keys to entries
     * @private
     */
    private updateMetadata;
    /**
     * Loads all cache entries from disk
     *
     * This method:
     * 1. Scans the namespaces directory for namespace subdirectories
     * 2. For each namespace, loads all entry files
     * 3. Parses and deserializes each entry
     * 4. Organizes entries by namespace and key
     *
     * Used during initialization with eager loading or when
     * explicitly reloading the cache from disk.
     *
     * @returns Map of namespaces to maps of keys to entries
     */
    loadAllEntries(): Promise<Map<string, Map<string, CacheEntry<any>>>>;
    /**
     * Clears all persisted cache entries
     *
     * This method:
     * 1. Removes all namespace directories and their contents
     * 2. Resets the metadata file to reflect an empty cache
     *
     * Used when completely resetting the cache state.
     */
    clear(): Promise<void>;
    /**
     * Removes a cache entry from disk
     *
     * This method:
     * 1. Determines the file path based on namespace and key
     * 2. Deletes the file if it exists
     * 3. Ignores errors if the file doesn't exist
     *
     * Used when invalidating specific cache entries.
     *
     * @param namespace - The namespace
     * @param key - The key
     */
    removeEntry(namespace: string, key: string): Promise<void>;
}
//# sourceMappingURL=persistenceManager.d.ts.map