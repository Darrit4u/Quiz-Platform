import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { createSocketServer } from "./socket/socketServer.js";

const server = createServer(app);
const io = createSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`Backend API is running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
