import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { EventStore } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PersistentEventStoreOptions, EventStoreStats, AccessControlOptions, AuditLogOptions } from "./types/eventStore.js";
/**
 * Production-grade implementation of the EventStore interface with persistence
 *
 * This class provides:
 * - In-memory storage with disk persistence
 * - Configurable event limits and expiration
 * - Comprehensive statistics and monitoring
 * - Stream-level and global event management
 * - Optional encryption for sensitive data
 * - Access control for multi-tenant scenarios
 * - Audit logging for compliance
 *
 * The PersistentEventStore is designed for production use, providing
 * durability across server restarts while maintaining the performance
 * benefits of in-memory storage for active sessions.
 *
 * @implements EventStore from the MCP SDK
 */
export declare class PersistentEventStore implements EventStore {
    private memoryStore;
    private persistenceManager;
    private options;
    private stats;
    private cleanupTimer?;
    private encryption?;
    private accessControl?;
    private auditLog?;
    /**
     * Creates a new PersistentEventStore
     *
     * @param options - Configuration options
     */
    constructor(options: PersistentEventStoreOptions & {
        accessControl?: AccessControlOptions;
        auditLog?: AuditLogOptions;
    });
    /**
     * Loads events from disk into memory
     */
    private loadEvents;
    /**
     * Sets up periodic cleanup of expired events
     */
    private setupCleanupInterval;
    /**
     * Generates a unique event ID for a stream
     *
     * The event ID format is: streamId_timestamp_randomString
     * This format ensures:
     * - Events are associated with their stream
     * - Events can be chronologically ordered
     * - IDs are unique even with timestamp collisions
     *
     * @param streamId - The ID of the stream this event belongs to
     * @returns A unique event ID string
     */
    private generateEventId;
    /**
     * Extracts the stream ID from an event ID
     *
     * Parses the event ID format (streamId_timestamp_randomString)
     * to extract the original stream ID.
     *
     * @param eventId - The event ID to parse
     * @returns The stream ID portion of the event ID
     */
    private getStreamIdFromEventId;
    /**
     * Stores a JSON-RPC message in the event store
     *
     * This method:
     * 1. Generates a unique event ID
     * 2. Associates the message with the stream ID
     * 3. Stores the event in memory
     * 4. Persists critical events immediately
     * 5. Enforces configured limits
     *
     * @param streamId - The ID of the stream this event belongs to
     * @param message - The JSON-RPC message to store
     * @param userId - Optional user ID for audit logging
     * @returns The generated event ID
     */
    storeEvent(streamId: string, message: JSONRPCMessage, userId?: string): Promise<string>;
    /**
     * Replays events that occurred after a specific event
     *
     * This method is used when a client reconnects and needs to catch up on
     * missed events. It:
     *
     * 1. Validates the last event ID received by the client
     * 2. Extracts the stream ID to filter relevant events
     * 3. Sorts all events chronologically
     * 4. Sends all events for the stream that occurred after the last received event
     *
     * If the event is not found in memory, it attempts to load it from disk.
     *
     * @param lastEventId - The ID of the last event received by the client
     * @param options - Options for replaying events
     * @returns The stream ID if successful, empty string otherwise
     */
    replayEventsAfter(lastEventId: string, options: {
        send: (eventId: string, message: JSONRPCMessage) => Promise<void>;
        userId?: string;
    }): Promise<string>;
    /**
     * Loads an event from disk if it's not in memory
     *
     * @param eventId - The ID of the event to load
     * @returns True if the event was loaded successfully, false otherwise
     */
    private loadEventFromDisk;
    /**
     * Enforces the maximum events per stream limit
     *
     * If the number of events for a stream exceeds the configured limit,
     * the oldest events are removed.
     *
     * @param streamId - The ID of the stream to check
     */
    private enforceStreamLimits;
    /**
     * Enforces the maximum total events limit
     *
     * If the total number of events exceeds the configured limit,
     * the oldest events are removed.
     */
    private enforceGlobalLimits;
    /**
     * Persists all events to disk
     *
     * This is typically called during graceful shutdown to ensure
     * all events are saved.
     */
    persistToDisk(): Promise<void>;
    /**
     * Removes expired events based on TTL
     *
     * This is called periodically if eventTTL is configured.
     */
    cleanup(): Promise<void>;
    /**
     * Gets statistics about the event store
     *
     * @returns Statistics about the event store
     */
    getStats(): Promise<EventStoreStats>;
    /**
     * Cleans up resources when the event store is no longer needed
     *
     * This should be called during graceful shutdown.
     */
    dispose(): Promise<void>;
    /**
     * Deletes all events associated with a specific user
     *
     * This is useful for GDPR compliance and "right to be forgotten" requests.
     *
     * @param userId - The ID of the user whose events should be deleted
     * @returns The number of events deleted
     */
    deleteUserEvents(userId: string): Promise<number>;
    /**
     * Logs an audit event if audit logging is enabled
     *
     * @param event - The audit event to log
     */
    private logAuditEvent;
}
//# sourceMappingURL=persistentEventStore.d.ts.map