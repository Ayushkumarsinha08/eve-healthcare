import { BookingStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/appError';
import type { CreateBookingInput } from '../validators/booking.validator';

const bookingRelations = {
  test: { select: { id: true, name: true, price: true } },
  centre: { select: { id: true, name: true, location: true } }
};

export const createBooking = async (userId: string, input: CreateBookingInput) => {
  const appointmentAt = new Date(input.appointmentAt);
  if (appointmentAt.getTime() <= Date.now()) throw new AppError(400, 'INVALID_APPOINTMENT_TIME', 'Appointment time must be in the future');
  const test = await prisma.diagnosticTest.findUnique({ where: { id: input.testId }, select: { id: true, centreId: true, price: true } });
  if (!test) throw new AppError(404, 'TEST_NOT_FOUND', 'Diagnostic test was not found');
  const centre = await prisma.diagnosticCentre.findUnique({ where: { id: input.centreId }, select: { id: true } });
  if (!centre) throw new AppError(404, 'CENTRE_NOT_FOUND', 'Diagnostic centre was not found');
  if (test.centreId !== centre.id) throw new AppError(400, 'TEST_CENTRE_MISMATCH', 'The selected test is not available at this centre');
  return prisma.booking.create({
    data: { userId, testId: test.id, centreId: centre.id, appointmentAt, amount: test.price, status: BookingStatus.PENDING },
    include: bookingRelations
  });
};

export const listBookings = (userId: string) => prisma.booking.findMany({ where: { userId }, include: bookingRelations, orderBy: { appointmentAt: 'asc' } });

export const getBooking = async (userId: string, id: string) => {
  const booking = await prisma.booking.findFirst({ where: { id, userId }, include: bookingRelations });
  if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking was not found');
  return booking;
};

export const cancelBooking = async (userId: string, id: string) => {
  const booking = await prisma.booking.findFirst({ where: { id, userId } });
  if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking was not found');
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new AppError(409, 'INVALID_BOOKING_STATUS', `A ${booking.status.toLowerCase()} booking cannot be cancelled`);
  }
  return prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED }, include: bookingRelations });
};