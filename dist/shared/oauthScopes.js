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
export const TOOL_SCOPES = {
    /**
     * Permission to execute the Google Search tool
     *
     * This scope allows clients to perform web searches using the Google Custom Search API.
     * Grant this scope to clients that need to search for information on the web.
     */
    GOOGLE_SEARCH: 'mcp:tool:google_search:execute',
    /**
     * Permission to execute the Scrape Page tool
     *
     * This scope allows clients to scrape content from web pages, including YouTube transcripts.
     * Grant this scope to clients that need to extract content from specific URLs.
     *
     * Note: This is a higher privilege scope as it involves making external network requests
     * to arbitrary URLs. Consider implementing additional URL allowlisting for security.
     */
    SCRAPE_PAGE: 'mcp:tool:scrape_page:execute',
    /**
     * Permission to execute the Analyze with Gemini tool
     *
     * This scope allows clients to analyze text content using Google's Gemini AI models.
     * Grant this scope to clients that need AI-powered text analysis capabilities.
     */
    ANALYZE_WITH_GEMINI: 'mcp:tool:analyze_with_gemini:execute',
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
    RESEARCH_TOPIC: 'mcp:tool:research_topic:execute',
};
/**
 * Administrative Scopes
 *
 * These scopes grant permission to perform administrative actions on the MCP server.
 * They follow the pattern mcp:admin:{resource}:{action} for granular control.
 */
export const ADMIN_SCOPES = {
    /**
     * Permission to view cache statistics
     *
     * This scope allows clients to access the /mcp/cache-stats endpoint to view
     * information about cache performance, hit/miss rates, and memory usage.
     * Grant this scope to monitoring tools and administrators who need to monitor
     * cache performance.
     */
    CACHE_READ: 'mcp:admin:cache:read',
    /**
     * Permission to invalidate cache entries
     *
     * This scope allows clients to access the /mcp/cache-invalidate endpoint to
     * clear specific cache entries or the entire cache.
     * Grant this scope only to administrators who need to manage cache data.
     */
    CACHE_INVALIDATE: 'mcp:admin:cache:invalidate',
    /**
     * Permission to force cache persistence
     *
     * This scope allows clients to access the /mcp/cache-persist endpoint to
     * force immediate persistence of the cache to disk.
     * Grant this scope to administrators and maintenance scripts.
     */
    CACHE_PERSIST: 'mcp:admin:cache:persist',
    /**
     * Permission to view event store statistics
     *
     * This scope allows clients to access the /mcp/event-store-stats endpoint to view
     * information about the event store's performance and usage.
     * Grant this scope to monitoring tools and administrators.
     */
    EVENT_STORE_READ: 'mcp:admin:event-store:read',
    /**
     * Permission to manage event store data
     *
     * This scope allows clients to perform management operations on the event store,
     * such as clearing old events or forcing persistence.
     * Grant this scope only to administrators who need to manage event data.
     */
    EVENT_STORE_MANAGE: 'mcp:admin:event-store:manage',
    /**
     * Permission to view server configuration
     *
     * This scope allows clients to view the server's configuration settings.
     * Grant this scope to administrators who need to audit the server configuration.
     */
    CONFIG_READ: 'mcp:admin:config:read',
    /**
     * Permission to modify server configuration
     *
     * This scope allows clients to modify the server's configuration settings.
     * Grant this scope only to trusted administrators.
     */
    CONFIG_WRITE: 'mcp:admin:config:write',
    /**
     * Permission to view server logs
     *
     * This scope allows clients to access server logs via an API endpoint.
     * Grant this scope to administrators and monitoring tools.
     */
    LOGS_READ: 'mcp:admin:logs:read',
};
/**
 * Composite Scopes
 *
 * These scopes represent collections of other scopes for convenience.
 */
export const COMPOSITE_SCOPES = {
    /**
     * Full administrative access
     *
     * This scope grants all administrative permissions.
     * Grant this scope only to highly trusted administrators.
     *
     * Note: This is a high-privilege scope that should be used sparingly.
     * Prefer granting specific admin scopes when possible.
     */
    ADMIN: 'mcp:admin',
    /**
     * Full tool execution access
     *
     * This scope grants permission to execute all tools.
     * Grant this scope to clients that need access to all tool functionality.
     */
    ALL_TOOLS: 'mcp:tool',
};
/**
 * Required Scopes by Endpoint
 *
 * This mapping defines which scopes are required for each API endpoint.
 * Use this to configure the OAuth middleware for each route.
 */
