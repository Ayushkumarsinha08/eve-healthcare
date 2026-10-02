import request from 'supertest';
import app from '../src/app';
import * as authService from '../src/services/auth.service';

describe('API foundation and authentication routes', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports the API health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('validates signup input before calling the service', async () => {
    const signup = jest.spyOn(authService, 'signup');
    const response = await request(app).post('/api/auth/signup').send({ email: 'invalid' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(signup).not.toHaveBeenCalled();
  });

  it('normalizes signup input and never returns a password hash', async () => {
    const user = {
      id: 'user_1', name: 'Asha Rao', email: 'asha@example.com',
      createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z')
    };
    const signup = jest.spyOn(authService, 'signup').mockResolvedValue(user);
    const response = await request(app).post('/api/auth/signup')
      .send({ name: ' Asha Rao ', email: 'ASHA@example.com', password: 'long-password' });
    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(signup).toHaveBeenCalledWith({ name: 'Asha Rao', email: 'asha@example.com', password: 'long-password' });
  });

  it('returns the authenticated user and JWT from login', async () => {
    const result = {
      user: { id: 'user_1', name: 'Asha Rao', email: 'asha@example.com', createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z') },
      token: 'signed-token'
    };
    jest.spyOn(authService, 'login').mockResolvedValue(result);
    const response = await request(app).post('/api/auth/login').send({ email: 'ASHA@example.com', password: 'long-password' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ ...result, user: { ...result.user, createdAt: result.user.createdAt.toISOString(), updatedAt: result.user.updatedAt.toISOString() } });
  });
});
