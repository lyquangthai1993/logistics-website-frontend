import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Trang đăng nhập hệ thống Quản lý Vận tải Logistics TMS.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    redirect('/dashboard/overview');
  }

  return <SignInViewPage />;
}
