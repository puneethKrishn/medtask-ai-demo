import { SessionTimeoutProvider } from "@/components/session-timeout";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionTimeoutProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[260px]">
          <div className="p-6 lg:p-8 max-w-5xl">{children}</div>
        </main>
      </div>
    </SessionTimeoutProvider>
  );
}
