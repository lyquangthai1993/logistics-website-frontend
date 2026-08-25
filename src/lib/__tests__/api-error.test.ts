// @ts-ignore
import { describe, it, expect } from 'bun:test';
import { formatApiError } from '../api-error';

describe('formatApiError Sanitization and Localization Tests', () => {
  it('should translate uniform auth errors (incorrectEmailOrPassword) and prioritize friendly message', () => {
    const errorResponse = {
      response: {
        data: {
          statusCode: 422,
          message: 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.',
          errors: {
            email: 'incorrectEmailOrPassword',
            password: 'incorrectEmailOrPassword'
          }
        }
      }
    };

    const formatted = formatApiError(errorResponse);
    expect(formatted).toBe('Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.');
    expect(formatted).not.toContain('incorrectEmailOrPassword');
    expect(formatted).not.toContain('email:');
    expect(formatted).not.toContain('password:');
  });

  it('should translate emailNotExists to Vietnamese error message', () => {
    const errorResponse = {
      response: {
        data: {
          statusCode: 422,
          message: 'Email not found',
          errors: {
            email: 'emailNotExists'
          }
        }
      }
    };

    const formatted = formatApiError(errorResponse);
    expect(formatted).toBe('Địa chỉ Email này chưa được đăng ký trong hệ thống.');
    expect(formatted).not.toContain('emailNotExists');
  });

  it('should translate legacy notFound / incorrectPassword auth error keys', () => {
    const errorResponse = {
      response: {
        data: {
          statusCode: 422,
          errors: {
            email: 'notFound',
            password: 'incorrectPassword'
          }
        }
      }
    };

    const formatted = formatApiError(errorResponse);
    expect(formatted).toBe('Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.');
  });

  it('should format localized validation error objects with multiple fields', () => {
    const errorResponse = {
      response: {
        data: {
          statusCode: 422,
          errors: {
            code: 'Mã chuyến xe đã tồn tại',
            capacity: 'mustBePositive'
          }
        }
      }
    };

    const formatted = formatApiError(errorResponse);
    expect(formatted).toBe('code: Mã chuyến xe đã tồn tại | capacity: Giá trị phải lớn hơn 0.');
    expect(formatted).not.toContain('mustBePositive');
  });

  it('should handle Network Error cleanly', () => {
    const networkError = new Error('Network Error');
    const formatted = formatApiError(networkError);
    expect(formatted).toBe('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
  });

  it('should return fallback message when error is null or undefined', () => {
    expect(formatApiError(null, 'Lỗi mặc định')).toBe('Lỗi mặc định');
    expect(formatApiError(undefined)).toBe('Đã xảy ra lỗi. Vui lòng thử lại sau.');
  });
});
