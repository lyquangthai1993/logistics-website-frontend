export const DEFAULT_HUBS = [
  'Andromeda Hub (Hà Nội)',
  'Magellan Hub (Đà Nẵng)',
  'Centaurus Hub (TP.HCM)',
  'Pegasus Hub (Cần Thơ)',
  'Vela Hub (Hải Phòng)'
];

export const ORDER_STATUS_OPTIONS = [
  { label: 'Bản nháp (Draft)', value: 'DRAFT' },
  { label: 'Chờ điều xe', value: 'PENDING_FLEET' },
  { label: 'Đã phân xe', value: 'ASSIGNED' },
  { label: 'Đang vận chuyển', value: 'IN_TRANSIT' },
  { label: 'Đã giao hàng', value: 'DELIVERED' },
  { label: 'Không có xe', value: 'NO_VEHICLE' },
  { label: 'Đã hủy', value: 'CANCELLED' }
];

export const DATE_PRESET_OPTIONS = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày qua' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'lastMonth', label: 'Tháng trước' }
] as const;

export type DatePreset = 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';
