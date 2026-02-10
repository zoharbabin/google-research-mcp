// mcp-inspector-e2e.mjs
// MCP Inspector Compatibility E2E Test
// Tests all tools, resources, and prompts are discoverable and functional
// via the MCP protocol, similar to how MCP Inspector interacts with servers.

import assert from "assert";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ── Expected Primitives ─────────────────────────────────────────────────────

const EXPECTED_TOOLS = [
  "google_search",
  "google_image_search",
  "google_news_search",
  "scrape_page",
  "search_and_scrape",
  "sequential_search",
  "academic_search",
  "patent_search",
].sort();

const EXPECTED_RESOURCES = [
  "search://recent",
  "stats://cache",
  "config://server",
  "stats://events",
];

const EXPECTED_PROMPTS = [
  "comprehensive-research",
  "fact-check",
  "summarize-url",
  "news-briefing",
];

// ── Test Runner Class ───────────────────────────────────────────────────────

class MCPInspectorTest {
  constructor() {
    this.client = null;
    this.transport = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.discoveredCounts = {
      tools: 0,
      resources: 0,
      prompts: 0,
    };
  }

  log(message) {
    console.log(`[MCP-Inspector-E2E] ${message}`);
  }

  pass(testName) {
    this.testResults.passed++;
    console.log(`  ✅ ${testName}`);
  }

  fail(testName, error) {
    this.testResults.failed++;
    this.testResults.errors.push({ testName, error: error.message });
    console.log(`  ❌ ${testName}: ${error.message}`);
  }

  // ── Connection ──────────────────────────────────────────────────────────

  async connect() {
    this.log("Starting server and connecting via STDIO...");

    this.transport = new StdioClientTransport({
      command: "node",
      args: ["--no-warnings", "dist/server.js"],
      env: { ...process.env, MCP_TEST_MODE: "stdio" },
    });

    this.client = new Client({
      name: "mcp-inspector-e2e-test",
      version: "1.0.0"
    });

    await this.client.connect(this.transport);
    this.log("Connected to server successfully");
  }

  // ── Tool Tests ──────────────────────────────────────────────────────────

  async testToolDiscovery() {
    this.log("Testing tool discovery...");

    try {
      const { tools } = await this.client.listTools();
      const toolNames = tools.map((t) => t.name).sort();

      assert.deepStrictEqual(
        toolNames,
        EXPECTED_TOOLS,
        `Expected tools: ${EXPECTED_TOOLS.join(", ")}, got: ${toolNames.join(", ")}`
      );

      this.pass(`tools/list returns ${tools.length} tools`);
      this.discoveredCounts.tools = tools.length;

      // Verify each tool has required fields
      for (const tool of tools) {
        assert(tool.name, "Tool must have a name");
        assert(tool.description, `Tool ${tool.name} must have a description`);
        assert(tool.inputSchema, `Tool ${tool.name} must have an inputSchema`);
      }

      this.pass("All tools have name, description, and inputSchema");

      return tools;
    } catch (error) {
      this.fail("tools/list", error);
      throw error;
    }
  }

  async testToolExecution() {
    this.log("Testing tool execution (scrape_page on example.com)...");

    try {
      // Test scrape_page with a simple, reliable URL
      const result = await this.client.callTool({
        name: "scrape_page",
        arguments: { url: "https://example.com" },
      });

      assert(result.content, "Tool result must have content");
      assert(result.content.length > 0, "Tool result must have at least one content item");

      const text = result.content[0].text;
      assert(text, "Tool result content must have text");
      assert(text.length > 50, "Scraped content should be substantial");
      assert(
        text.toLowerCase().includes("example") || text.toLowerCase().includes("domain"),
        "Scraped content should contain expected text from example.com"
      );

      this.pass("tools/call scrape_page executed successfully");
    } catch (error) {
      this.fail("tools/call scrape_page", error);
    }
  }

  // ── Resource Tests ──────────────────────────────────────────────────────

  async testResourceDiscovery() {
    this.log("Testing resource discovery...");

    try {
      const { resources } = await this.client.listResources();
      const resourceUris = resources.map((r) => r.uri);

      // Check that expected resources are present (there may be more)
      for (const expected of EXPECTED_RESOURCES) {
        assert(
          resourceUris.includes(expected),
          `Expected resource ${expected} not found in: ${resourceUris.join(", ")}`
        );
      }

      this.pass(`resources/list returns ${resources.length} resources (includes all 4 expected)`);
      this.discoveredCounts.resources = resources.length;

      // Verify each resource has required fields
      for (const resource of resources) {
        assert(resource.uri, "Resource must have a uri");
        assert(resource.name, `Resource ${resource.uri} must have a name`);
      }

      this.pass("All resources have uri and name");

      return resources;
    } catch (error) {
      this.fail("resources/list", error);
      throw error;
    }
  }

