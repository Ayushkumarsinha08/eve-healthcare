import { z } from 'zod';
import { entityIdSchema } from './common.validator';

export const createDiagnosticTestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().finite().positive(),
  centreId: entityIdSchema
});

export type CreateDiagnosticTestInput = z.infer<typeof createDiagnosticTestSchema>;