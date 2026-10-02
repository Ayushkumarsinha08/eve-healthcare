import { BookingStatus, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import * as bookingService from '../src/services/booking.service';
import * as centreService from '../src/services/centre.service';
import * as diagnosticTestService from '../src/services/diagnosticTest.service';
import { prisma } from '../src/utils/prisma';

const jwtSecret = 'test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = jwtSecret;

describe('diagnostic catalogue endpoints', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns a centre with its available tests', async () => {
    const centre = { id: 'centre-1', name: 'EVE Central', location: 'Bengaluru', tests: [{ id: 'test-1', name: 'Blood Count' }] };
    jest.spyOn(centreService, 'getCentre').mockResolvedValue(centre as never);
    const response = await request(app).get('/api/centres/centre-1');
    expect(response.status).toBe(200);
    expect(response.body.data.centre.tests).toEqual(centre.tests);
  });

  it('rejects a non-positive test price before calling the service', async () => {
    const createTest = jest.spyOn(diagnosticTestService, 'createDiagnosticTest');
    const response = await request(app).post('/api/tests').send({ name: 'Blood Count', price: 0, centreId: 'centre-1' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(createTest).not.toHaveBeenCalled();
  });

  it('returns not found when creating a test for an unknown centre', async () => {
    jest.spyOn(prisma.diagnosticCentre, 'findUnique').mockResolvedValue(null);
    const response = await request(app).post('/api/tests').send({ name: 'Blood Count', price: 25, centreId: 'missing-centre' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CENTRE_NOT_FOUND');
  });
});

describe('booking endpoints and service rules', () => {
  afterEach(() => jest.restoreAllMocks());

  it('requires a bearer token for booking routes', async () => {
    const response = await request(app).get('/api/bookings');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an impossible appointment calendar date', async () => {
    const token = jwt.sign({}, jwtSecret, { subject: 'user-from-token' });
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
      .send({ testId: 'test-1', centreId: 'centre-1', appointmentAt: '2026-02-31T10:30:00Z' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('gets the booking user id from JWT, not request body', async () => {
    const createBooking = jest.spyOn(bookingService, 'createBooking').mockResolvedValue({ id: 'booking-1', userId: 'user-from-token', status: BookingStatus.PENDING } as never);
    const token = jwt.sign({}, jwtSecret, { subject: 'user-from-token' });
    const appointmentAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const response = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
      .send({ userId: 'user-from-body', testId: 'test-1', centreId: 'centre-1', appointmentAt });
    expect(response.status).toBe(201);
    expect(createBooking).toHaveBeenCalledWith('user-from-token', { testId: 'test-1', centreId: 'centre-1', appointmentAt });
  });

  it('rejects past appointment times before database queries', async () => {
    const findTest = jest.spyOn(prisma.diagnosticTest, 'findUnique');
    await expect(bookingService.createBooking('user-1', { testId: 'test-1', centreId: 'centre-1', appointmentAt: '2020-01-01T10:00:00Z' }))
      .rejects.toMatchObject({ code: 'INVALID_APPOINTMENT_TIME' });
    expect(findTest).not.toHaveBeenCalled();
  });

  it('uses database test price and creates pending bookings', async () => {
    const price = new Prisma.Decimal('125.50');
    jest.spyOn(prisma.diagnosticTest, 'findUnique').mockResolvedValue({ id: 'test-1', centreId: 'centre-1', price } as never);
    jest.spyOn(prisma.diagnosticCentre, 'findUnique').mockResolvedValue({ id: 'centre-1' } as never);
    const create = jest.spyOn(prisma.booking, 'create').mockResolvedValue({ id: 'booking-1' } as never);
    await bookingService.createBooking('user-1', { testId: 'test-1', centreId: 'centre-1', appointmentAt: new Date(Date.now() + 3600000).toISOString() });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', amount: price, status: BookingStatus.PENDING }) }));
  });

  it('rejects test selected with a different centre', async () => {
    jest.spyOn(prisma.diagnosticTest, 'findUnique').mockResolvedValue({ id: 'test-1', centreId: 'centre-a', price: new Prisma.Decimal('20.00') } as never);
    jest.spyOn(prisma.diagnosticCentre, 'findUnique').mockResolvedValue({ id: 'centre-b' } as never);
    await expect(bookingService.createBooking('user-1', { testId: 'test-1', centreId: 'centre-b', appointmentAt: new Date(Date.now() + 3600000).toISOString() }))
      .rejects.toMatchObject({ code: 'TEST_CENTRE_MISMATCH' });
  });

  it('lists only bookings belonging to the requesting user', async () => {
    const findMany = jest.spyOn(prisma.booking, 'findMany').mockResolvedValue([] as never);
    await bookingService.listBookings('user-1');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });

  it('does not cancel a booking belonging to another user', async () => {
    const findFirst = jest.spyOn(prisma.booking, 'findFirst').mockResolvedValue(null);
    const update = jest.spyOn(prisma.booking, 'update');
    await expect(bookingService.cancelBooking('user-1', 'booking-2')).rejects.toMatchObject({ code: 'BOOKING_NOT_FOUND' });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'booking-2', userId: 'user-1' } });
    expect(update).not.toHaveBeenCalled();
  });

  it('does not cancel a failed booking', async () => {
    jest.spyOn(prisma.booking, 'findFirst').mockResolvedValue({ id: 'booking-1', status: BookingStatus.FAILED } as never);
    const update = jest.spyOn(prisma.booking, 'update');
    await expect(bookingService.cancelBooking('user-1', 'booking-1')).rejects.toMatchObject({ code: 'INVALID_BOOKING_STATUS' });
    expect(update).not.toHaveBeenCalled();
  });
});
