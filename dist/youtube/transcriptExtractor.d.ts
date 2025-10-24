/**
 * Robust YouTube Transcript Extraction System
 *
 * This module implements a comprehensive error handling and retry system
 * for YouTube transcript extraction, addressing the silent failure pattern
 * in the original implementation.
 */
export interface TranscriptFetcher {
    fetchTranscript(videoId: string): Promise<Array<{
        text: string;
    }>>;
}
export declare const defaultTranscriptFetcher: TranscriptFetcher;
/**
 * YouTube transcript error types for classification
 */
export declare enum YouTubeTranscriptErrorType {
    TRANSCRIPT_DISABLED = "transcript_disabled",
    VIDEO_UNAVAILABLE = "video_unavailable",
    VIDEO_NOT_FOUND = "video_not_found",
    NETWORK_ERROR = "network_error",
    RATE_LIMITED = "rate_limited",
    TIMEOUT = "timeout",
    PARSING_ERROR = "parsing_error",
    REGION_BLOCKED = "region_blocked",
    PRIVATE_VIDEO = "private_video",
    LIBRARY_ERROR = "library_error",
    UNKNOWN = "unknown"
}
/**
 * Retry configuration interface
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBase: number;
    retryableErrors: YouTubeTranscriptErrorType[];
    jitterFactor: number;
}
/**
 * Default retry configuration
 */
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Transcript extraction result interface
 */
export interface TranscriptResult {
    success: boolean;
    transcript?: string;
    videoId: string;
    attempts: number;
    duration: number;
    error?: {
        type: YouTubeTranscriptErrorType;
        message: string;
        originalError: string;
        videoId: string;
        attempts: number;
        duration: number;
    };
}
/**
 * Logger interface for structured logging
 */
export interface Logger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
/**
 * Simple console logger implementation
 */
export declare class ConsoleLogger implements Logger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
/**
 * Metrics collector interface
 */
export interface MetricsCollector {
    recordSuccess(videoId: string, attempts: number, duration: number): void;
    recordFailure(videoId: string, attempts: number, errorType: YouTubeTranscriptErrorType, duration: number): void;
}
/**
 * Simple metrics collector implementation
 */
export declare class SimpleMetricsCollector implements MetricsCollector {
    private stats;
    recordSuccess(videoId: string, attempts: number, duration: number): void;
    recordFailure(videoId: string, attempts: number, errorType: YouTubeTranscriptErrorType, duration: number): void;
    getStats(): {
        totalRequests: number;
        successful: number;
        failed: number;
        errorBreakdown: Record<YouTubeTranscriptErrorType, number>;
        averageDuration: number;
        totalDuration: number;
    };
}
/**
 * YouTube transcript error handler
 */
export declare class YouTubeTranscriptErrorHandler {
    private retryConfig;
    private logger;
    constructor(retryConfig?: RetryConfig, logger?: Logger);
    /**
     * Classifies an error based on its message and properties
     */
    classifyError(error: Error, videoId: string): YouTubeTranscriptErrorType;
    /**
     * Determines if an error should be retried
     */
    shouldRetry(errorType: YouTubeTranscriptErrorType, attempt: number): boolean;
    /**
     * Calculates retry delay with exponential backoff and jitter
     */
    getRetryDelay(attempt: number, errorType: YouTubeTranscriptErrorType): number;
    /**
     * Formats user-friendly error messages
     */
    formatUserError(errorType: YouTubeTranscriptErrorType, videoId: string, originalError: Error): string;
}
/**
 * Custom error class for YouTube transcript errors
 */
export declare class YouTubeTranscriptError extends Error {
    readonly type: YouTubeTranscriptErrorType;
    readonly videoId: string;
    readonly originalError: string;
    constructor(type: YouTubeTranscriptErrorType, message: string, videoId: string, originalError: string);
}
/**
 * Robust YouTube transcript extractor with comprehensive error handling and retry logic
 */
export declare class RobustYouTubeTranscriptExtractor {
    private retryConfig;
    private logger;
    private errorHandler;
    private metrics;
    private transcriptFetcher;
    constructor(retryConfig?: RetryConfig, logger?: Logger, metrics?: MetricsCollector, transcriptFetcher?: TranscriptFetcher);
    /**
     * Extracts transcript for a YouTube video with comprehensive error handling
     */
    extractTranscript(videoId: string): Promise<TranscriptResult>;
    /**
     * Attempts to extract transcript from YouTube
     */
    private attemptTranscriptExtraction;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Get metrics from the collector
     */
    getMetrics(): {
        totalRequests: number;
        successful: number;
        failed: number;
        errorBreakdown: Record<YouTubeTranscriptErrorType, number>;
        averageDuration: number;
        totalDuration: number;
    };
}
//# sourceMappingURL=transcriptExtractor.d.ts.map