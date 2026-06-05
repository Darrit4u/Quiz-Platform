import type { ExtendedError, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./socket.types.js";

type SessionSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function socketAuth(
  socket: SessionSocket,
  next: (error?: ExtendedError) => void,
) {
  const authToken = socket.handshake.auth.token;
  const authorization = socket.handshake.headers.authorization;
  const token =
    typeof authToken === "string"
      ? authToken
      : authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length).trim()
        : null;

  if (!token) {
    next(new Error("Authentication token is required"));
    return;
  }

  try {
    socket.data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error("Invalid or expired access token"));
  }
}
