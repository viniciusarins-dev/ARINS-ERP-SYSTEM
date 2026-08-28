"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { onboardingSchema } from "@/lib/validations/auth";

export interface OnboardingActionState {
  error?: string;
}

export async function createOrganizationAction(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const parsed = onboardingSchema.safeParse({ companyName: formData.get("companyName") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization_with_owner", {
    p_name: parsed.data.companyName,
    p_slug: slugify(parsed.data.companyName),
  });

  if (error) {
    return { error: "Nao foi possivel criar a empresa. Tente novamente." };
  }

  redirect("/");
}
