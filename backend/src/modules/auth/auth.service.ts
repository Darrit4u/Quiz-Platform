import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import { createAccessToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new HttpError(409, "A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      passwordHash,
      role: input.role,
    },
    select: publicUserSelect,
  });

  const token = createAccessToken(user);
  return { user, token };
}

export async function login(input: LoginInput) {
  const email = input.email.toLowerCase();
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
  });

  if (
    !userWithPassword ||
    !(await verifyPassword(input.password, userWithPassword.passwordHash))
  ) {
    throw new HttpError(401, "Invalid email or password");
  }

  const { passwordHash: _passwordHash, ...user } = userWithPassword;
  const token = createAccessToken(user);
  return { user, token };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new HttpError(401, "The authenticated user no longer exists");
  }

  return user;
}
