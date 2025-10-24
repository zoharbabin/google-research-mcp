/**
 * Base class for persistence strategies
 *
 * Persistence strategies determine when and how cache entries are persisted to disk.
 * This abstract base class provides common functionality for all strategies:
 * - Namespace filtering (which namespaces should be persisted)
 * - Abstract methods that concrete strategies must implement
 *
 * Different strategies can be used for different use cases:
 * - Write-through for critical data that must never be lost
 * - Periodic for balancing performance and durability
 * - On-shutdown for non-critical data
 * - Hybrid for mixed requirements
 */
class BasePersistenceStrategy {
    persistentNamespaces;
    /**
     * Creates a new BasePersistenceStrategy
     *
     * @param persistentNamespaces - Array of namespace names that should be persisted
     *                              If empty, all namespaces will be persisted
     */
    constructor(persistentNamespaces = []) {
        this.persistentNamespaces = new Set(persistentNamespaces);
    }
    /**
     * Determines if a namespace should be persisted
     *
     * This helper method checks if a namespace is in the list of persistent namespaces.
     * If no namespaces are specified (empty set), all namespaces are considered persistent.
     *
     * @param namespace - The namespace to check
     * @returns True if the namespace should be persisted
     * @protected - Available to subclasses but not external code
     */
    shouldPersistNamespace(namespace) {
        // If no namespaces are specified, persist all
        if (this.persistentNamespaces.size === 0) {
            return true;
        }
        // Otherwise, only persist specified namespaces
        return this.persistentNamespaces.has(namespace);
    }
    /**
     * Called when the server is shutting down
     *
     * Gives the strategy a chance to perform final persistence operations
     * before the process terminates.
     *
     * @returns A promise that resolves when shutdown operations are complete
     */
    async onShutdown() {
        // Default implementation does nothing
    }
}
/**
 * Strategy that persists entries periodically at fixed intervals
 *
 * This strategy:
 * - Never persists immediately on set or get operations
 * - Instead, persists all entries at regular intervals
 * - Balances performance and durability
 *
 * Best used for:
 * - Large caches where immediate persistence would cause performance issues
 * - Data that can tolerate some loss in case of unexpected shutdown
 * - Scenarios where write frequency is high but durability requirements are moderate
 */
export class PeriodicPersistenceStrategy extends BasePersistenceStrategy {
    interval;
    /**
     * Creates a new PeriodicPersistenceStrategy
     *
     * @param interval - Time between persistence operations in milliseconds (default: 5 minutes)
     * @param persistentNamespaces - Namespaces that should be persisted
     */
    constructor(interval = 5 * 60 * 1000, persistentNamespaces = []) {
        super(persistentNamespaces);
        this.interval = interval;
    }
    /**
     * Determines if an entry should be persisted on set
     *
     * For this strategy, entries are never persisted immediately on set.
     * Instead, they are persisted during the periodic persistence cycle.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnSet() {
        // Never persist on set, only periodically
        return false;
    }
    /**
     * Determines if an entry should be persisted on get
     *
     * For this strategy, entries are never persisted on get.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnGet() {
        // Never persist on get, only periodically
        return false;
    }
    /**
     * Gets the interval for periodic persistence in milliseconds
     *
     * @returns The configured persistence interval
     */
    getPersistenceInterval() {
        return this.interval;
    }
}
/**
 * Strategy that persists entries immediately when they are set
 *
 * This strategy:
 * - Persists entries to disk immediately when they are set in the cache
 * - Never persists on get operations
 * - Does not use periodic persistence
 *
 * Best used for:
 * - Critical data that must never be lost
 * - Caches with infrequent writes but high durability requirements
 * - Scenarios where consistency between memory and disk is important
 */
