// NOTE: Complex batch processing logic involving SDK transport/sessions
// is verified by the E2E test `e2e_batch_request_test.mjs`.
// These unit tests focus only on specific server-side checks
// related to batch requests (e.g., empty batches, missing session IDs).
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PersistentCache, HybridPersistenceStrategy } from './cache/index.js'; // Import necessary cache components
import { PersistentEventStore } from './shared/persistentEventStore.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// Mock the transport layer to avoid session/network issues in unit tests
const mockHandleRequest = jest.fn();
// Mock the StreamableHTTPServerTransport class
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
    return {
        StreamableHTTPServerTransport: jest.fn().mockImplementation(() => {
            return {
                handleRequest: mockHandleRequest,
                onclose: jest.fn(),
                onsessioninitialized: jest.fn() // Simplified mock
            };
        })
    };
});
// Now import the server module after the mocks are set up
import { createAppAndHttpTransport } from './server.js'; // Import the renamed function
import supertest from 'supertest';
// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Test basic batch request validation handled directly by the server
describe('JSON-RPC Batch Request Handling (Server-Side Checks)', () => {
    let app;
    let testCache; // Use test-specific instances
    let testEventStore;
    const testStorageDir = path.resolve(__dirname, '..', 'storage', 'test_temp', `batch-spec-${Date.now()}`);
    const testCachePath = path.join(testStorageDir, 'cache');
    const testEventPath = path.join(testStorageDir, 'events');
    beforeAll(async () => {
        // Use real timers for this test suite to avoid hanging
        jest.useRealTimers();
        // Setup test environment variables to prevent process.exit(1) in createAppAndHttpTransport
        process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'test-api-key';
        process.env.GOOGLE_CUSTOM_SEARCH_ID = 'test-search-id';
        process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key';
        // Ensure test storage directory exists
        await fs.mkdir(testStorageDir, { recursive: true });
        // Create test-specific cache and event store instances
        testCache = new PersistentCache({
            storagePath: testCachePath,
            persistenceStrategy: new HybridPersistenceStrategy([], 5000, []), // Simple strategy for tests
            eagerLoading: false // Don't load eagerly for unit tests
        });
        testEventStore = new PersistentEventStore({
            storagePath: testEventPath,
            eagerLoading: false // Don't load eagerly for unit tests
        });
        // No need to explicitly load from disk for these unit tests
        // Create app instance using the test instances
        // Note: OAuth options are not needed for these specific tests
        const { app: createdApp } = await createAppAndHttpTransport(testCache, testEventStore);
        app = createdApp;
    });
    afterAll(async () => {
        // Dispose test-specific resources
        if (testCache) {
            await testCache.dispose();
        }
        if (testEventStore) {
            await testEventStore.dispose();
        }
        // Clean up test storage directory
        await fs.rm(testStorageDir, { recursive: true, force: true });
        // Clear environment variables to avoid affecting other tests
        delete process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        delete process.env.GOOGLE_CUSTOM_SEARCH_ID;
        delete process.env.GOOGLE_GEMINI_API_KEY;
        // Restore fake timers for other tests
        jest.useFakeTimers();
    });
    it('should handle empty batch requests with a 400 error', async () => {
        // Use the app instance created in beforeAll
        const request = supertest(app);
        const response = await request
            .post('/mcp')
            .set('Content-Type', 'application/json')
            .send([]);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            jsonrpc: "2.0",
            error: { code: -32600, message: "Invalid Request: Empty batch" },
            id: null
        });
    });
    it('should reject batch requests without a valid session ID', async () => {
        // Use the app instance created in beforeAll
        const request = supertest(app);
        const batchRequest = [
            { jsonrpc: "2.0", method: "callTool", params: { name: "google_search", arguments: { query: "test" } }, id: 1 }
        ];
        const response = await request
            .post('/mcp')
            .set('Content-Type', 'application/json')
            .set('Mcp-Session-Id', 'invalid-session-id')
            .send(batchRequest);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID provided" },
            id: null
        });
        expect(mockHandleRequest).not.toHaveBeenCalled();
    });
    // Removed tests related to successful batch processing via transport,
    // as that logic is covered by e2e_batch_request_test.mjs
});
//# sourceMappingURL=server.batch.spec.js.map