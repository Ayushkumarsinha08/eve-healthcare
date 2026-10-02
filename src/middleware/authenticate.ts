import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { getJwtSecret } from '../utils/jwt';

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    next(new AppError(401, 'UNAUTHENTICATED', 'A bearer token is required'));
    return;
  }

  try {
    const payload = jwt.verify(match[1], getJwtSecret()) as JwtPayload;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Token subject is missing');
    }
    request.user = { id: payload.sub };
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'The bearer token is invalid or expired'));
  }
};