  async testResourceRead() {
    this.log("Testing resource reads...");

    for (const uri of EXPECTED_RESOURCES) {
      try {
        const result = await this.client.readResource({ uri });

        assert(result.contents, `Resource ${uri} must return contents`);
        assert(result.contents.length > 0, `Resource ${uri} must have at least one content item`);
        assert(result.contents[0].text, `Resource ${uri} content must have text`);

        // Verify it's valid JSON for our JSON resources
        const parsed = JSON.parse(result.contents[0].text);
        assert(parsed.generatedAt, `Resource ${uri} should have generatedAt timestamp`);

        this.pass(`resources/read ${uri}`);
      } catch (error) {
        this.fail(`resources/read ${uri}`, error);
      }
    }
  }

  // ── Prompt Tests ────────────────────────────────────────────────────────

  async testPromptDiscovery() {
    this.log("Testing prompt discovery...");

    try {
      const { prompts } = await this.client.listPrompts();
      const promptNames = prompts.map((p) => p.name);

      // Check that expected prompts are present (there may be more)
      for (const expected of EXPECTED_PROMPTS) {
        assert(
          promptNames.includes(expected),
          `Expected prompt ${expected} not found in: ${promptNames.join(", ")}`
        );
      }

      this.pass(`prompts/list returns ${prompts.length} prompts (includes all 4 expected)`);
      this.discoveredCounts.prompts = prompts.length;

      // Verify each prompt has required fields
      for (const prompt of prompts) {
        assert(prompt.name, "Prompt must have a name");
      }

      this.pass("All prompts have required fields");

      return prompts;
    } catch (error) {
      this.fail("prompts/list", error);
      throw error;
    }
  }

  async testPromptGet() {
    this.log("Testing prompt retrieval...");

    const testCases = [
      { name: "comprehensive-research", args: { topic: "test topic" } },
      { name: "fact-check", args: { claim: "test claim" } },
      { name: "summarize-url", args: { url: "https://example.com" } },
      { name: "news-briefing", args: { topic: "test news" } },
    ];

    for (const { name, args } of testCases) {
      try {
        const result = await this.client.getPrompt({ name, arguments: args });

        assert(result.messages, `Prompt ${name} must return messages`);
        assert(result.messages.length > 0, `Prompt ${name} must have at least one message`);
        assert(result.messages[0].role, `Prompt ${name} message must have a role`);
        assert(result.messages[0].content, `Prompt ${name} message must have content`);

        this.pass(`prompts/get ${name}`);
      } catch (error) {
        this.fail(`prompts/get ${name}`, error);
      }
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  async cleanup() {
    this.log("Cleaning up...");

    if (this.transport && typeof this.transport.close === "function") {
      try {
        await Promise.race([
          this.transport.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000)
          ),
        ]);
        this.log("Transport closed gracefully");
      } catch (error) {
        this.log(`Warning: ${error.message}`);
      }
    }

    // Force kill child process if needed
    if (this.transport && this.transport.childProcess) {
      if (!this.transport.childProcess.killed) {
        try {
          process.kill(this.transport.childProcess.pid, "SIGKILL");
          this.log("Child process terminated");
        } catch (error) {
          // Process may have already exited
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // ── Main Test Runner ────────────────────────────────────────────────────

  async runAllTests() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║       MCP Inspector Compatibility E2E Test Suite           ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    try {
      await this.connect();

      console.log("\n── Tool Tests ──────────────────────────────────────────────\n");
      await this.testToolDiscovery();
      await this.testToolExecution();

      console.log("\n── Resource Tests ──────────────────────────────────────────\n");
      await this.testResourceDiscovery();
      await this.testResourceRead();

      console.log("\n── Prompt Tests ────────────────────────────────────────────\n");
      await this.testPromptDiscovery();
      await this.testPromptGet();

    } catch (error) {
      this.log(`Fatal error: ${error.message}`);
    } finally {
      await this.cleanup();
    }

    // Print summary
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                      Test Summary                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`  Total Passed: ${this.testResults.passed}`);
    console.log(`  Total Failed: ${this.testResults.failed}`);

    console.log("\n  Discovered MCP Primitives:");
    console.log(`    - Tools:     ${this.discoveredCounts.tools} (expected: ${EXPECTED_TOOLS.length})`);
    console.log(`    - Resources: ${this.discoveredCounts.resources} (expected: ${EXPECTED_RESOURCES.length}+)`);
    console.log(`    - Prompts:   ${this.discoveredCounts.prompts} (expected: ${EXPECTED_PROMPTS.length}+)`);

    if (this.testResults.errors.length > 0) {
      console.log("\n  Failures:");
      for (const { testName, error } of this.testResults.errors) {
        console.log(`    - ${testName}: ${error}`);
      }
    }

    const success = this.testResults.failed === 0;
    console.log(`\n${success ? "🎉" : "❌"} MCP Inspector E2E Tests: ${success ? "PASSED" : "FAILED"}\n`);

    return success;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const test = new MCPInspectorTest();

try {
  const success = await test.runAllTests();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
