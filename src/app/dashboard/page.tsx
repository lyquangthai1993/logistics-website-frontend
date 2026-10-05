import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isTokenValid, parseJwtServer } from '@/lib/server-auth';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!isTokenValid(token)) {
    return redirect('/auth/sign-in');
  } else {
    const payload = parseJwtServer(token!);
    const roleId = typeof payload?.role === 'object' ? payload.role?.id : payload?.role;
    if (roleId === 4 || roleId === 'WAREHOUSE_MANAGER') {
      redirect('/dashboard/warehouse/inbound');
    }
    redirect('/dashboard/overview');
  }
}

