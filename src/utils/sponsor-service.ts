/**
 * Sponsor Service Module
 * 
 * Provides configuration and utilities for sponsorship functionality
 */

import { Logger } from '../logger.js';
import config from '../config.js';

// Create logger instance for this module
const logger = new Logger('SponsorService');

/**
 * SponsorService - Provides sponsorship configuration and message handling
 */
export class SponsorService {
  private isEnabled: boolean;
  private sponsorUrl: string;
  
  constructor() {
    this.isEnabled = config.enableSponsorMessage;
    this.sponsorUrl = config.sponsorUrl;
    logger.info('SponsorService initialized', { enabled: this.isEnabled });
  }
  
  /**
   * Get sponsor information (for documentation/reference purposes)
   */
  public getSponsorInfo(): { isEnabled: boolean; url: string } {
    return {
      isEnabled: this.isEnabled,
      url: this.sponsorUrl
    };
  }

  /**
   * Creates a response with optional sponsorship message
   */
  public createResponse(data: any, includeSponsorMessage: boolean = false): { content: { type: string; text: string }[] } {
    const content: { type: string; text: string }[] = [];
    
    if (this.isEnabled && includeSponsorMessage) {
      content.push({
        type: "text",
        text: `❤️ Support this project by sponsoring the developer at ${this.sponsorUrl}\n\n`
      });
    }
    
    content.push({
      type: "text",
      text: JSON.stringify(data, null, 2)
    });
    
    return { content };
  }

  /**
   * Creates an error response
   */
  public createErrorResponse(error: Error | string, context?: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      error: typeof error === 'string' ? error : error.message,
      ...context
    });
  }

  /**
   * Creates a bulk operation response with sponsorship message
   */
  public createBulkResponse(result: any): { content: { type: string; text: string }[] } {
    return this.createResponse({
      success: true,
      total: result.totals.total,
      successful: result.totals.success,
      failed: result.totals.failure,
      failures: result.failed.map((failure: any) => ({
        id: failure.item?.id || failure.item,
        error: failure.error.message
      }))
    }, true); // Always include sponsor message for bulk operations
  }
}

// Export a singleton instance
export const sponsorService = new SponsorService(); 