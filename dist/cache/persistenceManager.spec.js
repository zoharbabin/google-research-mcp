import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PersistenceManager } from './persistenceManager.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
describe('PersistenceManager', () => {
    let persistenceManager;
    let tempDir;
    beforeEach(async () => {
        // Create a temporary directory for testing
        tempDir = path.join(process.cwd(), 'storage', 'test', `cache_test_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        // Create a new persistence manager instance
        persistenceManager = new PersistenceManager(tempDir);
    });
    afterEach(async () => {
        // Clean up the temporary directory after each test
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error(`Error cleaning up temp directory: ${error}`);
        }
    });
    describe('saveEntry and loadEntry', () => {
        it('should save and load an entry', async () => {
            const namespace = 'test-namespace';
            const key = 'test-key';
            const entry = {
                value: { data: 'test value' },
                expiresAt: Date.now() + 1000,
                staleUntil: Date.now() + 2000
            };
            // Save the entry
            await persistenceManager.saveEntry(namespace, key, entry);
            // Load the entry
            const loadedEntry = await persistenceManager.loadEntry(namespace, key);
            // Check that the loaded entry matches the original
            expect(loadedEntry).toEqual(entry);
        });
        it('should return undefined when loading a non-existent entry', async () => {
            const loadedEntry = await persistenceManager.loadEntry('non-existent', 'non-existent');
            expect(loadedEntry).toBeUndefined();
        });
        it('should handle special characters in namespace and key', async () => {
            const namespace = 'test/namespace with spaces';
            const key = 'test:key?with&special#chars';
            const entry = {
                value: { data: 'test value' },
                expiresAt: Date.now() + 1000
            };
            // Save the entry
            await persistenceManager.saveEntry(namespace, key, entry);
            // Load the entry
            const loadedEntry = await persistenceManager.loadEntry(namespace, key);
            // Check that the loaded entry matches the original
            expect(loadedEntry).toEqual(entry);
        });
    });
    describe('removeEntry', () => {
        it('should remove an entry', async () => {
            const namespace = 'test-namespace';
            const key = 'test-key';
            const entry = {
                value: { data: 'test value' },
                expiresAt: Date.now() + 1000
            };
            // Save the entry
            await persistenceManager.saveEntry(namespace, key, entry);
            // Remove the entry
            await persistenceManager.removeEntry(namespace, key);
            // Try to load the entry
            const loadedEntry = await persistenceManager.loadEntry(namespace, key);
            // Check that the entry is gone
            expect(loadedEntry).toBeUndefined();
        });
        it('should not throw when removing a non-existent entry', async () => {
            // This should not throw
            await expect(persistenceManager.removeEntry('non-existent', 'non-existent')).resolves.not.toThrow();
        });
    });
    describe('saveAllEntries and loadAllEntries', () => {
        it('should save and load multiple entries', async () => {
            // Create test entries
            const entries = new Map();
            // Namespace 1
            const namespace1 = 'namespace1';
            const namespace1Entries = new Map();
            namespace1Entries.set('key1', {
                value: { data: 'value1' },
                expiresAt: Date.now() + 1000
            });
            namespace1Entries.set('key2', {
                value: { data: 'value2' },
                expiresAt: Date.now() + 2000
            });
            entries.set(namespace1, namespace1Entries);
            // Namespace 2
            const namespace2 = 'namespace2';
            const namespace2Entries = new Map();
            namespace2Entries.set('key3', {
                value: { data: 'value3' },
                expiresAt: Date.now() + 3000
            });
            entries.set(namespace2, namespace2Entries);
            // Save all entries
            await persistenceManager.saveAllEntries(entries);
            // Load all entries
            const loadedEntries = await persistenceManager.loadAllEntries();
            // Check that the loaded entries match the original
            expect(loadedEntries.size).toBe(2); // Two namespaces
            // Check namespace1
            expect(loadedEntries.has(namespace1)).toBe(true);
            const loadedNamespace1Entries = loadedEntries.get(namespace1);
            expect(loadedNamespace1Entries.size).toBe(2); // Two keys
            expect(loadedNamespace1Entries.get('key1')).toEqual(namespace1Entries.get('key1'));
            expect(loadedNamespace1Entries.get('key2')).toEqual(namespace1Entries.get('key2'));
            // Check namespace2
            expect(loadedEntries.has(namespace2)).toBe(true);
            const loadedNamespace2Entries = loadedEntries.get(namespace2);
            expect(loadedNamespace2Entries.size).toBe(1); // One key
            expect(loadedNamespace2Entries.get('key3')).toEqual(namespace2Entries.get('key3'));
        });
        it('should return an empty map when loading from an empty directory', async () => {
            // Create a new empty directory
            const emptyDir = path.join(process.cwd(), 'storage', 'test', `empty_${Date.now()}`);
            await fs.mkdir(emptyDir, { recursive: true });
            // Create a new persistence manager for the empty directory
            const emptyPersistenceManager = new PersistenceManager(emptyDir);
            // Load all entries
            const loadedEntries = await emptyPersistenceManager.loadAllEntries();
            // Check that the result is an empty map
            expect(loadedEntries.size).toBe(0);
            // Clean up
            await fs.rm(emptyDir, { recursive: true, force: true });
        });
    });
    describe('clear', () => {
        it('should clear all entries', async () => {
            // Create test entries
            const namespace = 'test-namespace';
            const key1 = 'test-key1';
            const key2 = 'test-key2';
            const entry1 = {
                value: { data: 'test value 1' },
                expiresAt: Date.now() + 1000
            };
            const entry2 = {
                value: { data: 'test value 2' },
                expiresAt: Date.now() + 2000
            };
            // Save the entries
            await persistenceManager.saveEntry(namespace, key1, entry1);
            await persistenceManager.saveEntry(namespace, key2, entry2);
            // Clear all entries
            await persistenceManager.clear();
            // Try to load the entries
            const loadedEntry1 = await persistenceManager.loadEntry(namespace, key1);
            const loadedEntry2 = await persistenceManager.loadEntry(namespace, key2);
            // Check that the entries are gone
            expect(loadedEntry1).toBeUndefined();
            expect(loadedEntry2).toBeUndefined();
            // Check that the namespace directory is gone
            const namespacePath = path.join(tempDir, 'namespaces', encodeURIComponent(namespace));
            await expect(fs.access(namespacePath)).rejects.toThrow();
        });
        it('should not throw when clearing an empty directory', async () => {
            // This should not throw
            await expect(persistenceManager.clear()).resolves.not.toThrow();
        });
    });
    describe('error handling', () => {
        it('should handle corrupted JSON files', async () => {
            const namespace = 'test-namespace';
            const key = 'test-key';
            const entry = {
                value: { data: 'test value' },
                expiresAt: Date.now() + 1000
            };
            // Save the entry
            await persistenceManager.saveEntry(namespace, key, entry);
            // Corrupt the file
            const namespacePath = path.join(tempDir, 'namespaces', encodeURIComponent(namespace));
            const entryPath = path.join(namespacePath, `${persistenceManager['hashKey'](key)}.json`);
            await fs.writeFile(entryPath, 'not valid json', 'utf8');
            // Try to load the entry
            const loadedEntry = await persistenceManager.loadEntry(namespace, key);
            // Check that the entry is undefined (corrupted file should be deleted)
            expect(loadedEntry).toBeUndefined();
            // Check that the corrupted file is gone
            await expect(fs.access(entryPath)).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=persistenceManager.spec.js.map