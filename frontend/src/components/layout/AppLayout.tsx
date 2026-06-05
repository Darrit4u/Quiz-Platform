import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="pl-64">
        <Navbar />
        <main className="mx-auto max-w-7xl px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
