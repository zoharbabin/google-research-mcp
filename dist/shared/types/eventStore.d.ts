import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
/**
 * Represents stored event data with metadata
 */
export interface EventData {
    /**
     * The ID of the stream this event belongs to
     */
    streamId: string;
    /**
     * The JSON-RPC message content
     */
    message: JSONRPCMessage;
    /**
     * Timestamp when the event was created (milliseconds since epoch)
     */
    timestamp: number;
    /**
     * Optional metadata for the event
     */
    metadata?: Record<string, any>;
}
/**
 * Configuration options for the PersistentEventStore
 */
export interface PersistentEventStoreOptions {
    /**
     * Maximum number of events to store per stream
     * @default 1000
     */
    maxEventsPerStream?: number;
    /**
     * Time-to-live for events in milliseconds
     * Events older than this will be automatically removed during cleanup
     * @default 24 * 60 * 60 * 1000 (24 hours)
     */
    eventTTL?: number;
    /**
     * Maximum total events to store across all streams
     * @default 10000
     */
    maxTotalEvents?: number;
    /**
     * Path for persistent storage of events
     * Required parameter
     */
    storagePath: string;
    /**
     * How often to persist events to disk in milliseconds
     * @default 5 * 60 * 1000 (5 minutes)
     */
    persistenceInterval?: number;
    /**
     * Stream IDs that should be persisted immediately on every update
     * @default []
     */
    criticalStreamIds?: string[];
    /**
     * Whether to load all events from disk on startup
     * @default false
     */
    eagerLoading?: boolean;
    /**
     * Optional encryption settings
     */
    encryption?: EncryptionOptions;
}
/**
 * Configuration options for event encryption
 */
export interface EncryptionOptions {
    /**
     * Whether encryption is enabled
     */
    enabled: boolean;
    /**
     * Function that provides the encryption key
     * Should return a Buffer containing the key
     */
    keyProvider: () => Promise<Buffer>;
    /**
     * Encryption algorithm to use
     * @default 'aes-256-gcm'
     */
    algorithm?: string;
}
/**
 * Statistics about the event store
 */
export interface EventStoreStats {
    /**
     * Total number of events in the store
     */
    totalEvents: number;
    /**
     * Number of events per stream
     */
    eventsByStream: Record<string, number>;
    /**
     * Estimated memory usage in bytes
     */
    memoryUsage: number;
    /**
     * Estimated disk usage in bytes
     */
    diskUsage: number;
    /**
     * Ratio of cache hits to total requests
     */
    hitRatio: number;
    /**
     * Ratio of cache misses to total requests
     */
    missRatio: number;
    /**
     * Timestamp of the oldest event in the store
     */
    oldestEvent: Date;
    /**
     * Timestamp of the newest event in the store
     */
    newestEvent: Date;
}
/**
 * Internal statistics tracking
 */
export interface EventStoreInternalStats {
    /**
     * Number of cache hits
     */
    hits: number;
    /**
     * Number of cache misses
     */
    misses: number;
    /**
     * Total number of requests
     */
    totalRequests: number;
}
/**
 * Options for access control
 */
export interface AccessControlOptions {
    /**
     * Whether access control is enabled
     */
    enabled: boolean;
    /**
     * Function that authorizes access to a stream
     * @param streamId - The ID of the stream to access
     * @param userId - The ID of the user requesting access
     * @returns Promise resolving to true if access is granted, false otherwise
     */
    authorizer: (streamId: string, userId: string) => Promise<boolean>;
}
/**
 * Options for audit logging
 */
export interface AuditLogOptions {
    /**
     * Whether audit logging is enabled
     */
    enabled: boolean;
    /**
     * Function that logs audit events
     * @param event - The audit event to log
     */
    logger: (event: AuditEvent) => Promise<void>;
}
/**
 * Represents an audit event
 */
export interface AuditEvent {
    /**
     * Timestamp of the event (ISO string)
     */
    timestamp: string;
    /**
     * Type of operation performed
     */
    operation: string;
    /**
     * ID of the stream involved
     */
    streamId: string;
    /**
     * ID of the user who performed the operation (if available)
     */
    userId?: string;
    /**
     * ID of the event involved (if applicable)
     */
    eventId?: string;
    /**
     * Result of the operation
     */
    result: 'success' | 'failure';
    /**
     * Additional details about the operation
     */
    details?: Record<string, any>;
}
//# sourceMappingURL=eventStore.d.ts.map