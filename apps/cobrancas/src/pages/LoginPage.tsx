import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "@/components/brand/Logo";
import { Sparkle } from "@/components/brand/Sparkle";
import { usePageTitle } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { brand } from "@/config/brand";

export function LoginPage() {
  usePageTitle("Entrar");
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "signedIn") return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(await signIn(email, password));
    setLoading(false);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r-[1.5px] border-noite bg-noite p-12 text-creme lg:flex lg:flex-col">
        <div className="dot-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute -bottom-40 -left-24 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(214,107,53,0.35),transparent_65%)]"
          aria-hidden="true"
        />
        <Logo tone="light" className="relative" />
        <div className="relative mt-auto">
          <Sparkle className="mb-6 size-10 text-laranja" />
          <p className="max-w-md font-display text-[44px] font-[800] leading-[1] tracking-[-0.045em]">
            Cada parcela no lugar. Cada cobrança a um clique.
          </p>
          <p className="mt-6 font-pixel text-[11px] text-creme/40">
            {brand.fullName} {brand.version} · acesso pessoal
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="font-display text-3xl font-[800] tracking-[-0.045em]">Entrar</h1>
          <p className="mt-2 text-sm text-cafe-300">Acesso restrito à sua conta.</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
            <Field label="E-mail">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  invalid={Boolean(error)}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Senha" error={error ?? undefined}>
              {(id, d) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={d}
                  invalid={Boolean(error)}
                />
              )}
            </Field>
            <Button type="submit" size="lg" loading={loading} icon={<LogIn />} className="mt-2 w-full">
              Entrar
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
