// Utility functions for consistent date handling across the application
// Ensures all dates are treated as local time to avoid UTC conversion issues

/**
 * Parse a date string as local time, avoiding UTC conversion
 * Works for both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats
 */
export function parseAsLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // If it's just a date (YYYY-MM-DD), parse as local date
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }
  
  // If it's a full timestamp, convert to local time
  if (dateString.includes('T')) {
    // Remove timezone info and parse as local
    const cleanDateString = dateString.replace(/[TZ]/g, ' ').replace(/\+.*$/, '').trim();
    const date = new Date(cleanDateString);
    
    // If the original had timezone info, it was probably UTC, so we don't adjust
    // If it didn't have timezone info, treat it as local time
    if (dateString.includes('Z') || dateString.includes('+')) {
      return date; // Already in local time after parsing
    }
    
    return date;
  }
  
  // Fallback to normal parsing
  return new Date(dateString);
}

/**
 * Convert a date to local date string (YYYY-MM-DD) 
 */
export function toLocalDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseAsLocalDate(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract date string from timestamp, ensuring consistent local date handling
 */
export function extractDateFromTimestamp(timestamp: string): string {
  const date = parseAsLocalDate(timestamp);
  return toLocalDateString(date);
}

/**
 * Compare if two date strings/timestamps represent the same local date
 */
export function isSameLocalDate(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === 'string' ? parseAsLocalDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseAsLocalDate(date2) : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get the local date string for today
 */
export function getTodayLocalDateString(): string {
  return toLocalDateString(new Date());
} 