export const ENDPOINT_REQUIRED_SCOPES = {
    // Tool endpoints
    '/mcp/tool/google_search': [TOOL_SCOPES.GOOGLE_SEARCH],
    '/mcp/tool/scrape_page': [TOOL_SCOPES.SCRAPE_PAGE],
    '/mcp/tool/analyze_with_gemini': [TOOL_SCOPES.ANALYZE_WITH_GEMINI],
    '/mcp/tool/research_topic': [TOOL_SCOPES.RESEARCH_TOPIC],
    // Admin endpoints
    '/mcp/cache-stats': [ADMIN_SCOPES.CACHE_READ],
    '/mcp/cache-invalidate': [ADMIN_SCOPES.CACHE_INVALIDATE],
    '/mcp/cache-persist': [ADMIN_SCOPES.CACHE_PERSIST],
    '/mcp/event-store-stats': [ADMIN_SCOPES.EVENT_STORE_READ],
};
/**
 * Scope Validation Helper
 *
 * Validates if a token has the required scopes.
 *
 * @param tokenScopes - Array of scopes from the OAuth token
 * @param requiredScopes - Array of scopes required for the operation
 * @returns True if the token has all required scopes, false otherwise
 */
export function hasRequiredScopes(tokenScopes, requiredScopes) {
    // Check for composite admin scope
    if (tokenScopes.includes(COMPOSITE_SCOPES.ADMIN)) {
        // Admin scope grants access to all admin endpoints
        if (requiredScopes.some(scope => scope.startsWith('mcp:admin'))) {
            return true;
        }
    }
    // Check for composite tool scope
    if (tokenScopes.includes(COMPOSITE_SCOPES.ALL_TOOLS)) {
        // All_tools scope grants access to all tool endpoints
        if (requiredScopes.some(scope => scope.startsWith('mcp:tool'))) {
            return true;
        }
    }
    // Check for specific required scopes
    return requiredScopes.every(requiredScope => tokenScopes.includes(requiredScope));
}
/**
 * Scope Documentation
 *
 * This object provides human-readable descriptions of each scope for documentation purposes.
 */
export const SCOPE_DOCUMENTATION = {
    // Tool scopes
    [TOOL_SCOPES.GOOGLE_SEARCH]: {
        description: 'Allows executing the Google Search tool to find information on the web',
        usage: 'Grant to clients that need to search for information using Google Custom Search'
    },
    [TOOL_SCOPES.SCRAPE_PAGE]: {
        description: 'Allows scraping content from web pages and extracting YouTube transcripts',
        usage: 'Grant to clients that need to extract content from specific URLs'
    },
    [TOOL_SCOPES.ANALYZE_WITH_GEMINI]: {
        description: 'Allows analyzing text content using Google\'s Gemini AI models',
        usage: 'Grant to clients that need AI-powered text analysis capabilities'
    },
    [TOOL_SCOPES.RESEARCH_TOPIC]: {
        description: 'Allows using the composite research tool that chains search, scraping, and analysis',
        usage: 'Grant to clients that need comprehensive research capabilities'
    },
    // Admin scopes
    [ADMIN_SCOPES.CACHE_READ]: {
        description: 'Allows viewing cache statistics and performance metrics',
        usage: 'Grant to monitoring tools and administrators who need to monitor cache performance'
    },
    [ADMIN_SCOPES.CACHE_INVALIDATE]: {
        description: 'Allows invalidating specific cache entries or clearing the entire cache',
        usage: 'Grant only to administrators who need to manage cache data'
    },
    [ADMIN_SCOPES.CACHE_PERSIST]: {
        description: 'Allows forcing immediate persistence of the cache to disk',
        usage: 'Grant to administrators and maintenance scripts'
    },
    [ADMIN_SCOPES.EVENT_STORE_READ]: {
        description: 'Allows viewing event store statistics and performance metrics',
        usage: 'Grant to monitoring tools and administrators'
    },
    [ADMIN_SCOPES.EVENT_STORE_MANAGE]: {
        description: 'Allows managing event store data, such as clearing old events',
        usage: 'Grant only to administrators who need to manage event data'
    },
    [ADMIN_SCOPES.CONFIG_READ]: {
        description: 'Allows viewing the server\'s configuration settings',
        usage: 'Grant to administrators who need to audit the server configuration'
    },
    [ADMIN_SCOPES.CONFIG_WRITE]: {
        description: 'Allows modifying the server\'s configuration settings',
        usage: 'Grant only to trusted administrators'
    },
    [ADMIN_SCOPES.LOGS_READ]: {
        description: 'Allows accessing server logs via an API endpoint',
        usage: 'Grant to administrators and monitoring tools'
    },
    // Composite scopes
    [COMPOSITE_SCOPES.ADMIN]: {
        description: 'Grants all administrative permissions',
        usage: 'Grant only to highly trusted administrators'
    },
    [COMPOSITE_SCOPES.ALL_TOOLS]: {
        description: 'Grants permission to execute all tools',
        usage: 'Grant to clients that need access to all tool functionality'
    },
};
//# sourceMappingURL=oauthScopes.js.map