import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export async function register(request: Request, response: Response) {
  const input = registerSchema.parse(request.body);
  const result = await authService.register(input);
  response.status(201).json(result);
}

export async function login(request: Request, response: Response) {
  const input = loginSchema.parse(request.body);
  const result = await authService.login(input);
  response.json(result);
}

export async function me(request: Request, response: Response) {
  if (!request.user) {
    throw new HttpError(401, "Требуется авторизация");
  }

  const user = await authService.getCurrentUser(request.user.id);
  response.json({ user });
}

export async function updateMe(request: Request, response: Response) {
  if (!request.user) {
    throw new HttpError(401, "Требуется авторизация");
  }

  const input = updateProfileSchema.parse(request.body);
  const user = await authService.updateProfile(request.user.id, input);
  response.json({ user });
}
