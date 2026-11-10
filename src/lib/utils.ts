import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: 'accurate' | 'normal';
  } = {}
) {
  const { decimals = 0, sizeType = 'normal' } = opts;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate' ? (accurateSizes[i] ?? 'Bytest') : (sizes[i] ?? 'Bytes')
  }`;
}

export function getInitials(name?: string | null, fallback = 'CN'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  }
  const first = Array.from(parts[0])[0] || '';
  const last = Array.from(parts[parts.length - 1])[0] || '';
  return (first + last).toUpperCase();
}

/**
 * Hàm util định dạng số chuẩn dùng chung toàn hệ thống:
 * - Viết liền không dấu cách phân tách hàng nghìn
 * - Thập phân dùng dấu chấm '.' (tự động lược bỏ số 0 vô nghĩa ở đuôi)
 * Ví dụ: 43190 -> "43190", 144045.65 -> "144045.65", 823.00 -> "823"
 */
export function formatNumber(
  val: number | string | null | undefined,
  maxDecimals: number = 2
): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return '0';

  if (maxDecimals <= 0) {
    return String(Math.round(num));
  }

  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  const [integerPart, decimalPart] = rounded.toString().split('.');

  if (decimalPart) {
    return `${integerPart}.${decimalPart.slice(0, maxDecimals)}`;
  }
  return integerPart;
}

/** Alias tương thích ngược */
export const formatNumberSpaced = formatNumber;
