import { randomInt } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { HttpError } from "./httpError.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_ROOM_CODE_LENGTH = 6;
const MAX_ROOM_CODE_ATTEMPTS = 20;

function createRoomCode(length: number) {
  return Array.from({ length }, () => {
    const index = randomInt(ROOM_CODE_ALPHABET.length);
    return ROOM_CODE_ALPHABET[index];
  }).join("");
}

export async function generateUniqueRoomCode(
  length = DEFAULT_ROOM_CODE_LENGTH,
) {
  for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = createRoomCode(length);
    const existingSession = await prisma.quizSession.findUnique({
      where: { roomCode },
      select: { id: true },
    });

    if (!existingSession) {
      return roomCode;
    }
  }

  throw new HttpError(503, "Не удалось создать уникальный код комнаты");
}
