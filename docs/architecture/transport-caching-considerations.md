# Guide: Transport and Caching Consistency

This document explains how the Google Researcher MCP Server ensures consistent caching behavior across its different transport mechanisms and why this is critical for performance and reliability.

## The Challenge: Multiple Transports, One Cache

The server supports two primary transport methods, as detailed in the [**Architecture Guide**](./architecture.md):

1.  **STDIO Transport**: For local, process-based communication.
2.  **HTTP+SSE Transport**: For remote, web-based communication.

A key feature of the server is its **persistent caching system**, which saves the results of expensive operations to disk. For this cache to be effective, all server instances—regardless of which transport they are serving—must read from and write to the *same physical location* on disk.

Without careful management, two major issues could arise:

1.  **Divergent Cache Locations**: If the cache path is relative (e.g., `../storage`), an STDIO server launched from one directory and an HTTP server launched from another would create two separate, unshared caches.
2.  **Data Loss in Short-Lived Processes**: STDIO server instances are often short-lived, created on-demand by a client. If such a process exits before the cache has a chance to be persisted to disk, valuable cached data would be lost.

## The Solution: A Unified Caching Strategy

The server implements two core strategies to solve these problems and guarantee a unified cache.

### 1. Global Singleton Instances

The most critical design choice is the use of **global singleton instances** for both the `PersistentCache` and the `PersistentEventStore`. As of version 1.0.0, these components are initialized *once* when the main server module (`src/server.ts`) is first loaded.

**How it Works:**
-   When `src/server.ts` is imported, it creates a single `globalCache` and a single `eventStoreInstance`.
-   Both the STDIO and HTTP transport initializers receive and use these *exact same instances*.
-   This ensures that all operations, regardless of their origin, are funneled through the same in-memory cache and the same persistence logic.

This approach effectively eliminates the problem of divergent cache locations at the application level.

### 2. Robust Shutdown Handling

To prevent data loss in short-lived processes, the `PersistentCache` and `PersistentEventStore` are designed with robust shutdown handling.

They listen for all common process termination signals:
-   `SIGINT` (e.g., Ctrl+C)
-   `SIGTERM` (e.g., from `kill` or process managers)
-   `SIGHUP` (when a parent terminal closes)
-   `beforeExit` (for graceful shutdowns)

When any of these signals are detected, the persistence components trigger a **synchronous, final write-to-disk operation**. This ensures that even if an STDIO process is terminated abruptly by its parent, it has a chance to save its in-memory cache before exiting.

## Security Context Awareness

It is important to note that while the *caching mechanism* is unified, the *security context* differs between transports:
-   **HTTP/SSE**: Secured by a mandatory OAuth 2.1 layer.
-   **STDIO**: Operates within the security context of the local user and the parent process that launched it.

Developers should always be mindful of these differing security models when designing and implementing clients.

## Summary of Benefits

This unified caching strategy provides:
-   **Maximum Cache Sharing**: All transports and sessions share the same cache, leading to higher hit rates.
-   **Improved Performance**: Faster responses for all clients, as a result cached by an HTTP client can be served to an STDIO client, and vice-versa.
-   **Reduced Costs**: Fewer redundant calls are made to external APIs.
-   **Data Integrity**: Robust shutdown handling minimizes the risk of data loss.
