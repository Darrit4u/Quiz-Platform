import { createBrowserRouter, Navigate } from "react-router";
import {
  HomeRedirect,
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { CreateQuizPage } from "@/pages/organizer/CreateQuizPage";
import { HostLobbyPage } from "@/pages/organizer/HostLobbyPage";
import { HostQuizPage } from "@/pages/organizer/HostQuizPage";
import { OrganizerDashboardPage } from "@/pages/organizer/OrganizerDashboardPage";
import { QuestionEditorPage } from "@/pages/organizer/QuestionEditorPage";
import { ParticipantJoinPage } from "@/pages/participant/ParticipantJoinPage";
import { ParticipantLobbyPage } from "@/pages/participant/ParticipantLobbyPage";
import { ParticipantQuestionPage } from "@/pages/participant/ParticipantQuestionPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRedirect />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]} />,
    children: [
      {
        path: "/organizer",
        element: <AppLayout />,
        children: [
          { index: true, element: <OrganizerDashboardPage /> },
          { path: "quizzes/new", element: <CreateQuizPage /> },
          { path: "quizzes/:quizId/questions", element: <QuestionEditorPage /> },
        ],
      },
      {
        path: "/organizer/rooms/:roomId/lobby",
        element: <HostLobbyPage />,
      },
      {
        path: "/organizer/rooms/:roomId/live",
        element: <HostQuizPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["PARTICIPANT"]} />,
    children: [
      {
        path: "/participant/join",
        element: <ParticipantJoinPage />,
      },
      {
        path: "/participant/rooms/:roomId/lobby",
        element: <ParticipantLobbyPage />,
      },
      {
        path: "/participant/rooms/:roomId/question",
        element: <ParticipantQuestionPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [{ path: "/results/:roomId", element: <ResultsPage /> }],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
