# MCP Distribution Guide

Complete guide to all distribution channels for Google Researcher MCP server, including installation methods, submission processes, and maintenance procedures.

## Current Distribution Status

| Channel | Type | Status | Version | Link |
|---------|------|--------|---------|------|
| **npm** | Package Registry | ✅ Published | 6.0.0 | [npmjs.com](https://www.npmjs.com/package/google-researcher-mcp) |
| **MCP Registry** | Official Anthropic | ✅ Published | 6.0.0 | Via `mcp-publisher` CLI |
| **MCPB** | One-click Install | ✅ Automated | 6.0.0 | [GitHub Releases](https://github.com/zoharbabin/google-research-mcp/releases) |
| **awesome-mcp-servers** | Curated List (80k⭐) | ⏳ PR Pending | - | [PR #1917](https://github.com/punkpeye/awesome-mcp-servers/pull/1917) |
| **Glama.ai** | Directory (17k+) | 📋 Not Listed | - | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) |
| **MCP.so** | Marketplace (17k+) | 📋 Not Listed | - | [mcp.so](https://mcp.so) |

---

## Server Features Summary

For users evaluating this MCP server:

| Tool | Description |
|------|-------------|
| `google_search` | Web search with time range, site, language filters |
| `google_image_search` | Image search with size, type, color filters |
| `google_news_search` | News search with freshness and source filters |
| `scrape_page` | Web/YouTube/PDF/DOCX content extraction |
| `search_and_scrape` | Combined search + scrape with quality scoring |
| `academic_search` | arXiv, PubMed, IEEE, Nature paper search |
| `patent_search` | Google Patents with prior art analysis |
| `sequential_search` | Multi-step research state tracking |

**Additional Features:**
- Smart caching (30min search, 1hr content)
- JavaScript rendering via Playwright
- Content deduplication and quality scoring
- Prometheus metrics export
- STDIO and HTTP/SSE transports

---

## Installation Methods

### Option 1: Claude Desktop (One-Click MCPB)

**Best for:** Non-technical users who want instant setup.

1. Go to [GitHub Releases](https://github.com/zoharbabin/google-research-mcp/releases)
2. Download `google-researcher-mcp.mcpb`
3. Double-click to install in Claude Desktop
4. Enter your [Google API credentials](./API_SETUP.md) when prompted

### Option 2: Claude Desktop (Manual Config)

**Best for:** Users who prefer manual configuration.

**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-researcher": {
      "command": "npx",
      "args": ["-y", "google-researcher-mcp"],
      "env": {
        "GOOGLE_CUSTOM_SEARCH_API_KEY": "your-api-key",
        "GOOGLE_CUSTOM_SEARCH_ID": "your-search-engine-id"
      }
    }
  }
}
```

### Option 3: npm (Developers)

**Best for:** Developers integrating with custom MCP clients.

```bash
# Global installation
npm install -g google-researcher-mcp

# Or run directly
npx google-researcher-mcp

# Or as project dependency
npm install google-researcher-mcp
```

### Option 4: Docker

**Best for:** Containerized deployments and HTTP/SSE mode.

```bash
docker pull ghcr.io/zoharbabin/google-research-mcp:latest
docker run -p 3000:3000 \
  -e GOOGLE_CUSTOM_SEARCH_API_KEY=your-key \
  -e GOOGLE_CUSTOM_SEARCH_ID=your-id \
  ghcr.io/zoharbabin/google-research-mcp:latest
```

---

## Distribution Channels - Detailed Guide

### 1. npm (Primary Distribution)

**URL:** https://www.npmjs.com/package/google-researcher-mcp
**Status:** ✅ Published
**Purpose:** Primary distribution for developers

**Publishing a New Version:**
```bash
# 1. Update version
npm version patch|minor|major

# 2. Publish
npm login
npm publish

# 3. Verify
npm view google-researcher-mcp version
```

**Version Policy:**
- `patch`: Bug fixes, documentation
- `minor`: New features, non-breaking changes
- `major`: Breaking changes, API changes

---

### 2. MCP Registry (Official Anthropic)

**Purpose:** Official discoverability through Anthropic's registry
**Status:** ✅ Published

**Publishing:**
```bash
# Install publisher
npm install -g mcp-publisher

# Login (uses GitHub OAuth)
mcp-publisher login

# Publish (reads from package.json)
mcp-publisher publish

# Verify
mcp-publisher info google-researcher-mcp
```

**Configuration in package.json:**
```json
{
  "mcpName": "google-researcher-mcp",
  "mcp": {
    "tools": ["google_search", "scrape_page", "..."]
  }
}
```

---

### 3. MCPB (MCP Bundles)

**Spec:** https://github.com/modelcontextprotocol/mcpb
**Status:** ✅ Automated via GitHub Actions
**Purpose:** One-click installation for Claude Desktop

**How It Works:**
1. GitHub Release triggers `.github/workflows/mcpb-release.yml`
2. Workflow builds `.mcpb` bundle from `manifest.json`
3. Bundle is attached to the release as an asset
4. Users download and double-click to install

**Key Files:**
| File | Purpose |
|------|---------|
| `manifest.json` | MCPB manifest (version, config schema, privacy) |
| `.mcpbignore` | Files excluded from bundle |
| `.github/workflows/mcpb-release.yml` | Automated build workflow |

**Manual Build (for testing):**
```bash
npm install -g @anthropic-ai/mcpb
mcpb validate manifest.json
mcpb pack . google-researcher-mcp.mcpb
```

**Manifest Best Practices:**
- Use `manifest_version: "0.4"` for latest features
- Define `user_config` for API credentials with clear descriptions
- Include `privacy_policies` documenting external service connections
- Keep bundle size under 100MB

---

### 4. awesome-mcp-servers

**URL:** https://github.com/punkpeye/awesome-mcp-servers
**Stars:** 80,000+
**Status:** ⏳ [PR #1917](https://github.com/punkpeye/awesome-mcp-servers/pull/1917) pending
**Purpose:** High-visibility curated community list

**Our Entry (in PR):**
```markdown
- [Google Researcher MCP](https://github.com/zoharbabin/google-research-mcp) - Comprehensive research tools including Google Search (web, news, images), web scraping, academic paper search, patent search, and YouTube transcript extraction. 🟢 ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) ☁️ 🏠
```

**Entry Format Explained:**
- `🟢` = Actively maintained
- TypeScript badge = Implementation language
- `☁️` = Cloud/remote deployment supported
- `🏠` = Local deployment supported

**Submission Process (for reference):**
```bash
# 1. Fork and clone
gh repo fork punkpeye/awesome-mcp-servers --clone
cd awesome-mcp-servers
git checkout -b add-your-server

# 2. Add entry to README.md in appropriate category
# (alphabetical order within category)

# 3. Submit PR
git add README.md
git commit -m "Add Your Server Name"
git push origin add-your-server
gh pr create
```

---

### 5. Glama.ai

**URL:** https://glama.ai/mcp/servers
**Servers Listed:** 17,200+
**Status:** 📋 Not yet submitted
**Purpose:** Largest MCP directory with quality metrics

**Features:**
- A/B/C quality grades (security, license, code quality)
- Security audit results
- Usage statistics and popularity ranking
- MCP Gateway integration

**Submission Process:**
1. Navigate to https://glama.ai/mcp/servers
2. Click "Add Server" or "Submit"
3. Enter GitHub repository URL: `https://github.com/zoharbabin/google-research-mcp`
4. Server is automatically indexed and scored

**Expected Listing:**
- Category: Search & Data Extraction
- Features detected: Google Search, Web Scraping, Document Parsing

---

### 6. MCP.so

**URL:** https://mcp.so
**Servers Listed:** 17,598+
**Status:** 📋 Not yet submitted
**Purpose:** Community-driven marketplace

**Submission Process:**
1. Go to https://mcp.so
2. Click "Submit" in navigation
3. Create GitHub issue in their repository with:
   - Server name: Google Researcher MCP
   - Repository URL
   - Description and features
   - Connection info (STDIO, HTTP/SSE)

---

### 7. Other Directories

| Directory | URL | Type | Submission |
|-----------|-----|------|------------|
| **MCPHub.io** | https://mcphub.io | Discovery (250+) | Auto-indexed from GitHub |
| **Cursor Directory** | https://cursor.directory/mcp | Cursor IDE users | Submit via website |
| **MCP.run** | https://mcp.run | Enterprise gateway | Not a public directory |
| **Official Servers** | github.com/modelcontextprotocol/servers | Reference impls | Very selective |

---

## Automated Release Process

### Creating a Release

```bash
# 1. Ensure all changes are committed
git status

# 2. Update version (updates package.json and creates tag)
npm version patch  # or minor, major

# 3. Push with tags
git push origin main --tags

# 4. Create GitHub Release (triggers MCPB build)
gh release create v6.0.1 --generate-notes

# 5. Publish to npm
npm publish

# 6. Update MCP Registry
mcp-publisher publish
```

### What Happens Automatically

1. **CI/CD Pipeline** (`ci.yml`)
   - Runs tests on Node 20/22 across Linux, macOS, Windows
   - Runs lint, security audit, performance tests
   - Builds Docker image

2. **MCPB Release** (`mcpb-release.yml`)
   - Triggers on new GitHub Release
   - Builds `.mcpb` bundle
   - Attaches to release as downloadable asset

### Version Sync Checklist

After each release, verify:
- [ ] `package.json` version updated
- [ ] `manifest.json` version matches (auto-synced by CI)
- [ ] GitHub Release tag matches
- [ ] npm shows new version: `npm view google-researcher-mcp version`

---

## Maintaining Distributions

### After Feature Updates

1. Create release with updated version
2. Verify npm package updated
3. Verify MCPB bundle attached to release
4. Update directory listings if description changed

### Monitoring

- **npm:** Check download stats at npmjs.com
- **GitHub:** Check release download counts
- **Glama.ai:** Monitor quality score (once listed)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| MCPB not attached to release | Check workflow logs, ensure manifest.json is valid |
| npm publish fails | Verify npm login, check version not already published |
| MCP Registry update fails | Re-run `mcp-publisher login` |

---

## Action Items

### Immediate (Priority 1)
- [x] npm: Published and maintained
- [x] MCP Registry: Published
- [x] MCPB: Automated in CI

### Pending External (Priority 2)
- [ ] awesome-mcp-servers: PR #1917 awaiting merge

### Todo (Priority 3)
- [ ] Submit to Glama.ai
- [ ] Submit to MCP.so
- [ ] Monitor for new directories/marketplaces

---

## Related Resources

| Resource | Description |
|----------|-------------|
| [README.md](../README.md) | Main documentation |
| [API_SETUP.md](./API_SETUP.md) | Google API credentials setup |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [manifest.json](../manifest.json) | MCPB manifest |
| [Issue #89](https://github.com/zoharbabin/google-research-mcp/issues/89) | Distribution tracking issue |
| [Issue #85](https://github.com/zoharbabin/google-research-mcp/issues/85) | awesome-mcp-servers submission |
