# Storage Configuration

## Overview

The google-research-mcp server uses temporary storage to avoid polluting user project directories. All cache, event store, and Crawlee data is stored in the system's temporary directory.

## Storage Location

Storage is configured to use the OS temporary directory:

```typescript
const TEMP_STORAGE_BASE = path.join(os.tmpdir(), 'google-research-mcp');
```

On different operating systems, this resolves to:
- **macOS**: `/var/folders/.../google-research-mcp`
- **Linux**: `/tmp/google-research-mcp`
- **Windows**: `%TEMP%\google-research-mcp`

## Storage Components

The server uses three types of storage:

1. **Persistent Cache** (`persistent_cache/`)
   - Caches Google Search results
   - Caches scraped web pages
   - Caches Gemini AI analysis results
   - Reduces API calls within a session

2. **Event Store** (`event_store/`)
   - Stores MCP session events
   - Enables session management for HTTP+SSE transport
   - Provides event replay capabilities

3. **Crawlee Storage** (`request_queues/`)
   - Internal storage for the Crawlee web scraping library
   - Manages request queues and datasets
   - Configured via `CRAWLEE_STORAGE_DIR` environment variable

## Why Temporary Storage?

### Benefits

✅ **No Directory Pollution**: npx execution doesn't create `./storage` in user projects
✅ **Automatic Cleanup**: OS manages cleanup of old temporary files
✅ **Session Isolation**: Each run gets its own clean storage
✅ **npx-Friendly**: Works seamlessly with remote GitHub execution

### Trade-offs

⚠️ **Cache Persistence**: Cache doesn't survive between separate npx invocations
- This is acceptable because each npx run is independent
- Cache still works within a single session to reduce redundant API calls

⚠️ **Storage Location**: Temporary files may be harder to inspect for debugging
- Use `console.log(process.env.CRAWLEE_STORAGE_DIR)` to find the location
- Temporary storage is typically in `/tmp` or equivalent

## Configuration Details

### Crawlee Configuration

The `CRAWLEE_STORAGE_DIR` environment variable is set early in the server initialization:

```typescript
// Set before any Crawlee code is imported or executed
process.env.CRAWLEE_STORAGE_DIR = TEMP_STORAGE_BASE;
```

This ensures that all Crawlee operations use the configured temporary directory instead of defaulting to `./storage` in the current working directory.

### Cache Configuration

The `PersistentCache` is configured with the temporary storage path:

```typescript
const globalCacheInstance = new PersistentCache({
  storagePath: DEFAULT_CACHE_PATH, // Points to temp directory
  // ... other options
});
```

### Event Store Configuration

The `PersistentEventStore` is configured similarly:

```typescript
const eventStoreInstance = new PersistentEventStore({
  storagePath: DEFAULT_EVENT_PATH, // Points to temp directory
  // ... other options
});
```

## Testing

A test script verifies the storage configuration:

```bash
node tests/test-temp-storage.mjs
```

This test confirms:
- No `./storage` directory is created in the working directory
- Crawlee uses the configured temporary storage
- Storage is created in the system temp directory

## Troubleshooting

### Finding Storage Location

To see where storage is being created:

```bash
# macOS/Linux
echo $TMPDIR
ls -la $TMPDIR/google-research-mcp

# Or check the environment variable
node -e "console.log(process.env.CRAWLEE_STORAGE_DIR || 'Not set')"
```

### Clearing Storage

Storage is automatically cleaned up by the OS, but you can manually clear it:

```bash
# macOS/Linux
rm -rf /tmp/google-research-mcp
rm -rf /var/folders/*/T/google-research-mcp

# Windows
del /s /q %TEMP%\google-research-mcp
```

### Debugging Storage Issues

If you encounter storage-related errors:

1. Check permissions on the temp directory
2. Verify disk space is available
3. Check for any file locks or competing processes
4. Review logs for specific error messages

## Migration Notes

**Previous Behavior**: The server used `./storage` relative to the project root or current working directory.

**Current Behavior**: The server always uses the system temporary directory.

**Impact**: 
- Existing `./storage` directories from previous runs are not automatically migrated
- Cache from previous runs will not be available (fresh start with each npx run)
- This is the desired behavior for npx execution