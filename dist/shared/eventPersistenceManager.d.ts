import { EventData } from './types/eventStore.js';
/**
 * Options for the EventPersistenceManager
 */
interface EventPersistenceManagerOptions {
    /**
     * Path for persistent storage of events
     */
    storagePath: string;
    /**
     * Stream IDs that should be persisted immediately on every update
     */
    criticalStreamIds?: string[];
    /**
     * How often to persist events to disk in milliseconds
     */
    persistenceInterval?: number;
}
/**
 * Manages persistence of events to disk
 *
 * This class handles:
 * - Writing events to disk
 * - Reading events from disk
 * - Organizing events by stream ID
 * - Periodic persistence of events
 */
export declare class EventPersistenceManager {
    private storagePath;
    private criticalStreamIds;
    private persistenceInterval;
    private persistenceTimer?;
    private onPersistCallback?;
    private isDisposed;
    /**
     * Creates a new EventPersistenceManager
     *
     * @param options - Configuration options
     */
    constructor(options: EventPersistenceManagerOptions);
    /**
     * Sets the callback function to be called during periodic persistence
     *
     * @param callback - Function that returns the events to persist
     */
    setOnPersistCallback(callback: () => Promise<Map<string, EventData>>): void;
    /**
     * Persists all events to disk
     *
     * @param events - Map of event ID to event data
     */
    persistEvents(events: Map<string, EventData>): Promise<void>;
    /**
     * Loads all events from disk
     *
     * @returns Map of event ID to event data
     */
    loadEvents(): Promise<Map<string, EventData>>;
    /**
     * Persists a single event to disk
     *
     * @param eventId - The ID of the event
     * @param data - The event data
     */
    persistEvent(eventId: string, data: EventData): Promise<void>;
    /**
     * Loads a single event from disk
     *
     * @param eventId - The ID of the event
     * @returns The event data, or null if not found
     */
    loadEvent(eventId: string): Promise<EventData | null>;
    /**
     * Starts periodic persistence of events
     */
    startPeriodicPersistence(): void;
    /**
     * Stops periodic persistence of events
     */
    stopPeriodicPersistence(): void;
    /**
     * Disposes of resources used by the EventPersistenceManager
     *
     * This method:
     * 1. Stops the persistence timer
     * 2. Clears any callbacks
     * 3. Marks the manager as disposed
     *
     * Call this method when shutting down to ensure proper cleanup
     */
    dispose(): Promise<void>;
    /**
     * Called when the persistence interval timer fires
     */
    private onPersistenceInterval;
    /**
     * Ensures a directory exists, creating it if necessary (async version for other uses)
     *
     * @param dir - The directory path
     */
    private ensureDirectoryExistsAsync;
    /**
     * Gets the directory path for a stream
     *
     * @param streamId - The ID of the stream
     * @returns The directory path
     */
    getStreamDirectory(streamId: string): string;
    /**
     * Writes event data to a file using atomic write pattern
     *
     * @param filePath - The path to write to
     * @param data - The event data to write
     */
    private writeEventFile;
    /**
     * Reads event data from a file
     *
     * @param filePath - The path to read from
     * @returns The event data
     */
    private readEventFile;
    /**
     * Calculates the total disk usage of all events
     *
     * @returns The total size in bytes
     */
    calculateDiskUsage(): Promise<number>;
}
export {};
//# sourceMappingURL=eventPersistenceManager.d.ts.map