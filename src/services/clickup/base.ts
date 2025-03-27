/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Base ClickUp Service Class
 * 
 * This class provides core functionality for all ClickUp service modules:
 * - Axios client configuration
 * - Rate limiting and request throttling
 * - Error handling
 * - Common request methods
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger, LogLevel } from '../../logger.js';

/**
 * Basic service response interface
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  }
}

/**
 * Error types for better error handling
 */
export enum ErrorCode {
  RATE_LIMIT = 'rate_limit_exceeded',
  NOT_FOUND = 'resource_not_found',
  UNAUTHORIZED = 'unauthorized',
  VALIDATION = 'validation_error',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  WORKSPACE_ERROR = 'workspace_error',
  INVALID_PARAMETER = 'invalid_parameter',
  UNKNOWN = 'unknown_error'
}

/**
 * Custom error class for ClickUp API errors
 */
export class ClickUpServiceError extends Error {
  readonly code: ErrorCode;
  readonly data?: any;
  readonly status?: number;
  context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    data?: any,
    status?: number,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ClickUpServiceError';
    this.code = code;
    this.data = data;
    this.status = status;
    this.context = context;
  }
}

/**
 * Rate limit response headers from ClickUp API
 */
interface RateLimitHeaders {
  'x-ratelimit-limit': number;
  'x-ratelimit-remaining': number;
  'x-ratelimit-reset': number;
}

/**
 * Base ClickUp service class that handles common functionality
 */
export class BaseClickUpService {
  protected readonly apiKey: string;
  protected readonly teamId: string;
  protected readonly client: AxiosInstance;
  protected readonly logger: Logger;
  
  protected readonly defaultRequestSpacing = 600; // Default milliseconds between requests
  protected readonly rateLimit = 100; // Maximum requests per minute (Free Forever plan)
  protected requestSpacing: number; // Current request spacing, can be adjusted
  protected readonly timeout = 65000; // 65 seconds (safely under the 1-minute window)
  protected requestQueue: (() => Promise<any>)[] = [];
  protected processingQueue = false;
  protected lastRateLimitReset: number = 0;

