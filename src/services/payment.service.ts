import { randomUUID } from 'node:crypto';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/appError';
import type { PaymentWebhookInput } from '../validators/payment.validator';

const isUniqueConstraintError = (error: unknown): error is { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
const paymentAlreadyProcessed = () => new AppError(409, 'PAYMENT_ALREADY_PROCESSED', 'This booking already has a processed payment');
const invalidBookingState = () => new AppError(409, 'INVALID_BOOKING_STATE', 'Only pending bookings can be paid');

const createPaymentAndUpdateBooking = async (
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: { bookingId: string; eventId: string; status: PaymentStatus },
  userId?: string
) => {
  const booking = userId
    ? await transaction.booking.findFirst({ where: { id: input.bookingId, userId }, include: { payment: true } })
    : await transaction.booking.findUnique({ where: { id: input.bookingId }, include: { payment: true } });
  if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking was not found');
  if (booking.payment) throw paymentAlreadyProcessed();
  if (booking.status !== BookingStatus.PENDING) throw invalidBookingState();

  const payment = await transaction.payment.create({ data: { bookingId: booking.id, eventId: input.eventId, amount: booking.amount, status: input.status } });
  const updatedBooking = await transaction.booking.update({
    where: { id: booking.id },
    data: { status: input.status === PaymentStatus.SUCCESS ? BookingStatus.CONFIRMED : BookingStatus.FAILED }
  });
  return { payment, booking: updatedBooking, duplicate: false };
};

export const createSimulatedPayment = async (userId: string, bookingId: string) => {
  const status = Math.random() < 0.8 ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
  const eventId = `sim_${randomUUID()}`;
  try {
    return await prisma.$transaction((transaction) => createPaymentAndUpdateBooking(transaction, { bookingId, eventId, status }, userId));
  } catch (error) {
    if (isUniqueConstraintError(error) && await prisma.payment.findUnique({ where: { bookingId } })) throw paymentAlreadyProcessed();
    throw error;
  }
};

export const processWebhook = async (input: PaymentWebhookInput) => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.payment.findUnique({ where: { eventId: input.eventId } });
      if (existing) return { payment: existing, duplicate: true };
      return createPaymentAndUpdateBooking(transaction, { bookingId: input.bookingId, eventId: input.eventId, status: input.status });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const eventPayment = await prisma.payment.findUnique({ where: { eventId: input.eventId } });
      if (eventPayment) return { payment: eventPayment, duplicate: true };
      if (await prisma.payment.findUnique({ where: { bookingId: input.bookingId } })) throw paymentAlreadyProcessed();
    }
    throw error;
  }
};