import { toast } from 'sonner';

export interface PaginatedMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginatedMeta;
  silent?: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, any> | string[] | string | null;
  timestamp?: string;
  path?: string;
  stack?: string;
}

/**
 * Extracts and formats a user-friendly error message from any API error or unknown exception.
 * Handles NestJS validation errors map, message arrays, and standard HTTP error messages.
 */
export function formatApiError(
  error: unknown,
  fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
): string {
  if (!error) return fallbackMessage;

  const err = error as any;

  // Handle Axios error response
  if (err.response?.data) {
    const errorData: ApiErrorResponse = err.response.data;

    // Handle common auth error cases
    if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
      if (errorData.errors.email === 'notFound' || errorData.errors.password === 'incorrectPassword') {
        return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.';
      }
      if (errorData.errors.email === 'emailNotExists') {
        return 'Địa chỉ Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại.';
      }
    }

    // 1. Detailed field validation errors map if meaningful
    if (errorData.errors) {
      if (typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
        const errorValues = Object.entries(errorData.errors)
          .filter(([, msg]) => msg && typeof msg === 'string' && msg !== 'notFound')
          .map(([field, msg]) => {
            if (Array.isArray(msg)) return `${field}: ${(msg as string[]).join(', ')}`;
            return `${field}: ${msg}`;
          });
        if (errorValues.length > 0) {
          return errorValues.join(' | ');
        }
      } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        return errorData.errors.join(', ');
      } else if (typeof errorData.errors === 'string' && errorData.errors.trim().length > 0) {
        return errorData.errors;
      }
    }

    // 2. Error message string or array from backend
    if (errorData.message) {
      if (Array.isArray(errorData.message)) {
        return errorData.message.join(', ');
      }
      if (typeof errorData.message === 'string' && errorData.message.trim().length > 0) {
        return errorData.message;
      }
    }
  }

  // Handle standard JavaScript Error
  if (err instanceof Error && err.message) {
    if (err.message === 'Network Error') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
    }
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  return fallbackMessage;
}

/**
 * Displays a standardized toast error notification using Sonner.
 */
export function showApiErrorToast(
  error: unknown,
  fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
): void {
  const message = formatApiError(error, fallbackMessage);
  toast.error(message);
}

/**
 * Displays a standardized toast success notification using Sonner.
 */
export function showApiSuccessToast(message: string): void {
  toast.success(message);
}
