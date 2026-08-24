import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ResetPasswordViewPage from '@/features/auth/components/reset-password-view';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu | Logistics TMS',
  description: 'Trang đặt lại mật khẩu mới cho hệ thống Quản lý Vận tải Logistics TMS.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    redirect('/dashboard/overview');
  }

  return <ResetPasswordViewPage />;
}
