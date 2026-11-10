import { Check, Eye, EyeOff, KeyRound, Lock, LogOut, ShieldCheck } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Backdrop, DarkField, FormError, GlassCard, GoldButton, inputClass } from "@/components/armag/AuthParts";
import { usePageTitle } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";

export const PASSWORD_MIN = 8;

/** Regras da nova senha — verificadas em tempo real. */
export function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= PASSWORD_MIN, label: `Pelo menos ${PASSWORD_MIN} caracteres` },
    { ok: /[a-zA-Z]/.test(pw), label: "Pelo menos uma letra" },
    { ok: /\d/.test(pw), label: "Pelo menos um número" },
  ];
}

/**
 * Troca obrigatória da senha provisória no primeiro acesso.
 * Também pode ser aberta voluntariamente para trocar a senha.
 */
export function SetPasswordPage() {
  usePageTitle("Definir nova senha");
  const { status, email, mustChangePassword, changePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = useId();

  if (status === "loading") return null;
  if (status === "signedOut") return <Navigate to="/entrar" replace />;

  const checks = passwordChecks(password);
  const strong = checks.every((c) => c.ok);
  const matches = confirm.length > 0 && confirm === password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!strong) {
      setError("A senha ainda não atende a todos os requisitos.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const err = await changePassword(password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    toast({ title: "Senha alterada", description: "Use a nova senha nos próximos acessos." });
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink font-ui text-ice selection:bg-gold/40">
      <Backdrop />
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img
            src="/brand/escudo.png"
            alt=""
            width={48}
            height={48}
            className="size-12 rounded-xl"
            draggable={false}
          />
          <div className="leading-tight">
            <p className="font-brand text-xl font-bold tracking-[0.12em] text-gold-metal">ARMAG</p>
            <p className="font-brand text-[10px] font-semibold uppercase tracking-[0.45em] text-gold/70">Cobranças</p>
          </div>
        </div>

        <GlassCard>
          <header className="mb-7">
            <span className="mb-4 grid size-11 place-items-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan shadow-[0_0_24px_-6px_rgba(53,221,251,0.6)]">
              <KeyRound className="size-5" />
            </span>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
              {mustChangePassword ? (
                <>
                  Crie a sua <span className="text-gold-metal">senha.</span>
                </>
              ) : (
                <>
                  Alterar <span className="text-gold-metal">senha.</span>
                </>
              )}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-mist">
              {mustChangePassword
                ? "Este é o seu primeiro acesso. Por segurança, troque a senha provisória por uma senha só sua."
                : "Defina uma nova senha para a sua conta."}
            </p>
            {email && <p className="mt-3 truncate text-xs text-mist-600">Conta: {email}</p>}
          </header>

          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <DarkField
              label="Nova senha"
              icon={<Lock />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Ocultar senhas" : "Mostrar senhas"}
                  aria-pressed={show}
                  className="grid size-9 place-items-center rounded-lg text-mist transition-colors hover:bg-white/5 hover:text-ice focus-visible:outline-2 focus-visible:outline-cyan"
                >
                  {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              }
            >
              {(id) => (
                <input
                  id={id}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  aria-describedby={`${errorId}-rules`}
                  className={cn(inputClass, "pr-12")}
                  autoFocus
                />
              )}
            </DarkField>

            <ul id={`${errorId}-rules`} className="-mt-2 grid gap-1.5" aria-label="Requisitos da senha">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={cn(
                    "flex items-center gap-2 text-[13px] transition-colors",
                    c.ok ? "text-cyan" : "text-mist-600",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border transition-colors",
                      c.ok ? "border-cyan bg-cyan/15" : "border-white/15",
                    )}
                  >
                    {c.ok && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {c.label}
                  <span className="sr-only">{c.ok ? "(atendido)" : "(pendente)"}</span>
                </li>
              ))}
            </ul>

            <DarkField label="Confirmar nova senha" icon={<ShieldCheck />}>
              {(id) => (
                <input
                  id={id}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={(confirm.length > 0 && !matches) || undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={inputClass}
                />
              )}
            </DarkField>
            {confirm.length > 0 && !matches && !error && (
              <p className="-mt-3 text-[13px] text-[#ffb3ba]">As senhas não conferem.</p>
            )}

            {error && <FormError id={errorId}>{error}</FormError>}

            <GoldButton loading={saving} loadingLabel="Salvando…">
              Salvar nova senha
            </GoldButton>
          </form>

          <div className="mt-7 flex justify-center border-t border-white/5 pt-5">
            {mustChangePassword ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1.5 text-xs text-mist-600 transition-colors hover:text-ice"
              >
                <LogOut className="size-3.5" /> Sair e trocar depois
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-xs text-mist-600 transition-colors hover:text-ice"
              >
                Cancelar
              </button>
            )}
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
