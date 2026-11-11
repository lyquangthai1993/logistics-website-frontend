import { NavGroup } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 * Items are organized into groups, each rendered with a SidebarGroupLabel.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property with a `role` field.
 * The role field supports comma-separated roles: 'SUPER_ADMIN,DISPATCHER'
 *
 * Available roles:
 * - SUPER_ADMIN: Full access
 * - DISPATCHER: Order & trip management
 * - FLEET_MANAGER: Vehicle & fleet management
 * - WAREHOUSE_MANAGER: Warehouse operations
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Vận hành TMS',
    items: [
      // Tạm thời ẩn trang Lệnh điều vận (/dashboard/orders) theo yêu cầu vận hành
      // {
      //   title: 'Lệnh điều vận',
      //   url: '/dashboard/orders',
      //   icon: 'orders',
      //   shortcut: ['o', 'r'],
      //   isActive: false,
      //   items: [],
      //   access: { role: 'SUPER_ADMIN,DISPATCHER' }
      // },
      {
        title: 'Phân công xe',
        url: '/dashboard/trips',
        icon: 'trips',
        shortcut: ['t', 'r'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,FLEET_MANAGER' }
      },
      {
        title: 'Quản lý đội xe',
        url: '/dashboard/fleet',
        icon: 'fleet',
        shortcut: ['f', 'l'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,FLEET_MANAGER' }
      },
      {
        title: 'Nhập kho',
        url: '/dashboard/warehouse/inbound',
        icon: 'warehouse',
        shortcut: ['w', 'i'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,WAREHOUSE_MANAGER' }
      },
      {
        title: 'Xuất kho',
        url: '/dashboard/warehouse/outbound',
        icon: 'truck',
        shortcut: ['w', 'o'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,WAREHOUSE_MANAGER' }
      },
      {
        title: 'Đơn hàng kho',
        url: '/dashboard/warehouse/orders',
        icon: 'package',
        shortcut: ['w', 's'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,WAREHOUSE_MANAGER' }
      },
      {
        title: 'Chuyển đổi Excel',
        url: '/dashboard/warehouse/excel-converter',
        icon: 'table',
        shortcut: ['w', 'c'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,WAREHOUSE_MANAGER' }
      }
    ]
  },
  {
    label: 'Quản trị hệ thống',
    items: [
      {
        title: 'Báo cáo vận hành',
        url: '/dashboard/admin/reports',
        icon: 'trendingUp',
        shortcut: ['r', 'p'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Theo dõi TRIP theo ngày',
        url: '/dashboard/admin/reports/trips',
        icon: 'trips',
        shortcut: ['r', 't'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Cân đối đội xe theo miền',
        url: '/dashboard/admin/reports/regional-dispatch',
        icon: 'truck',
        shortcut: ['r', 'd'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Quản trị Cronjob',
        url: '/dashboard/admin/cronjobs',
        icon: 'settings',
        shortcut: ['c', 'j'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Chi Nhánh Kho (Hubs)',
        url: '/dashboard/admin/hubs',
        icon: 'mapPin',
        shortcut: ['h', 'b'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Người dùng',
        url: '/dashboard/users',
        icon: 'teams',
        shortcut: ['u', 'u'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      }
    ]
  }
];
