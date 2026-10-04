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
}

/** Packages that can be dispatched from the viewer's hub. */
export function availableOutboundStock(order: StockSource): number {
  if (order.hubStock !== null && order.hubStock !== undefined) {
    return Math.max(0, Number(order.hubStock) || 0);
  }
  if (order.remainingQuantity !== null && order.remainingQuantity !== undefined) {
    return Math.max(0, Number(order.remainingQuantity) || 0);
  }
  return Math.max(0, Number(order.totalQuantity) || 0);
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
