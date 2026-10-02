import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { entityIdSchema } from './common.validator';

export const createPaymentSchema = z.object({ bookingId: entityIdSchema });

export const paymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  paymentId: z.string().trim().min(1).max(200),
  bookingId: entityIdSchema,
  status: z.nativeEnum(PaymentStatus)
});

export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;