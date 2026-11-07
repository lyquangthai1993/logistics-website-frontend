import PageContainer from '@/components/layout/page-container';
import { SuperAdminCronjobManager } from '@/features/admin-reports/components/super-admin-cronjob-manager';

export const metadata = {
  title: 'Quản Trị Cronjob | Logistics TMS'
};

export default function AdminCronjobsPage() {
  return (
    <PageContainer
      pageTitle='Quản Trị Cronjob'
      pageDescription='Danh mục tác vụ Cronjob hệ thống — Chọn một tác vụ để vào trang Chi tiết thực hiện chạy lại theo khoảng ngày, cấu hình lịch chạy và xem nhật ký'
    >
      <SuperAdminCronjobManager />
    </PageContainer>
  );
}
