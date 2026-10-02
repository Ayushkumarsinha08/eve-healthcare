import type { RequestHandler } from 'express';
import * as bookingService from '../services/booking.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamsSchema } from '../validators/common.validator';

export const createBooking: RequestHandler = asyncHandler(async (request, response) => {
  const booking = await bookingService.createBooking(request.user!.id, request.body);
  response.status(201).json({ success: true, data: { booking } });
});
export const listBookings: RequestHandler = asyncHandler(async (request, response) => {
  const bookings = await bookingService.listBookings(request.user!.id);
  response.status(200).json({ success: true, data: { bookings } });
});
export const getBooking: RequestHandler = asyncHandler(async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  const booking = await bookingService.getBooking(request.user!.id, id);
  response.status(200).json({ success: true, data: { booking } });
});
export const cancelBooking: RequestHandler = asyncHandler(async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  const booking = await bookingService.cancelBooking(request.user!.id, id);
  response.status(200).json({ success: true, data: { booking } });
});