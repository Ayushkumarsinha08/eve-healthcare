import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import request from 'supertest';
import app from '../src/app';
import * as paymentService from '../src/services/payment.service';
import { prisma } from '../src/utils/prisma';

const setupPaymentDb = (overrides: { userId?: string; status?: BookingStatus } = {}) => {
  const state = {
    booking: { id: 'booking-1', userId: overrides.userId ?? 'user-1', status: overrides.status ?? BookingStatus.PENDING, amount: new Prisma.Decimal('45.67') },
    payments: [] as Array<Record<string, unknown>>
  };
  const getBooking = (id: string, userId?: string) => {
    if (state.booking.id !== id || (userId && state.booking.userId !== userId)) return null;
    return { ...state.booking, payment: state.payments.find((payment) => payment.bookingId === id) ?? null };
  };
  const transaction = {
    booking: {
      findFirst: jest.fn(async ({ where }: { where: { id: string; userId?: string } }) => getBooking(where.id, where.userId)),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => getBooking(where.id)),
      update: jest.fn(async ({ data }: { data: { status: BookingStatus } }) => { state.booking.status = data.status; return { ...state.booking }; })
    },
    payment: {
      findUnique: jest.fn(async ({ where }: { where: { eventId?: string; bookingId?: string } }) => state.payments.find((payment) =>
        (where.eventId !== undefined && payment.eventId === where.eventId) || (where.bookingId !== undefined && payment.bookingId === where.bookingId)
      ) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (state.payments.some((payment) => payment.bookingId === data.bookingId || payment.eventId === data.eventId)) {
          throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        }
        const payment = { id: `payment-${state.payments.length + 1}`, ...data };
        state.payments.push(payment);
        return payment;
      })
    }
  };
  (jest.spyOn(prisma, '$transaction') as jest.SpyInstance).mockImplementation((callback: (client: unknown) => Promise<unknown>) => callback(transaction));
  return { state, transaction };
};

describe('simulated payments', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates success from the booking amount and confirms the booking', async () => {
    const { state } = setupPaymentDb();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = await paymentService.createSimulatedPayment('user-1', 'booking-1');
    expect(result.payment).toEqual(expect.objectContaining({ amount: new Prisma.Decimal('45.67'), status: PaymentStatus.SUCCESS }));
    expect(state.booking.status).toBe(BookingStatus.CONFIRMED);
    expect(state.payments).toHaveLength(1);
  });

  it('creates failure and marks booking failed', async () => {
    const { state } = setupPaymentDb();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = await paymentService.createSimulatedPayment('user-1', 'booking-1');
    expect(result.payment).toEqual(expect.objectContaining({ status: PaymentStatus.FAILED }));
    expect(state.booking.status).toBe(BookingStatus.FAILED);
  });

  it('rejects nonexistent booking', async () => {
    setupPaymentDb();
    await expect(paymentService.createSimulatedPayment('user-1', 'missing')).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('rejects another user paying for the booking', async () => {
    setupPaymentDb();
    await expect(paymentService.createSimulatedPayment('another-user', 'booking-1')).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('rejects non-pending bookings', async () => {
    setupPaymentDb({ status: BookingStatus.CONFIRMED });
    await expect(paymentService.createSimulatedPayment('user-1', 'booking-1')).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_BOOKING_STATE' });
  });

  it('prevents duplicate payment processing', async () => {
    setupPaymentDb();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    await paymentService.createSimulatedPayment('user-1', 'booking-1');
    await expect(paymentService.createSimulatedPayment('user-1', 'booking-1')).rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_ALREADY_PROCESSED' });
  });

  it('requires JWT authentication', async () => {
    const response = await request(app).post('/api/payments').send({ bookingId: 'booking-1' });
    expect(response.status).toBe(401);
  });
});

describe('payment webhook', () => {
  afterEach(() => jest.restoreAllMocks());
  const payload = (overrides: Record<string, unknown> = {}) => ({ eventId: 'evt_123', paymentId: 'external_123', bookingId: 'booking-1', status: PaymentStatus.SUCCESS, ...overrides });

  it('processes successful webhook without JWT', async () => {
    const { state } = setupPaymentDb();
    const response = await request(app).post('/api/payments/webhook').send(payload());
    expect(response.status).toBe(200);
    expect(state.booking.status).toBe(BookingStatus.CONFIRMED);
    expect(state.payments).toHaveLength(1);
  });

  it('processes failed webhook', async () => {
    const { state } = setupPaymentDb();
    const response = await request(app).post('/api/payments/webhook').send(payload({ status: PaymentStatus.FAILED }));
    expect(response.status).toBe(200);
    expect(state.booking.status).toBe(BookingStatus.FAILED);
    expect(state.payments).toHaveLength(1);
  });

  it('treats duplicate event as success without changing state', async () => {
    const { state } = setupPaymentDb();
    const first = await paymentService.processWebhook(payload());
    const duplicate = await paymentService.processWebhook(payload({ status: PaymentStatus.FAILED }));
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(state.payments).toHaveLength(1);
    expect(state.booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it('handles repeated event deliveries with only one payment and update', async () => {
    const { state, transaction } = setupPaymentDb();
    await paymentService.processWebhook(payload());
    await paymentService.processWebhook(payload());
    await paymentService.processWebhook(payload());
    expect(state.payments).toHaveLength(1);
    expect(state.booking.status).toBe(BookingStatus.CONFIRMED);
    expect(transaction.booking.update).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid event', async () => {
    const response = await request(app).post('/api/payments/webhook').send(payload({ eventId: '' }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid status', async () => {
    const response = await request(app).post('/api/payments/webhook').send(payload({ status: 'PENDING' }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects webhook for missing booking', async () => {
    setupPaymentDb();
    await expect(paymentService.processWebhook(payload({ bookingId: 'missing' }))).rejects.toMatchObject({ statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  });

  it('rejects webhook for non-pending booking', async () => {
    setupPaymentDb({ status: BookingStatus.CANCELLED });
    await expect(paymentService.processWebhook(payload())).rejects.toMatchObject({ statusCode: 409, code: 'INVALID_BOOKING_STATE' });
  });

  it('rejects a distinct webhook event after payment already exists', async () => {
    setupPaymentDb();
    await paymentService.processWebhook(payload());
    await expect(paymentService.processWebhook(payload({ eventId: 'evt_other' }))).rejects.toMatchObject({ statusCode: 409, code: 'PAYMENT_ALREADY_PROCESSED' });
  });
});
