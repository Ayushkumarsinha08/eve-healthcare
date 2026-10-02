import type { RequestHandler } from 'express';
import * as centreService from '../services/centre.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamsSchema } from '../validators/common.validator';

export const createCentre: RequestHandler = asyncHandler(async (request, response) => {
  const centre = await centreService.createCentre(request.body);
  response.status(201).json({ success: true, data: { centre } });
});
export const listCentres: RequestHandler = asyncHandler(async (_request, response) => {
  const centres = await centreService.listCentres();
  response.status(200).json({ success: true, data: { centres } });
});
export const getCentre: RequestHandler = asyncHandler(async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  const centre = await centreService.getCentre(id);
  response.status(200).json({ success: true, data: { centre } });
});