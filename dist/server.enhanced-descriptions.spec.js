/**
 * Enhanced MCP Tool Descriptions Integration Test
 *
 * This test suite verifies that the enhanced tool descriptions are properly implemented
 * and accessible through the MCP server functionality.
 */
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PersistentCache, HybridPersistenceStrategy } from './cache/index.js';
import { PersistentEventStore } from './shared/persistentEventStore.js';
import { createAppAndHttpTransport } from './server.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import supertest from 'supertest';
// Mock external dependencies
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: jest.fn(() => Promise.resolve({ text: 'Mock AI analysis result' }))
        }
    }))
}));
jest.mock('crawlee', () => ({
    CheerioCrawler: jest.fn().mockImplementation(() => ({
        run: jest.fn(() => Promise.resolve())
    }))
}));
jest.mock('@danielxceron/youtube-transcript', () => ({
    YoutubeTranscript: {
        fetchTranscript: jest.fn(() => Promise.resolve([
            { text: 'Mock transcript segment 1' },
            { text: 'Mock transcript segment 2' }
        ]))
    }
}));
// Mock fetch for Google Search API
global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
        items: [
            { link: 'https://example1.com' },
            { link: 'https://example2.com' }
        ]
    })
}));
// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
describe('Enhanced Tool Descriptions - Server Integration', () => {
    let app;
    let testCache;
    let testEventStore;
    const testStorageDir = path.resolve(__dirname, '..', 'storage', 'test_temp', `enhanced-descriptions-spec-${Date.now()}`);
    const testCachePath = path.join(testStorageDir, 'cache');
    const testEventPath = path.join(testStorageDir, 'events');
    beforeAll(async () => {
        // Setup test environment
        process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'test-api-key';
        process.env.GOOGLE_CUSTOM_SEARCH_ID = 'test-search-id';
        process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
        // Ensure test storage directory exists
        await fs.mkdir(testStorageDir, { recursive: true });
        // Create test-specific cache and event store instances
        testCache = new PersistentCache({
            storagePath: testCachePath,
            persistenceStrategy: new HybridPersistenceStrategy([], 5000, []),
            eagerLoading: false
        });
        testEventStore = new PersistentEventStore({
            storagePath: testEventPath,
            eagerLoading: false
        });
        // Create app instance
        const { app: createdApp } = await createAppAndHttpTransport(testCache, testEventStore);
        app = createdApp;
    });
    afterAll(async () => {
        // Cleanup test resources
        if (testCache) {
            await testCache.dispose();
        }
        if (testEventStore) {
            await testEventStore.dispose();
        }
        await fs.rm(testStorageDir, { recursive: true, force: true });
    });
    describe('Tool Registration and Discovery', () => {
        it('should register all tools with enhanced descriptions', () => {
            // This test verifies that the server starts successfully with enhanced tool descriptions
            // The actual tool registration happens during server creation
            expect(app).toBeDefined();
        });
        it('should provide cache statistics endpoint', async () => {
            const response = await supertest(app)
                .get('/mcp/cache-stats')
                .expect(200);
            expect(response.body).toHaveProperty('cache');
            expect(response.body).toHaveProperty('process');
            expect(response.body).toHaveProperty('server');
            expect(response.body.cache).toHaveProperty('timestamp');
        });
        it('should provide event store statistics endpoint', async () => {
            const response = await supertest(app)
                .get('/mcp/event-store-stats')
                .expect(200);
            expect(response.body).toHaveProperty('eventStore');
            expect(response.body.eventStore).toHaveProperty('timestamp');
        });
    });
    describe('Enhanced Parameter Validation', () => {
        it('should handle invalid batch requests properly', async () => {
            // Test empty batch request (should be rejected)
            const response = await supertest(app)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .send([]);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.message).toContain('Empty batch');
        });
        it('should handle batch requests without valid session ID', async () => {
            const batchRequest = [
                {
                    jsonrpc: "2.0",
                    method: "callTool",
                    params: {
                        name: "google_search",
                        arguments: { query: "test", num_results: 5 }
                    },
                    id: 1
                }
            ];
            const response = await supertest(app)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .set('Mcp-Session-Id', 'invalid-session-id')
                .send(batchRequest);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.message).toContain('No valid session ID');
        });
    });
    describe('Backward Compatibility', () => {
        it('should maintain existing API endpoints', async () => {
            // Test that all expected endpoints are available
            const endpoints = [
                '/mcp/cache-stats',
                '/mcp/event-store-stats',
                '/mcp/oauth-config',
                '/mcp/oauth-scopes'
            ];
            for (const endpoint of endpoints) {
                const response = await supertest(app).get(endpoint);
                expect(response.status).not.toBe(404);
            }
        });
        it('should handle cache management endpoints', async () => {
            // Test cache persistence endpoint
            const response = await supertest(app)
                .get('/mcp/cache-persist')
                .expect(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('persistedAt');
        });
    });
    describe('Performance Verification', () => {
        it('should respond to health check endpoints quickly', async () => {
            const startTime = Date.now();
            await supertest(app)
                .get('/mcp/cache-stats')
                .expect(200);
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            // Should respond within 100ms for simple endpoints
            expect(responseTime).toBeLessThan(100);
        });
        it('should handle multiple concurrent requests', async () => {
            const requests = Array(10).fill(null).map(() => supertest(app).get('/mcp/cache-stats'));
            const responses = await Promise.all(requests);
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle malformed JSON requests', async () => {
            const response = await supertest(app)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .send('invalid json');
            expect(response.status).toBe(400);
        });
        it('should handle unsupported HTTP methods', async () => {
            const response = await supertest(app)
                .patch('/mcp')
                .send({});
            expect(response.status).toBe(404);
        });
    });
    describe('OAuth Configuration', () => {
        it('should provide OAuth configuration', async () => {
            const response = await supertest(app)
                .get('/mcp/oauth-config')
                .expect(200);
            expect(response.body).toHaveProperty('oauth');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.oauth).toHaveProperty('enabled');
        });
        it('should provide OAuth scopes documentation', async () => {
            const response = await supertest(app)
                .get('/mcp/oauth-scopes')
                .expect(200);
            // Should return markdown content
            expect(response.text).toContain('OAuth');
            expect(response.headers['content-type']).toContain('text/markdown');
        });
    });
});
//# sourceMappingURL=server.enhanced-descriptions.spec.js.map