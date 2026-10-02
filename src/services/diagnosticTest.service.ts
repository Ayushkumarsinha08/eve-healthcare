import { prisma } from '../utils/prisma';
import { AppError } from '../utils/appError';
import type { CreateDiagnosticTestInput } from '../validators/diagnosticTest.validator';

export const createDiagnosticTest = async (input: CreateDiagnosticTestInput) => {
  const centre = await prisma.diagnosticCentre.findUnique({ where: { id: input.centreId }, select: { id: true } });
  if (!centre) throw new AppError(404, 'CENTRE_NOT_FOUND', 'Diagnostic centre was not found');
  return prisma.diagnosticTest.create({ data: input });
};

export const listDiagnosticTests = () => prisma.diagnosticTest.findMany({
  include: { centre: { select: { id: true, name: true, location: true } } },
  orderBy: { name: 'asc' }
});

export const getDiagnosticTest = async (id: string) => {
  const test = await prisma.diagnosticTest.findUnique({ where: { id }, include: { centre: { select: { id: true, name: true, location: true } } } });
  if (!test) throw new AppError(404, 'TEST_NOT_FOUND', 'Diagnostic test was not found');
  return test;
};