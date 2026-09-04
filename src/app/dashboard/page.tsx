import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isTokenValid } from '@/lib/server-auth';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!isTokenValid(token)) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}

