import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          QuizPlatform
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Professional quiz and learning sessions
        </p>
      </div>
      <div className="mx-auto mt-8 w-full max-w-md rounded-xl border border-zinc-200 bg-white px-10 py-8 shadow-sm">
        <Outlet />
      </div>
    </main>
  );
}
