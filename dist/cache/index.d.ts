/**
 * Advanced Caching System with Persistence Support
 *
 * This module provides a comprehensive caching solution with features including:
 *
 * - In-memory caching with TTL (Time-To-Live) expiration
 * - Disk persistence with configurable strategies
 * - Stale-while-revalidate pattern for improved performance
 * - Promise coalescing to prevent cache stampedes
 * - LRU (Least Recently Used) eviction policy
 * - Namespace-based organization
 * - Comprehensive metrics and monitoring
 *
 * The module is designed to be flexible and extensible, with clear separation
 * between the core caching logic, persistence strategies, and storage mechanisms.
 *
 * Main components:
 * - Cache: Base in-memory cache implementation
 * - PersistentCache: Extends Cache with disk persistence
 * - PersistenceManager: Handles low-level storage operations
 * - PersistenceStrategy: Defines when and how to persist entries
 *
 * @see https://web.dev/stale-while-revalidate/ for stale-while-revalidate pattern
 * @see https://en.wikipedia.org/wiki/Cache_stampede for cache stampede prevention
 */
export * from './types.js';
export * from './cache.js';
export * from './persistenceManager.js';
export * from './persistenceStrategies.js';
export * from './persistentCache.js';
//# sourceMappingURL=index.d.ts.map