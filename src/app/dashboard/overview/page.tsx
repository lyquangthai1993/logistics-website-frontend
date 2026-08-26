import type { Metadata } from 'next';
import OverViewPage from '@/features/overview/components/overview';

export const metadata: Metadata = {
  title: 'Tổng quan | Logistics TMS',
  description: 'Tổng quan chỉ số hoạt động hệ thống Logistics TMS.'
};

export default function Page() {
  return <OverViewPage />;
}
