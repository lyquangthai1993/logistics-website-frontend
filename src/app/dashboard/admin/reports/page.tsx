import { AdminReportHeaderAndKpis } from '@/features/admin-reports/components/super-admin-operational-report';
import { SuperAdminRegionalDispatchTable } from '@/features/admin-reports/components/super-admin-regional-dispatch-table';

export default function AdminOperationalReportsPage() {
  return (
    <div className='space-y-4'>
      <AdminReportHeaderAndKpis />
      <SuperAdminRegionalDispatchTable />
    </div>
  );
}