export class WriteThroughPersistenceStrategy extends BasePersistenceStrategy {
    /**
     * Determines if an entry should be persisted on set
     *
     * For this strategy, entries are always persisted immediately on set
     * if they belong to a persistent namespace.
     *
     * @param namespace - The namespace of the entry
     * @returns True if the namespace should be persisted
     */
    shouldPersistOnSet(namespace) {
        return this.shouldPersistNamespace(namespace);
    }
    /**
     * Determines if an entry should be persisted on get
     *
     * For this strategy, entries are never persisted on get.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnGet() {
        // Never persist on get, only on set
        return false;
    }
    /**
     * Gets the interval for periodic persistence in milliseconds
     *
     * This strategy doesn't use periodic persistence.
     *
     * @returns null (periodic persistence disabled)
     */
    getPersistenceInterval() {
        // No periodic persistence
        return null;
    }
}
/**
 * Strategy that persists entries only when the server is shutting down
 *
 * This strategy:
 * - Never persists on set or get operations
 * - Does not use periodic persistence
 * - Persists all entries when the server is shutting down
 *
 * Best used for:
 * - Non-critical data that can be regenerated if lost
 * - Caches where performance is the primary concern
 * - Development or testing environments
 */
export class OnShutdownPersistenceStrategy extends BasePersistenceStrategy {
    /**
     * Determines if an entry should be persisted on set
     *
     * For this strategy, entries are never persisted on set.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnSet() {
        // Never persist on set, only on shutdown
        return false;
    }
    /**
     * Determines if an entry should be persisted on get
     *
     * For this strategy, entries are never persisted on get.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnGet() {
        // Never persist on get, only on shutdown
        return false;
    }
    /**
     * Gets the interval for periodic persistence in milliseconds
     *
     * This strategy doesn't use periodic persistence.
     *
     * @returns null (periodic persistence disabled)
     */
    getPersistenceInterval() {
        // No periodic persistence
        return null;
    }
    /**
     * Called when the server is shutting down
     *
     * This is the key method for this strategy - it signals that
     * all entries should be persisted before the server exits.
     *
     * @returns A resolved promise (actual persistence is handled by the cache)
     */
    async onShutdown() {
        // Signal that all entries should be persisted
        return Promise.resolve();
    }
}
/**
 * Hybrid strategy combining write-through for critical namespaces and periodic for others
 *
 * This strategy:
 * - Immediately persists entries in critical namespaces when they are set
 * - Periodically persists all other entries at a configurable interval
 * - Never persists on get operations
 *
 * Best used for:
 * - Mixed workloads with varying durability requirements
 * - Systems where some data is critical while other data is less important
 * - Production environments that need to balance performance and durability
 */
export class HybridPersistenceStrategy extends BasePersistenceStrategy {
    criticalNamespaces;
    interval;
    /**
     * Creates a new HybridPersistenceStrategy
     *
     * @param criticalNamespaces - Namespaces that should be persisted immediately on set
     * @param interval - Time between persistence operations in milliseconds (default: 5 minutes)
     * @param persistentNamespaces - All namespaces that should be persisted (critical + periodic)
     */
    constructor(criticalNamespaces = [], interval = 5 * 60 * 1000, persistentNamespaces = []) {
        super(persistentNamespaces);
        this.criticalNamespaces = new Set(criticalNamespaces);
        this.interval = interval;
    }
    /**
     * Determines if an entry should be persisted on set
     *
     * For this strategy, entries are persisted immediately on set only if:
     * 1. They belong to a persistent namespace, AND
     * 2. They belong to a critical namespace
     *
     * Other entries will be persisted during the periodic persistence cycle.
     *
     * @param namespace - The namespace of the entry
     * @returns True if the entry should be persisted immediately
     */
    shouldPersistOnSet(namespace) {
        // Only persist critical namespaces on set
        return this.shouldPersistNamespace(namespace) && this.criticalNamespaces.has(namespace);
    }
    /**
     * Determines if an entry should be persisted on get
     *
     * For this strategy, entries are never persisted on get.
     *
     * @returns Always false for this strategy
     */
    shouldPersistOnGet() {
        // Never persist on get
        return false;
    }
    /**
     * Gets the interval for periodic persistence in milliseconds
     *
     * @returns The configured persistence interval
     */
    getPersistenceInterval() {
        return this.interval;
    }
}
//# sourceMappingURL=persistenceStrategies.js.map