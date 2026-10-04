import type { Order, OrderLedgerEntry } from '../api/types';

export interface CurrentHubStock {
  /** Hub the counters refer to — current hub of the goods, or the last hub that handled them while in transit. */
  hubId: number | null;
  hubName: string | null;
  /** Packages received at this hub (sum of PNK invoices). */
  inbound: number;
  /** Packages dispatched from this hub (sum of PXK / PGH invoices). */
  outbound: number;
  /** Packages still in stock at this hub. */
  available: number;
}

const STOCK_MOVEMENT_TYPES = new Set(['INBOUND', 'OUTBOUND', 'TRANSFER']);

/**
 * Per-hub stock counters derived from the operational ledger, mirroring the backend
 * `OperationalLedgerService.getHubStock` formula (INBOUND − OUTBOUND − TRANSFER, scoped by hub).
 * Order-level `inboundQuantity` accumulates across every hub, so it must not be shown as
 * the stock of a single warehouse.
 */
export function computeCurrentHubStock(
  order: Pick<Order, 'currentHubId' | 'currentHubEntity'>,
  ledger: OrderLedgerEntry[]
): CurrentHubStock {
  const movements = ledger.filter((e) => e.hubId != null && STOCK_MOVEMENT_TYPES.has(e.type));
  const hubId = order.currentHubId ?? movements.at(-1)?.hubId ?? null;

  if (hubId == null) {
    return { hubId: null, hubName: null, inbound: 0, outbound: 0, available: 0 };
  }

  let inbound = 0;
  let outbound = 0;
  for (const e of movements) {
    if (e.hubId !== hubId) continue;
    if (e.type === 'INBOUND') inbound += e.quantity ?? 0;
    else outbound += e.quantity ?? 0;
  }

  const hubName =
    (order.currentHubEntity?.id === hubId ? order.currentHubEntity.name : null) ??
    movements.find((e) => e.hubId === hubId && e.hubName)?.hubName ??
    null;

  return { hubId, hubName, inbound, outbound, available: Math.max(0, inbound - outbound) };
}
