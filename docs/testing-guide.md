# Testing Guide

This document provides a comprehensive guide to the testing architecture, strategies, and best practices for the Google Researcher MCP Server. A robust testing strategy is essential for maintaining code quality, ensuring reliability, and enabling confident contributions.

## Table of Contents

1.  [**Testing Philosophy**](#testing-philosophy)
2.  [**Test Architecture**](#test-architecture)
    -   [Multi-Layer Testing Pyramid](#multi-layer-testing-pyramid)
    -   [Framework and Configuration](#framework-and-configuration)
    -   [Directory Structure](#directory-structure)
3.  [**Types of Tests**](#types-of-tests)
    -   [Component Tests (Unit & Integration)](#component-tests)
    -   [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
4.  [**Running Tests**](#running-tests)
    -   [Available Scripts](#available-scripts)
    -   [Running Specific Tests](#running-specific-tests)
5.  [**MCP Inspector Integration**](#mcp-inspector-integration)
6.  [**CI Pipeline Overview**](#ci-pipeline-overview)
7.  [**Performance Benchmark Targets**](#performance-benchmark-targets)
8.  [**Code Coverage**](#code-coverage)
9.  [**Mocking and Test Strategies**](#mocking-and-test-strategies)
    -   [Mocking External Services](#mocking-external-services)
    -   [Testing the OAuth 2.1 Layer](#testing-the-oauth-21-layer)
10. [**Writing New Tests**](#writing-new-tests)
11. [**Troubleshooting**](#troubleshooting)

---

## Testing Philosophy

Our testing strategy is pragmatic, focusing on a balanced "testing pyramid" that prioritizes different types of tests for maximum value:

-   **End-to-End Tests** form the foundation, validating the entire system from the client's perspective. They ensure the server's core promises—tool execution, reliability, and security—are met.
-   **Focused Component Tests** (a mix of unit and integration tests) target the complex, stateful logic unique to this server, such as the caching and event store systems.

This approach provides high confidence in the overall system behavior while keeping the test suite maintainable and fast.

## Test Architecture

### Multi-Layer Testing Pyramid

Our test suite follows a layered approach, with each layer serving a specific purpose:

```
                    ┌─────────────────────┐
                    │   Manual Testing    │  ← MCP Inspector
                    │   (Interactive)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    E2E Tests        │  ← Full server + real MCP SDK
                    │  (STDIO, HTTP/SSE)  │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
┌──────────▼──────────┐ ┌──────▼──────┐ ┌─────────▼─────────┐
│  Integration Tests  │ │ Performance │ │  Transport Tests  │
│  (server-integration)│ │   Tests    │ │  (protocol layer) │
└──────────┬──────────┘ └──────┬──────┘ └─────────┬─────────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Unit Tests       │  ← Cache, OAuth, EventStore
                    │  (*.spec.ts files)  │
                    └─────────────────────┘
```

| Layer | Purpose | Speed | Isolation |
|-------|---------|-------|-----------|
| **Unit Tests** | Test individual functions/classes | Fast (ms) | Full mocking |
| **Integration Tests** | Test module interactions | Medium (seconds) | Partial mocking |
| **E2E Tests** | Test complete user flows | Slow (seconds) | Real server |
| **Manual (Inspector)** | Interactive debugging | N/A | Real server |

### Framework and Configuration

-   **Framework**: [Jest](https://jestjs.io/) is used for all component tests.
-   **TypeScript Support**: [ts-jest](https://kulshekhar.github.io/ts-jest/) enables running tests written in TypeScript.
-   **Configuration**:
    -   `jest.config.js`: The main configuration file.
    -   `jest.setup.js`: A setup file used to configure Jest's fake timers and suppress console output during tests to keep results clean. It also ensures that internal timers within the application (like cache persistence) are disabled when `NODE_ENV === 'test'` to prevent open handles.

### Directory Structure

-   **Component Tests (`src/**/*.spec.ts`)**: Tests are co-located with the source code they validate. This makes it easy to find and maintain tests for a specific module.
-   **End-to-End Tests (`tests/e2e/`)**: All E2E tests reside in a dedicated top-level directory, providing a clear separation from the application source code.

## Types of Tests

### Component Tests

These tests, written with Jest, cover the internal logic of the server's most critical components.

-   **Cache System** (`src/cache/*.spec.ts`):
    -   Verifies core cache logic (TTL, LRU eviction).
    -   Tests the `PersistenceManager`'s file I/O operations.
    -   Validates different `PersistenceStrategies`.
-   **Event Store** (`src/shared/*.spec.ts`):
    -   Tests event storage, retrieval, and expiration.
    -   Validates the `EventPersistenceManager`'s file I/O.
-   **OAuth Security** (`src/shared/oauth*.spec.ts`):
    -   Tests the `oauthMiddleware` logic with mock JWTs.
    -   Verifies the `requireScopes` enforcement.

### End-to-End (E2E) Tests

E2E tests are plain JavaScript/TypeScript files that use the MCP SDK to interact with a running instance of the server. They validate the system as a whole.

-   `e2e_stdio_mcp_client_test.mjs`: Tests the server over the **STDIO transport**.
-   `e2e_sse_mcp_client_test.mjs`: Tests the server over the **HTTP/SSE transport**.
-   `comprehensive_timeout_test.js`: A crucial suite that verifies the server's **reliability features**, including API timeouts, graceful degradation of the `search_and_scrape` tool, and content size limiting.
-   `server.tool-descriptions.spec.ts` & `server.enhanced-descriptions.spec.ts`: Component tests that validate the implementation of the enhanced tool descriptions.

## Running Tests

All test commands are defined as scripts in `package.json`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all component tests (`*.spec.ts`) using Jest |
| `npm run test:unit` | Run unit tests only (fast, isolated) |
| `npm run test:integration` | Run integration tests (server-integration patterns) |
| `npm run test:coverage` | Generate detailed code coverage report |
| `npm run test:verbose` | Run tests with verbose output including `console.log` |
| `npm run test:e2e` | Full E2E suite: STDIO + HTTP/SSE + YouTube |
| `npm run test:e2e:stdio` | E2E tests for STDIO transport only |
| `npm run test:e2e:sse` | E2E tests for HTTP/SSE transport only |
| `npm run test:e2e:youtube` | E2E tests for YouTube transcript extraction |
| `npm run test:e2e:timeout` | Performance and timeout behavior tests |
| `npm run test:e2e:inspector` | Automated MCP Inspector verification |
| `npm run inspect` | Open MCP Inspector for manual testing |

### Running Specific Tests

You can pass arguments to Jest to run specific files or tests.

```bash
# Run tests in a specific file
npm test -- src/cache/cache.spec.ts

# Run tests with a name matching a pattern
npm test -- -t "should evict least recently used item"
```

## MCP Inspector Integration

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) provides a visual interface for testing MCP servers interactively. It's useful for:

- **Manual verification** of tool behavior during development
- **Debugging** tool input/output schemas
- **Validating** resource and prompt registration

### Running the Inspector

```bash
npm run inspect
```

This launches the Inspector UI at `http://localhost:5173`, connected to the server via STDIO.

### Automated Inspector Testing

We also have an automated E2E test that verifies Inspector compatibility:

```bash
npm run test:e2e:inspector
```

This test validates:
- All 8 tools are discoverable
- All 6 resources are accessible
- All 8 prompts are registered
- Basic tool execution works

### What to Verify in Inspector

| Tab | Expected Count | Key Items to Check |
|-----|----------------|-------------------|
| **Tools** | 8 | `search_and_scrape`, `google_search`, `scrape_page` work without errors |
| **Resources** | 6 | `config://server` returns valid JSON |
| **Prompts** | 8 | `comprehensive-research` generates proper message structure |

## CI Pipeline Overview

Our GitHub Actions CI pipeline runs on every push and pull request. Here's the flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌──────────┐                      │
│  │  Test   │   │  Lint   │   │ Security │   ← Run in parallel  │
│  │ Suite   │   │ Check   │   │  Audit   │                      │
│  └────┬────┘   └────┬────┘   └────┬─────┘                      │
│       │             │             │                             │
│       ▼             │             │                             │
│  ┌─────────┐        │             │                             │
│  │Perform- │        │             │                             │
│  │  ance   │        │             │                             │
│  └────┬────┘        │             │                             │
│       │             │             │                             │
│       └─────────────┼─────────────┘                             │
│                     │                                           │
│                     ▼                                           │
│              ┌─────────────┐                                    │
│              │   Docker    │                                    │
│              │   Build     │                                    │
│              └──────┬──────┘                                    │
│                     │                                           │
│                     ▼                                           │
│         ┌───────────────────────┐                               │
│         │   Publish Readiness   │  ← main branch only          │
│         │   (npm pack --dry-run)│                               │
│         └───────────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CI Jobs Summary

| Job | Runs On | Node Versions | Key Steps |
|-----|---------|---------------|-----------|
| **Test Suite** | Every push/PR | 20.x, 22.x | Unit, Integration, E2E (STDIO, SSE, YouTube) |
| **Lint Check** | Every push/PR | 20.x | TypeScript compilation, shebang verification |
| **Security Audit** | Every push/PR | 20.x | `npm audit --audit-level=high` |
| **Performance** | After Test Suite | 20.x | Timeout tests, performance patterns |
| **Docker Build** | After Lint | 20.x | Build image, verify non-root user |
| **Publish Ready** | main branch only | 20.x | `npm pack --dry-run` verification |

### Test Matrix

The test suite runs on multiple Node.js versions to ensure compatibility:

| Node Version | Status |
|--------------|--------|
| 20.x (LTS) | Primary target |
| 22.x | Forward compatibility |

## Performance Benchmark Targets

The `npm run test:e2e:timeout` suite validates performance characteristics:

| Metric | Target | Test Coverage |
|--------|--------|---------------|
| **Tool response time** | < 30s per tool call | Timeout behavior tests |
| **Search API timeout** | 10s max | `comprehensive_timeout_test.js` |
| **Scrape timeout** | 15s max | Graceful degradation tests |
| **Cache hit latency** | < 10ms | Cache performance tests |
| **Memory usage** | < 512MB baseline | Resource limiting tests |

### Content Size Limits

| Content Type | Limit | Enforcement |
|--------------|-------|-------------|
| Single scrape | 50 KB | Truncated at natural breakpoints |
| Combined research | 300 KB | Total across all sources |
| Document upload | 10 MB | PDF, DOCX, PPTX |

### Graceful Degradation

The `search_and_scrape` tool is designed to return partial results if some sources fail:

```
┌─────────────────────────────────────────┐
│         search_and_scrape               │
├─────────────────────────────────────────┤
│  Source 1: ✓ Success                    │
│  Source 2: ✗ Timeout → Skip gracefully  │
│  Source 3: ✓ Success                    │
│  Source 4: ✗ 404 → Skip gracefully      │
│  Source 5: ✓ Success                    │
├─────────────────────────────────────────┤
│  Result: 3/5 sources returned           │
│  Status: Success (partial)              │
└─────────────────────────────────────────┘
```

## Code Coverage

We aim for high code coverage on our critical, stateful components to ensure their logic is thoroughly tested. You can generate a coverage report by running:

```bash
npm run test:coverage
```

The report will be generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser to view the detailed results. While we don't enforce a strict percentage, pull requests that include new logic should also include corresponding tests.

## Mocking and Test Strategies

### Mocking External Services

For component tests, we mock all external dependencies to ensure tests are fast, reliable, and isolated.

-   **File System**: The `fs/promises` module is mocked using `jest.mock()` for unit tests that shouldn't touch the disk. For integration tests, we write to temporary directories that are cleaned up afterward.
-   **Timers**: We use Jest's fake timers (`jest.useFakeTimers()`) to test time-dependent logic like cache expiration without waiting for real time to pass.

### Testing the OAuth 2.1 Layer

Testing the security layer is critical. Our strategy involves:

1.  **Mocking the Authorization Server**: We use mocks to simulate the external JWKS endpoint, providing a controlled set of public keys for token verification.
2.  **Generating Test JWTs**: We create a variety of test tokens (valid, expired, invalid signature, incorrect scopes) signed with a private key that corresponds to our mocked public key.
3.  **Verifying Middleware Logic**: We write unit tests that pass these mock tokens to the `oauthMiddleware` and `requireScopes` functions to assert that they correctly accept valid tokens and reject invalid ones with the appropriate HTTP status codes (401 or 403).

This strategy allows us to thoroughly test our security implementation without relying on an external identity provider.

## Writing New Tests

When contributing code, please include tests.

-   **For New Features**: Add new component tests for any new internal logic and consider adding a case to the E2E tests to validate the feature from a client's perspective.
-   **For Bug Fixes**: Start by writing a failing test that reproduces the bug. This proves the bug exists and confirms when it has been fixed.

**Best Practices**:
-   Keep tests small, focused, and independent.
-   Use descriptive names for your `describe` and `it` blocks.
-   Always clean up resources (e.g., temporary files, mocks) in `afterEach` or `afterAll` blocks.

## Troubleshooting

-   **Open Handles Warning**: This usually means a resource (like a timer or file handle) was not properly closed. Ensure `jest.useRealTimers()` is called after using fake timers, and check that all asynchronous operations have completed. The `NODE_ENV === 'test'` check in our core components helps prevent this by disabling periodic background tasks.
-   **Flaky Tests**: If a test passes inconsistently, it may have a race condition or a dependency on real time. Refactor to use fake timers or ensure all async operations are properly awaited.
-   **Debugging**: Use `console.log` for quick debugging, or run Jest with the `--inspect-brk` flag to attach a full debugger.
