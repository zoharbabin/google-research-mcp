// src/cache/persistentCache.ts
import { Cache } from './cache.js';
import { PersistenceManager } from './persistenceManager.js';
import { HybridPersistenceStrategy } from './persistenceStrategies.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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
export class PersistentCache extends Cache {
    persistenceManager;
    persistenceStrategy;
    persistenceTimer = null;
    namespaceCache = new Map();
    isDirty = false;
    isInitialized = false;
    eagerLoading;
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
    constructor(options = {}) {
        // Initialize the base Cache class
        super({
            defaultTTL: options.defaultTTL,
            maxSize: options.maxSize
        });
        // Initialize persistence manager: use injected one or create default
        if (options.persistenceManager) {
            this.persistenceManager = options.persistenceManager;
        }
        else {
            // Use absolute path for storage to ensure consistency across different transports
            // This fixes cache misses when different transports have different working directories
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            // Match the path resolution used in server.ts (only one level up)
            const storagePath = options.storagePath || path.resolve(__dirname, '..', 'storage', 'persistent_cache');
            this.persistenceManager = new PersistenceManager(storagePath);
        }
        // Initialize persistence strategy
        this.persistenceStrategy = options.persistenceStrategy ||
            new HybridPersistenceStrategy([], // No critical namespaces by default
            5 * 60 * 1000, // 5 minutes persistence interval
            options.persistentNamespaces || []);
        // Initialize eager loading flag
        this.eagerLoading = options.eagerLoading || false;
        // Initialize the cache - we need to handle this asynchronously
        // but can't use async/await in constructor
        this.initialize().catch(error => {
            console.error('Error during cache initialization:', error);
        });
        // Register shutdown handler
        this.registerShutdownHandlers();
    }
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
    async initialize() {
        // console.log('[Initialize] Starting initialization...'); // DEBUG LOG - Removed for test hygiene
        try {
            if (this.eagerLoading) {
                // console.log('[Initialize] Eager loading enabled.'); // DEBUG LOG - Removed for test hygiene
                try {
                    // Load all entries at once
                    // console.log('[Initialize] Loading all entries from persistence manager...'); // DEBUG LOG - Removed for test hygiene
                    const entries = await this.persistenceManager.loadAllEntries();
                    // console.log(`[Initialize] Loaded ${entries.size} namespaces from persistence manager.`); // DEBUG LOG - Removed for test hygiene
                    // Add entries to the in-memory cache
                    // console.log('[Initialize] Populating in-memory cache...'); // DEBUG LOG - Removed for test hygiene
                    for (const [namespace, namespaceEntries] of entries.entries()) {
                        // Create namespace map if it doesn't exist
                        if (!this.namespaceCache.has(namespace)) {
                            this.namespaceCache.set(namespace, new Map());
                        }
                        // Add entries to the namespace map
                        const namespaceMap = this.namespaceCache.get(namespace);
                        for (const [key, entry] of namespaceEntries.entries()) {
                            // Skip expired entries
                            if (entry.expiresAt <= this.now()) { // Use this.now()
                                continue;
                            }
                            // Add to namespace map
                            namespaceMap.set(key, entry);
                            // Add to in-memory cache
                            super.set(this.generateFullKey(namespace, key), entry);
                        }
                    }
                    try {
                        // console.log(`Loaded ${this.getEntryCount()} entries from persistent storage`); // Removed for test hygiene
                    }
                    catch (_) {
                        // Ignore console errors during shutdown
                    }
                }
                catch (loadError) {
                    try {
                        console.error('Error loading entries from persistent storage:', loadError); // Keep error log
                    }
                    catch (_) {
                        // Ignore console errors during shutdown
                    }
                    // Continue with empty cache even if loading fails
                }
            }
            // Start persistence timer if needed
            // console.log('[Initialize] Starting persistence timer...'); // DEBUG LOG - Removed for test hygiene
            this.startPersistenceTimer();
            // Mark initialization as complete
            this.isInitialized = true;
            // console.log('[Initialize] Initialization complete.'); // DEBUG LOG - Removed for test hygiene
        }
        catch (error) {
            // console.error('[Initialize] Error during initialization:', error); // DEBUG LOG - Removed for test hygiene
            try {
                console.error('Error initializing persistent cache:', error); // Keep actual error log
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
            // Continue with empty cache
            this.isInitialized = true;
        }
    }
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
    // Store bound handler functions so we can remove them later
    exitHandler = () => this.persistSync();
    sigintHandler = () => {
        try {
            console.log('Persisting cache before exit...');
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
        this.persistSync();
        process.exit(0);
    };
    sigtermHandler = () => {
        try {
            console.log('Persisting cache before exit...');
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
        this.persistSync();
        process.exit(0);
    };
    sighupHandler = () => {
        try {
            console.log('SIGHUP received. Persisting cache before exit...');
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
        this.persistSync();
        process.exit(0); // Exit after persisting
    };
    uncaughtExceptionHandler = (error) => {
        // Check if it's an EPIPE error
        if (error.code === 'EPIPE') {
            // For EPIPE errors, just stop the persistence timer and exit gracefully
            this.stopPersistenceTimer();
            // Don't try to log anything as that would cause another EPIPE error
            return;
        }
        try {
            console.error('Uncaught exception:', error);
            console.log('Persisting cache before exit...');
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
        this.persistSync();
        process.exit(1);
    };
    registerShutdownHandlers() {
        // Skip registering handlers in test environment to avoid leaking listeners
        if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
            return;
        }
        // Set max listeners to avoid MaxListenersExceededWarning
        // This is needed because many instances might be created during tests
        const currentMaxListeners = process.getMaxListeners();
        if (currentMaxListeners <= 10) {
            // Only increase if it's at the default value or lower
            process.setMaxListeners(20);
        }
        // Handle normal exit
        process.on('exit', this.exitHandler);
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', this.sigintHandler);
        // Handle SIGTERM
        process.on('SIGTERM', this.sigtermHandler);
        // Handle SIGHUP (often sent when parent process exits)
        process.on('SIGHUP', this.sighupHandler);
        // Handle uncaught exceptions
        process.on('uncaughtException', this.uncaughtExceptionHandler);
    }
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
    startPersistenceTimer() {
        // Do not start the timer in the test environment to prevent open handles
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        const interval = this.persistenceStrategy.getPersistenceInterval();
        if (interval !== null && interval > 0) {
            this.persistenceTimer = setInterval(() => {
                // Wrap in try-catch to prevent uncaught exceptions from timer callbacks
                try {
                    this.persistToDisk().catch(error => {
                        // If we get an EPIPE error, stop the timer
                        if (error.code === 'EPIPE') {
                            this.stopPersistenceTimer();
                        }
                    });
                }
                catch (error) {
                    // If we get an EPIPE error, stop the timer
                    if (error.code === 'EPIPE') {
                        this.stopPersistenceTimer();
                    }
                }
            }, interval);
            // Ensure timer doesn't prevent Node from exiting
            if (this.persistenceTimer.unref) {
                this.persistenceTimer.unref();
            }
        }
    }
    /**
     * Stops the persistence timer
     *
     * Cancels any scheduled persistence operations.
     * Used during shutdown or when reconfiguring the cache.
     *
     * @private
     */
    stopPersistenceTimer() {
        if (this.persistenceTimer) {
            clearInterval(this.persistenceTimer);
            this.persistenceTimer = null;
        }
    }
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
    generateFullKey(namespace, key) {
        // Key passed here is expected to be the hashed key already
        return `${namespace}:${key}`;
    }
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
    parseFullKey(fullKey) {
        const firstColonIndex = fullKey.indexOf(':');
        if (firstColonIndex === -1) {
            // Default to empty namespace if no colon
            return { namespace: '', key: fullKey };
        }
        const namespace = fullKey.substring(0, firstColonIndex);
        const key = fullKey.substring(firstColonIndex + 1); // This part is the hashed key
        return { namespace, key };
    }
    /**
     * Gets the total number of entries in the cache
     *
     * Counts entries across all namespaces in the namespace cache.
     * Used for statistics and monitoring.
     *
     * @returns The total number of entries
     * @private
     */
    getEntryCount() {
        let count = 0;
        for (const namespaceEntries of this.namespaceCache.values()) {
            count += namespaceEntries.size;
        }
        return count;
    }
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
    async set(fullKey, entry) {
        // Parse the full key to get namespace and hashedKey
        const { namespace, key: hashedKey } = this.parseFullKey(fullKey);
        // Set in the in-memory cache using the full key
        super.set(fullKey, entry);
        // Add to namespace cache using the hashedKey
        if (!this.namespaceCache.has(namespace)) {
            this.namespaceCache.set(namespace, new Map());
        }
        this.namespaceCache.get(namespace).set(hashedKey, entry); // Store by hashedKey
        // Mark as dirty for periodic persistence
        this.isDirty = true;
        // Persist if needed (using hashedKey)
        if (this.persistenceStrategy.shouldPersistOnSet(namespace, hashedKey, entry)) {
            try {
                await this.persistenceManager.saveEntry(namespace, hashedKey, entry); // Use hashedKey for persistence
            }
            catch (error) {
                try {
                    console.error(`Error persisting cache entry ${namespace}:${hashedKey}:`, error);
                }
                catch (_) {
                    // Ignore console errors during shutdown
                }
            }
        }
    }
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
    async getWithPersistence(fullKey) {
        // Parse the full key
        const { namespace, key: hashedKey } = this.parseFullKey(fullKey);
        // Try to get from in-memory cache first (super.get updates accessLog)
        let entry = super.get(fullKey);
        // If found in memory, check if it's expired (it might be stale but valid)
        if (entry && entry.expiresAt <= this.now() && (!entry.staleUntil || entry.staleUntil <= this.now())) {
            // console.log(`[GetPersistence] Found expired entry in memory: ${fullKey}`); // DEBUG LOG - Removed for test hygiene
            entry = undefined; // Treat expired entry as not found in memory
            this.cache.delete(fullKey); // Clean up expired entry from memory explicitly
            this.accessLog.delete(fullKey);
        }
        // If not found in memory (or was expired) AND not eager loading, try disk
        if (!entry && !this.eagerLoading) {
            // console.log(`[GetPersistence] Not in memory, trying disk: ${fullKey}`); // DEBUG LOG - Removed for test hygiene
            try {
                const persistedEntry = await this.persistenceManager.loadEntry(namespace, hashedKey); // Load using hashedKey
                // console.log(`[GetPersistence] Loaded from disk for ${fullKey}:`, persistedEntry ? 'found' : 'not found'); // DEBUG LOG - Removed for test hygiene
                // If found on disk, add to in-memory cache
                if (persistedEntry) {
                    // Skip expired entries
                    if (persistedEntry.expiresAt <= this.now()) { // Use this.now()
                        // Optionally remove expired entry from disk here
                        this.persistenceManager.removeEntry(namespace, hashedKey).catch(err => console.error("Failed to remove expired entry from disk", err));
                        return undefined;
                    }
                    // Add to in-memory cache using fullKey (this also updates accessLog)
                    super.set(fullKey, persistedEntry);
                    entry = persistedEntry; // Update the entry variable to be returned
                    // Add to namespace cache using hashedKey
                    if (!this.namespaceCache.has(namespace)) {
                        this.namespaceCache.set(namespace, new Map());
                    }
                    this.namespaceCache.get(namespace).set(hashedKey, persistedEntry);
                    // try {
                    //   console.log(`Loaded cache entry ${namespace}:${hashedKey} from disk`); // Removed for test hygiene
                    // } catch (_) {
                    //   // Ignore console errors during shutdown
                    // }
                }
            }
            catch (error) {
                try {
                    console.error(`Error loading cache entry ${namespace}:${hashedKey} from disk:`, error);
                }
                catch (_) {
                    // Ignore console errors during shutdown
                }
            }
        }
        // If entry is found and should be persisted on get, persist it (using hashedKey)
        if (entry && this.persistenceStrategy.shouldPersistOnGet(namespace, hashedKey, entry)) {
            this.persistenceManager.saveEntry(namespace, hashedKey, entry) // Use hashedKey
                .catch(error => {
                try {
                    console.error(`Error persisting cache entry ${namespace}:${hashedKey}:`, error);
                }
                catch (_) {
                    // Ignore console errors during shutdown
                }
            });
        }
        return entry;
    }
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
    async getOrCompute(namespace, args, computeFn, options = {}) {
        // Wait for initialization to complete
        if (!this.isInitialized) {
            await new Promise(resolve => {
                // Use a timeout to prevent infinite waiting
                const timeout = setTimeout(() => {
                    console.warn('Cache initialization timeout - proceeding anyway');
                    resolve();
                }, 10000); // 10 second timeout
                // Store the interval ID so it can be cleared
                const checkInterval = setInterval(() => {
                    if (this.isInitialized) {
                        clearInterval(checkInterval);
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 100);
                // Ensure timers don't prevent Node from exiting
                if (checkInterval.unref) {
                    checkInterval.unref();
                }
                if (timeout.unref) {
                    timeout.unref();
                }
            });
        }
        // Generate the hashed key and full key
        const hashedKey = super.generateKey(namespace, args); // Use base class to hash args
        const fullKey = this.generateFullKey(namespace, hashedKey); // Construct full key
        // Try to get from cache using the persistence-aware method
        const cached = await this.getWithPersistence(fullKey);
        // Case 1: Fresh cache hit
        if (cached && cached.expiresAt > this.now()) { // Use this.now()
            this.metrics.hits++; // FIX: Increment hits (metrics is now protected)
            return cached.value;
        }
        // Case 2: Stale cache hit with stale-while-revalidate enabled
        const staleWhileRevalidate = options.staleWhileRevalidate ?? false;
        if (staleWhileRevalidate && cached && cached.staleUntil && cached.staleUntil > this.now()) { // Use this.now()
            // Value is stale but still usable - trigger background refresh
            this.metrics.hits++; // FIX: Increment hits (stale hit) (metrics is now protected)
            try {
                // console.log(`Serving stale content for ${namespace} while revalidating`); // Removed for test hygiene
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
            // Background revalidation (don't await) - pass hashedKey
            this.revalidateInBackground(namespace, args, hashedKey, computeFn, options);
            return cached.value;
        }
        // Case 3: Cache miss or expired stale content
        this.metrics.misses++; // FIX: Increment misses (metrics is now protected)
        // Compute the value
        const value = await computeFn();
        // Store in cache
        const currentTime = this.now(); // Use this.now()
        const ttl = options.ttl || this.defaultTTL;
        const entry = {
            value,
            expiresAt: currentTime + ttl, // Use currentTime
            staleUntil: options.staleWhileRevalidate ? currentTime + ttl + (options.staleTime ?? 60 * 1000) : undefined // Use currentTime
        };
        // Set in cache using the full key
        await this.set(fullKey, entry);
        return value;
    }
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
    async revalidateInBackground(namespace, args, // Keep args for potential future use, though key is already hashed
    key, // This is the HASHED key
    computeFn, options = {}) {
        try {
            // Compute the value
            const value = await computeFn();
            // Store in cache
            const currentTime = this.now(); // Use this.now()
            const ttl = options.ttl || this.defaultTTL;
            const entry = {
                value,
                expiresAt: currentTime + ttl, // Use currentTime
                staleUntil: options.staleWhileRevalidate ? currentTime + ttl + (options.staleTime ?? 60 * 1000) : undefined // Use currentTime
            };
            // Set in cache using the full key (namespace + hashed key)
            const fullKey = this.generateFullKey(namespace, key);
            this.set(fullKey, entry);
            // try {
            //   console.log(`Background revalidation completed for ${namespace}`); // Removed for test hygiene
            // } catch (_) {
            //   // Ignore console errors during shutdown
            // } // Corrected closing brace placement
        }
        catch (error) {
            // Log but don't throw - this is a background operation
            try {
                console.error(`Background revalidation failed for ${namespace}:`, error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
        }
    }
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
    async invalidate(namespace, args) {
        // Generate the hashed key
        const key = super.generateKey(namespace, args); // Use base class to hash args
        const fullKey = this.generateFullKey(namespace, key); // Construct full key
        // Remove from in-memory cache using base invalidate (which uses generateKey)
        // This deletes from this.cache and this.accessLog
        super.invalidate(namespace, args);
        this.cache.delete(fullKey); // Explicitly delete again to be sure
        // Also remove from namespace cache using the hashed key
        if (this.namespaceCache.has(namespace)) {
            this.namespaceCache.get(namespace).delete(key);
            // If namespace becomes empty, remove it
            if (this.namespaceCache.get(namespace).size === 0) {
                this.namespaceCache.delete(namespace);
            }
        }
        // Remove from disk using the hashed key
        try {
            await this.persistenceManager.removeEntry(namespace, key); // Use hashed key
        }
        catch (error) {
            try {
                console.error(`Error removing cache entry ${namespace}:${key} from disk:`, error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
        }
    }
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
    clear() {
        // Clear in-memory cache
        super.clear();
        // Clear namespace cache
        this.namespaceCache.clear();
        // Clear disk cache
        this.persistenceManager.clear()
            .catch(error => {
            try {
                console.error('Error clearing persistent cache:', error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
        });
    }
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
    async persistToDisk() {
        // Check dirty flag first
        if (!this.isDirty) {
            // try {
            //   // console.log('Cache is not dirty, skipping persistence'); // Reduce noise
            // } catch (error) {
            //   // Ignore console errors during shutdown
            // }
            return;
        }
        try {
            // try {
            //   console.log('Persisting cache to disk...'); // Removed for test hygiene
            // } catch (error) {
            //   // Ignore console errors during shutdown
            // }
            // Immediately mark as not dirty to prevent race conditions with timer
            this.isDirty = false;
            // Perform the actual save
            await this.persistenceManager.saveAllEntries(this.namespaceCache);
            // try {
            //   console.log('Cache persisted successfully'); // Removed for test hygiene
            // } catch (error) {
            //   // Ignore console errors during shutdown
            // }
        }
        catch (error) {
            try {
                console.error('Error persisting cache to disk:', error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
            throw error;
        }
    }
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
    persistSync() {
        if (!this.isDirty) {
            return;
        }
        try {
            // Use a synchronous file write
            // This is not ideal, but it's the only way to ensure the cache is persisted before exit
            // try {
            //   console.log('Persisting cache synchronously before exit...'); // Removed for test hygiene
            // } catch (_) {
            //   // Ignore console errors during shutdown
            // }
            // We can't use the persistence manager directly because it's async
            // Instead, we'll use the imported Node.js fs module directly
            // Create the storage directory if it doesn't exist
            const storagePath = this.persistenceManager.storagePath;
            if (!fs.existsSync(storagePath)) {
                fs.mkdirSync(storagePath, { recursive: true });
            }
            // Create the namespaces directory if it doesn't exist
            const namespacesPath = path.join(storagePath, 'namespaces');
            if (!fs.existsSync(namespacesPath)) {
                fs.mkdirSync(namespacesPath, { recursive: true });
            }
            // Write each namespace to disk
            for (const [namespace, namespaceEntries] of this.namespaceCache.entries()) {
                // Create the namespace directory if it doesn't exist
                const namespacePath = path.join(namespacesPath, encodeURIComponent(namespace));
                if (!fs.existsSync(namespacePath)) {
                    fs.mkdirSync(namespacePath, { recursive: true });
                }
                // Write each entry to disk
                for (const [hashedKey, entry] of namespaceEntries.entries()) { // Iterate over hashed keys
                    // Skip expired entries
                    if (entry.expiresAt <= this.now()) { // Use this.now()
                        continue;
                    }
                    // Construct path using the hashed key
                    const entryPath = path.join(namespacePath, `${hashedKey}.json`);
                    // Serialize the entry (using the hashed key)
                    const serializedEntry = {
                        key: hashedKey, // Store the hashed key
                        value: entry.value,
                        metadata: {
                            createdAt: this.now(), // Use this.now()
                            expiresAt: entry.expiresAt,
                            staleUntil: entry.staleUntil,
                            size: JSON.stringify(entry.value).length,
                            contentType: typeof entry.value === 'object' ? 'application/json' : undefined
                        }
                    };
                    // Write to disk
                    fs.writeFileSync(entryPath, JSON.stringify(serializedEntry, null, 2), 'utf8');
                }
            }
            // Write metadata
            const metadataPath = path.join(storagePath, 'metadata.json');
            const metadata = {
                version: '1.0.0',
                lastPersisted: this.now(), // Use this.now()
                stats: {
                    totalEntries: this.getEntryCount(),
                    totalSize: 0 // We don't calculate this for sync persistence
                }
            };
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
            // try {
            //   console.log('Cache persisted synchronously'); // Removed for test hygiene
            // } catch (_) {
            //   // Ignore console errors during shutdown
            // }
        }
        catch (error) {
            try {
                console.error('Error persisting cache synchronously:', error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
        }
    }
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
    async loadFromDisk() {
        try { // Restore the outer try block for loadFromDisk
            // try {
            //   console.log('Loading cache from disk...'); // Removed for test hygiene
            // } catch (_) {
            //   // Ignore console errors during shutdown
            // }
            // Clear in-memory cache first
            super.clear();
            this.namespaceCache.clear();
            // Load all entries
            const entries = await this.persistenceManager.loadAllEntries();
            // Add entries to the in-memory cache
            for (const [namespace, namespaceEntries] of entries.entries()) {
                // Create namespace map if it doesn't exist
                if (!this.namespaceCache.has(namespace)) {
                    this.namespaceCache.set(namespace, new Map());
                }
                // Add entries to the namespace map
                const namespaceMap = this.namespaceCache.get(namespace);
                for (const [hashedKey, entry] of namespaceEntries.entries()) { // Key from loadAllEntries is the hashed key
                    // Skip expired entries
                    if (entry.expiresAt <= this.now()) { // Use this.now()
                        continue;
                    }
                    // Add to namespace map using hashedKey
                    namespaceMap.set(hashedKey, entry);
                    // Add to in-memory cache using full key (namespace:hashedKey)
                    const fullKey = this.generateFullKey(namespace, hashedKey);
                    super.set(fullKey, entry);
                }
            }
            // try {
            //   console.log(`Loaded ${this.getEntryCount()} entries from persistent storage`); // Removed for test hygiene
            // } catch (_) {
            //   // Ignore console errors during shutdown
            // }
        }
        catch (error) {
            try {
                console.error('Error loading cache from disk:', error);
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
            throw error;
        }
    }
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
    getStats() {
        // Get base stats
        const baseStats = super.getStats();
        // Add persistence stats
        return {
            ...baseStats,
            persistence: {
                isDirty: this.isDirty,
                namespaces: this.namespaceCache.size,
                persistedEntries: this.getEntryCount()
            }
        };
    }
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
    async dispose() {
        try {
            if (process.env.NODE_ENV !== 'test') {
                console.log('Disposing PersistentCache...');
            }
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
        // Stop the persistence timer first
        this.stopPersistenceTimer();
        // Persist any dirty entries (but don't wait too long in tests)
        if (this.isDirty) {
            try {
                const persistPromise = this.persistToDisk();
                // In test environment, use a shorter timeout to prevent hanging
                if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
                    await Promise.race([
                        persistPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Persist timeout during test disposal')), 1000))
                    ]);
                }
                else {
                    await persistPromise;
                }
                try {
                    if (process.env.NODE_ENV !== 'test') {
                        console.log('Cache persisted successfully during disposal.');
                    }
                }
                catch (_) {
                    // Ignore console errors during shutdown
                }
            }
            catch (error) {
                try {
                    if (process.env.NODE_ENV !== 'test') {
                        console.error('Error persisting cache during disposal:', error);
                    }
                }
                catch (_) {
                    // Ignore console errors during shutdown
                }
                // Don't re-throw in test environment to prevent hanging
            }
        }
        else {
            try {
                if (process.env.NODE_ENV !== 'test') {
                    console.log('No dirty entries to persist during disposal.');
                }
            }
            catch (_) {
                // Ignore console errors during shutdown
            }
        }
        // Remove all event listeners (only if they were registered)
        if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
            process.removeListener('exit', this.exitHandler);
            process.removeListener('SIGINT', this.sigintHandler);
            process.removeListener('SIGTERM', this.sigtermHandler);
            process.removeListener('SIGHUP', this.sighupHandler);
            process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
        }
        // Clear all internal data structures to help with garbage collection
        this.namespaceCache.clear();
        // Call the base class dispose to clear its resources (like the cleanup interval)
        await super.dispose();
        try {
            if (process.env.NODE_ENV !== 'test') {
                console.log('PersistentCache disposed.');
            }
        }
        catch (_) {
            // Ignore console errors during shutdown
        }
    }
    /**
     * Override evictLRUEntries to also remove from persistence
     * @param count Number of entries to evict
     * @protected - Changed from private in base class
     */
    // This method overrides the base class evictLRUEntries
    async evictLRUEntries(count) {
        // Ensure count is valid
        if (count <= 0)
            return;
        // console.log(`[Evict] Attempting to evict ${count} entries.`); // DEBUG LOG - Removed for test hygiene
        // Get keys sorted by last access time (oldest first)
        const sortedKeys = [...this.accessLog.entries()]
            .sort(([, timeA], [, timeB]) => timeA - timeB)
            .map(([key]) => key)
            .slice(0, count); // Get the 'count' oldest keys
        // console.log('[Evict] Keys targeted for eviction:', sortedKeys); // DEBUG LOG - Removed for test hygiene
        let actualEvictedCount = 0;
        const removePromises = [];
        for (const fullKey of sortedKeys) {
            // Remove from memory (base cache and access log)
            if (this.cache.delete(fullKey)) {
                this.accessLog.delete(fullKey);
                this.metrics.evictions++;
                actualEvictedCount++;
                // Remove from namespace cache and persistence layer
                const { namespace, key: hashedKey } = this.parseFullKey(fullKey);
                if (this.namespaceCache.has(namespace)) {
                    this.namespaceCache.get(namespace).delete(hashedKey);
                    if (this.namespaceCache.get(namespace).size === 0) {
                        this.namespaceCache.delete(namespace);
                    }
                }
                // Add persistence removal to promises
                removePromises.push(this.persistenceManager.removeEntry(namespace, hashedKey).catch(error => {
                    console.error(`Error removing evicted entry ${namespace}:${hashedKey} from disk:`, error);
                    // Don't block other evictions if one fails
                }));
            }
        }
        if (actualEvictedCount > 0) { // Restore this log as it's not a debug log
            console.log(`Evicted ${actualEvictedCount} LRU cache entries from memory`);
        }
        // Wait for all persistence removals to complete
        await Promise.all(removePromises);
    }
}
//# sourceMappingURL=persistentCache.js.map