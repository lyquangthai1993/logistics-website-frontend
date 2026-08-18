import type { InfobarContent } from '@/components/ui/infobar';

export const notificationsInfoContent: InfobarContent = {
  title: 'Trung Tâm Thông Báo — Hướng Dẫn & Tính Năng',
  sections: [
    {
      title: 'Quản Lý Thông Báo Hệ Thống',
      description:
        'Xem và quản lý thông báo điều phối, cảnh báo đội xe, nhập xuất kho bãi theo thời gian thực với kết nối WebSocket hai chiều và bộ lọc phân loại.',
      links: []
    },
    {
      title: 'Đồng Bộ Trạng Thái URL (nuqs)',
      description:
        'Trạng thái chuyển tab (Tất cả / Chưa đọc / Đã đọc) và phân trang được đồng bộ trực tiếp vào URL (?tab=all|unread|read&page=1).',
      links: [
        {
          title: 'nuqs Documentation',
          url: 'https://nuqs.47ng.com'
        }
      ]
    },
    {
      title: 'Chuẩn Hóa Thông Báo Sonner',
      description:
        'Toàn bộ phản hồi đánh dấu đã đọc tuân thủ 100% tiếng Việt và cơ chế bắt lỗi ưu tiên API message first.',
      links: []
    }
  ]
};
