import type { RequestHandler } from 'express';
import * as paymentService from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';

export const createPayment: RequestHandler = asyncHandler(async (request, response) => {
  const result = await paymentService.createSimulatedPayment(request.user!.id, request.body.bookingId);
  response.status(201).json({ success: true, data: result });
});
export const paymentWebhook: RequestHandler = asyncHandler(async (request, response) => {
  const result = await paymentService.processWebhook(request.body);
  response.status(200).json({ success: true, data: result });
});