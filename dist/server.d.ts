#!/usr/bin/env node
/**
 * MCP Server Implementation
 *
 * This file implements a Model Context Protocol (MCP) server that provides tools for:
 * - Web search via Google Custom Search API
 * - Web page scraping (including YouTube transcript extraction)
 * - Content analysis using Google's Gemini AI
 *
 * The server supports two transport mechanisms:
 * 1. STDIO - For direct process-to-process communication
 * 2. HTTP+SSE - For web-based clients with Server-Sent Events for streaming
 *
 * All operations use a sophisticated caching system to improve performance and
 * reduce API calls to external services.
 *
 * @see https://github.com/zoharbabin/google-research-mcp for MCP documentation
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PersistentEventStore } from "./shared/persistentEventStore.js";
import { PersistentCache } from "./cache/index.js";
import { OAuthMiddlewareOptions } from "./shared/oauthMiddleware.js";
import { RobustYouTubeTranscriptExtractor } from "./youtube/transcriptExtractor.js";
declare let globalCacheInstance: PersistentCache;
declare let eventStoreInstance: PersistentEventStore;
declare let transcriptExtractorInstance: RobustYouTubeTranscriptExtractor;
declare let stdioTransportInstance: StdioServerTransport | undefined;
declare let httpTransportInstance: StreamableHTTPServerTransport | undefined;
/**
 * Initializes global cache and event store instances.
 * Ensures storage directories exist.
 * @param cachePath - Path for cache storage
 * @param eventPath - Path for event storage
 */
declare function initializeGlobalInstances(cachePath?: string, eventPath?: string, requestQueuesPath?: string): Promise<void>;
/**
 * Factory function to create and configure the Express app for the HTTP+SSE transport
 *
 * @param cache - The pre-initialized PersistentCache instance
 * @param eventStore - The pre-initialized PersistentEventStore instance
 * @param oauthOptions - Optional OAuth configuration
 * @returns Object containing the Express app and the HTTP transport instance
 */
export declare function createAppAndHttpTransport(cache: PersistentCache, // Accept pre-initialized cache
eventStore: PersistentEventStore, // Accept pre-initialized event store
oauthOptions?: OAuthMiddlewareOptions): Promise<{
    app: import("express-serve-static-core").Express;
    httpTransport: StreamableHTTPServerTransport;
}>;
export { stdioTransportInstance, httpTransportInstance, globalCacheInstance, eventStoreInstance, transcriptExtractorInstance, initializeGlobalInstances };
//# sourceMappingURL=server.d.ts.map