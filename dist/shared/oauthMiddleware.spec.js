import { describe, it, expect } from '@jest/globals';
import { OAuthTokenError, createOAuthMiddleware } from './oauthMiddleware.js';
describe('OAuth 2.1 Middleware', () => {
    // Test OAuthTokenError class
    describe('OAuthTokenError', () => {
        it('should create an error with default status and code', () => {
            const error = new OAuthTokenError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('invalid_token');
            expect(error.status).toBe(401);
        });
        it('should create an error with custom status and code', () => {
            const error = new OAuthTokenError('Test error', 'custom_code', 403);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe('custom_code');
            expect(error.status).toBe(403);
        });
    });
    // Test createOAuthMiddleware configuration validation
    describe('createOAuthMiddleware configuration', () => {
        it('should throw an error if issuerUrl is not provided', () => {
            expect(() => createOAuthMiddleware({
                issuerUrl: '',
                audience: 'api://default'
            })).toThrow('issuerUrl is required for OAuth middleware');
        });
        it('should throw an error if audience is not provided', () => {
            expect(() => createOAuthMiddleware({
                issuerUrl: 'https://auth.example.com',
                audience: ''
            })).toThrow('audience is required for OAuth middleware');
        });
        it('should return a middleware function', () => {
            const middleware = createOAuthMiddleware({
                issuerUrl: 'https://auth.example.com',
                audience: 'api://default'
            });
            expect(typeof middleware).toBe('function');
        });
    });
});
//# sourceMappingURL=oauthMiddleware.spec.js.map