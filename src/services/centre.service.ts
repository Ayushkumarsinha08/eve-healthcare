import { prisma } from '../utils/prisma';
import { AppError } from '../utils/appError';
import type { CreateCentreInput } from '../validators/centre.validator';

export const createCentre = (input: CreateCentreInput) => prisma.diagnosticCentre.create({ data: input });
export const listCentres = () => prisma.diagnosticCentre.findMany({ orderBy: { name: 'asc' } });

export const getCentre = async (id: string) => {
  const centre = await prisma.diagnosticCentre.findUnique({ where: { id }, include: { tests: { orderBy: { name: 'asc' } } } });
  if (!centre) throw new AppError(404, 'CENTRE_NOT_FOUND', 'Diagnostic centre was not found');
  return centre;
};