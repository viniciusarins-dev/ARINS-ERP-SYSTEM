import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpValues } from "@arins/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { api, ApiError } from "@/lib/api";

export default function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpValues) {
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Este e-mail ja esta cadastrado"
          : "Nao foi possivel criar sua conta"
      );
      return;
    }

    // Email confirmation disabled on the Supabase project: we already have
    // a session, so create the organization right away instead of making
    // the user go through a separate onboarding step.
    if (data.session) {
      try {
        await api.post("/api/organizations", { companyName: values.companyName });
        navigate("/", { replace: true });
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Conta criada, mas houve um erro ao criar a empresa. Tente novamente em Configuracoes."
        );
      }
      return;
    }

    // Email confirmation enabled: no session yet. The user lands on
    // /onboarding to create the organization right after confirming their
    // e-mail and logging in.
    setCheckEmail(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Criar sua empresa</CardTitle>
          <CardDescription>Comece a usar o ARINS ERP gratuitamente</CardDescription>
        </CardHeader>
        <CardContent>
          {checkEmail ? (
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmacao para o seu e-mail. Depois de confirmar, faca login
              para configurar sua empresa.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input id="companyName" {...register("companyName")} />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting ? "Criando..." : "Criar empresa"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ja tem conta?{" "}
            <Link to="/login" className="text-primary underline underline-offset-4">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
