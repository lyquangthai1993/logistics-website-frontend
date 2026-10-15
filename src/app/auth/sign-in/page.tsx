import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SignInViewPage from '@/features/auth/components/sign-in-view';
import { isTokenValid, parseJwtServer } from '@/lib/server-auth';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Trang đăng nhập hệ thống Quản lý Vận tải S-Hub.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (isTokenValid(token)) {
    redirect('/dashboard/warehouse/orders');
  }

  return <SignInViewPage />;
}

