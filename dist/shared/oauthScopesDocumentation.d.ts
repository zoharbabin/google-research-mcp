/**
 * OAuth Scopes Documentation
 *
 * This file exports a markdown string containing comprehensive documentation
 * for the OAuth scopes used in the MCP server. This can be:
 * 1. Served through an API endpoint
 * 2. Used to generate static documentation files
 * 3. Displayed in the admin UI
 *
 * The documentation is kept in sync with the actual scope definitions in oauthScopes.ts
 */
import { Request, Response } from 'express';
/**
 * Generates markdown documentation for the OAuth scopes
 * @returns Markdown formatted documentation
 */
export declare function generateOAuthScopesDocumentation(): string;
export declare const oauthScopesDocumentation: string;
/**
 * Serves the OAuth scopes documentation through an API endpoint
 * @param req - Express request object
 * @param res - Express response object
 */
export declare function serveOAuthScopesDocumentation(req: Request, res: Response): void;
//# sourceMappingURL=oauthScopesDocumentation.d.ts.map