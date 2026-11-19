export type CanonicalRole =
  | 'SUPER_ADMIN'
  | 'DISPATCHER'
  | 'FLEET_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'REPORT_VIEWER';

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  '1': 'SUPER_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPERADMIN: 'SUPER_ADMIN',
  '2': 'DISPATCHER',
  DISPATCHER: 'DISPATCHER',
  DIEU_PHOI_VIEN: 'DISPATCHER',
  '3': 'FLEET_MANAGER',
  FLEET_MANAGER: 'FLEET_MANAGER',
  QUAN_LY_DOI_XE: 'FLEET_MANAGER',
  '4': 'WAREHOUSE_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  QUAN_LY_KHO: 'WAREHOUSE_MANAGER',
  '5': 'REPORT_VIEWER',
  REPORT_VIEWER: 'REPORT_VIEWER',
  CHI_XEM_BAO_CAO: 'REPORT_VIEWER'
};

function normalizeRoleName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (letter) => (letter === 'Đ' ? 'D' : 'd'))
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/** Normalize role IDs, codes, and display names received from the API or JWT. */
export function normalizeRole(role: unknown): CanonicalRole | undefined {
  if (typeof role === 'number' || typeof role === 'string') {
    const normalized = normalizeRoleName(String(role));
    return ROLE_ALIASES[normalized];
  }

  if (role && typeof role === 'object') {
    const value = role as Record<string, unknown>;
    for (const candidate of [value.id, value.code, value.name, value.displayName]) {
      const normalized = normalizeRole(candidate);
      if (normalized) return normalized;
    }
  }

  return undefined;
}
