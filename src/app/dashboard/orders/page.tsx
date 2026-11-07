import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Lập Lệnh Điều Vận | Logistics TMS'
};

/**
 * Trang /dashboard/orders đang tạm thời ẩn theo yêu cầu vận hành,
 * tự động chuyển hướng về trang Đơn hàng kho (/dashboard/warehouse/orders).
 */
export default async function OrdersPage() {
  redirect('/dashboard/warehouse/orders');
}
