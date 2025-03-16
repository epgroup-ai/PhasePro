import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a currency amount to a human-readable string
 */
export function formatCurrency(amount: string | number, currency: string = 'GBP'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Generate a readable enquiry or invoice code
 */
export function generateCode(prefix: string, length: number = 6): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomPart = Math.random().toString(36).substring(2, 2 + length - timestamp.length);
  return `${prefix}-${timestamp}${randomPart}`.toUpperCase();
}

/**
 * Truncate text with ellipsis if it exceeds the max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}
