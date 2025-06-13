/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Date Utility Functions
 * 
 * This module provides utilities for handling dates, timestamps, and due date parsing.
 */

import { Logger } from '../logger.js';

// Create a logger instance for date utilities
const logger = new Logger('DateUtils');

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
 * Get the start of today (midnight) in Unix milliseconds
 * @returns Timestamp in milliseconds for start of current day
 */
export function getStartOfDay(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * Get the end of today (23:59:59.999) in Unix milliseconds
 * @returns Timestamp in milliseconds for end of current day
 */
export function getEndOfDay(): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

/**
 * Get the current time in Unix milliseconds
 * @returns Current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return new Date().getTime();
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
    // First, try to parse as a direct timestamp
    const numericValue = Number(dateString);
    if (!isNaN(numericValue) && numericValue > 0) {
      // If it's a reasonable timestamp (after year 2000), use it
      if (numericValue > 946684800000) { // Jan 1, 2000
        return numericValue;
      }
    }

    // Handle natural language dates
    const lowerDate = dateString.toLowerCase().trim();

    // Handle "now" specifically
    if (lowerDate === 'now') {
      return getCurrentTimestamp();
    }

    // Handle "today" with different options
    if (lowerDate === 'today') {
      return getEndOfDay();
    }

    if (lowerDate === 'today start' || lowerDate === 'start of today') {
      return getStartOfDay();
    }

    if (lowerDate === 'today end' || lowerDate === 'end of today') {
      return getEndOfDay();
    }

    // Handle "yesterday" and "tomorrow"
    if (lowerDate === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      return yesterday.getTime();
    }

    if (lowerDate === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow.getTime();
    }

    // Handle day names (Monday, Tuesday, etc.) - find next occurrence
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatch = lowerDate.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (dayMatch) {
      const targetDayName = dayMatch[1];
      const targetDayIndex = dayNames.indexOf(targetDayName);
      const today = new Date();
      const currentDayIndex = today.getDay();

      // Calculate days until target day
      let daysUntilTarget = targetDayIndex - currentDayIndex;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }

      // Handle "next" prefix explicitly
      if (lowerDate.includes('next ')) {
        daysUntilTarget += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);

      // Extract time if specified (e.g., "Friday at 3pm", "Saturday 2:30pm")
      const timeMatch = lowerDate.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridian = timeMatch[3]?.toLowerCase();

        // Convert to 24-hour format
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to end of day if no time specified
        targetDate.setHours(23, 59, 59, 999);
      }

      return targetDate.getTime();
    }
    
    // Handle relative dates with specific times
    const relativeTimeRegex = /(?:(\d+)\s*(minutes?|hours?|days?|weeks?|months?)\s*from\s*now|tomorrow|next\s+(?:week|month|year))\s*(?:at\s+(\d+)(?::(\d+))?\s*(am|pm)?)?/i;
    const match = lowerDate.match(relativeTimeRegex);
    
    if (match) {
      const date = new Date();
      const [_, amount, unit, hours, minutes, meridian] = match;
      
      // Calculate the future date
      if (amount && unit) {
        const value = parseInt(amount);
        if (unit.startsWith('minute')) {
          date.setMinutes(date.getMinutes() + value);
        } else if (unit.startsWith('hour')) {
          date.setHours(date.getHours() + value);
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
      } else if (lowerDate.includes('next year')) {
        date.setFullYear(date.getFullYear() + 1);
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
    
    // Handle various relative formats
    const relativeFormats = [
      { regex: /(\d+)\s*minutes?\s*from\s*now/i, handler: (m: number) => getRelativeTimestamp(m) },
      { regex: /(\d+)\s*hours?\s*from\s*now/i, handler: (h: number) => getRelativeTimestamp(0, h) },
      { regex: /(\d+)\s*days?\s*from\s*now/i, handler: (d: number) => getRelativeTimestamp(0, 0, d) },
      { regex: /(\d+)\s*weeks?\s*from\s*now/i, handler: (w: number) => getRelativeTimestamp(0, 0, 0, w) },
      { regex: /(\d+)\s*months?\s*from\s*now/i, handler: (m: number) => getRelativeTimestamp(0, 0, 0, 0, m) }
    ];
    
    for (const format of relativeFormats) {
      if (format.regex.test(lowerDate)) {
        const value = parseInt(lowerDate.match(format.regex)![1]);
        return format.handler(value);
      }
    }
    
    // Handle specific date formats
    // Format: MM/DD/YYYY
    const usDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?:\s+(am|pm))?)?$/i;
    const usDateMatch = lowerDate.match(usDateRegex);
    
    if (usDateMatch) {
      const [_, month, day, year, hours, minutes, meridian] = usDateMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // JS months are 0-indexed
        parseInt(day)
      );
      
      // Add time if specified
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
    
    // Enhanced fallback: Try JavaScript's native Date constructor with various formats
    // This handles many natural language formats like "Saturday at 3pm EST", "next Friday", etc.
    const nativeDate = new Date(dateString);
    if (!isNaN(nativeDate.getTime())) {
      // Check if the parsed date is reasonable (not too far in the past or future)
      const now = Date.now();
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
      const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);

      if (nativeDate.getTime() > oneYearAgo && nativeDate.getTime() < tenYearsFromNow) {
        return nativeDate.getTime();
      }
    }

    // Try some common variations and transformations
    const variations = [
      dateString.replace(/\s+at\s+/i, ' '), // "Saturday at 3pm" -> "Saturday 3pm"
      dateString.replace(/\s+EST|EDT|PST|PDT|CST|CDT|MST|MDT/i, ''), // Remove timezone
      dateString.replace(/next\s+/i, ''), // "next Friday" -> "Friday"
      dateString.replace(/this\s+/i, ''), // "this Friday" -> "Friday"
    ];

    for (const variation of variations) {
      const varDate = new Date(variation);
      if (!isNaN(varDate.getTime())) {
        const now = Date.now();
        const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
        const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);

        if (varDate.getTime() > oneYearAgo && varDate.getTime() < tenYearsFromNow) {
          // If the parsed date is in the past, assume they meant next occurrence
          if (varDate.getTime() < now) {
            // Add 7 days if it's a day of the week
            if (dateString.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i)) {
              varDate.setDate(varDate.getDate() + 7);
            }
          }
          return varDate.getTime();
        }
      }
    }

    // If all parsing fails, return undefined
    return undefined;
  } catch (error) {
    logger.warn(`Failed to parse due date: ${dateString}`, error);
    throw new Error(`Invalid date format: ${dateString}`);
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
    logger.warn(`Failed to format due date: ${timestamp}`, error);
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
}

/**
 * Checks if a timestamp is for today
 * 
 * @param timestamp Unix timestamp in milliseconds
 * @returns Boolean indicating if the timestamp is for today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Get timestamp range for today (start to end)
 * 
 * @returns Object with start and end timestamps for today
 */
export function getTodayRange(): { start: number, end: number } {
  return {
    start: getStartOfDay(),
    end: getEndOfDay()
  };
}

/**
 * Format a date for display in errors and messages
 * @param timestamp The timestamp to format
 * @returns A human-readable relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | number): string {
  if (!timestamp) return 'Unknown';
  
  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  const now = Date.now();
  const diffMs = now - timestampNum;
  
  // Convert to appropriate time unit
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec} seconds ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minutes ago`;
  
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hours ago`;
  
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} months ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} years ago`;
} 