# NPX GitHub Installation

This repository is configured to work with direct npx GitHub installation:

```bash
npx -y github:jimweller/google-research-mcp
```

## Architecture

### Traditional npm Build Approach

The repository uses the **traditional npm approach** where TypeScript is compiled during installation:

**How it works:**
- ✅ Source TypeScript files (`src/`) committed to repository
- ✅ Compiled files (`dist/`) NOT committed (in `.gitignore`)
- ✅ `prepare` script runs TypeScript compiler during `npm install`
- ✅ Works for both `npm install` and `npx github:user/repo`

**Advantages:**
- ✅ Clean git history (no compiled files)
- ✅ Smaller repository
- ✅ Always builds from latest source
- ✅ Standard npm best practice

**Requirements:**
- TypeScript must be in dependencies (not just devDependencies)
- Build must complete successfully during install
- Node.js >= 18.0.0 required

### Platform Compatibility

The compiled JavaScript files are:
- ✅ Platform-independent (macOS, Linux, Windows)
- ✅ Architecture-independent (ARM, x86, etc.)
- ✅ Compatible with any Node.js version >= 18.0.0

The compilation happens at install time on the target platform, ensuring compatibility.

### Development Workflow

When making changes:

1. Edit TypeScript files in `src/`
2. Test locally: `npm run build && npm test`
3. Commit only source files (dist/ is gitignored)
4. Push to GitHub
5. The `prepare` script will build automatically during install

### npm Scripts

- `prepare`: Runs automatically during `npm install` or `npx` - builds TypeScript
- `build`: Manually compile TypeScript to JavaScript
- `prepublishOnly`: Runs tests before publishing to npm registry

### Publishing to npm

For npm registry publishing:
1. `prepublishOnly` runs tests
2. `prepare` builds the code
3. Package is published with compiled files

### Why This Approach Works

The `prepare` script is special in npm:
- Runs after `npm install` (including `npx` installs)
- Runs before `npm publish`
- Guaranteed to run in both local development and remote installs

This ensures users always get working code, whether installing from npm registry or directly from GitHub.