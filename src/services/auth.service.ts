import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/appError';
import { getJwtExpiresIn, getJwtSecret } from '../utils/jwt';
import type { LoginInput, SignupInput } from '../validators/auth.validator';

const toPublicUser = ({ id, name, email, createdAt, updatedAt }: User) => ({ id, name, email, createdAt, updatedAt });

export const signup = async (input: SignupInput) => {
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
  return toPublicUser(user);
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  const token = jwt.sign({}, getJwtSecret(), { subject: user.id, expiresIn: getJwtExpiresIn() });
  return { user: toPublicUser(user), token };
};