# NPX GitHub Installation

This repository is configured to work with direct npx GitHub installation:

```bash
npx -y github:jimweller/google-research-mcp
```

## Architecture

### Committed dist/ Files

The compiled JavaScript files in `dist/` are **committed to the repository**. This is intentional for GitHub-based npx installations.

**Why this approach:**
- ✅ Reliable npx installation from GitHub
- ✅ No build step during install
- ✅ Faster installation
- ✅ Works across all platforms (not CPU-specific - it's JavaScript, not binaries)

**Tradeoffs:**
- ⚠️ Larger repository size
- ⚠️ Must rebuild before committing source changes

### Platform Compatibility

The dist files are **pure JavaScript** compiled from TypeScript. They are:
- ✅ Platform-independent (macOS, Linux, Windows)
- ✅ Architecture-independent (ARM, x86, etc.)
- ✅ Compatible with any Node.js version >= 18.0.0

### Development Workflow

When making changes:

1. Edit TypeScript files in `src/`
2. Build: `npm run build`
3. Test: `npm test`
4. Commit both src and dist files
5. Push to GitHub

### Publishing to npm

For npm registry publishing, `prepublishOnly` ensures a fresh build before publishing.

### Alternative Approaches

Other packages may:
- Exclude dist/ and use `prepare` scripts (requires working build during install)
- Publish only to npm registry (not support GitHub direct installs)

We chose committed dist/ for maximum compatibility with MCP client tools that expect GitHub-based npx installation.