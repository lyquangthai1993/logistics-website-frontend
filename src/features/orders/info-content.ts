import type { InfobarContent } from '@/components/ui/infobar';

export const ordersInfoContent: InfobarContent = {
  title: 'Quy Trình & Hướng Dẫn Điều Vận (Orders Intake)',
  sections: [
    {
      title: 'Tổng Quan & Vai Trò',
      description:
        'Trang quản lý và tạo lập các lệnh điều vận hàng hóa trong hệ thống Spider Express. Điều độ viên (DISPATCHER) và Quản trị viên (SUPER_ADMIN) có thể tạo đơn hàng mới, gửi yêu cầu điều xe sang Đội xe (Fleet), theo dõi trạng thái phân công và quản lý phương tiện thuê ngoài.',
      links: []
    },
    {
      title: 'Vòng Đời Đơn Hàng (Status Workflow)',
      description:
        '1. DRAFT (Bản nháp): Đơn hàng mới tạo, có thể chỉnh sửa hoặc xóa.\n2. PENDING_FLEET (Chờ điều xe): Đã gửi yêu cầu điều xe lên Fleet Manager để phân công xe/tài xế.\n3. ASSIGNED / IN_TRANSIT: Đã phân xe và đang trên đường vận chuyển.\n4. DELIVERED: Đã giao hàng thành công.\n5. NO_VEHICLE: Fleet không đủ xe nội bộ, chuyển cờ xử lý thuê xe đối tác ngoài (External Fleet).',
      links: []
    },
    {
      title: 'Kiến Trúc TanStack Query v5 + nuqs',
      description:
        'Dữ liệu bảng và các chỉ số KPI được prefetch tại tầng Server Component thông qua ordersQueryOptions và ordersStatsQueryOptions. Bộ lọc thời gian thực, tìm kiếm, phân trang và khoảng ngày được đồng bộ hai chiều mượt mà qua URL search params.',
      links: [
        {
          title: 'Tài liệu TanStack Table',
          url: 'https://tanstack.com/table/v8'
        }
      ]
    }
  ]
};
