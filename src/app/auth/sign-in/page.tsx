import { Metadata } from 'next';
import SignInViewPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Trang đăng nhập hệ thống Quản lý Vận tải Logistics TMS.'
};

export default async function Page() {
  return <SignInViewPage />;
}
