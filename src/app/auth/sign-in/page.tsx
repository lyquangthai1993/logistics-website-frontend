import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SignInViewPage from '@/features/auth/components/sign-in-view';
import { isTokenValid, parseJwtServer } from '@/lib/server-auth';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Trang đăng nhập hệ thống Quản lý Vận tải Logistics TMS.'
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (isTokenValid(token)) {
    const payload = parseJwtServer(token!);
    const roleId = typeof payload?.role === 'object' ? payload.role?.id : payload?.role;
    if (roleId === 4 || roleId === 'WAREHOUSE_MANAGER') {
      redirect('/dashboard/warehouse/inbound');
    }
    redirect('/dashboard/overview');
  }

  return <SignInViewPage />;
}

