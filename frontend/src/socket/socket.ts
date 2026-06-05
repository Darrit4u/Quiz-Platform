import { io, type Socket } from "socket.io-client";
import { getStoredToken } from "@/api/httpClient";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ??
  (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(
    /\/api\/?$/,
    "",
  )
).replace(/\/$/, "");

export function createSessionSocket(): Socket | null {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  return io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  });
}
