/**
 * OAuth 2.1 Resource Server Middleware
 *
 * This module implements Express middleware for validating OAuth 2.1 Bearer tokens
 * as a Resource Server. It handles token extraction, signature validation against
 * external Authorization Server JWKS, issuer/audience validation, and expiry checks.
 *
 * Features:
 * - Bearer token extraction from Authorization header
 * - JWKS fetching and caching from the configured AS URI
 * - Token signature validation using JWKS
 * - Validation of iss, aud, exp, nbf claims
 * - HTTP 401 responses for missing/invalid/expired tokens
 * - Configurable AS Issuer URL and expected Audience
 * - HTTPS enforcement for production environments
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Configuration options for the OAuth middleware
 */
export interface OAuthMiddlewareOptions {
    /** The issuer URL of the Authorization Server (AS) */
    issuerUrl: string;
    /** The expected audience value in the token */
    audience: string;
    /** Path to the JWKS endpoint (default: '/.well-known/jwks.json') */
    jwksPath?: string;
    /** Whether to enforce HTTPS for relevant endpoints (default: true in production) */
    enforceHttps?: boolean;
    /** Cache TTL for JWKS in milliseconds (default: 1 hour) */
    jwksCacheTtl?: number;
    /** Whether to allow expired tokens (for testing only, default: false) */
    allowExpiredTokens?: boolean;
}
/**
 * Error class for OAuth token validation failures
 */
export declare class OAuthTokenError extends Error {
    status: number;
    code: string;
    constructor(message: string, code?: string, status?: number);
}
/**
 * Creates an OAuth 2.1 middleware for validating Bearer tokens
 *
 * @param options - Configuration options for the middleware
 * @returns Express middleware function
 */
export declare function createOAuthMiddleware(options: OAuthMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
/**
 * Creates middleware that checks if the token has the required scopes
 *
 * @param requiredScopes - Array of scopes required for the endpoint
 * @returns Express middleware function
 */
export declare function requireScopes(requiredScopes: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Creates middleware that applies OAuth validation only if a token is present
 * This is useful for endpoints that can be accessed both with and without authentication
 *
 * @param options - Configuration options for the middleware
 * @returns Express middleware function
 */
export declare function optionalOAuth(options: OAuthMiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Creates middleware that applies OAuth validation and scope checking in one step
 *
 * @param options - Configuration options for the middleware
 * @param requiredScopes - Array of scopes required for the endpoint
 * @returns Express middleware function
 */
export declare function protectWithScopes(options: OAuthMiddlewareOptions, requiredScopes: string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=oauthMiddleware.d.ts.map