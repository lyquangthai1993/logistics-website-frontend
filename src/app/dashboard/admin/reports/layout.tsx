import React from 'react';
import { AdminOperationalReportLayoutShell } from '@/features/admin-reports/components/super-admin-operational-report';

export const metadata = {
  title: 'Báo Cáo Kết Quả Hoạt Động Vận Hành Hub (Super Admin) | Logistics TMS'
};

export default function AdminOperationalReportsLayout({
  children,
  daily_stats,
  monthly_trends,
  drilldown_table
}: {
  children: React.ReactNode;
  daily_stats: React.ReactNode;
  monthly_trends: React.ReactNode;
  drilldown_table: React.ReactNode;
}) {
  return (
    <AdminOperationalReportLayoutShell
      daily_stats={daily_stats}
      monthly_trends={monthly_trends}
      drilldown_table={drilldown_table}
    >
      {children}
    </AdminOperationalReportLayoutShell>
  );
}
