import * as z from 'zod';

export const vehicleSchema = z.object({
  licensePlate: z.string().min(1, 'Biển số xe là bắt buộc'),
  model: z.string().optional(),
  type: z.string().min(1, 'Vui lòng chọn loại xe'),
  maxWeight: z.coerce.number().positive('Tải trọng phải lớn hơn 0'),
  maxVolume: z.coerce.number().positive('Thể tích phải lớn hơn 0'),
  hubId: z.coerce.number().nullable().optional(),
  currentHub: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']),
  isExternal: z.boolean().optional(),
  externalProvider: z.string().optional()
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
