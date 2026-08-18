import type { InfobarContent } from '@/components/ui/infobar';

export const tripsInfoContent: InfobarContent = {
  title: 'Quy Trình & Hướng Dẫn Phân Công Xe (Trips Management)',
  sections: [
    {
      title: 'Tổng Quan & Vai Trò',
      description:
        'Màn hình điều phối vận tải trung tâm dành cho Quản lý Đội xe (FLEET_MANAGER) và Quản trị viên (SUPER_ADMIN). Tại đây, đội xe tiếp nhận các yêu cầu điều vận từ bộ phận Điều hành (Dispatcher), bố trí phương tiện phù hợp (nội bộ hoặc thuê ngoài), tính toán tải trọng và quản lý vòng đời chuyến xe.',
      links: []
    },
    {
      title: 'Quy Trình Phân Công Đơn & Split Shipment',
      description:
        '1. Đơn Cần Phân Xe: Hiển thị các đơn hàng chờ bố trí phương tiện.\n2. Phân Công Đơn Chiếc: Chọn phương tiện, tài xế, ngày giờ lấy hàng và ngày dự kiến đến kho.\n3. Split Shipment (Chia tải 2–5 xe): Khi khối lượng đơn vượt quá sức chứa 1 xe, hệ thống hỗ trợ phân bổ tải trọng và thể tích linh hoạt sang nhiều chuyến xe độc lập.\n4. Báo Hết Xe Nội Bộ: Trong trường hợp toàn bộ xe bận hoặc bảo dưỡng, quản lý đội xe có thể gửi phản hồi lý do để Dispatcher chủ động thuê xe đối tác ngoài.',
      links: []
    },
    {
      title: 'Đồng Hồ Đo Tải Trọng (Capacity Gauge) & Cảnh Báo',
      description:
        'Hệ thống tự động tính toán tỷ lệ lấp đầy khối lượng (%) và thể tích (%) theo thời gian thực dựa trên thông số định mức của xe. Nếu vượt quá 100%, hệ thống sẽ hiển thị cảnh báo đỏ và khuyến nghị kích hoạt chế độ Split Shipment.',
      links: []
    },
    {
      title: 'Xác Nhận Chuyến Xe & Luồng Thông Báo Tự Động',
      description:
        'Khi nhấn "Xác nhận Trip", trạng thái chuyến xe chuyển sang CONFIRMED. Khi toàn bộ các chuyến xe của đơn hàng được xác nhận, đơn hàng tự động chuyển sang ASSIGNED và hệ thống tự động gửi thông báo real-time qua email và in-app đến Thủ kho (Inbound Kho) và Điều độ viên.',
      links: [
        {
          title: 'Tài liệu Quản lý Đội xe',
          url: '/dashboard/fleet'
        }
      ]
    }
  ]
};
