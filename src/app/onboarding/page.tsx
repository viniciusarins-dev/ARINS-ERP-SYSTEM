import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Vamos criar sua empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Falta so isso para comecar a usar o sistema.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
