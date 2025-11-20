/**
 * Logger utility
 * Provides conditional logging based on environment
 * Only logs in development mode to avoid performance degradation in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log general information (dev only)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (dev only)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug information (dev only)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log table data (dev only)
   */
  table: (data: any) => {
    if (isDev && console.table) {
      console.table(data);
    }
  },

  /**
   * Group logs together (dev only)
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End log group (dev only)
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Time operations (dev only)
   */
  time: (label: string) => {
    if (isDev) {
      console.time(label);
    }
  },

  /**
   * End timing operations (dev only)
   */
  timeEnd: (label: string) => {
    if (isDev) {
      console.timeEnd(label);
    }
  },
};
