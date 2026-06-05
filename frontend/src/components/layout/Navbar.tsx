export function Navbar() {
  return (
    <header className="flex h-16 items-center justify-end border-b border-zinc-200 bg-white px-8">
      <div className="text-right">
        <p className="text-sm font-medium text-zinc-900">Jane Doe</p>
        <p className="text-xs text-zinc-500">Organizer</p>
      </div>
      <div className="ml-3 flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
        JD
      </div>
    </header>
  );
}
