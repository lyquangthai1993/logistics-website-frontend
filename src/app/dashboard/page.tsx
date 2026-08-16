import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return redirect('/auth/sign-in');
  } else {
    redirect('/dashboard/overview');
  }
}
