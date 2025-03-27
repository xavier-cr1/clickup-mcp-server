/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Date Utility Functions
 * 
 * This module provides utilities for handling dates, timestamps, and due date parsing.
 */

/**
 * Get a timestamp for a relative time
 * 
 * @param minutes Minutes from now
 * @param hours Hours from now
 * @param days Days from now
 * @param weeks Weeks from now
 * @param months Months from now
 * @returns Timestamp in milliseconds
 */
export function getRelativeTimestamp(minutes = 0, hours = 0, days = 0, weeks = 0, months = 0): number {
  const now = new Date();
  
  if (minutes) now.setMinutes(now.getMinutes() + minutes);
  if (hours) now.setHours(now.getHours() + hours);
  if (days) now.setDate(now.getDate() + days);
  if (weeks) now.setDate(now.getDate() + (weeks * 7));
  if (months) now.setMonth(now.getMonth() + months);
  
  return now.getTime();
}

/**
 * Parse a due date string into a timestamp
 * Supports ISO 8601 format or natural language like "tomorrow"
 * 
 * @param dateString Date string to parse
 * @returns Timestamp in milliseconds or undefined if parsing fails
 */
export function parseDueDate(dateString: string): number | undefined {
  if (!dateString) return undefined;
  
  try {
    // Handle natural language dates
    const lowerDate = dateString.toLowerCase();
    const now = new Date();
    
    if (lowerDate === 'today') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today.getTime();
    }
    
    // Handle relative dates with specific times
    const relativeTimeRegex = /(?:(\d+)\s*(minutes?|days?|weeks?|months?)\s*from\s*now|tomorrow|next\s+(?:week|month))\s*(?:at\s+(\d+)(?::(\d+))?\s*(am|pm)?)?/i;
    const match = lowerDate.match(relativeTimeRegex);
    
    if (match) {
      const date = new Date();
      const [_, amount, unit, hours, minutes, meridian] = match;
      
      // Calculate the future date
      if (amount && unit) {
        const value = parseInt(amount);
        if (unit.startsWith('minute')) {
          date.setMinutes(date.getMinutes() + value);
        } else if (unit.startsWith('day')) {
          date.setDate(date.getDate() + value);
        } else if (unit.startsWith('week')) {
          date.setDate(date.getDate() + (value * 7));
        } else if (unit.startsWith('month')) {
          date.setMonth(date.getMonth() + value);
        }
      } else if (lowerDate.startsWith('tomorrow')) {
        date.setDate(date.getDate() + 1);
      } else if (lowerDate.includes('next week')) {
        date.setDate(date.getDate() + 7);
      } else if (lowerDate.includes('next month')) {
        date.setMonth(date.getMonth() + 1);
      }

      // Set the time if specified
      if (hours) {
        let parsedHours = parseInt(hours);
        const parsedMinutes = minutes ? parseInt(minutes) : 0;
        
        // Convert to 24-hour format if meridian is specified
        if (meridian?.toLowerCase() === 'pm' && parsedHours < 12) parsedHours += 12;
        if (meridian?.toLowerCase() === 'am' && parsedHours === 12) parsedHours = 0;
        
        date.setHours(parsedHours, parsedMinutes, 0, 0);
      } else {
        // Default to end of day if no time specified
        date.setHours(23, 59, 59, 999);
      }
      
      return date.getTime();
    }
    
    // Handle hours from now
    const minutesRegex = /(\d+)\s*minutes?\s*from\s*now/i;
    const hoursRegex = /(\d+)\s*hours?\s*from\s*now/i;
    const daysRegex = /(\d+)\s*days?\s*from\s*now/i;
    const weeksRegex = /(\d+)\s*weeks?\s*from\s*now/i;
    const monthsRegex = /(\d+)\s*months?\s*from\s*now/i;
    
    if (minutesRegex.test(lowerDate)) {
      const minutes = parseInt(lowerDate.match(minutesRegex)![1]);
      return getRelativeTimestamp(minutes);
    }
    
    if (hoursRegex.test(lowerDate)) {
      const hours = parseInt(lowerDate.match(hoursRegex)![1]);
      return getRelativeTimestamp(0, hours);
    }
    
    if (daysRegex.test(lowerDate)) {
      const days = parseInt(lowerDate.match(daysRegex)![1]);
      return getRelativeTimestamp(0, 0, days);
    }
    
    if (weeksRegex.test(lowerDate)) {
      const weeks = parseInt(lowerDate.match(weeksRegex)![1]);
      return getRelativeTimestamp(0, 0, 0, weeks);
    }
    
    if (monthsRegex.test(lowerDate)) {
      const months = parseInt(lowerDate.match(monthsRegex)![1]);
      return getRelativeTimestamp(0, 0, 0, 0, months);
    }
    
    // Try to parse as a date string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    
    // If all parsing fails, return undefined
    return undefined;
  } catch (error) {
    console.warn(`Failed to parse due date: ${dateString}`, error);
    return undefined;
  }
}

/**
 * Format a due date timestamp into a human-readable string
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string or undefined if timestamp is invalid
 */
export function formatDueDate(timestamp: number | null | undefined): string | undefined {
  if (!timestamp) return undefined;
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) return undefined;
    
    // Format: "March 10, 2025 at 10:56 PM"
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' at', ',');
  } catch (error) {
    console.warn(`Failed to format due date: ${timestamp}`, error);
    return undefined;
  }
} 