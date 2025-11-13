// Time Utilities for Booking System

/**
 * Generate time slots with 5-minute intervals
 * For admin use - allows precise start times
 */
export const generate5MinuteSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

/**
 * Generate time slots with 30-minute intervals (for regular users)
 */
export const generate30MinuteSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
};

/**
 * Add days to a date
 */
export const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Add weeks to a date
 */
export const addWeeks = (dateString: string, weeks: number): string => {
  return addDays(dateString, weeks * 7);
};

/**
 * Get all dates in a weekly recurring series
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD) - optional, defaults to 1 year
 * @returns Array of date strings
 */
export const getWeeklyRecurringDates = (
  startDate: string,
  endDate?: string
): string[] => {
  const dates: string[] = [startDate];
  const maxDate = endDate || addWeeks(startDate, 52); // Default 1 year
  
  let currentDate = startDate;
  while (true) {
    currentDate = addWeeks(currentDate, 1);
    if (currentDate > maxDate) break;
    dates.push(currentDate);
  }
  
  return dates;
};

/**
 * Format time for display (e.g., "20:05" → "8:05 PM")
 */
export const formatTime = (time: string): string => {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  
  if (hour === 0) return `12:${minute} AM`;
  if (hour < 12) return `${hour}:${minute} AM`;
  if (hour === 12) return `12:${minute} PM`;
  return `${hour - 12}:${minute} PM`;
};

/**
 * Generate a unique ID for a recurring booking group
 */
export const generateRecurringGroupId = (): string => {
  return `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a booking is part of a recurring series
 */
export const isRecurringBooking = (booking: any): boolean => {
  return booking.isRecurring === true && !!booking.recurringGroupId;
};

/**
 * Get day of week from date string (0 = Sunday, 6 = Saturday)
 */
export const getDayOfWeek = (dateString: string): number => {
  return new Date(dateString).getDay();
};

/**
 * Check if two dates are on the same day of the week
 */
export const isSameDayOfWeek = (date1: string, date2: string): boolean => {
  return getDayOfWeek(date1) === getDayOfWeek(date2);
};
