/**
 * OAuth Scopes Documentation
 *
 * This file exports a markdown string containing comprehensive documentation
 * for the OAuth scopes used in the MCP server. This can be:
 * 1. Served through an API endpoint
 * 2. Used to generate static documentation files
 * 3. Displayed in the admin UI
 *
 * The documentation is kept in sync with the actual scope definitions in oauthScopes.ts
 */
import { TOOL_SCOPES, ADMIN_SCOPES, COMPOSITE_SCOPES, SCOPE_DOCUMENTATION } from './oauthScopes.js';
/**
 * Generates markdown documentation for the OAuth scopes
 * @returns Markdown formatted documentation
 */
export function generateOAuthScopesDocumentation() {
    return `# OAuth Scopes for MCP Server

## Introduction

This document defines the OAuth 2.1 scopes used for authorization in the MCP server. These scopes follow a hierarchical structure:

- \`mcp:tool:{tool_name}:execute\` - For executing specific tools
- \`mcp:admin:{resource}:{action}\` - For administrative actions

OAuth scopes provide granular permission control, allowing clients to request only the permissions they need. When implementing OAuth 2.1 authorization, these scopes should be requested by clients and validated by the server.

## Tool Execution Scopes

These scopes grant permission to execute specific tools provided by the MCP server.

| Scope | Description | Usage |
|-------|-------------|-------|
| \`${TOOL_SCOPES.GOOGLE_SEARCH}\` | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.GOOGLE_SEARCH].description} | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.GOOGLE_SEARCH].usage} |
| \`${TOOL_SCOPES.SCRAPE_PAGE}\` | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.SCRAPE_PAGE].description} | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.SCRAPE_PAGE].usage} |
| \`${TOOL_SCOPES.ANALYZE_WITH_GEMINI}\` | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.ANALYZE_WITH_GEMINI].description} | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.ANALYZE_WITH_GEMINI].usage} |
| \`${TOOL_SCOPES.RESEARCH_TOPIC}\` | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.RESEARCH_TOPIC].description} | ${SCOPE_DOCUMENTATION[TOOL_SCOPES.RESEARCH_TOPIC].usage} |

### Security Considerations for Tool Scopes

- **\`${TOOL_SCOPES.SCRAPE_PAGE}\`**: This scope allows making requests to arbitrary URLs. To mitigate Server-Side Request Forgery (SSRF) risks, implement URL allowlisting and validate URLs against private IP ranges.
- **\`${TOOL_SCOPES.ANALYZE_WITH_GEMINI}\`**: Consider the sensitivity of data being sent to external AI services. Ensure appropriate data handling policies are in place.

## Administrative Scopes

These scopes grant permission to perform administrative actions on the MCP server.

| Scope | Description | Usage |
|-------|-------------|-------|
| \`${ADMIN_SCOPES.CACHE_READ}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_READ].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_READ].usage} |
| \`${ADMIN_SCOPES.CACHE_INVALIDATE}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_INVALIDATE].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_INVALIDATE].usage} |
| \`${ADMIN_SCOPES.CACHE_PERSIST}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_PERSIST].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CACHE_PERSIST].usage} |
| \`${ADMIN_SCOPES.EVENT_STORE_READ}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.EVENT_STORE_READ].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.EVENT_STORE_READ].usage} |
| \`${ADMIN_SCOPES.EVENT_STORE_MANAGE}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.EVENT_STORE_MANAGE].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.EVENT_STORE_MANAGE].usage} |
| \`${ADMIN_SCOPES.CONFIG_READ}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CONFIG_READ].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CONFIG_READ].usage} |
| \`${ADMIN_SCOPES.CONFIG_WRITE}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CONFIG_WRITE].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.CONFIG_WRITE].usage} |
| \`${ADMIN_SCOPES.LOGS_READ}\` | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.LOGS_READ].description} | ${SCOPE_DOCUMENTATION[ADMIN_SCOPES.LOGS_READ].usage} |

### Security Considerations for Admin Scopes

- Administrative scopes should be granted with caution and only to trusted clients.
- Consider implementing additional security measures for administrative endpoints, such as IP allowlisting.
- Audit logging should be enabled for all actions performed with administrative scopes.

## Composite Scopes

These scopes represent collections of other scopes for convenience.

| Scope | Description | Usage |
|-------|-------------|-------|
| \`${COMPOSITE_SCOPES.ADMIN}\` | ${SCOPE_DOCUMENTATION[COMPOSITE_SCOPES.ADMIN].description} | ${SCOPE_DOCUMENTATION[COMPOSITE_SCOPES.ADMIN].usage} |
| \`${COMPOSITE_SCOPES.ALL_TOOLS}\` | ${SCOPE_DOCUMENTATION[COMPOSITE_SCOPES.ALL_TOOLS].description} | ${SCOPE_DOCUMENTATION[COMPOSITE_SCOPES.ALL_TOOLS].usage} |

### Security Considerations for Composite Scopes

- Composite scopes grant broad permissions and should be used sparingly.
- When possible, prefer granting specific scopes rather than composite scopes.
- Regularly audit which clients have been granted composite scopes.

## Implementation Guidelines

### For OAuth 2.1 Resource Server (MCP Server)

1. **Token Validation**: Validate incoming OAuth tokens using the token validation middleware.
2. **Scope Checking**: Use the \`hasRequiredScopes\` function to check if a token has the required scopes for an operation.
3. **Endpoint Protection**: Configure each endpoint to require specific scopes as defined in the \`ENDPOINT_REQUIRED_SCOPES\` mapping.

### For OAuth 2.1 Clients

1. **Request Minimal Scopes**: Only request the scopes needed for your application's functionality.
2. **User Consent**: Clearly explain to users which permissions your application is requesting and why.
3. **Token Management**: Securely store tokens and refresh them as needed.

## Scope Validation Example

\`\`\`typescript
import { hasRequiredScopes, TOOL_SCOPES } from './oauthScopes';

// Example token scopes from a validated JWT
const tokenScopes = ['mcp:tool:google_search:execute', 'mcp:admin:cache:read'];

// Check if the token has permission to execute the Google Search tool
const canExecuteGoogleSearch = hasRequiredScopes(tokenScopes, [TOOL_SCOPES.GOOGLE_SEARCH]);
// Result: true

// Check if the token has permission to execute the Scrape Page tool
const canExecuteScrapePage = hasRequiredScopes(tokenScopes, [TOOL_SCOPES.SCRAPE_PAGE]);
// Result: false
\`\`\`

## References

- [OAuth 2.1 Draft Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-07)
- [OAuth 2.0 Bearer Token Usage (RFC 6750)](https://tools.ietf.org/html/rfc6750)
- [MCP Server Security Improvements Implementation Guide](../plans/security-improvements-implementation-guide.md)
`;
}
// Export the documentation as a string
export const oauthScopesDocumentation = generateOAuthScopesDocumentation();
/**
 * Serves the OAuth scopes documentation through an API endpoint
 * @param req - Express request object
 * @param res - Express response object
 */
export function serveOAuthScopesDocumentation(req, res) {
    res.setHeader('Content-Type', 'text/markdown');
    res.send(oauthScopesDocumentation);
}
//# sourceMappingURL=oauthScopesDocumentation.js.map