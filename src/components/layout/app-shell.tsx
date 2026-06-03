import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar />
        <main className="px-5 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
