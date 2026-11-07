import PageContainer from '@/components/layout/page-container';
import { SuperAdminCronjobManager } from '@/features/admin-reports/components/super-admin-cronjob-manager';

export const metadata = {
  title: 'Quản Trị Cronjob | Logistics TMS'
};

export default function AdminCronjobsPage() {
  return (
    <PageContainer
      pageTitle='Quản Trị Cronjob'
      pageDescription='Cấu hình lịch chạy ngầm hàng ngày, thực thi chạy lại một ngày cụ thể và theo dõi nhật ký vận hành Cronjob'
    >
      <SuperAdminCronjobManager />
    </PageContainer>
  );
}
