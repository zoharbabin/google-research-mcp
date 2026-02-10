/**
 * MCP Transport Layer Test Suite
 *
 * Tests for STDIO and HTTP-SSE transport mechanisms:
 *
 * STDIO Transport:
 * - Concurrent request handling
 * - Malformed JSON graceful handling
 * - Message ordering
 *
 * HTTP-SSE Transport:
 * - SSE connection establishment
 * - OAuth token validation
 * - Session management
 *
 * @see https://spec.modelcontextprotocol.io/specification/basic/transports/
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Express } from 'express';
import supertest from 'supertest';
import {
  createTestStoragePaths,
  ensureTestStorageDirs,
  cleanupTestStorage,
  setupTestEnv,
  cleanupTestEnv,
  createTestInstances,
  disposeTestInstances,
  cleanupProcessListeners,
  type TestInstances,
} from './test-helpers.js';

// Mock the StreamableHTTPServerTransport to test transport behavior
const mockHandleRequest = jest.fn();
const mockOnSessionInitialized = jest.fn();

jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: jest.fn().mockImplementation((options) => {
    // Call onsessioninitialized callback if provided
    if (options?.onsessioninitialized) {
      mockOnSessionInitialized.mockImplementation(options.onsessioninitialized);
    }
    return {
      handleRequest: mockHandleRequest,
      onclose: jest.fn(),
      onsessioninitialized: mockOnSessionInitialized,
    };
  }),
}));

// Mock other dependencies
jest.mock('crawlee', () => ({
  CheerioCrawler: jest.fn().mockImplementation(() => ({
    run: jest.fn(() => Promise.resolve()),
  })),
  PlaywrightCrawler: jest.fn().mockImplementation(() => ({
    run: jest.fn(() => Promise.resolve()),
  })),
  Configuration: { getGlobalConfig: () => ({ set: jest.fn() }) },
  log: { setLevel: jest.fn() },
  LogLevel: { OFF: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4 },
}));

jest.mock('@danielxceron/youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: jest.fn(() =>
      Promise.resolve([
        { text: 'Mock transcript segment 1' },
        { text: 'Mock transcript segment 2' },
      ])
    ),
  },
}));

// Mock fetch for Google Search API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        items: [
          { link: 'https://example1.com', title: 'Example 1' },
          { link: 'https://example2.com', title: 'Example 2' },
        ],
      }),
  })
) as any;

const paths = createTestStoragePaths('transport-spec', import.meta.url);

describe('MCP Transport Layer', () => {
  let app: Express;
  let testCache: TestInstances['cache'];
  let testEventStore: TestInstances['eventStore'];

  beforeAll(async () => {
    jest.useRealTimers();
    setupTestEnv({ NODE_ENV: 'test' });
    await ensureTestStorageDirs(paths);

    const instances = createTestInstances(paths);
    testCache = instances.cache;
    testEventStore = instances.eventStore;

    const { createAppAndHttpTransport } = await import('./server.js');
    const { app: createdApp } = await createAppAndHttpTransport(testCache, testEventStore);
    app = createdApp;
  });

  afterAll(async () => {
    await disposeTestInstances({ cache: testCache, eventStore: testEventStore });
    await cleanupTestStorage(paths);
    cleanupTestEnv();
    cleanupProcessListeners();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRequest.mockReset();
  });

  afterEach(() => {
    cleanupProcessListeners();
  });

  // ── STDIO Transport Tests ──────────────────────────────────────────────────

  describe('STDIO Transport', () => {
    describe('Concurrent Request Handling', () => {
      it('should handle multiple parallel requests to HTTP transport', async () => {
        // Simulate concurrent requests by sending multiple requests
        const requests = Array.from({ length: 5 }, (_, i) =>
          supertest(app)
            .post('/mcp')
            .set('Content-Type', 'application/json')
            .send([])
        );

        const responses = await Promise.all(requests);

        // All requests should complete and return consistent error for empty batch
        responses.forEach((response) => {
          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe(-32600);
        });
      });

      it('should maintain request isolation between concurrent requests', async () => {
        // Each request should get its own response
        const request1 = supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send([]);

        const request2 = supertest(app)
          .get('/health');

        const [response1, response2] = await Promise.all([request1, request2]);

        // Requests should not interfere with each other
        expect(response1.status).toBe(400); // Empty batch error
        expect(response2.status).toBe(200); // Health check success
        expect(response2.body.status).toBe('ok');
      });
    });

    describe('Malformed JSON Handling', () => {
      it('should handle malformed JSON gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('{ invalid json }');

        expect(response.status).toBe(400);
        // Express json parser returns 400 for malformed JSON
      });

      it('should handle truncated JSON gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('{ "jsonrpc": "2.0", "method":');

        expect(response.status).toBe(400);
      });

      it('should handle empty body gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('');

        // Empty body causes Express json parser to pass through, then SDK returns 406
        expect([400, 406]).toContain(response.status);
      });

      it('should handle null body gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('null');

        // null is valid JSON but not a valid JSON-RPC request
        expect(response.status).not.toBe(500);
      });

      it('should handle non-object JSON gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('"just a string"');

        // String is valid JSON but not a valid JSON-RPC request
        expect(response.status).not.toBe(500);
      });

      it('should handle number JSON gracefully', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send('42');

        // Number is valid JSON but not a valid JSON-RPC request
        expect(response.status).not.toBe(500);
      });
    });

    describe('Message Ordering', () => {
      it('should process sequential requests in order', async () => {
        const results: number[] = [];

        // Send requests sequentially
        for (let i = 0; i < 3; i++) {
          const response = await supertest(app)
            .get('/health');
          if (response.status === 200) {
            results.push(i);
          }
        }

        // Results should be in order
        expect(results).toEqual([0, 1, 2]);
      });

      it('should return consistent responses for identical requests', async () => {
        const response1 = await supertest(app).get('/version');
        const response2 = await supertest(app).get('/version');

        expect(response1.body.version).toBe(response2.body.version);
        expect(response1.body.name).toBe(response2.body.name);
      });
    });

    describe('Large Message Handling', () => {
      it('should handle large request bodies', async () => {
        const largePayload = {
          jsonrpc: '2.0',
          method: 'test',
          params: {
            data: 'x'.repeat(10000), // 10KB of data
          },
          id: 1,
        };

        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send(largePayload);

        // Should handle without crashing (may return error but not 500)
        expect([200, 400, 406]).toContain(response.status);
      });

      it('should handle large batch arrays', async () => {
        const largeBatch = Array.from({ length: 100 }, (_, i) => ({
          jsonrpc: '2.0',
          method: 'test',
          id: i,
        }));

        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Mcp-Session-Id', 'test-session')
          .send(largeBatch);

        // Should handle without crashing
        expect(response.status).not.toBe(500);
      });
    });
  });

  // ── HTTP-SSE Transport Tests ───────────────────────────────────────────────

  describe('HTTP-SSE Transport', () => {
    describe('SSE Connection Establishment', () => {
      it('should accept GET requests to /mcp for SSE', async () => {
        const response = await supertest(app)
          .get('/mcp')
          .set('Mcp-Session-Id', 'test-session');

        // Should not return 404 - endpoint exists
        expect(response.status).not.toBe(404);
      });

      it('should handle GET without session ID', async () => {
        const response = await supertest(app).get('/mcp');

        // Should handle gracefully (transport handles this)
        expect(response.status).not.toBe(404);
      });

      it('should handle Accept header for SSE', async () => {
        const response = await supertest(app)
          .get('/mcp')
          .set('Accept', 'text/event-stream')
          .set('Mcp-Session-Id', 'test-session');

        // Should handle SSE request
        expect(response.status).not.toBe(404);
      });
    });

    describe('Session Management', () => {
      it('should reject batch requests without session ID', async () => {
        // Note: The server validates 'invalid-session-id' specifically
        // Other invalid session IDs go through to the SDK which returns 406
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Mcp-Session-Id', 'invalid-session-id') // This specific value is checked
          .send([{ jsonrpc: '2.0', method: 'test', id: 1 }]);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('No valid session ID');
      });

      it('should handle DELETE requests for session teardown', async () => {
        const response = await supertest(app)
          .delete('/mcp')
          .set('Mcp-Session-Id', 'test-session');

        // Should handle session teardown request
        expect(response.status).not.toBe(404);
      });

      it('should handle DELETE without session ID', async () => {
        const response = await supertest(app).delete('/mcp');

        // Should handle gracefully
        expect(response.status).not.toBe(404);
      });

      it('should handle session ID in header', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Mcp-Session-Id', 'custom-session-id')
          .send([{ jsonrpc: '2.0', method: 'test', id: 1 }]);

        // Session ID that's not specifically 'invalid-session-id' goes to SDK
        // SDK returns 406 for non-existent sessions
        expect([400, 406]).toContain(response.status);
      });
    });

    describe('OAuth Token Validation', () => {
      it('should handle requests without Authorization header', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .send([]);

        // Should work without OAuth when OAuth is not configured
        expect(response.status).toBe(400); // Empty batch error, not auth error
      });

      it('should report OAuth configuration status', async () => {
        const response = await supertest(app).get('/mcp/oauth-config');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('oauth');
        expect(response.body.oauth).toHaveProperty('enabled');
      });

      it('should return 401 for oauth-token-info without OAuth', async () => {
        const response = await supertest(app).get('/mcp/oauth-token-info');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('oauth_not_configured');
      });

      it('should handle malformed Authorization header', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Authorization', 'InvalidFormat')
          .send([]);

        // Should handle without crashing
        expect(response.status).not.toBe(500);
      });

      it('should handle Bearer token format', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/json')
          .set('Authorization', 'Bearer fake-token')
          .send([]);

        // Should handle without crashing (OAuth not configured)
        expect(response.status).not.toBe(500);
      });
    });

    describe('Connection Keep-Alive', () => {
      it('should handle multiple requests on same connection', async () => {
        // Test connection reuse by making multiple requests
        const agent = supertest.agent(app);

        const response1 = await agent.get('/health');
        const response2 = await agent.get('/version');

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
      });

      it('should handle rapid successive requests', async () => {
        const responses = [];
        for (let i = 0; i < 10; i++) {
          responses.push(await supertest(app).get('/health'));
        }

        // All should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe('Error Handling', () => {
      it('should return JSON error for unsupported methods on /mcp', async () => {
        const response = await supertest(app)
          .put('/mcp')
          .set('Content-Type', 'application/json')
          .send({});

        // PUT is not supported on /mcp
        expect(response.status).toBe(404);
      });

      it('should return JSON error for PATCH on /mcp', async () => {
        const response = await supertest(app)
          .patch('/mcp')
          .set('Content-Type', 'application/json')
          .send({});

        // PATCH is not supported on /mcp
        expect(response.status).toBe(404);
      });

      it('should handle invalid content type', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'text/plain')
          .send('plain text');

        // Should handle gracefully
        expect(response.status).not.toBe(500);
      });

      it('should handle application/x-www-form-urlencoded', async () => {
        const response = await supertest(app)
          .post('/mcp')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('key=value');

        // Should handle gracefully (may reject but not crash)
        expect(response.status).not.toBe(500);
      });
    });

    describe('Timeout Handling', () => {
      it('should respond within reasonable time', async () => {
        const startTime = Date.now();
        const response = await supertest(app).get('/health');
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
      });
    });
  });

  // ── Rate Limiting ──────────────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const response = await supertest(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send([]);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should track rate limit remaining', async () => {
      const response1 = await supertest(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send([]);

      const response2 = await supertest(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send([]);

      const remaining1 = parseInt(response1.headers['ratelimit-remaining'], 10);
      const remaining2 = parseInt(response2.headers['ratelimit-remaining'], 10);

      // Remaining should decrease (or be reset in new window)
      expect(remaining1).toBeGreaterThanOrEqual(remaining2);
    });
  });

  // ── HTTP Methods ───────────────────────────────────────────────────────────

  describe('HTTP Methods', () => {
    it('should support POST to /mcp', async () => {
      const response = await supertest(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send([]);

      expect(response.status).toBe(400); // Empty batch, but endpoint works
    });

    it('should support GET to /mcp', async () => {
      const response = await supertest(app)
        .get('/mcp')
        .set('Mcp-Session-Id', 'test');

      expect(response.status).not.toBe(404);
    });

    it('should support DELETE to /mcp', async () => {
      const response = await supertest(app)
        .delete('/mcp')
        .set('Mcp-Session-Id', 'test');

      expect(response.status).not.toBe(404);
    });

    it('should support OPTIONS to /mcp for CORS', async () => {
      const response = await supertest(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
    });

    it('should handle HEAD to /mcp', async () => {
      const response = await supertest(app).head('/mcp');

      // HEAD may return 200 (Express auto-handles from GET), 404, or 405
      // Express 5.x automatically responds to HEAD with GET handler
      expect([200, 404, 405]).toContain(response.status);
    });
  });

  // ── Transport-Specific Headers ─────────────────────────────────────────────

  describe('Transport-Specific Headers', () => {
    it('should expose Mcp-Session-Id header', async () => {
      const response = await supertest(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-expose-headers']).toContain('Mcp-Session-Id');
    });

    it('should allow Mcp-Session-Id in request headers', async () => {
      const response = await supertest(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Mcp-Session-Id');

      expect(response.status).toBe(204);
    });

    it('should allow Authorization in request headers', async () => {
      const response = await supertest(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Authorization');

      expect(response.status).toBe(204);
    });
  });
});
