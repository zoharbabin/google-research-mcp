import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PersistentEventStore } from './persistentEventStore.js';
import * as path from 'node:path';
// Mock the EventPersistenceManager
// We'll use a manual mock approach instead
describe('PersistentEventStore', () => {
    let eventStore;
    let mockPersistenceManager;
    let mockNow;
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Set up mock time
        mockNow = Date.now();
        jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
        // Create a temporary directory for testing
        const tempDir = path.join(process.cwd(), 'storage', 'test', `event_store_test_${Date.now()}`);
        // Create event store with test configuration
        eventStore = new PersistentEventStore({
            maxEventsPerStream: 5,
            eventTTL: 1000, // 1 second for faster testing
            maxTotalEvents: 10,
            persistenceInterval: 100, // 100ms for faster testing
            eagerLoading: false,
            storagePath: tempDir
        });
        // Create a mock persistence manager
        mockPersistenceManager = {
            persistEvent: jest.fn(),
            persistEvents: jest.fn(),
            loadEvent: jest.fn(),
            loadEvents: jest.fn(),
            setOnPersistCallback: jest.fn(),
            startPeriodicPersistence: jest.fn(),
            stopPeriodicPersistence: jest.fn(),
            calculateDiskUsage: jest.fn(),
            getStreamDirectory: jest.fn(streamId => `${tempDir}/${streamId}`),
            dispose: jest.fn()
        };
        // Replace the internal persistence manager with our mock
        eventStore.persistenceManager = mockPersistenceManager;
        // Set up default mock implementations
        mockPersistenceManager.persistEvent.mockResolvedValue(undefined);
        mockPersistenceManager.persistEvents.mockResolvedValue(undefined);
        mockPersistenceManager.loadEvent.mockResolvedValue(null);
        mockPersistenceManager.loadEvents.mockResolvedValue(new Map());
        mockPersistenceManager.calculateDiskUsage.mockResolvedValue(0);
        mockPersistenceManager.dispose.mockResolvedValue(undefined);
    });
    afterEach(async () => {
        // Clean up
        await eventStore.dispose();
        jest.restoreAllMocks();
    });
    describe('storeEvent', () => {
        it('should store an event and return an event ID', async () => {
            const streamId = 'test-stream';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Mock persistEvent to resolve successfully
            mockPersistenceManager.persistEvent.mockResolvedValue();
            const eventId = await eventStore.storeEvent(streamId, message);
            // Check that the event ID is in the expected format
            expect(eventId).toMatch(new RegExp(`^${streamId}_\\d+_[a-z0-9]+$`));
            // Persistence should not be called for non-critical streams
            expect(mockPersistenceManager.persistEvent).not.toHaveBeenCalled();
        });
        it('should persist critical stream events immediately', async () => {
            const streamId = 'critical-stream';
            const message = { jsonrpc: '2.0', method: 'test', params: { data: 'test' } };
            // Create a new event store with critical streams
            const criticalEventStore = new PersistentEventStore({
                maxEventsPerStream: 5,
                eventTTL: 1000,
                maxTotalEvents: 10,
                persistenceInterval: 100,
                criticalStreamIds: [streamId],
                storagePath: path.join(process.cwd(), 'storage', 'test', `critical_event_store_test_${Date.now()}`)
            });
            // Replace the internal persistence manager with our mock
            criticalEventStore.persistenceManager = mockPersistenceManager;
            // Mock persistEvent to resolve successfully
            mockPersistenceManager.persistEvent.mockResolvedValue();
            // Need to cast message to any to bypass TypeScript's type checking
            const eventId = await criticalEventStore.storeEvent(streamId, message);
            // Check that persistEvent was called for critical stream
            expect(mockPersistenceManager.persistEvent).toHaveBeenCalledWith(eventId, expect.objectContaining({
                streamId,
                message: expect.any(Object),
                timestamp: expect.any(Number)
            }));
            // Clean up
            await criticalEventStore.dispose();
        });
        it('should enforce stream event limits', async () => {
            const streamId = 'test-stream';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Store more events than the limit
            const eventIds = [];
            for (let i = 0; i < 7; i++) {
                eventIds.push(await eventStore.storeEvent(streamId, message));
            }
            // Get stats to check how many events are stored
            const stats = await eventStore.getStats();
            // Should only have maxEventsPerStream (5) events for this stream
            expect(stats.eventsByStream[streamId]).toBe(5);
            // The oldest events should have been removed
            expect(stats.totalEvents).toBe(5);
        });
        it('should enforce global event limits', async () => {
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Store events across multiple streams, exceeding the global limit
            for (let i = 0; i < 5; i++) {
                await eventStore.storeEvent('stream1', message);
            }
            for (let i = 0; i < 7; i++) {
                await eventStore.storeEvent('stream2', message);
            }
            // Get stats to check how many events are stored
            const stats = await eventStore.getStats();
            // Should only have maxTotalEvents (10) events total
            expect(stats.totalEvents).toBe(10);
        });
    });
    describe('replayEventsAfter', () => {
        it('should replay events after a given event ID', async () => {
            // Create a new event store with direct access to the memory store for testing
            const testEventStore = new PersistentEventStore({
                maxEventsPerStream: 5,
                eventTTL: 1000,
                maxTotalEvents: 10,
                persistenceInterval: 100,
                storagePath: path.join(process.cwd(), 'storage', 'test', `event_store_test_${Date.now()}`)
            });
            try {
                const streamId = 'test-stream';
                const message1 = { jsonrpc: "2.0", method: 'test1', params: { data: 'test1' } };
                const message2 = { jsonrpc: "2.0", method: 'test2', params: { data: 'test2' } };
                const message3 = { jsonrpc: "2.0", method: 'test3', params: { data: 'test3' } };
                // Store some events
                const eventId1 = await testEventStore.storeEvent(streamId, message1);
                const eventId2 = await testEventStore.storeEvent(streamId, message2);
                const eventId3 = await testEventStore.storeEvent(streamId, message3);
                // Set up a mock send function with proper typing
                const mockSend = jest.fn()
                    .mockImplementation(() => Promise.resolve());
                // Replay events after eventId1
                const result = await testEventStore.replayEventsAfter(eventId1, { send: mockSend });
                // Check that the correct stream ID was returned
                expect(result).toBe(streamId);
                // Check that send was called with the correct events
                expect(mockSend).toHaveBeenCalledTimes(2); // Should be called for eventId2 and eventId3
                expect(mockSend).toHaveBeenCalledWith(eventId2, message2);
                expect(mockSend).toHaveBeenCalledWith(eventId3, message3);
            }
            finally {
                // Clean up
                await testEventStore.dispose();
            }
        });
        it('should return empty string if event ID is not found', async () => {
            const mockSend = jest.fn()
                .mockImplementation(() => Promise.resolve());
            // Try to replay events after a non-existent event ID
            const result = await eventStore.replayEventsAfter('non-existent', { send: mockSend });
            // Check that an empty string was returned
            expect(result).toBe('');
            // Check that send was not called
            expect(mockSend).not.toHaveBeenCalled();
        });
        it('should load event from disk if not in memory', async () => {
            const streamId = 'test-stream';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            const eventId = `${streamId}_${mockNow}_abcdef`;
            // Mock loadEvent to return an event
            mockPersistenceManager.loadEvent.mockResolvedValue({
                streamId,
                message,
                timestamp: mockNow
            });
            // Set up a mock send function
            const mockSend = jest.fn()
                .mockImplementation(() => Promise.resolve());
            // Replay events after the mocked event ID
            const result = await eventStore.replayEventsAfter(eventId, { send: mockSend });
            // Check that loadEvent was called
            expect(mockPersistenceManager.loadEvent).toHaveBeenCalledWith(eventId);
            // Since we're not adding any events after the loaded one, send should not be called
            expect(mockSend).not.toHaveBeenCalled();
            // But we should get the stream ID back
            expect(result).toBe(streamId);
        });
    });
    describe('cleanup', () => {
        it('should remove expired events', async () => {
            const streamId = 'test-stream';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Store an event
            const eventId = await eventStore.storeEvent(streamId, message);
            // Advance time past TTL
            mockNow += 2000; // 2 seconds later, past the 1000ms TTL
            // Run cleanup
            await eventStore.cleanup();
            // Get stats to check how many events are stored
            const stats = await eventStore.getStats();
            // Should have no events
            expect(stats.totalEvents).toBe(0);
        });
    });
    describe('persistToDisk', () => {
        it('should persist all events to disk', async () => {
            const streamId = 'test-stream';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Store some events
            await eventStore.storeEvent(streamId, message);
            await eventStore.storeEvent(streamId, message);
            // Mock persistEvents to resolve successfully
            mockPersistenceManager.persistEvents.mockResolvedValue();
            // Persist to disk
            await eventStore.persistToDisk();
            // Check that persistEvents was called with a map
            expect(mockPersistenceManager.persistEvents).toHaveBeenCalledWith(expect.any(Map));
        });
    });
    describe('getStats', () => {
        it('should return accurate statistics', async () => {
            const stream1 = 'stream1';
            const stream2 = 'stream2';
            const message = { jsonrpc: "2.0", method: 'test', params: { data: 'test' } };
            // Store some events
            await eventStore.storeEvent(stream1, message);
            await eventStore.storeEvent(stream1, message);
            await eventStore.storeEvent(stream2, message);
            // Mock calculateDiskUsage to return a value
            mockPersistenceManager.calculateDiskUsage.mockResolvedValue(1024); // 1KB
            // Get stats
            const stats = await eventStore.getStats();
            // Check stats
            expect(stats.totalEvents).toBe(3);
            expect(stats.eventsByStream[stream1]).toBe(2);
            expect(stats.eventsByStream[stream2]).toBe(1);
            expect(stats.diskUsage).toBe(1024);
            expect(stats.memoryUsage).toBeGreaterThan(0);
            expect(stats.oldestEvent).toBeInstanceOf(Date);
            expect(stats.newestEvent).toBeInstanceOf(Date);
        });
    });
});
//# sourceMappingURL=persistentEventStore.spec.js.map