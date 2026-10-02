import { z } from 'zod';
import { entityIdSchema } from './common.validator';

export const createBookingSchema = z.object({
  testId: entityIdSchema,
  centreId: entityIdSchema,
  appointmentAt: z.string().datetime({ offset: true }).refine((value) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, 'Appointment date must be a real calendar date')
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;