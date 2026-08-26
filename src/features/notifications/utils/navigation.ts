import { NotificationItem } from '../hooks/use-notifications-query';

export interface NotificationNavigationTarget {
  orderId?: number;
  orderCode?: string;
  url?: string;
}

/**
 * Extracts order navigation target from notification metadata or title/body text.
 * Returns orderId, orderCode, and the target URL (/dashboard/orders/...) if found.
 */
export function extractNotificationTarget(
  notification: NotificationItem
): NotificationNavigationTarget {
  const metadata = (notification.metadata as Record<string, unknown>) || {};

  // 1. Direct metadata check for orderId
  const rawOrderId = metadata.orderId;
  const orderId =
    typeof rawOrderId === 'number' && !isNaN(rawOrderId)
      ? rawOrderId
      : typeof rawOrderId === 'string' && !isNaN(Number(rawOrderId))
        ? Number(rawOrderId)
        : undefined;

  // 2. Direct metadata check for orderCode
  const rawOrderCode = metadata.orderCode;
  const orderCode =
    typeof rawOrderCode === 'string' && rawOrderCode.trim() ? rawOrderCode.trim() : undefined;

  if (orderId) {
    return {
      orderId,
      orderCode,
      url: `/dashboard/orders/${orderId}`
    };
  }

  if (orderCode) {
    return {
      orderCode,
      url: `/dashboard/orders/${orderCode}`
    };
  }

  // 3. Fallback: Regex pattern match from title & body
  const text = `${notification.title} ${notification.body}`;
  const codeMatch =
    text.match(/\b([A-Z]{2,4}\d{4,8}-\d{3,4})\b/) ||
    text.match(/(?:Đơn hàng|Đơn|Order)\s*[:#]?\s*([A-Za-z0-9-]+)/i);

  if (codeMatch && codeMatch[1]) {
    const extractedCode = codeMatch[1].trim();
    return {
      orderCode: extractedCode,
      url: `/dashboard/orders/${extractedCode}`
    };
  }

  return {};
}
