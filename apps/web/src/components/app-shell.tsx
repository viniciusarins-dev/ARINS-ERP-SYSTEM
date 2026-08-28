import { Outlet } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";
import { AppSidebar } from "./app-sidebar";

export function AppShell() {
  const { organization } = useAuth();

  // RequireOrganizationRoute guarantees organization is set before this renders.
  if (!organization) return null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 md:flex-row">
      <AppSidebar organizationName={organization.name} />
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
