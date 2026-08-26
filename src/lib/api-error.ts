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

const ERROR_CODE_TRANSLATIONS: Record<string, string> = {
  incorrectEmailOrPassword: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.',
  notFound: 'Không tìm thấy dữ liệu yêu cầu.',
  incorrectPassword: 'Mật khẩu không chính xác. Vui lòng thử lại.',
  emailNotExists: 'Địa chỉ Email này chưa được đăng ký trong hệ thống.',
  emailAlreadyExists: 'Địa chỉ Email này đã được sử dụng trong hệ thống.',
  userNotFound: 'Không tìm thấy thông tin tài khoản.',
  invalidCredentials: 'Thông tin tài khoản hoặc mật khẩu không hợp lệ.',
  tokenExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  invalidToken: 'Mã xác thực không hợp lệ hoặc đã hết hạn.',
  sessionExpired: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  unauthorized: 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  alreadyExists: 'Dữ liệu đã tồn tại trên hệ thống.',
  mustBePositive: 'Giá trị phải lớn hơn 0.',
  isRequired: 'Trường này là bắt buộc.'
};

/**
 * Extracts and formats a user-friendly error message from any API error or unknown exception.
 * Sanitizes raw technical error codes (e.g., incorrectEmailOrPassword) and prioritizes
 * clear backend messages and localized Vietnamese descriptions.
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

    // 1. Auth & known technical codes in errors object
    if (
      errorData.errors &&
      typeof errorData.errors === 'object' &&
      !Array.isArray(errorData.errors)
    ) {
      const errorMap = errorData.errors as Record<string, any>;
      const hasAuthCode =
        errorMap.email === 'incorrectEmailOrPassword' ||
        errorMap.password === 'incorrectEmailOrPassword' ||
        errorMap.email === 'notFound' ||
        errorMap.password === 'incorrectPassword' ||
        errorMap.email === 'emailNotExists';

      if (hasAuthCode) {
        if (errorMap.email === 'emailNotExists') {
          return ERROR_CODE_TRANSLATIONS.emailNotExists;
        }
        return errorData.message || ERROR_CODE_TRANSLATIONS.incorrectEmailOrPassword;
      }
    }

    // 2. Prioritize clean user-facing message from backend if available
    if (typeof errorData.message === 'string' && errorData.message.trim().length > 0) {
      // Check if message is a known technical code
      const translatedMsg = ERROR_CODE_TRANSLATIONS[errorData.message.trim()];
      if (translatedMsg) return translatedMsg;

      // If message is a non-empty string provided by backend, return it directly
      return errorData.message.trim();
    } else if (Array.isArray(errorData.message) && errorData.message.length > 0) {
      return errorData.message.map((m) => ERROR_CODE_TRANSLATIONS[m] || m).join(', ');
    }

    // 3. Field validation errors map (translate codes or format nicely)
    if (errorData.errors) {
      if (typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
        const errorValues = Object.entries(errorData.errors)
          .filter(([, msg]) => msg !== null && msg !== undefined && msg !== '')
          .map(([field, msg]) => {
            const rawMsg = Array.isArray(msg) ? msg.join(', ') : String(msg);
            const localizedMsg = ERROR_CODE_TRANSLATIONS[rawMsg] || rawMsg;
            // If the message is already translated or human-readable, format nicely
            return `${field}: ${localizedMsg}`;
          });

        if (errorValues.length > 0) {
          return errorValues.join(' | ');
        }
      } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        return errorData.errors.map((e) => ERROR_CODE_TRANSLATIONS[e] || e).join(', ');
      } else if (typeof errorData.errors === 'string' && errorData.errors.trim().length > 0) {
        return ERROR_CODE_TRANSLATIONS[errorData.errors.trim()] || errorData.errors;
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
    return ERROR_CODE_TRANSLATIONS[err] || err;
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
