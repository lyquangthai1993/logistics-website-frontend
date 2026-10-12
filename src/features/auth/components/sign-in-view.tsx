import { AuthHeroBanner } from './auth-hero-banner';
import { LoginForm } from './login-form';

export default function SignInViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Left Visual Column */}
      <AuthHeroBanner tagBadge='Anytime Anywhere' />

      {/* Right Login Form Column */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8 bg-background'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col text-center'>
            <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Đăng nhập</h1>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
