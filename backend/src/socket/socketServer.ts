import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { registerSessionSocketHandlers } from "./sessionSocketHandlers.js";
import { socketAuth } from "./socketAuth.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./socket.types.js";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(socketAuth);
  io.on("connection", (socket) => {
    registerSessionSocketHandlers(io, socket);
  });

  return io;
}
