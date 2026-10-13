import { AuthHeroBanner } from './auth-hero-banner';
import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background'>
      {/* Left Visual Column */}
      <AuthHeroBanner
        tagBadge='Security & Auth'
        cardTitle='Hệ thống Quản trị Vận tải Số hóa'
        cardDescription='Tối ưu hóa quy trình vận tải, kết nối chuỗi cung ứng và nâng tầm hiệu suất logistics toàn diện.'
        quoteText='Bảo mật thông tin và bảo đảm tính sẵn sàng cao là ưu tiên hàng đầu trong vận hành S-Hub.'
      />

      {/* Right Form Column */}
      <div className='flex h-full items-center justify-center p-4 lg:p-8 bg-background'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight text-foreground'>
              Quên mật khẩu?
            </h1>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              Nhập địa chỉ email doanh nghiệp đã đăng ký để nhận mã OTP và liên kết đặt lại mật khẩu
              an toàn.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
