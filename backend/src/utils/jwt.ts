import type { UserRole } from "@prisma/client";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../modules/users/user.types.js";
import { HttpError } from "./httpError.js";

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function createAccessToken(user: AuthUser) {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "ORGANIZER" &&
        payload.role !== "PARTICIPANT" &&
        payload.role !== "ADMIN")
    ) {
      throw new HttpError(401, "Invalid access token");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "Invalid or expired access token");
  }
}
