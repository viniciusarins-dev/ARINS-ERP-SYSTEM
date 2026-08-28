import { redirect } from "next/navigation";

import { getCurrentOrganization } from "@/lib/organizations";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await getCurrentOrganization();

  if (!organization) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AppNav organizationName={organization.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
