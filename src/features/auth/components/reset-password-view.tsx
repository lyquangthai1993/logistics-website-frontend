import { AuthHeroBanner } from './auth-hero-banner';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Left Visual Column */}
      <AuthHeroBanner
        tagBadge='Security & Auth'
        cardTitle='Đặt lại mật khẩu tài khoản'
        cardDescription='Tạo mật khẩu mới có độ bảo mật cao để bảo vệ tài khoản và duy trì truy cập an toàn vào hệ thống.'
        quoteText='Bảo mật thông tin và bảo đảm tính sẵn sàng cao là ưu tiên hàng đầu trong vận hành Logistics TMS.'
      />

      {/* Right Form Column */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8 bg-background'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight text-foreground'>
              Đặt lại mật khẩu
            </h1>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              Vui lòng nhập mật khẩu mới tài khoản doanh nghiệp của bạn.
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
