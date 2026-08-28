"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { signUpSchema } from "@/lib/validations/auth";

export interface SignUpActionState {
  error?: string;
  checkEmail?: boolean;
}

export async function signUpAction(
  _prevState: SignUpActionState,
  formData: FormData
): Promise<SignUpActionState> {
  const parsed = signUpSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos" };
  }

  const { companyName, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message === "User already registered" ? "Este e-mail ja esta cadastrado" : "Nao foi possivel criar sua conta" };
  }

  // Email confirmation disabled on the Supabase project: we already have a
  // session, so create the organization right away instead of making the
  // user go through a separate onboarding step.
  if (data.session) {
    const { error: rpcError } = await supabase.rpc("create_organization_with_owner", {
      p_name: companyName,
      p_slug: slugify(companyName),
    });

    if (rpcError) {
      return { error: "Conta criada, mas houve um erro ao criar a empresa. Tente novamente em Configuracoes." };
    }

    redirect("/");
  }

  // Email confirmation enabled: no session yet. The user will land on
  // /onboarding (via middleware + app layout) to create the organization
  // right after confirming their e-mail and logging in.
  return { checkEmail: true };
}
