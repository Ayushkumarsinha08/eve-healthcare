import type { NextFunction, Request, Response } from 'express';

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRoute) =>
  (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };