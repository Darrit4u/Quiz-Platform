import { Prisma } from "@prisma/client";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const DEMO_PASSWORD = "password123";

const ids = {
  organizerUser: "seed-user-organizer",
  participantUser: "seed-user-participant",
  category: "seed-category-business",
  quiz: "seed-quiz-corporate-knowledge",
  questions: {
    websocket: "seed-question-websocket",
    realtimeFeatures: "seed-question-realtime-features",
    organizerControls: "seed-question-organizer-controls",
  },
  options: {
    websocket: {
      realtime: "seed-q1-o1",
      migration: "seed-q1-o2",
      staticHosting: "seed-q1-o3",
      passwordHashing: "seed-q1-o4",
    },
    realtimeFeatures: {
      roomCode: "seed-q2-o1",
      sync: "seed-q2-o2",
      validation: "seed-q2-o3",
      manualEditing: "seed-q2-o4",
    },
    organizerControls: {
      organizer: "seed-q3-o1",
      participant: "seed-q3-o2",
      databaseOnly: "seed-q3-o3",
      browserCache: "seed-q3-o4",
    },
  },
} as const;

const demoQuizQuestions = [
  {
    id: ids.questions.websocket,
    text: "What is the main purpose of a WebSocket connection?",
    imageUrl: null,
    type: "SINGLE_CHOICE" as const,
    timeLimitSec: 30,
    points: 1,
    orderIndex: 1,
    explanation:
      "WebSockets allow a persistent two-way channel between client and server.",
    options: [
      {
        id: ids.options.websocket.realtime,
        text: "Real-time two-way communication",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: ids.options.websocket.migration,
        text: "Database migration",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 2,
      },
      {
        id: ids.options.websocket.staticHosting,
        text: "Static file hosting",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 3,
      },
      {
        id: ids.options.websocket.passwordHashing,
        text: "Password hashing",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 4,
      },
    ],
  },
  {
    id: ids.questions.realtimeFeatures,
    text: "Which features are important for a real-time quiz application?",
    imageUrl: null,
    type: "MULTIPLE_CHOICE" as const,
    timeLimitSec: 45,
    points: 2,
    orderIndex: 2,
    explanation:
      "A working live quiz needs room joining, live sync, and server-side validation.",
    options: [
      {
        id: ids.options.realtimeFeatures.roomCode,
        text: "Room code joining",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: ids.options.realtimeFeatures.sync,
        text: "Live question synchronization",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 2,
      },
      {
        id: ids.options.realtimeFeatures.validation,
        text: "Server-side answer validation",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 3,
      },
      {
        id: ids.options.realtimeFeatures.manualEditing,
        text: "Manual database editing by participants",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 4,
      },
    ],
  },
  {
    id: ids.questions.organizerControls,
    text: "Who controls the live quiz flow?",
    imageUrl: null,
    type: "SINGLE_CHOICE" as const,
    timeLimitSec: 30,
    points: 1,
    orderIndex: 3,
    explanation:
      "The organizer controls the flow; participants only join and answer.",
    options: [
      {
        id: ids.options.organizerControls.organizer,
        text: "Organizer",
        imageUrl: null,
        isCorrect: true,
        orderIndex: 1,
      },
      {
        id: ids.options.organizerControls.participant,
        text: "Participant",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 2,
      },
      {
        id: ids.options.organizerControls.databaseOnly,
        text: "Database only",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 3,
      },
      {
        id: ids.options.organizerControls.browserCache,
        text: "Browser cache",
        imageUrl: null,
        isCorrect: false,
        orderIndex: 4,
      },
    ],
  },
] as const;

async function upsertQuestion(
  quizId: string,
  question: (typeof demoQuizQuestions)[number],
) {
  await prisma.question.upsert({
    where: { id: question.id },
    update: {
      quizId,
      text: question.text,
      imageUrl: question.imageUrl,
      type: question.type,
      timeLimitSec: question.timeLimitSec,
      points: question.points,
      orderIndex: question.orderIndex,
      explanation: question.explanation,
      answerOptions: {
        deleteMany: {},
        create: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          imageUrl: option.imageUrl,
          isCorrect: option.isCorrect,
          orderIndex: option.orderIndex,
        })),
      },
    },
    create: {
      id: question.id,
      quizId,
      text: question.text,
      imageUrl: question.imageUrl,
      type: question.type,
      timeLimitSec: question.timeLimitSec,
      points: question.points,
      orderIndex: question.orderIndex,
      explanation: question.explanation,
      answerOptions: {
        create: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          imageUrl: option.imageUrl,
          isCorrect: option.isCorrect,
          orderIndex: option.orderIndex,
        })),
      },
    },
  });
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const organizer = await prisma.user.upsert({
    where: { id: ids.organizerUser },
    update: {
      email: "organizer@example.com",
      name: "Demo Organizer",
      passwordHash,
      role: "ORGANIZER",
    },
    create: {
      id: ids.organizerUser,
      email: "organizer@example.com",
      name: "Demo Organizer",
      passwordHash,
      role: "ORGANIZER",
    },
  });

  const participant = await prisma.user.upsert({
    where: { id: ids.participantUser },
    update: {
      email: "participant@example.com",
      name: "Demo Participant",
      passwordHash,
      role: "PARTICIPANT",
    },
    create: {
      id: ids.participantUser,
      email: "participant@example.com",
      name: "Demo Participant",
      passwordHash,
      role: "PARTICIPANT",
    },
  });

  const category = await prisma.quizCategory.upsert({
    where: { id: ids.category },
    update: {
      name: "Business",
      slug: "business",
      description: "Demo category for business and corporate quizzes",
    },
    create: {
      id: ids.category,
      name: "Business",
      slug: "business",
      description: "Demo category for business and corporate quizzes",
    },
  });

  const quiz = await prisma.quiz.upsert({
    where: { id: ids.quiz },
    update: {
      creatorId: organizer.id,
      categoryId: category.id,
      title: "Corporate Knowledge Quiz",
      description:
        "Demo quiz for corporate training and intellectual quiz sessions",
      status: "PUBLISHED",
      visibility: "PRIVATE",
      defaultTimeLimitSec: 30,
      scoringMode: "FIXED",
      shuffleQuestions: false,
      shuffleAnswers: false,
    },
    create: {
      id: ids.quiz,
      creatorId: organizer.id,
      categoryId: category.id,
      title: "Corporate Knowledge Quiz",
      description:
        "Demo quiz for corporate training and intellectual quiz sessions",
      status: "PUBLISHED",
      visibility: "PRIVATE",
      defaultTimeLimitSec: 30,
      scoringMode: "FIXED",
      shuffleQuestions: false,
      shuffleAnswers: false,
    },
  });

  for (const question of demoQuizQuestions) {
    await upsertQuestion(quiz.id, question);
  }

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { status: "PUBLISHED" },
  });

  console.log("Seed completed:", {
    organizer: organizer.email,
    participant: participant.email,
    quiz: "Corporate Knowledge Quiz",
    questions: demoQuizQuestions.length,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
