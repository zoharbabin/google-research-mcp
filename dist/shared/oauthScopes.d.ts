/**
 * OAuth Scopes for MCP Server
 *
 * This file defines the OAuth scopes used for authorization in the MCP server.
 * These scopes follow a hierarchical structure:
 * - mcp:tool:{tool_name}:execute - For executing specific tools
 * - mcp:admin:{resource}:{action} - For administrative actions
 *
 * Each scope is documented with its purpose and when it should be used.
 */
/**
 * Tool Execution Scopes
 *
 * These scopes grant permission to execute specific tools provided by the MCP server.
 * Each tool has its own scope to allow for granular permission control.
 */
export declare const TOOL_SCOPES: {
    /**
     * Permission to execute the Google Search tool
     *
     * This scope allows clients to perform web searches using the Google Custom Search API.
     * Grant this scope to clients that need to search for information on the web.
     */
    GOOGLE_SEARCH: string;
    /**
     * Permission to execute the Scrape Page tool
     *
     * This scope allows clients to scrape content from web pages, including YouTube transcripts.
     * Grant this scope to clients that need to extract content from specific URLs.
     *
     * Note: This is a higher privilege scope as it involves making external network requests
     * to arbitrary URLs. Consider implementing additional URL allowlisting for security.
     */
    SCRAPE_PAGE: string;
    /**
     * Permission to execute the Analyze with Gemini tool
     *
     * This scope allows clients to analyze text content using Google's Gemini AI models.
     * Grant this scope to clients that need AI-powered text analysis capabilities.
     */
    ANALYZE_WITH_GEMINI: string;
    /**
     * Permission to execute the Research Topic tool
     *
     * This scope allows clients to use the composite research tool that chains:
     * 1. Google Search
     * 2. Page Scraping
     * 3. Content Analysis with Gemini
     *
     * Grant this scope to clients that need comprehensive research capabilities.
     * Note: This scope implicitly requires the other tool scopes, but explicit checks
     * should still be performed for each component tool.
     */
    RESEARCH_TOPIC: string;
};
/**
 * Administrative Scopes
 *
 * These scopes grant permission to perform administrative actions on the MCP server.
 * They follow the pattern mcp:admin:{resource}:{action} for granular control.
 */
export declare const ADMIN_SCOPES: {
    /**
     * Permission to view cache statistics
     *
     * This scope allows clients to access the /mcp/cache-stats endpoint to view
     * information about cache performance, hit/miss rates, and memory usage.
     * Grant this scope to monitoring tools and administrators who need to monitor
     * cache performance.
     */
    CACHE_READ: string;
    /**
     * Permission to invalidate cache entries
     *
     * This scope allows clients to access the /mcp/cache-invalidate endpoint to
     * clear specific cache entries or the entire cache.
     * Grant this scope only to administrators who need to manage cache data.
     */
    CACHE_INVALIDATE: string;
    /**
     * Permission to force cache persistence
     *
     * This scope allows clients to access the /mcp/cache-persist endpoint to
     * force immediate persistence of the cache to disk.
     * Grant this scope to administrators and maintenance scripts.
     */
    CACHE_PERSIST: string;
    /**
     * Permission to view event store statistics
     *
     * This scope allows clients to access the /mcp/event-store-stats endpoint to view
     * information about the event store's performance and usage.
     * Grant this scope to monitoring tools and administrators.
     */
    EVENT_STORE_READ: string;
    /**
     * Permission to manage event store data
     *
     * This scope allows clients to perform management operations on the event store,
     * such as clearing old events or forcing persistence.
     * Grant this scope only to administrators who need to manage event data.
     */
    EVENT_STORE_MANAGE: string;
    /**
     * Permission to view server configuration
     *
     * This scope allows clients to view the server's configuration settings.
     * Grant this scope to administrators who need to audit the server configuration.
     */
    CONFIG_READ: string;
    /**
     * Permission to modify server configuration
     *
     * This scope allows clients to modify the server's configuration settings.
     * Grant this scope only to trusted administrators.
     */
    CONFIG_WRITE: string;
    /**
     * Permission to view server logs
     *
     * This scope allows clients to access server logs via an API endpoint.
     * Grant this scope to administrators and monitoring tools.
     */
    LOGS_READ: string;
};
/**
 * Composite Scopes
 *
 * These scopes represent collections of other scopes for convenience.
 */
export declare const COMPOSITE_SCOPES: {
    /**
     * Full administrative access
     *
     * This scope grants all administrative permissions.
     * Grant this scope only to highly trusted administrators.
     *
     * Note: This is a high-privilege scope that should be used sparingly.
     * Prefer granting specific admin scopes when possible.
     */
    ADMIN: string;
    /**
     * Full tool execution access
     *
     * This scope grants permission to execute all tools.
     * Grant this scope to clients that need access to all tool functionality.
     */
    ALL_TOOLS: string;
};
/**
 * Required Scopes by Endpoint
 *
 * This mapping defines which scopes are required for each API endpoint.
 * Use this to configure the OAuth middleware for each route.
 */
export declare const ENDPOINT_REQUIRED_SCOPES: Record<string, string[]>;
/**
 * Scope Validation Helper
 *
 * Validates if a token has the required scopes.
 *
 * @param tokenScopes - Array of scopes from the OAuth token
 * @param requiredScopes - Array of scopes required for the operation
 * @returns True if the token has all required scopes, false otherwise
 */
export declare function hasRequiredScopes(tokenScopes: string[], requiredScopes: string[]): boolean;
/**
 * Scope Documentation
 *
 * This object provides human-readable descriptions of each scope for documentation purposes.
 */
export declare const SCOPE_DOCUMENTATION: Record<string, {
    description: string;
    usage: string;
}>;
//# sourceMappingURL=oauthScopes.d.ts.map