import type { InfobarContent } from '@/components/ui/infobar';

export const hubsInfoContent: InfobarContent = {
  title: 'Chi Nhánh Kho (Hubs) — Hướng Dẫn & Kiến Trúc',
  sections: [
    {
      title: 'Tổng Quan & Vai Trò',
      description:
        'Trang quản lý danh sách các chi nhánh kho (Hubs) trên toàn hệ thống Spider Express. SUPER_ADMIN có toàn quyền thêm mới, cập nhật thông tin, bật/tắt trạng thái hoạt động và xóa mềm chi nhánh kho.',
      links: []
    },
    {
      title: 'Kiến Trúc TanStack Query v5 + nuqs',
      description:
        'Dữ liệu được prefetch ở tầng Server Component thông qua queryClient.prefetchQuery(hubsQueryOptions) và hydrat hóa mượt mà ở Client Component. URL search params (search, page, perPage, status) đồng bộ hai chiều thời gian thực thông qua thư viện nuqs.',
      links: [
        {
          title: 'Tài liệu TanStack Table',
          url: 'https://tanstack.com/table/v8'
        }
      ]
    },
    {
      title: 'Chính Sách Xóa Mềm & An Toàn Dữ Liệu',
      description:
        'Hệ thống áp dụng cơ chế Soft Delete. Khi một chi nhánh kho bị xóa mềm, các liên kết phương tiện xe trực thuộc sẽ được giải phóng an toàn mà không làm mất lịch sử giao dịch, đơn hàng hay chuyến xe đã vận hành.',
      links: []
    }
  ]
};
