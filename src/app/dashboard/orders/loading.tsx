import PageContainer from '@/components/layout/page-container';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';

export default function OrdersLoading() {
  return (
    <PageContainer
      pageTitle='Lập Lệnh Điều Vận'
      pageDescription='Quản lý kế hoạch vận chuyển hàng hóa, tạo đơn hàng và gửi yêu cầu phân bổ phương tiện.'
    >
      <DataTableSkeleton columnCount={7} rowCount={10} filterCount={2} />
    </PageContainer>
  );
}
