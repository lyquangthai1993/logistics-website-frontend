import * as z from 'zod';

export const driverSchema = z.object({
  fullName: z.string().min(1, 'Họ và tên là bắt buộc'),
  phone: z.string().min(1, 'Số điện thoại là bắt buộc'),
  licenseNumber: z.string().optional(),
  licenseClass: z.string().min(1, 'Vui lòng chọn hạng bằng lái'),
  experienceYears: z.coerce.number().min(0, 'Kinh nghiệm phải lớn hơn hoặc bằng 0'),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY'])
});

export type DriverFormValues = z.infer<typeof driverSchema>;
