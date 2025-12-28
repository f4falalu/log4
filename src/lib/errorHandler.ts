/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the application
 */

import { toast } from 'sonner';
import { logger } from './logger';

export interface ErrorOptions {
  /** Custom user-friendly message to display */
  userMessage?: string;
  /** Whether to show a toast notification */
  showToast?: boolean;
  /** Whether to log to console */
  logError?: boolean;
  /** Additional context for debugging */
  context?: Record<string, any>;
}

/**
 * Handle errors consistently across the application
 * @param error - The error object
 * @param options - Configuration options
 */
export function handleError(error: unknown, options: ErrorOptions = {}) {
  const {
    userMessage,
    showToast = true,
    logError = true,
    context,
  } = options;

  // Extract error message
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

  // Log error to console
  if (logError) {
    if (context) {
      logger.error('Error:', errorMessage, '\nContext:', context);
    } else {
      logger.error('Error:', errorMessage);
    }

    // Log full error object in development
    if (import.meta.env.DEV && error instanceof Error) {
      logger.error('Stack trace:', error.stack);
    }
  }

  // Show user notification
  if (showToast) {
    toast.error(userMessage || errorMessage);
  }

  // In production, consider sending to error tracking service
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error, { extra: context });
  }
}

/**
 * Handle async errors with automatic error handling
 * @param fn - Async function to execute
 * @param options - Error handling options
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  options: ErrorOptions = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, options);
    return null;
  }
}

/**
 * Wrap a function with automatic error handling
 * Useful for event handlers
 */
export function withErrorHandler<T extends (...args: any[]) => any>(
  fn: T,
  options: ErrorOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          handleError(error, options);
          throw error;
        });
      }

      return result;
    } catch (error) {
      handleError(error, options);
      throw error;
    }
  }) as T;
}

/**
 * Create an error handler for specific contexts
 */
export function createErrorHandler(defaultOptions: ErrorOptions) {
  return (error: unknown, options?: ErrorOptions) => {
    handleError(error, { ...defaultOptions, ...options });
  };
}

// Pre-configured error handlers for common scenarios
export const authErrorHandler = createErrorHandler({
  userMessage: 'Authentication failed. Please try logging in again.',
  context: { type: 'auth' },
});

export const networkErrorHandler = createErrorHandler({
  userMessage: 'Network error. Please check your connection and try again.',
  context: { type: 'network' },
});

export const validationErrorHandler = createErrorHandler({
  userMessage: 'Please check your input and try again.',
  context: { type: 'validation' },
});
