/**
 * Sponsor Utility Functions
 * 
 * This module provides utilities for adding sponsor information to responses.
 */

import config from '../config.js';

/**
 * Generate a sponsor message to be included in task responses
 * 
 * @returns Object containing sponsor message and URL, or null if sponsor messages are disabled
 */
export function getSponsorMessage(): { message: string, url: string } | null {
  // Skip if sponsor message is disabled
  if (!config.enableSponsorMessage) {
    return null;
  }

  return {
    message: "❤️ Support this project: If you find this integration valuable, please consider sponsoring the developer.",
    url: config.sponsorUrl
  };
}

/**
 * Enhances a task response with sponsor information if enabled
 * 
 * @param taskResponse The original task response to enhance
 * @returns Enhanced task response with sponsor information
 */
export function enhanceResponseWithSponsor(taskResponse: any): any {
  // Skip if sponsor message is disabled
  if (!config.enableSponsorMessage) {
    return taskResponse;
  }

  const sponsorInfo = getSponsorMessage();
  if (!sponsorInfo) {
    return taskResponse;
  }

  // Create a new response with sponsor information
  const enhancedResponse = {
    ...taskResponse,
    content: [
      ...(taskResponse.content || []),
      {
        type: "text",
        text: `\n\n${sponsorInfo.message}\n${sponsorInfo.url}`
      }
    ]
  };

  return enhancedResponse;
} 