import * as z from 'zod';

export const userSchema = z.object({
  firstName: z.string().trim().min(1, 'Vui lòng nhập tên (First Name)').max(50, 'Tên tối đa 50 ký tự'),
  lastName: z.string().trim().min(1, 'Vui lòng nhập họ (Last Name)').max(50, 'Họ tối đa 50 ký tự'),
  email: z.string().trim().min(1, 'Vui lòng nhập địa chỉ email').email('Email không đúng định dạng'),
  username: z.string().trim().optional().or(z.literal('')),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: 'Mật khẩu phải có ít nhất 6 ký tự'
    }),
  roleId: z.coerce.number().min(1, 'Vui lòng chọn vai trò').max(4, 'Vai trò không hợp lệ'),
  statusId: z.coerce.number().min(1, 'Vui lòng chọn trạng thái').max(2, 'Trạng thái không hợp lệ')
});

export const userCreateSchema = userSchema.extend({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

export const userUpdateSchema = userSchema;

export type UserFormValues = z.infer<typeof userSchema>;
export type UserCreateFormValues = z.infer<typeof userCreateSchema>;
export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>;
