import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventPersistenceManager } from './eventPersistenceManager.js';
import * as crypto from 'node:crypto'; // Import crypto for randomUUID
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
describe('EventPersistenceManager', () => {
    let persistenceManager;
    let tempDir;
    beforeEach(async () => {
        // Create a unique temporary directory for testing using randomUUID
        const uniqueId = crypto.randomUUID(); // Use crypto for better uniqueness
        tempDir = path.join(process.cwd(), 'storage', 'test', `event_store_test_${uniqueId}`);
        await fs.mkdir(tempDir, { recursive: true });
        // Create a new persistence manager instance
        persistenceManager = new EventPersistenceManager({
            storagePath: tempDir,
            criticalStreamIds: ['critical-stream'],
            persistenceInterval: 100 // 100ms for faster testing
        });
    });
    afterEach(async () => {
        // Dispose the persistence manager
        await persistenceManager.dispose();
        // Clean up the temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error(`Error cleaning up temp directory: ${error}`);
        }
    });
    describe('persistEvent and loadEvent', () => {
        it('should persist and load an event', async () => {
            const streamId = 'test-stream';
            const eventId = `${streamId}_${Date.now()}_abcdef`;
            const eventData = {
                streamId,
                message: { jsonrpc: "2.0", method: 'test', params: { data: 'test' } },
                timestamp: Date.now(),
                metadata: { userId: 'test-user' }
            };
            // Persist the event
            await persistenceManager.persistEvent(eventId, eventData);
            // Load the event
            const loadedEvent = await persistenceManager.loadEvent(eventId);
            // Check that the loaded event matches the original
            expect(loadedEvent).toEqual(eventData);
        });
        it('should return null when loading a non-existent event', async () => {
            const loadedEvent = await persistenceManager.loadEvent('non-existent');
            expect(loadedEvent).toBeNull();
        });
    });
    describe('persistEvents and loadEvents', () => {
        it('should persist and load multiple events', async () => {
            const events = new Map();
            // Create test events
            const streamId1 = 'stream1';
            const eventId1 = `${streamId1}_${Date.now()}_abc`;
            const eventData1 = {
                streamId: streamId1,
                message: { jsonrpc: "2.0", method: 'test1', params: { data: 'test1' } },
                timestamp: Date.now()
            };
            const streamId2 = 'stream2';
            const eventId2 = `${streamId2}_${Date.now()}_def`;
            const eventData2 = {
                streamId: streamId2,
                message: { jsonrpc: "2.0", method: 'test2', params: { data: 'test2' } },
                timestamp: Date.now()
            };
            events.set(eventId1, eventData1);
            events.set(eventId2, eventData2);
            // Persist all events
            await persistenceManager.persistEvents(events);
            // Load all events
            const loadedEvents = await persistenceManager.loadEvents();
            // Check that the loaded events match the original
            expect(loadedEvents.size).toBe(2);
            expect(loadedEvents.get(eventId1)).toEqual(eventData1);
            expect(loadedEvents.get(eventId2)).toEqual(eventData2);
        });
        it('should return an empty map when loading from an empty directory', async () => {
            // Create a new empty directory
            const emptyDir = path.join(process.cwd(), 'storage', 'test', `empty_${Date.now()}`);
            await fs.mkdir(emptyDir, { recursive: true });
            // Create a new persistence manager for the empty directory
            const emptyPersistenceManager = new EventPersistenceManager({
                storagePath: emptyDir
            });
            // Load all events
            const loadedEvents = await emptyPersistenceManager.loadEvents();
            // Check that the result is an empty map
            expect(loadedEvents.size).toBe(0);
            // Clean up
            await emptyPersistenceManager.dispose();
            await fs.rm(emptyDir, { recursive: true, force: true });
        });
    });
    describe('onPersistenceInterval', () => {
        // Increase timeout for this test
        jest.setTimeout(10000);
        it('should call the persistence callback when the interval fires', async () => {
            // Create a mock callback with proper typing
            const mockCallback = jest.fn()
                .mockResolvedValue(new Map());
            // Set the callback
            persistenceManager.setOnPersistCallback(mockCallback);
            // Directly call the private onPersistenceInterval method instead of waiting for timer
            await persistenceManager.onPersistenceInterval();
            // Check that the callback was called
            expect(mockCallback).toHaveBeenCalled();
        });
    });
    describe('calculateDiskUsage', () => {
        it('should calculate the disk usage of all events', async () => {
            // Create and persist some events
            const events = new Map();
            for (let i = 0; i < 5; i++) {
                const streamId = 'stream';
                const eventId = `${streamId}_${Date.now() + i}_${i}`;
                const eventData = {
                    streamId,
                    message: { jsonrpc: "2.0", method: 'test', params: { data: `test${i}` } },
                    timestamp: Date.now() + i
                };
                events.set(eventId, eventData);
            }
            // Persist all events
            await persistenceManager.persistEvents(events);
            // Calculate disk usage
            const diskUsage = await persistenceManager.calculateDiskUsage();
            // Check that disk usage is greater than 0
            expect(diskUsage).toBeGreaterThan(0);
        });
        it('should return 0 for an empty directory', async () => {
            // Create a new empty directory
            const emptyDir = path.join(process.cwd(), 'storage', 'test', `empty_${Date.now()}`);
            await fs.mkdir(emptyDir, { recursive: true });
            // Create a new persistence manager for the empty directory
            const emptyPersistenceManager = new EventPersistenceManager({
                storagePath: emptyDir
            });
            // Calculate disk usage
            const diskUsage = await emptyPersistenceManager.calculateDiskUsage();
            // Check that disk usage is 0
            expect(diskUsage).toBe(0);
            // Clean up
            await emptyPersistenceManager.dispose();
            await fs.rm(emptyDir, { recursive: true, force: true });
        });
    });
    describe('getStreamDirectory', () => {
        it('should return the correct directory path for a stream', () => {
            const streamId = 'test-stream';
            const expectedPath = path.join(tempDir, streamId);
            const streamDir = persistenceManager.getStreamDirectory(streamId);
            expect(streamDir).toBe(expectedPath);
        });
    });
    describe('error handling', () => {
        it('should handle corrupted JSON files', async () => {
            const streamId = 'test-stream';
            const eventId = `${streamId}_${Date.now()}_abcdef`;
            const eventData = {
                streamId,
                message: { jsonrpc: "2.0", method: 'test', params: { data: 'test' } },
                timestamp: Date.now()
            };
            // Persist the event
            await persistenceManager.persistEvent(eventId, eventData);
            // Corrupt the file
            const streamDir = persistenceManager.getStreamDirectory(streamId);
            const eventPath = path.join(streamDir, `${eventId}.json`);
            await fs.writeFile(eventPath, 'not valid json', 'utf8');
            // Try to load the event
            const loadedEvent = await persistenceManager.loadEvent(eventId);
            // Check that the event is null (corrupted file should be handled)
            expect(loadedEvent).toBeNull();
        });
    });
});
//# sourceMappingURL=eventPersistenceManager.spec.js.map