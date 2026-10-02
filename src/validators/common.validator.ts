import { z } from 'zod';

export const entityIdSchema = z
  .union([z.string().trim().min(1), z.number().int().positive()])
  .transform(String);

export const idParamsSchema = z.object({ id: entityIdSchema });