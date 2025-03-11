/**
 * Utility functions for ClickUp MCP tools
 */

/**
 * Get a timestamp for a relative time
 * 
 * @param hours Hours from now
 * @param days Days from now
 * @param weeks Weeks from now
 * @param months Months from now
 * @returns Timestamp in milliseconds
 */
export function getRelativeTimestamp(hours = 0, days = 0, weeks = 0, months = 0): number {
  const now = new Date();
  
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
    
    if (lowerDate === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow.getTime();
    }
    
    if (lowerDate.includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      return nextWeek.getTime();
    }
    
    if (lowerDate.includes('next month')) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setHours(23, 59, 59, 999);
      return nextMonth.getTime();
    }

    // Handle hours/days/weeks/months from now
    const hoursRegex = /(\d+)\s*hours?\s*from\s*now/i;
    const daysRegex = /(\d+)\s*days?\s*from\s*now/i;
    const weeksRegex = /(\d+)\s*weeks?\s*from\s*now/i;
    const monthsRegex = /(\d+)\s*months?\s*from\s*now/i;
    
    if (hoursRegex.test(lowerDate)) {
      const hours = parseInt(lowerDate.match(hoursRegex)![1]);
      return getRelativeTimestamp(hours);
    }
    
    if (daysRegex.test(lowerDate)) {
      const days = parseInt(lowerDate.match(daysRegex)![1]);
      return getRelativeTimestamp(0, days);
    }
    
    if (weeksRegex.test(lowerDate)) {
      const weeks = parseInt(lowerDate.match(weeksRegex)![1]);
      return getRelativeTimestamp(0, 0, weeks);
    }
    
    if (monthsRegex.test(lowerDate)) {
      const months = parseInt(lowerDate.match(monthsRegex)![1]);
      return getRelativeTimestamp(0, 0, 0, months);
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