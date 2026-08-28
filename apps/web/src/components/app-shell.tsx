import { Outlet } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";
import { AppNav } from "./app-nav";

export function AppShell() {
  const { organization } = useAuth();

  // RequireOrganizationRoute guarantees organization is set before this renders.
  if (!organization) return null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AppNav organizationName={organization.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
