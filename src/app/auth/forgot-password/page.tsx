import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ForgotPasswordViewPage from '@/features/auth/components/forgot-password-view';

export const metadata: Metadata = {
  title: 'Quên mật khẩu | Logistics TMS',
  description: 'Trang khôi phục mật khẩu tài khoản hệ thống Quản lý Vận tải Logistics TMS.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    redirect('/dashboard/overview');
  }

  return <ForgotPasswordViewPage />;
}
