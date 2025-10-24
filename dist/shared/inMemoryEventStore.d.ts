import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { EventStore } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
/**
 * Simple in-memory implementation of the EventStore interface for MCP session resumability
 *
 * This class provides:
 * - Storage of JSON-RPC messages by stream ID and event ID
 * - Replay capability for missed events after reconnection
 * - Chronological ordering of events during replay
 *
 * The EventStore is a critical component for the Server-Sent Events (SSE) transport,
 * allowing clients to resume sessions after disconnection without losing messages.
 *
 * Note: This implementation stores all events in memory and is intended for
 * examples, testing, or development use. For production, consider implementing
 * a persistent EventStore using a database or file system.
 *
 * @see https://github.com/zoharbabin/google-research-mcp for MCP documentation
 * @implements EventStore from the MCP SDK
 */
export declare class InMemoryEventStore implements EventStore {
    private events;
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
     * @private
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
     * @private
     */
    private getStreamIdFromEventId;
    /**
     * Stores a JSON-RPC message in the event store
     *
     * This method:
     * 1. Generates a unique event ID
     * 2. Associates the message with the stream ID
     * 3. Stores the event in memory
     *
     * @param streamId - The ID of the stream this event belongs to
     * @param message - The JSON-RPC message to store
     * @returns The generated event ID
     */
    storeEvent(streamId: string, message: JSONRPCMessage): Promise<string>;
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
     * @param lastEventId - The ID of the last event received by the client
     * @param send - Callback function to send events to the client
     * @returns The stream ID if successful, empty string otherwise
     */
    replayEventsAfter(lastEventId: string, { send }: {
        send: (eventId: string, message: JSONRPCMessage) => Promise<void>;
    }): Promise<string>;
}
//# sourceMappingURL=inMemoryEventStore.d.ts.map