  /**
   * Creates an instance of BaseClickUpService.
   * @param apiKey - ClickUp API key for authentication
   * @param teamId - ClickUp team ID for targeting the correct workspace
   * @param baseUrl - Optional custom base URL for the ClickUp API
   */
  constructor(apiKey: string, teamId: string, baseUrl: string = 'https://api.clickup.com/api/v2') {
    this.apiKey = apiKey;
    this.teamId = teamId;
    this.requestSpacing = this.defaultRequestSpacing;
    
    // Create a logger with the actual class name for better context
    const className = this.constructor.name;
    this.logger = new Logger(`ClickUp:${className}`);

    // Configure the Axios client with default settings
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: this.timeout
    });

    this.logger.debug(`Initialized ${className}`, { teamId, baseUrl });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleAxiosError(error)
    );
  }

  /**
   * Handle errors from Axios requests
   * @private
   * @param error Error from Axios
   * @returns Never - always throws an error
   */
  private handleAxiosError(error: any): never {
    // Determine error details
    const status = error.response?.status;
    const responseData = error.response?.data;
    const errorMsg = responseData?.err || responseData?.error || error.message || 'Unknown API error';
    const path = error.config?.url || 'unknown path';
    
    // Context object for providing more detailed log information
    const errorContext = {
      path,
      status,
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      requestData: error.config?.data ? JSON.parse(error.config.data) : undefined
    };

    // Pick the appropriate error code based on status
    let code: ErrorCode;
    let logMessage: string;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      code = ErrorCode.NETWORK_ERROR;
      logMessage = `Request timeout for ${path}`;
    } else if (!error.response) {
      code = ErrorCode.NETWORK_ERROR;
      logMessage = `Network error accessing ${path}: ${error.message}`;
    } else if (status === 429) {
      code = ErrorCode.RATE_LIMIT;
      this.handleRateLimitHeaders(error.response.headers);
      logMessage = `Rate limit exceeded for ${path}`;
    } else if (status === 401 || status === 403) {
      code = ErrorCode.UNAUTHORIZED;
      logMessage = `Authorization failed for ${path}`;
    } else if (status === 404) {
      code = ErrorCode.NOT_FOUND;
      logMessage = `Resource not found: ${path}`;
    } else if (status >= 400 && status < 500) {
      code = ErrorCode.VALIDATION;
      logMessage = `Validation error for ${path}: ${errorMsg}`;
    } else if (status >= 500) {
      code = ErrorCode.SERVER_ERROR;
      logMessage = `ClickUp server error: ${errorMsg}`;
    } else {
      code = ErrorCode.UNKNOWN;
      logMessage = `Unknown API error: ${errorMsg}`;
    }

    // Log the error with context
    this.logger.error(logMessage, errorContext);

    // Throw a well-structured error
    throw new ClickUpServiceError(
      errorMsg,
      code,
      responseData,
      status,
      errorContext
    );
  }

  /**
   * Process the request queue, respecting rate limits by spacing out requests
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) {
      this.logger.debug('Queue empty, exiting queue processing mode');
      this.processingQueue = false;
      return;
    }

    this.logger.debug(`Processing request queue (${this.requestQueue.length} items)`);

    const startTime = Date.now();
    try {
      // Take the first request from the queue
        const request = this.requestQueue.shift();
        if (request) {
        // Wait for the request spacing interval
        await new Promise(resolve => setTimeout(resolve, this.requestSpacing));
        
        // Run the request
            await request();
      }
    } catch (error) {
      this.logger.error('Error executing queued request', error);
    } finally {
      const duration = Date.now() - startTime;
      this.logger.trace(`Queue item processed in ${duration}ms, ${this.requestQueue.length} items remaining`);
      
      // Continue processing the queue after a short delay
      setTimeout(() => this.processQueue(), this.requestSpacing);
    }
  }

  /**
   * Handle rate limit headers from ClickUp API
   * @private
   * @param headers Response headers from ClickUp
   */
  private handleRateLimitHeaders(headers: any): void {
    try {
      // Parse the rate limit headers
      const limit = headers['x-ratelimit-limit'];
      const remaining = headers['x-ratelimit-remaining'];
      const reset = headers['x-ratelimit-reset'];
      
      // Only log if we're getting close to the limit
      if (remaining < limit * 0.2) {
        this.logger.warn('Approaching rate limit', { remaining, limit, reset });
      } else {
        this.logger.debug('Rate limit status', { remaining, limit, reset });
      }

      if (reset) {
        this.lastRateLimitReset = reset;
        
        // If reset is in the future, calculate a safe request spacing
        const now = Date.now();
        const resetTime = reset * 1000; // convert to milliseconds
        const timeToReset = Math.max(0, resetTime - now);
        
        if (timeToReset > 0 && remaining > 0) {
          // Calculate time between requests to stay under limit
          // Add 10% buffer to be safe
          const safeSpacing = Math.ceil((timeToReset / remaining) * 1.1);
          
          // Only adjust if it's greater than our current spacing
          if (safeSpacing > this.requestSpacing) {
            this.logger.debug(`Adjusting request spacing: ${this.requestSpacing}ms → ${safeSpacing}ms`);
            this.requestSpacing = safeSpacing;
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse rate limit headers', error);
    }
  }

  /**
   * Makes an API request with rate limiting.
   * @protected
   * @param fn - Function that executes the API request
   * @returns Promise that resolves with the result of the API request
   */
  protected async makeRequest<T>(fn: () => Promise<T>): Promise<T> {
    // If we're being rate limited, queue the request rather than executing immediately
    if (this.processingQueue) {
      this.logger.debug('Queue active, adding request to queue');
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    const startTime = Date.now();
    try {
      // Execute the request function
      const result = await fn();
      
      // Debug log for successful requests with timing information
      const duration = Date.now() - startTime;
      this.logger.debug(`Request completed successfully in ${duration}ms`);
      
      return result;
        } catch (error) {
      // If we hit a rate limit, start processing the queue
      if (error instanceof ClickUpServiceError && error.code === ErrorCode.RATE_LIMIT) {
        this.logger.warn('Rate limit reached, switching to queue mode', {
          reset: this.lastRateLimitReset,
          queueLength: this.requestQueue.length
        });
        
        if (!this.processingQueue) {
          this.processingQueue = true;
          this.processQueue().catch(err => {
            this.logger.error('Error processing request queue', err);
          });
        }

        // Queue this failed request and return a promise that will resolve when it's retried
        return new Promise<T>((resolve, reject) => {
          this.requestQueue.push(async () => {
            try {
              const result = await fn();
              resolve(result);
            } catch (retryError) {
              reject(retryError);
        }
      });
    });
      }

      // For other errors, just throw
      throw error;
    }
  }

  /**
   * Gets the ClickUp team ID associated with this service instance
   * @returns The team ID
   */
  getTeamId(): string {
    return this.teamId;
  }

  /**
   * Helper method to log API operations
   * @protected
   * @param operation - Name of the operation being performed
   * @param details - Details about the operation
   */
  protected logOperation(operation: string, details: any): void {
    this.logger.info(`Operation: ${operation}`, details);
  }

  /**
   * Log detailed information about a request (path and payload)
   * For trace level logging only
   */
  protected traceRequest(method: string, url: string, data?: any): void {
    if (this.logger.isLevelEnabled(LogLevel.TRACE)) {
      this.logger.trace(`${method} ${url}`, {
        payload: data,
        teamId: this.teamId
      });
    }
  }
} 