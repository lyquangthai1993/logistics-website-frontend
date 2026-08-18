import { Suspense } from 'react';
import NotificationsPage from '@/features/notifications/components/notifications-page';
import { notificationsSearchParamsCache } from '@/features/notifications/params';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Notifications'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  notificationsSearchParamsCache.parse(searchParams);

  return (
    <Suspense>
      <NotificationsPage />
    </Suspense>
  );
}
