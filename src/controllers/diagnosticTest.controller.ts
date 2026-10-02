import type { RequestHandler } from 'express';
import * as diagnosticTestService from '../services/diagnosticTest.service';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamsSchema } from '../validators/common.validator';

export const createDiagnosticTest: RequestHandler = asyncHandler(async (request, response) => {
  const test = await diagnosticTestService.createDiagnosticTest(request.body);
  response.status(201).json({ success: true, data: { test } });
});
export const listDiagnosticTests: RequestHandler = asyncHandler(async (_request, response) => {
  const tests = await diagnosticTestService.listDiagnosticTests();
  response.status(200).json({ success: true, data: { tests } });
});
export const getDiagnosticTest: RequestHandler = asyncHandler(async (request, response) => {
  const { id } = idParamsSchema.parse(request.params);
  const test = await diagnosticTestService.getDiagnosticTest(id);
  response.status(200).json({ success: true, data: { test } });
});