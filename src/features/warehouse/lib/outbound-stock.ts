/**
 * Stock helpers for outbound notes.
 *
 * `order.remainingQuantity` is the network-wide quantity still sitting in any warehouse
 * (it goes down on dispatch and back up when another hub receives the goods), so it must
 * never be used as the stock of a single hub. The backend returns `hubStock`
 * (ledger: INBOUND − OUTBOUND − TRANSFER at the viewer's hub) for warehouse managers.
 */

interface StockSource {
  hubStock?: number | null;
  remainingQuantity?: number | null;
  totalQuantity?: number | null;
  status?: string;
  hubStatus?: string | null;
  pendingOutboundQuantity?: number | null;
  effectiveHubStock?: number | null;
  pendingOutboundTripCodes?: string[] | null;
}

/** Packages that can be dispatched from the viewer's hub. */
export function availableOutboundStock(
  order: StockSource & { status?: string; hubStatus?: string | null }
): number {
  if (order.effectiveHubStock !== null && order.effectiveHubStock !== undefined) {
    return Math.max(0, Number(order.effectiveHubStock) || 0);
  }

  const st = (order.hubStatus ?? order.status ?? '').toUpperCase();
  const isDraft = ['DRAFT', 'PENDING', 'WAITING'].includes(st);
  const pending = Number(order.pendingOutboundQuantity) || 0;

  // Nếu là đơn nháp, tồn khả dụng để xếp xe chính là số kiện kế hoạch của đơn hàng trừ đi số kiện đã xếp vào chuyến nháp khác
  if (isDraft) {
    const baseDraft =
      order.remainingQuantity !== null && order.remainingQuantity !== undefined
        ? Number(order.remainingQuantity) || 0
        : Number(order.totalQuantity) || 0;
    return Math.max(0, baseDraft - pending);
  }

  let baseStock = 0;
  if (order.hubStock !== null && order.hubStock !== undefined) {
    baseStock = Number(order.hubStock) || 0;
  } else if (order.remainingQuantity !== null && order.remainingQuantity !== undefined) {
    baseStock = Number(order.remainingQuantity) || 0;
  } else {
    baseStock = Number(order.totalQuantity) || 0;
  }

  return Math.max(0, baseStock - pending);
}

/** Share of a contract metric (kg, m³) for a partial package quantity — mirrors backend `proportional`. */
export function proportionalMetric(
  total: number | null | undefined,
  qty: number,
  totalQty: number | null | undefined
): number {
  const t = Number(total) || 0;
  const tq = Number(totalQty) || 0;
  if (!tq || qty >= tq) return t;
  return Math.round(((t * qty) / tq) * 1000) / 1000;
}
