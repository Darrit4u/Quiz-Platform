import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";

export function requireRole(...roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(new HttpError(401, "Требуется авторизация"));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new HttpError(403, "Недостаточно прав для выполнения этого действия"));
      return;
    }

    next();
  };
}
