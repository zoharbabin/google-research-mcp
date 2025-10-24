import { describe, it, expect } from '@jest/globals';
import { PeriodicPersistenceStrategy, WriteThroughPersistenceStrategy, OnShutdownPersistenceStrategy, HybridPersistenceStrategy } from './persistenceStrategies.js';
describe('PersistenceStrategies', () => {
    const mockEntry = {
        value: 'test value',
        expiresAt: Date.now() + 1000
    };
    describe('PeriodicPersistenceStrategy', () => {
        it('should never persist on set or get', () => {
            const strategy = new PeriodicPersistenceStrategy(60000);
            expect(strategy.shouldPersistOnSet()).toBe(false);
            expect(strategy.shouldPersistOnGet()).toBe(false);
        });
        it('should return the configured persistence interval', () => {
            const interval = 60000; // 1 minute
            const strategy = new PeriodicPersistenceStrategy(interval);
            expect(strategy.getPersistenceInterval()).toBe(interval);
        });
        it('should filter namespaces when configured', () => {
            const strategy = new PeriodicPersistenceStrategy(60000, ['persistent']);
            // Even though this strategy never persists on set/get, we can test the namespace filtering
            // by accessing the protected shouldPersistNamespace method
            expect(strategy.shouldPersistNamespace('persistent')).toBe(true);
            expect(strategy.shouldPersistNamespace('non-persistent')).toBe(false);
        });
        it('should persist all namespaces when none are specified', () => {
            const strategy = new PeriodicPersistenceStrategy(60000);
            expect(strategy.shouldPersistNamespace('any-namespace')).toBe(true);
        });
    });
    describe('WriteThroughPersistenceStrategy', () => {
        it('should persist on set but not on get', () => {
            const strategy = new WriteThroughPersistenceStrategy();
            expect(strategy.shouldPersistOnSet('namespace')).toBe(true);
            expect(strategy.shouldPersistOnGet()).toBe(false);
        });
        it('should not use periodic persistence', () => {
            const strategy = new WriteThroughPersistenceStrategy();
            expect(strategy.getPersistenceInterval()).toBeNull();
        });
        it('should filter namespaces when configured', () => {
            const strategy = new WriteThroughPersistenceStrategy(['persistent']);
            expect(strategy.shouldPersistOnSet('persistent')).toBe(true);
            expect(strategy.shouldPersistOnSet('non-persistent')).toBe(false);
        });
    });
    describe('OnShutdownPersistenceStrategy', () => {
        it('should never persist on set or get', () => {
            const strategy = new OnShutdownPersistenceStrategy();
            expect(strategy.shouldPersistOnSet()).toBe(false);
            expect(strategy.shouldPersistOnGet()).toBe(false);
        });
        it('should not use periodic persistence', () => {
            const strategy = new OnShutdownPersistenceStrategy();
            expect(strategy.getPersistenceInterval()).toBeNull();
        });
        it('should resolve the onShutdown promise', async () => {
            const strategy = new OnShutdownPersistenceStrategy();
            await expect(strategy.onShutdown()).resolves.toBeUndefined();
        });
    });
    describe('HybridPersistenceStrategy', () => {
        it('should persist critical namespaces on set', () => {
            const strategy = new HybridPersistenceStrategy(['critical'], // Critical namespaces
            60000, // Persistence interval
            ['critical', 'normal'] // All persistent namespaces
            );
            expect(strategy.shouldPersistOnSet('critical')).toBe(true);
            expect(strategy.shouldPersistOnSet('normal')).toBe(false);
            expect(strategy.shouldPersistOnSet('non-persistent')).toBe(false);
        });
        it('should never persist on get', () => {
            const strategy = new HybridPersistenceStrategy(['critical']);
            expect(strategy.shouldPersistOnGet()).toBe(false);
            expect(strategy.shouldPersistOnGet()).toBe(false);
        });
        it('should return the configured persistence interval', () => {
            const interval = 60000; // 1 minute
            const strategy = new HybridPersistenceStrategy(['critical'], interval);
            expect(strategy.getPersistenceInterval()).toBe(interval);
        });
        it('should respect both critical and persistent namespace lists', () => {
            const strategy = new HybridPersistenceStrategy(['critical1', 'critical2'], // Critical namespaces
            60000, // Persistence interval
            ['critical1', 'critical2', 'normal'] // All persistent namespaces
            );
            // Critical and persistent - should persist on set
            expect(strategy.shouldPersistOnSet('critical1')).toBe(true);
            // Persistent but not critical - should not persist on set
            expect(strategy.shouldPersistOnSet('normal')).toBe(false);
            // Neither critical nor persistent - should not persist on set
            expect(strategy.shouldPersistOnSet('other')).toBe(false);
        });
        it('should handle empty critical namespaces list', () => {
            const strategy = new HybridPersistenceStrategy([], // No critical namespaces
            60000, ['persistent'] // Only persistent namespaces
            );
            // Should not persist any namespace on set
            expect(strategy.shouldPersistOnSet('persistent')).toBe(false);
        });
    });
});
//# sourceMappingURL=persistenceStrategies.spec.js.map