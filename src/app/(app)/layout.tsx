import { requireAuth } from "@/lib/core/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { startWorker } from "@/lib/email/worker";

// Démarre le worker de jobs au premier rendu côté serveur (runtime node).
startWorker();

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  return (
    <div className="flex min-h-screen bg-fill-subtle">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar ctx={ctx} />
        <main className="flex-1">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
}
