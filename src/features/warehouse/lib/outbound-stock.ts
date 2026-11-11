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
  outboundQuantity?: number | null;
  totalQuantity?: number | null;
  totalWeight?: number | null;
  totalVolume?: number | null;
  exportedWeight?: number | null;
  exportedVolume?: number | null;
  pendingOutboundWeight?: number | null;
  pendingOutboundVolume?: number | null;
  remainingWeight?: number | null;
  remainingVolume?: number | null;
  status?: string;
  hubStatus?: string | null;
  pendingOutboundQuantity?: number | null;
  effectiveHubStock?: number | null;
  pendingOutboundTripCodes?: string[] | null;
  pendingInboundQuantity?: number | null;
  pendingInboundTripCodes?: string[] | null;
  hasPendingInboundTrip?: boolean | null;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Packages that can be dispatched (or planned onto an outbound draft) from the viewer's hub. */
export function availableOutboundStock(
  order: StockSource & { status?: string; hubStatus?: string | null }
): number {
  const st = (order.hubStatus ?? order.status ?? '').toUpperCase();
  const isDraft = ['DRAFT', 'PENDING', 'WAITING'].includes(st);
  const pendingOut = Number(order.pendingOutboundQuantity) || 0;
  const pendingIn = Number(order.pendingInboundQuantity) || 0;

  // Nếu là đơn nháp (chưa nhập kho vật lý nên hubStock = 0 và remainingQuantity = 0),
  // tồn khả dụng để xếp xe xuất nháp = số kiện kế hoạch (hoặc số kiện đang nằm ở chuyến nhập nháp) trừ đi số kiện đã xếp vào chuyến xuất nháp khác
  if (isDraft) {
    const rem = Number(order.remainingQuantity) || 0;
    const out = Number(order.outboundQuantity) || 0;
    const tot = Number(order.totalQuantity) || 0;
    const baseDraft = rem > 0 ? rem : Math.max(0, tot - out, pendingIn);
    return Math.max(0, baseDraft - pendingOut);
  }

  if (order.effectiveHubStock !== null && order.effectiveHubStock !== undefined) {
    if (pendingIn > 0) {
      if (order.hubStock !== null && order.hubStock !== undefined) {
        const confirmedHub = Math.max(0, Number(order.hubStock) || 0);
        return Math.max(0, confirmedHub + pendingIn - pendingOut);
      }
      return Math.max(0, (Number(order.effectiveHubStock) || 0) + pendingIn);
    }
    return Math.max(0, Number(order.effectiveHubStock) || 0);
  }

  let baseStock = 0;
  if (order.hubStock !== null && order.hubStock !== undefined) {
    baseStock = Number(order.hubStock) || 0;
  } else if (order.remainingQuantity !== null && order.remainingQuantity !== undefined) {
    baseStock = Number(order.remainingQuantity) || 0;
  } else {
    baseStock = Number(order.totalQuantity) || 0;
  }

  return Math.max(0, baseStock + pendingIn - pendingOut);
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
  return round3((t * qty) / tq);
}

/**
 * Remaining weight (kg) available to export for an order at the viewer's hub.
 * Subtracts all previously exported + pending-outbound weight from totalWeight so that
 * exporting all remaining packages reduces remaining weight to 0.
 */
export function availableOutboundWeight(
  order: StockSource,
  availStock?: number
): number {
  const stock = availStock !== undefined ? availStock : availableOutboundStock(order);
  if (stock <= 0) return 0;
  const st = (order.hubStatus ?? order.status ?? '').toUpperCase();
  const isDraftOrPendingIn =
    ['DRAFT', 'PENDING', 'WAITING'].includes(st) ||
    (Number(order.pendingInboundQuantity) || 0) > 0;
  if (
    !isDraftOrPendingIn &&
    order.remainingWeight !== undefined &&
    order.remainingWeight !== null
  ) {
    return Math.max(0, round3(Number(order.remainingWeight) || 0));
  }
  if (
    order.exportedWeight !== undefined ||
    order.pendingOutboundWeight !== undefined
  ) {
    const totalW = Number(order.totalWeight) || 0;
    const exportedW = Number(order.exportedWeight) || 0;
    const pendingW = Number(order.pendingOutboundWeight) || 0;
    const remW = Math.max(0, round3(totalW - exportedW - pendingW));
    return proportionalMetric(remW, stock, order.totalQuantity);
  }
  return proportionalMetric(order.totalWeight, stock, order.totalQuantity);
}

/**
 * Remaining volume (m³) available to export for an order at the viewer's hub.
 * Subtracts all previously exported + pending-outbound volume from totalVolume so that
 * exporting all remaining packages reduces remaining volume to 0.
 */
export function availableOutboundVolume(
  order: StockSource,
  availStock?: number
): number {
  const stock = availStock !== undefined ? availStock : availableOutboundStock(order);
  if (stock <= 0) return 0;
  const st = (order.hubStatus ?? order.status ?? '').toUpperCase();
  const isDraftOrPendingIn =
    ['DRAFT', 'PENDING', 'WAITING'].includes(st) ||
    (Number(order.pendingInboundQuantity) || 0) > 0;
  if (
    !isDraftOrPendingIn &&
    order.remainingVolume !== undefined &&
    order.remainingVolume !== null
  ) {
    return Math.max(0, round3(Number(order.remainingVolume) || 0));
  }
  if (
    order.exportedVolume !== undefined ||
    order.pendingOutboundVolume !== undefined
  ) {
    const totalV = Number(order.totalVolume) || 0;
    const exportedV = Number(order.exportedVolume) || 0;
    const pendingV = Number(order.pendingOutboundVolume) || 0;
    const remV = Math.max(0, round3(totalV - exportedV - pendingV));
    return proportionalMetric(remV, stock, order.totalQuantity);
  }
  return proportionalMetric(order.totalVolume, stock, order.totalQuantity);
}
