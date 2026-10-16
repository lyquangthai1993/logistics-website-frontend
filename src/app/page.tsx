import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isTokenValid, parseJwtServer, getRoleDefaultPath } from '@/lib/server-auth';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!isTokenValid(token)) {
    return redirect('/auth/sign-in');
  } else {
    const payload = parseJwtServer(token!);
    redirect(getRoleDefaultPath(payload?.role));
  }
}

