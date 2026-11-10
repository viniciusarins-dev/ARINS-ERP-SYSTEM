import { ArrowRight, BarChart3, Eye, EyeOff, Lock, Mail, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { Backdrop, DarkField, Feature, FormError, GlassCard, GoldButton, inputClass } from "@/components/armag/AuthParts";
import { usePageTitle } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";

/**
 * Login ARMAG — Luxury Tech: preto profundo, vidro escuro com borda dourada,
 * ciano para foco e estados interativos.
 */
export function LoginPage() {
  usePageTitle("Entrar");
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorId = useId();

  if (status === "signedIn") return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    setError(await signIn(email, password));
    setLoading(false);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink font-ui text-ice selection:bg-gold/40">
      <Backdrop />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1200px] items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        {/* Marca */}
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex w-48 flex-col items-center sm:w-60 lg:-ml-4 lg:w-[340px]">
            <img
              src="/brand/armag-logo.png"
              alt="ARMAG"
              width={640}
              height={640}
              draggable={false}
              className="w-full select-none drop-shadow-[0_0_40px_rgba(217,164,65,0.22)]"
              style={{
                // dissolve as bordas do quadro preto da imagem no fundo da página
                maskImage: "radial-gradient(closest-side, black 78%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(closest-side, black 78%, transparent 100%)",
              }}
            />
            <p className="-mt-3 font-brand text-[11px] font-semibold uppercase tracking-[0.55em] text-gold/80 sm:text-xs lg:-mt-5">
              Cobranças
            </p>
          </div>

          <h1 className="mt-8 hidden max-w-md text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] lg:block">
            Sua cobrança em <span className="text-gold-metal">outro nível.</span>
          </h1>
          <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-mist lg:block">
            Clientes, cobranças, recebimentos e relatórios em um só lugar — com controle total da sua operação.
          </p>

          <ul className="mt-8 hidden gap-3 lg:grid">
            <Feature icon={<ReceiptText />} text="Cobranças avulsas e parceladas" />
            <Feature icon={<Wallet />} text="Pagamentos parciais e controle de inadimplência" />
            <Feature icon={<BarChart3 />} text="Relatórios com exportação em PDF e Excel" />
          </ul>
        </section>

        {/* Formulário */}
        <section className="mx-auto w-full max-w-[420px]">
          <GlassCard>
            <header className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Área restrita</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">
                Bem-vindo de <span className="text-gold-metal">volta.</span>
              </h2>
              <p className="mt-1.5 text-sm text-mist">Entre com a sua conta para acessar o painel.</p>
            </header>

            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <DarkField label="E-mail" icon={<Mail />}>
                {(id) => (
                  <input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={inputClass}
                    autoFocus
                  />
                )}
              </DarkField>

              <DarkField
                label="Senha"
                icon={<Lock />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    className="grid size-9 place-items-center rounded-lg text-mist transition-colors hover:bg-white/5 hover:text-ice focus-visible:outline-2 focus-visible:outline-cyan"
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                }
              >
                {(id) => (
                  <input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(inputClass, "pr-12")}
                  />
                )}
              </DarkField>

              {error && <FormError id={errorId}>{error}</FormError>}

              <GoldButton loading={loading} loadingLabel="Entrando…">
                Entrar
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
              </GoldButton>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/5 pt-5 text-xs text-mist-600">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="size-4 text-cyan" />
                Conexão segura
              </span>
              <span className="whitespace-nowrap">Somente usuários autorizados</span>
            </div>
          </GlassCard>

          <p className="mt-6 text-center text-xs text-mist-600">
            © {new Date().getFullYear()} ARMAG · Gestão inteligente. Resultados reais.
          </p>
        </section>
      </div>
    </div>
  );
}
