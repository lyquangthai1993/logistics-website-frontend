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
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Lệnh điều vận',
        url: '/dashboard/orders',
        icon: 'forms',
        shortcut: ['o', 'r'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,DISPATCHER' }
      },
      {
        title: 'Phân công xe',
        url: '/dashboard/trips',
        icon: 'truck',
        shortcut: ['t', 'r'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,FLEET_MANAGER,DISPATCHER' }
      },
      {
        title: 'Quản lý đội xe',
        url: '/dashboard/fleet',
        icon: 'truck',
        shortcut: ['f', 'l'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,FLEET_MANAGER' }
      },
      {
        title: 'Inbound Kho',
        url: '/dashboard/warehouse',
        icon: 'product',
        shortcut: ['w', 'h'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN,WAREHOUSE_MANAGER' }
      },
      {
        title: 'Product',
        url: '/dashboard/product',
        icon: 'product',
        shortcut: ['p', 'p'],
        isActive: false,
        items: []
      },
      {
        title: 'Users',
        url: '/dashboard/users',
        icon: 'teams',
        shortcut: ['u', 'u'],
        isActive: false,
        items: [],
        access: { role: 'SUPER_ADMIN' }
      },
      {
        title: 'Kanban',
        url: '/dashboard/kanban',
        icon: 'kanban',
        shortcut: ['k', 'k'],
        isActive: false,
        items: []
      },
      {
        title: 'Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        shortcut: ['c', 'c'],
        isActive: false,
        items: []
      },
      {
        title: 'AI Chat',
        url: '/dashboard/ai-chat',
        icon: 'sparkles',
        shortcut: ['a', 'i'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Elements',
    items: [
      {
        title: 'Forms',
        url: '#',
        icon: 'forms',
        isActive: true,
        items: [
          {
            title: 'Basic Form',
            url: '/dashboard/forms/basic',
            icon: 'forms',
            shortcut: ['f', 'f']
          },
          {
            title: 'Multi-Step Form',
            url: '/dashboard/forms/multi-step',
            icon: 'forms'
          },
          {
            title: 'Sheet & Dialog',
            url: '/dashboard/forms/sheet-form',
            icon: 'forms'
          },
          {
            title: 'Advanced Patterns',
            url: '/dashboard/forms/advanced',
            icon: 'forms'
          }
        ]
      },
      {
        title: 'React Query',
        url: '/dashboard/react-query',
        icon: 'code',
        isActive: false,
        items: []
      },
      {
        title: 'Icons',
        url: '/dashboard/elements/icons',
        icon: 'palette',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '#',
        icon: 'account',
        isActive: true,
        items: [
          {
            title: 'Profile',
            url: '/dashboard/profile',
            icon: 'profile',
            shortcut: ['m', 'm']
          },
          {
            title: 'Notifications',
            url: '/dashboard/notifications',
            icon: 'notification',
            shortcut: ['n', 'n']
          },
          {
            title: 'Login',
            shortcut: ['l', 'l'],
            url: '/',
            icon: 'login'
          }
        ]
      }
    ]
  }
];
