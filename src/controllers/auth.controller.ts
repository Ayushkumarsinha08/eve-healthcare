import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/auth.service';

export const signup: RequestHandler = asyncHandler(async (request, response) => {
  const user = await authService.signup(request.body);
  response.status(201).json({ success: true, data: { user } });
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.login(request.body);
  response.status(200).json({ success: true, data: result });
});