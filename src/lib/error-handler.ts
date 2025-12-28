import { AxiosError } from 'axios';
import { toast } from 'sonner';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // This is needed to make the stack trace appear correctly in ErrorBoundary
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export const handleError = (error: unknown, defaultMessage: string = 'An error occurred'): void => {
  console.error('Error:', error);
  
  if (error instanceof AppError) {
    toast.error(error.message || defaultMessage, {
      description: error.details?.message || error.details,
    });
    return;
  }

  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message || defaultMessage;
    const details = error.response?.data?.details || error.response?.data;
    
    toast.error(message, {
      description: details ? JSON.stringify(details) : undefined,
    });
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message || defaultMessage);
    return;
  }

  if (typeof error === 'string') {
    toast.error(error || defaultMessage);
    return;
  }

  toast.error(defaultMessage);
};

export const handlePromiseError = <T>(
  promise: Promise<T>,
  options?: {
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: unknown) => void;
    throwError?: boolean;
  }
): Promise<T | void> => {
  const {
    loadingMessage,
    successMessage,
    errorMessage = 'An error occurred',
    onSuccess,
    onError,
    throwError = false,
  } = options || {};

  const toastId = loadingMessage ? toast.loading(loadingMessage) : undefined;

  return promise
    .then((data) => {
      if (successMessage) {
        toast.success(successMessage, { id: toastId });
      } else if (toastId) {
        toast.dismiss(toastId);
      }
      
      onSuccess?.(data);
      return data;
    })
    .catch((error) => {
      handleError(error, errorMessage);
      onError?.(error);
      
      if (throwError) {
        return Promise.reject(error);
      }
    });
};

// Example usage:
/*
// Basic usage
handlePromiseError(
  apiCall(),
  {
    loadingMessage: 'Processing...',
    successMessage: 'Operation completed successfully!',
    errorMessage: 'Failed to complete operation',
  }
);

// With callbacks
handlePromiseError(
  apiCall(),
  {
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    },
  }
);
*/
