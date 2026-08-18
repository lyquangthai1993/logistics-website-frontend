import type { InfobarContent } from '@/components/ui/infobar';

export const fleetInfoContent: InfobarContent = {
  title: 'Đội Xe & Phương Tiện — Hướng Dẫn & Kiến Trúc',
  sections: [
    {
      title: 'Tổng Quan Hệ Thống Đội Xe & Tài Xế',
      description:
        'Trang quản lý phương tiện vận tải và tài xế ứng dụng kiến trúc chuẩn hóa TanStack React Table v8, đồng bộ trạng thái URL thời gian thực qua nuqs, và tối ưu hóa truy vấn dữ liệu với TanStack React Query v5.',
      links: [
        {
          title: 'TanStack React Table',
          url: 'https://tanstack.com/table/v8'
        }
      ]
    },
    {
      title: 'Đồng Bộ Trạng Thái Tab & Bộ Lọc',
      description:
        'Chuyển đổi mượt mà giữa danh sách phương tiện (Vehicles) và tài xế (Drivers) được lưu vết qua tham số ?tab=vehicles hoặc ?tab=drivers. Mọi thao tác phân trang, tìm kiếm và lọc trạng thái đều được đồng bộ hai chiều với URL.',
      links: [
        {
          title: 'nuqs Documentation',
          url: 'https://nuqs.47ng.com'
        }
      ]
    },
    {
      title: 'Chuẩn Hóa Thông Báo (Sonner Toast)',
      description:
        'Toàn bộ thông báo CRUD tuân thủ nghiêm ngặt 100% tiếng Việt và ưu tiên hiển thị thông điệp chi tiết trả về từ API backend khi xảy ra lỗi.',
      links: []
    }
  ]
};
