import PageContainer from '@/components/layout/page-container';
import { SuperAdminCronjobDetail } from '@/features/admin-reports/components/super-admin-cronjob-manager';

export const metadata = {
  title: 'Chi Tiết & Thực Thi Cronjob | Logistics TMS'
};

export default async function AdminCronjobDetailPage({
  params
}: {
  params: Promise<{ jobKey: string }>;
}) {
  const { jobKey } = await params;

  return (
    <PageContainer
      pageTitle='Chi Tiết & Điều Khiển Tác Vụ Cronjob'
      pageDescription='Thực thi chạy lại Cronjob theo khoảng ngày (Từ ngày → Đến ngày), cấu hình lịch chạy định kỳ và theo dõi nhật ký thực thi'
    >
      <SuperAdminCronjobDetail jobKey={jobKey} />
    </PageContainer>
  );
}
