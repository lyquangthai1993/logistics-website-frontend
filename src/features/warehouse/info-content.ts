import type { InfobarContent } from '@/components/ui/infobar';

export const warehouseInfoContent: InfobarContent = {
  title: 'Quy Trình Quản Lý Kho & Tiếp Nhận Hàng (Warehouse Inbound)',
  sections: [
    {
      title: 'Tổng Quan & Vai Trò',
      description:
        'Màn hình Inbound Board dành riêng cho Thủ kho (WAREHOUSE_MANAGER) và Quản trị viên (SUPER_ADMIN) để theo dõi các chuyến xe vận chuyển hàng hóa sắp cập bến Hub. Hệ thống tự động cập nhật danh sách xe sau khi Quản lý Đội xe xác nhận điều phối.',
      links: []
    },
    {
      title: 'Quy Trình Kiểm Tra & Tiếp Nhận',
      description:
        '1. Đối soát Thông Tin: Kiểm tra biển số xe, tài xế và mã vận đơn đối chiếu với thông tin chuyến xe trên hệ thống.\n2. Xe Thuê Ngoài (Đối tác): Với các chuyến xe có nhãn "Xe ngoài", thủ kho cần kiểm tra hợp đồng vận chuyển và giấy tờ tùy thân của tài xế đối tác.\n3. Kiểm Đếm Tải Trọng & Thể Tích: Đối chiếu khối lượng (kg) và thể tích (m³) thực nhận so với phiếu điều vận.\n4. Đánh Dấu Hoàn Thành: Khi hàng hóa đã dỡ an toàn vào kho, chọn "Đánh dấu hoàn thành" để cập nhật trạng thái đơn hàng.',
      links: []
    },
    {
      title: 'Chế Độ Hiển Thị Linh Hoạt',
      description:
        'Thủ kho có thể chuyển đổi linh hoạt giữa Dạng Bảng (Data Table chuẩn với phân trang, lọc nâng cao) và Dạng Thẻ (Card Board trực quan theo từng chuyến xe) trên thanh công cụ.',
      links: [
        {
          title: 'Quản lý Chi Nhánh Kho (Hubs)',
          url: '/dashboard/admin/hubs'
        }
      ]
    }
  ]
};
