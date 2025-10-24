import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { EncryptionOptions } from './types/eventStore.js';
/**
 * Handles encryption and decryption of event data
 */
export declare class EventStoreEncryption {
    private options;
    /**
     * Creates a new EventStoreEncryption instance
     *
     * @param options - Encryption options
     */
    constructor(options: EncryptionOptions);
    /**
     * Encrypts a JSON-RPC message
     *
     * @param message - The message to encrypt
     * @returns A special message that contains the encrypted data
     */
    encryptMessage(message: JSONRPCMessage): Promise<JSONRPCMessage>;
    /**
     * Decrypts a JSON-RPC message
     *
     * @param message - The message to decrypt
     * @returns The decrypted message
     */
    decryptMessage(message: JSONRPCMessage): Promise<JSONRPCMessage>;
}
/**
 * Sanitizes sensitive data from a JSON-RPC message
 *
 * @param message - The message to sanitize
 * @returns A sanitized copy of the message
 */
export declare function sanitizeMessage(message: JSONRPCMessage): JSONRPCMessage;
//# sourceMappingURL=eventStoreEncryption.d.ts.map