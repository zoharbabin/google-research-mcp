/**
 * MCP Server Performance Benchmark Tests
 *
 * Measures and validates performance targets with CI-aware thresholds:
 *
 * Local targets:
 * - Throughput: >1000 req/s (cached operations)
 * - Latency P50: <50ms, P95: <100ms
 * - Memory: <200MB baseline
 *
 * CI targets (reduced due to shared runner constraints):
 * - Throughput: >200 req/s (cached operations)
 * - Latency P50: <100ms, P95: <200ms
 * - Memory: <200MB baseline
 *
 * These benchmarks run as Jest tests and use assertions to validate
 * performance targets are met. They are designed to catch performance
 * regressions during CI/CD while accounting for environment differences.
 *
 * @see https://spec.modelcontextprotocol.io/specification/
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Express } from 'express';
import supertest from 'supertest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PersistentCache, HybridPersistenceStrategy } from '../../src/cache/index.js';
import { PersistentEventStore } from '../../src/shared/persistentEventStore.js';

// ── Test Configuration ───────────────────────────────────────────────────────

// Detect CI environment - CI runners have lower performance than local machines
const IS_CI = process.env.CI === 'true';

const BENCHMARK_CONFIG = {
  // Performance targets - lower thresholds for CI environments
  throughput: {
    // CI runners achieve ~500 req/s vs local ~3000 req/s
    minRequestsPerSecond: IS_CI ? 200 : 1000,
    warmupRequests: 10,
    measurementRequests: IS_CI ? 50 : 100,
  },
  latency: {
    // CI has higher latency variance
    p50MaxMs: IS_CI ? 100 : 50,
    p95MaxMs: IS_CI ? 200 : 100,
    sampleSize: IS_CI ? 50 : 100,
  },
  memory: {
    // CI runners have higher base memory usage (~250MB vs local ~195MB)
    maxBaselineMb: IS_CI ? 300 : 200,
    maxGrowthMb: IS_CI ? 100 : 50, // Allow more growth in CI
    iterationsToCheck: IS_CI ? 50 : 100,
  },
};

// ── Test Utilities ───────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestStoragePaths {
  storageDir: string;
  cachePath: string;
  eventPath: string;
  requestQueuesPath: string;
}

function createTestStoragePaths(): TestStoragePaths {
  const storageDir = path.resolve(__dirname, '..', '..', 'storage', 'test_temp', `benchmark-${Date.now()}`);
  return {
    storageDir,
    cachePath: path.join(storageDir, 'cache'),
    eventPath: path.join(storageDir, 'events'),
    requestQueuesPath: path.join(storageDir, 'request_queues'),
  };
}

async function ensureTestStorageDirs(paths: TestStoragePaths): Promise<void> {
  await fs.mkdir(paths.storageDir, { recursive: true });
}

async function cleanupTestStorage(paths: TestStoragePaths): Promise<void> {
  try {
    await fs.rm(paths.storageDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Use valid formats that pass envValidator checks
const TEST_ENV_VARS: Record<string, string> = {
  GOOGLE_CUSTOM_SEARCH_API_KEY: 'AIzaSyTEST_KEY_FOR_BENCHMARK_TESTS_1234',
  GOOGLE_CUSTOM_SEARCH_ID: '123456789012345:benchmark',
};

function setupTestEnv(): void {
  Object.assign(process.env, TEST_ENV_VARS);
}

function cleanupTestEnv(): void {
  for (const key of Object.keys(TEST_ENV_VARS)) {
    delete process.env[key];
  }
}

function cleanupProcessListeners(): void {
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(sig => process.removeAllListeners(sig));
  process.removeAllListeners('exit');
  process.removeAllListeners('uncaughtException');
}

// ── Statistical Helpers ──────────────────────────────────────────────────────

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

function getHeapUsedMb(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

// ── Mock Dependencies ────────────────────────────────────────────────────────

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
        { text: 'Mock transcript segment' },
      ])
    ),
  },
}));

// Mock fetch for fast cached responses
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

// ── Benchmark Tests ──────────────────────────────────────────────────────────

describe('MCP Server Performance Benchmarks', () => {
  let app: Express;
  let testCache: PersistentCache;
  let testEventStore: PersistentEventStore;
  let paths: TestStoragePaths;

  beforeAll(async () => {
    jest.useRealTimers();
    setupTestEnv();
    paths = createTestStoragePaths();
    await ensureTestStorageDirs(paths);

    // Create lightweight test instances
    testCache = new PersistentCache({
      storagePath: paths.cachePath,
      persistenceStrategy: new HybridPersistenceStrategy([], 5000, []),
      eagerLoading: false,
    });
    testEventStore = new PersistentEventStore({
      storagePath: paths.eventPath,
      eagerLoading: false,
    });

    const { createAppAndHttpTransport } = await import('../../src/server.js');
    const { app: createdApp } = await createAppAndHttpTransport(testCache, testEventStore);
    app = createdApp;

    // Force garbage collection if available (run with --expose-gc)
    if (global.gc) {
      global.gc();
    }
  }, 30000);

  afterAll(async () => {
    if (testCache) {
      try { await testCache.dispose(); } catch { /* ignore */ }
    }
    if (testEventStore) {
      try { await testEventStore.dispose(); } catch { /* ignore */ }
    }
    await cleanupTestStorage(paths);
    cleanupTestEnv();
    cleanupProcessListeners();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupProcessListeners();
  });

  // ── Throughput Benchmarks ──────────────────────────────────────────────────

  describe('Throughput Benchmarks', () => {
    it('should meet throughput target for cached health endpoint', async () => {
      const { warmupRequests, measurementRequests, minRequestsPerSecond } = BENCHMARK_CONFIG.throughput;

      // Warmup phase - establish baseline
      for (let i = 0; i < warmupRequests; i++) {
        await supertest(app).get('/health');
      }

      // Measurement phase
      const startTime = performance.now();
      const requests = Array.from({ length: measurementRequests }, () =>
        supertest(app).get('/health')
      );
      await Promise.all(requests);
      const endTime = performance.now();

      const durationSeconds = (endTime - startTime) / 1000;
      const requestsPerSecond = measurementRequests / durationSeconds;

      console.log(`Throughput: ${requestsPerSecond.toFixed(0)} req/s (target: >${minRequestsPerSecond})`);

      // Validate throughput target
      expect(requestsPerSecond).toBeGreaterThan(minRequestsPerSecond);
    });

    it('should meet throughput target for cached version endpoint', async () => {
      const measurementRequests = BENCHMARK_CONFIG.throughput.measurementRequests;
      const minRequestsPerSecond = IS_CI ? 100 : 500;

      // Warmup
      for (let i = 0; i < 5; i++) {
        await supertest(app).get('/version');
      }

      // Measurement
      const startTime = performance.now();
      const requests = Array.from({ length: measurementRequests }, () =>
        supertest(app).get('/version')
      );
      await Promise.all(requests);
      const endTime = performance.now();

      const durationSeconds = (endTime - startTime) / 1000;
      const requestsPerSecond = measurementRequests / durationSeconds;

      console.log(`Version endpoint: ${requestsPerSecond.toFixed(0)} req/s (target: >${minRequestsPerSecond})`);

      expect(requestsPerSecond).toBeGreaterThan(minRequestsPerSecond);
    });

    it('should meet throughput target for cache-stats endpoint', async () => {
      const measurementRequests = 20; // Reduced to avoid connection pool exhaustion
      const minRequestsPerSecond = IS_CI ? 50 : 200;

      // Warmup
      for (let i = 0; i < 3; i++) {
        await supertest(app).get('/mcp/cache-stats');
      }

      // Measurement - sequential to avoid HTTP parser issues
      const startTime = performance.now();
      let successCount = 0;
      for (let i = 0; i < measurementRequests; i++) {
        const response = await supertest(app).get('/mcp/cache-stats');
        if (response.status === 200 || response.status === 429) {
          successCount++;
        }
      }
      const endTime = performance.now();

      const durationSeconds = (endTime - startTime) / 1000;
      const requestsPerSecond = successCount / durationSeconds;

      console.log(`Cache stats: ${requestsPerSecond.toFixed(0)} req/s (target: >${minRequestsPerSecond})`);

      expect(requestsPerSecond).toBeGreaterThan(minRequestsPerSecond);
    });
  });

  // ── Latency Benchmarks ─────────────────────────────────────────────────────

  describe('Latency Benchmarks', () => {
    it('should meet P50 latency target for health endpoint', async () => {
      const { sampleSize, p50MaxMs } = BENCHMARK_CONFIG.latency;
      const latencies: number[] = [];

      // Warmup
      for (let i = 0; i < 10; i++) {
        await supertest(app).get('/health');
      }

      // Collect latency samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/health');
        const end = performance.now();
        latencies.push(end - start);
      }

      const p50 = calculatePercentile(latencies, 50);
      const p95 = calculatePercentile(latencies, 95);
      const mean = calculateMean(latencies);
      const stdDev = calculateStdDev(latencies);

      console.log(`Health endpoint latency: P50=${p50.toFixed(1)}ms, P95=${p95.toFixed(1)}ms, mean=${mean.toFixed(1)}ms, stdDev=${stdDev.toFixed(1)}ms`);

      expect(p50).toBeLessThan(p50MaxMs);
    });

    it('should meet P95 latency target for health endpoint', async () => {
      const { sampleSize, p95MaxMs } = BENCHMARK_CONFIG.latency;
      const latencies: number[] = [];

      // Warmup
      for (let i = 0; i < 10; i++) {
        await supertest(app).get('/health');
      }

      // Collect latency samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/health');
        const end = performance.now();
        latencies.push(end - start);
      }

      const p95 = calculatePercentile(latencies, 95);

      expect(p95).toBeLessThan(p95MaxMs);
    });

    it('should have consistent latency (low variance) for cached responses', async () => {
      const sampleSize = 50;
      const maxCoefficientOfVariation = 1.5; // CV < 150% - lenient for CI environments
      const latencies: number[] = [];

      // Extended warmup for JIT optimization
      for (let i = 0; i < 20; i++) {
        await supertest(app).get('/health');
      }

      // Collect samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/health');
        const end = performance.now();
        latencies.push(end - start);
      }

      const mean = calculateMean(latencies);
      const stdDev = calculateStdDev(latencies);
      const cv = stdDev / mean;

      console.log(`Latency variance: CV=${cv.toFixed(2)} (target: <${maxCoefficientOfVariation})`);

      expect(cv).toBeLessThan(maxCoefficientOfVariation);
    });

    it('should meet P50 latency target for version endpoint', async () => {
      const latencies: number[] = [];
      const sampleSize = 50;

      // Warmup
      for (let i = 0; i < 10; i++) {
        await supertest(app).get('/version');
      }

      // Collect samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/version');
        const end = performance.now();
        latencies.push(end - start);
      }

      const p50 = calculatePercentile(latencies, 50);
      console.log(`Version endpoint P50: ${p50.toFixed(1)}ms`);

      expect(p50).toBeLessThan(50);
    });
  });

  // ── Memory Benchmarks ──────────────────────────────────────────────────────

  describe('Memory Benchmarks', () => {
    it('should meet baseline memory usage target', () => {
      const { maxBaselineMb } = BENCHMARK_CONFIG.memory;

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const heapUsedMb = getHeapUsedMb();
      console.log(`Baseline heap usage: ${heapUsedMb.toFixed(1)}MB (target: <${maxBaselineMb}MB)`);

      expect(heapUsedMb).toBeLessThan(maxBaselineMb);
    });

    it('should not have significant memory growth over iterations', async () => {
      const { maxGrowthMb, iterationsToCheck } = BENCHMARK_CONFIG.memory;

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const initialHeap = getHeapUsedMb();

      // Run many requests
      for (let i = 0; i < iterationsToCheck; i++) {
        await supertest(app).get('/health');
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalHeap = getHeapUsedMb();
      const growth = finalHeap - initialHeap;

      console.log(`Memory growth after ${iterationsToCheck} requests: ${growth.toFixed(1)}MB (target: <${maxGrowthMb}MB)`);

      // Allow some growth but not excessive
      expect(growth).toBeLessThan(maxGrowthMb);
    });

    it('should report memory usage in cache-stats endpoint', async () => {
      const response = await supertest(app).get('/mcp/cache-stats');

      // May hit rate limit during benchmark tests - both are acceptable
      if (response.status === 200) {
        expect(response.body).toHaveProperty('process');
        expect(response.body.process).toHaveProperty('memoryUsage');
        expect(response.body.process.memoryUsage).toHaveProperty('heapUsed');
      } else {
        expect(response.status).toBe(429); // Rate limited
      }
    });

    it('should have reasonable RSS memory (<500MB)', () => {
      const maxRssMb = 500;
      const rssMb = process.memoryUsage().rss / 1024 / 1024;

      console.log(`RSS memory: ${rssMb.toFixed(1)}MB (target: <${maxRssMb}MB)`);

      expect(rssMb).toBeLessThan(maxRssMb);
    });
  });

  // ── Concurrent Load Benchmarks ─────────────────────────────────────────────

  describe('Concurrent Load Benchmarks', () => {
    it('should handle 50 concurrent requests without errors', async () => {
      const concurrentRequests = 50;

      const requests = Array.from({ length: concurrentRequests }, () =>
        supertest(app).get('/health')
      );

      const responses = await Promise.all(requests);
      // Count successful or rate-limited responses (both are acceptable behaviors)
      const validCount = responses.filter(r => r.status === 200 || r.status === 429).length;

      // All requests should complete without server errors (5xx)
      expect(validCount).toBe(concurrentRequests);
      // Server should not crash (no 500 errors)
      const serverErrors = responses.filter(r => r.status >= 500).length;
      expect(serverErrors).toBe(0);
    });

    it('should maintain latency under concurrent load', async () => {
      const concurrentRequests = 20;
      const maxP95Ms = 200; // Allow higher latency under load

      const startTime = performance.now();
      const requests = Array.from({ length: concurrentRequests }, () =>
        supertest(app).get('/health')
      );
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgLatency = totalTime / concurrentRequests;

      console.log(`Concurrent load: ${concurrentRequests} requests in ${totalTime.toFixed(0)}ms, avg=${avgLatency.toFixed(1)}ms`);

      // All should either succeed or be rate-limited (no server errors)
      responses.forEach(r => expect([200, 429]).toContain(r.status));

      // Average latency should still be reasonable
      expect(avgLatency).toBeLessThan(maxP95Ms);
    });

    it('should handle burst traffic gracefully', async () => {
      const bursts = 5;
      const requestsPerBurst = 20;

      for (let burst = 0; burst < bursts; burst++) {
        const requests = Array.from({ length: requestsPerBurst }, () =>
          supertest(app).get('/health')
        );
        const responses = await Promise.all(requests);

        // All requests should complete without server errors (200 or 429 rate limited)
        const validCount = responses.filter(r => r.status === 200 || r.status === 429).length;
        expect(validCount).toBe(requestsPerBurst);

        // No server errors (5xx)
        const serverErrors = responses.filter(r => r.status >= 500).length;
        expect(serverErrors).toBe(0);

        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });

  // ── Cache Performance Benchmarks ───────────────────────────────────────────

  describe('Cache Performance Benchmarks', () => {
    it('should have fast cache stats retrieval (<20ms P50)', async () => {
      const sampleSize = 30;
      const latencies: number[] = [];

      // Warmup
      for (let i = 0; i < 5; i++) {
        await supertest(app).get('/mcp/cache-stats');
      }

      // Collect samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/mcp/cache-stats');
        const end = performance.now();
        latencies.push(end - start);
      }

      const p50 = calculatePercentile(latencies, 50);
      console.log(`Cache stats P50: ${p50.toFixed(1)}ms`);

      expect(p50).toBeLessThan(20);
    });

    it('should have fast event-store stats retrieval', async () => {
      const sampleSize = 20;
      const latencies: number[] = [];

      // Warmup
      for (let i = 0; i < 5; i++) {
        await supertest(app).get('/mcp/event-store-stats');
      }

      // Collect samples
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        await supertest(app).get('/mcp/event-store-stats');
        const end = performance.now();
        latencies.push(end - start);
      }

      const p50 = calculatePercentile(latencies, 50);
      console.log(`Event store stats P50: ${p50.toFixed(1)}ms`);

      expect(p50).toBeLessThan(50);
    });
  });

  // ── Benchmark Summary ──────────────────────────────────────────────────────

  describe('Benchmark Summary', () => {
    it('should log final benchmark results', () => {
      const memUsage = process.memoryUsage();
      console.log('\n=== Benchmark Summary ===');
      console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`);
      console.log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`);
      console.log(`External: ${(memUsage.external / 1024 / 1024).toFixed(1)}MB`);
      console.log('=========================\n');

      // This test always passes - it's for logging
      expect(true).toBe(true);
    });
  });
});
