import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function authMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError(401, "Требуется токен авторизации"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    next(new HttpError(401, "Требуется токен авторизации"));
    return;
  }

  try {
    request.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
