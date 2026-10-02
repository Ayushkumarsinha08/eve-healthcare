import { z } from 'zod';

export const createCentreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(200)
});

export type CreateCentreInput = z.infer<typeof createCentreSchema>;