/**
 * OAuth Scopes Tests
 *
 * This file contains tests for the OAuth scopes implementation.
 * It verifies that:
 * 1. All required scopes are defined
 * 2. The scope validation function works correctly
 * 3. The documentation generation works correctly
 */
import { TOOL_SCOPES, ADMIN_SCOPES, COMPOSITE_SCOPES, SCOPE_DOCUMENTATION, hasRequiredScopes, ENDPOINT_REQUIRED_SCOPES } from './oauthScopes.js';
import { oauthScopesDocumentation } from './oauthScopesDocumentation.js';
describe('OAuth Scopes', () => {
    describe('Scope Definitions', () => {
        it('should define all required tool scopes', () => {
            expect(TOOL_SCOPES.GOOGLE_SEARCH).toBe('mcp:tool:google_search:execute');
            expect(TOOL_SCOPES.SCRAPE_PAGE).toBe('mcp:tool:scrape_page:execute');
            expect(TOOL_SCOPES.ANALYZE_WITH_GEMINI).toBe('mcp:tool:analyze_with_gemini:execute');
            expect(TOOL_SCOPES.RESEARCH_TOPIC).toBe('mcp:tool:research_topic:execute');
        });
        it('should define all required admin scopes', () => {
            expect(ADMIN_SCOPES.CACHE_READ).toBe('mcp:admin:cache:read');
            expect(ADMIN_SCOPES.CACHE_INVALIDATE).toBe('mcp:admin:cache:invalidate');
            expect(ADMIN_SCOPES.CACHE_PERSIST).toBe('mcp:admin:cache:persist');
            expect(ADMIN_SCOPES.EVENT_STORE_READ).toBe('mcp:admin:event-store:read');
            expect(ADMIN_SCOPES.EVENT_STORE_MANAGE).toBe('mcp:admin:event-store:manage');
            expect(ADMIN_SCOPES.CONFIG_READ).toBe('mcp:admin:config:read');
            expect(ADMIN_SCOPES.CONFIG_WRITE).toBe('mcp:admin:config:write');
            expect(ADMIN_SCOPES.LOGS_READ).toBe('mcp:admin:logs:read');
        });
        it('should define all required composite scopes', () => {
            expect(COMPOSITE_SCOPES.ADMIN).toBe('mcp:admin');
            expect(COMPOSITE_SCOPES.ALL_TOOLS).toBe('mcp:tool');
        });
    });
    describe('Scope Documentation', () => {
        it('should provide documentation for all scopes', () => {
            // Check that all tool scopes have documentation
            Object.values(TOOL_SCOPES).forEach(scope => {
                expect(SCOPE_DOCUMENTATION[scope]).toBeDefined();
                expect(SCOPE_DOCUMENTATION[scope].description).toBeTruthy();
                expect(SCOPE_DOCUMENTATION[scope].usage).toBeTruthy();
            });
            // Check that all admin scopes have documentation
            Object.values(ADMIN_SCOPES).forEach(scope => {
                expect(SCOPE_DOCUMENTATION[scope]).toBeDefined();
                expect(SCOPE_DOCUMENTATION[scope].description).toBeTruthy();
                expect(SCOPE_DOCUMENTATION[scope].usage).toBeTruthy();
            });
            // Check that all composite scopes have documentation
            Object.values(COMPOSITE_SCOPES).forEach(scope => {
                expect(SCOPE_DOCUMENTATION[scope]).toBeDefined();
                expect(SCOPE_DOCUMENTATION[scope].description).toBeTruthy();
                expect(SCOPE_DOCUMENTATION[scope].usage).toBeTruthy();
            });
        });
        it('should generate markdown documentation', () => {
            expect(oauthScopesDocumentation).toBeTruthy();
            expect(typeof oauthScopesDocumentation).toBe('string');
            expect(oauthScopesDocumentation).toContain('# OAuth Scopes for MCP Server');
            expect(oauthScopesDocumentation).toContain('## Tool Execution Scopes');
            expect(oauthScopesDocumentation).toContain('## Administrative Scopes');
            expect(oauthScopesDocumentation).toContain('## Composite Scopes');
        });
    });
    describe('Scope Validation', () => {
        it('should validate specific scopes correctly', () => {
            const tokenScopes = ['mcp:tool:google_search:execute', 'mcp:admin:cache:read'];
            // Should have google_search scope
            expect(hasRequiredScopes(tokenScopes, [TOOL_SCOPES.GOOGLE_SEARCH])).toBe(true);
            // Should have cache:read scope
            expect(hasRequiredScopes(tokenScopes, [ADMIN_SCOPES.CACHE_READ])).toBe(true);
            // Should not have scrape_page scope
            expect(hasRequiredScopes(tokenScopes, [TOOL_SCOPES.SCRAPE_PAGE])).toBe(false);
            // Should not have cache:invalidate scope
            expect(hasRequiredScopes(tokenScopes, [ADMIN_SCOPES.CACHE_INVALIDATE])).toBe(false);
        });
        it('should validate composite scopes correctly', () => {
            // Token with admin composite scope
            const adminToken = ['mcp:admin'];
            // Should have all admin scopes
            expect(hasRequiredScopes(adminToken, [ADMIN_SCOPES.CACHE_READ])).toBe(true);
            expect(hasRequiredScopes(adminToken, [ADMIN_SCOPES.CACHE_INVALIDATE])).toBe(true);
            expect(hasRequiredScopes(adminToken, [ADMIN_SCOPES.EVENT_STORE_READ])).toBe(true);
            // Should not have tool scopes
            expect(hasRequiredScopes(adminToken, [TOOL_SCOPES.GOOGLE_SEARCH])).toBe(false);
            // Token with all_tools composite scope
            const toolsToken = ['mcp:tool'];
            // Should have all tool scopes
            expect(hasRequiredScopes(toolsToken, [TOOL_SCOPES.GOOGLE_SEARCH])).toBe(true);
            expect(hasRequiredScopes(toolsToken, [TOOL_SCOPES.SCRAPE_PAGE])).toBe(true);
            expect(hasRequiredScopes(toolsToken, [TOOL_SCOPES.ANALYZE_WITH_GEMINI])).toBe(true);
            // Should not have admin scopes
            expect(hasRequiredScopes(toolsToken, [ADMIN_SCOPES.CACHE_READ])).toBe(false);
        });
        it('should validate multiple required scopes correctly', () => {
            const tokenScopes = ['mcp:tool:google_search:execute', 'mcp:admin:cache:read'];
            // Should have both scopes
            expect(hasRequiredScopes(tokenScopes, [
                TOOL_SCOPES.GOOGLE_SEARCH,
                ADMIN_SCOPES.CACHE_READ
            ])).toBe(true);
            // Should not have all required scopes
            expect(hasRequiredScopes(tokenScopes, [
                TOOL_SCOPES.GOOGLE_SEARCH,
                ADMIN_SCOPES.CACHE_INVALIDATE
            ])).toBe(false);
        });
    });
    describe('Endpoint Required Scopes', () => {
        it('should define required scopes for all endpoints', () => {
            // Check tool endpoints
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/tool/google_search']).toContain(TOOL_SCOPES.GOOGLE_SEARCH);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/tool/scrape_page']).toContain(TOOL_SCOPES.SCRAPE_PAGE);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/tool/analyze_with_gemini']).toContain(TOOL_SCOPES.ANALYZE_WITH_GEMINI);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/tool/research_topic']).toContain(TOOL_SCOPES.RESEARCH_TOPIC);
            // Check admin endpoints
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/cache-stats']).toContain(ADMIN_SCOPES.CACHE_READ);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/cache-invalidate']).toContain(ADMIN_SCOPES.CACHE_INVALIDATE);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/cache-persist']).toContain(ADMIN_SCOPES.CACHE_PERSIST);
            expect(ENDPOINT_REQUIRED_SCOPES['/mcp/event-store-stats']).toContain(ADMIN_SCOPES.EVENT_STORE_READ);
        });
    });
});
//# sourceMappingURL=oauthScopes.spec.js.map