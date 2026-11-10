import { ArrowRight, BarChart3, Eye, EyeOff, Lock, Mail, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
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
          <div className="glass-gold rounded-[28px] p-7 sm:p-9">
            {/* filete de luz no topo do card */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan/70 to-transparent"
            />

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

              {error && (
                <p
                  id={errorId}
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-[#ffb3ba]"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-danger shadow-[0_0_8px_#ff5d6c]" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "btn-gold group relative mt-1 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-bold tracking-wide",
                  "transition-[transform,filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_14px_40px_-12px_rgba(217,164,65,0.75)]",
                  "active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                  "disabled:cursor-wait disabled:opacity-80",
                )}
              >
                {/* reflexo que atravessa no hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent transition-[left] duration-700 group-hover:left-[120%]"
                />
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-ink/80 border-r-transparent" />
                    Entrando…
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/5 pt-5 text-xs text-mist-600">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="size-4 text-cyan" />
                Conexão segura
              </span>
              <span className="whitespace-nowrap">Somente usuários autorizados</span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-mist-600">
            © {new Date().getFullYear()} ARMAG · Gestão inteligente. Resultados reais.
          </p>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-[15px] text-ice placeholder:text-mist-600 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-white/20 focus:border-cyan/70 focus:bg-white/[0.05] focus:outline-none focus:shadow-[0_0_0_4px_rgba(53,221,251,0.12),0_0_24px_-6px_rgba(53,221,251,0.5)] " +
  "aria-[invalid=true]:border-danger/60";

function DarkField({
  label,
  icon,
  trailing,
  children,
}: {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-mist">
        {label}
      </label>
      <div className="group/field relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-mist-600 transition-colors group-focus-within/field:text-cyan [&_svg]:size-[18px]">
          {icon}
        </span>
        {children(id)}
        {trailing && <span className="absolute inset-y-0 right-1.5 grid place-items-center">{trailing}</span>}
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-ice/85">
      <span className="grid size-9 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold [&_svg]:size-[18px]">
        {icon}
      </span>
      {text}
    </li>
  );
}

/** Fundo: brilhos dourado/ciano, feixes diagonais e grade sutil. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(217,164,65,0.18),transparent_62%)]" />
      <div className="absolute -bottom-56 -left-40 size-[620px] rounded-full bg-[radial-gradient(circle,rgba(53,221,251,0.12),transparent_62%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* feixes de luz diagonais (só em telas grandes, para não cruzar o formulário) */}
      <div className="absolute -right-24 top-0 hidden h-[140%] lg:block w-px rotate-[32deg] origin-top bg-gradient-to-b from-transparent via-gold/50 to-transparent" />
      <div className="absolute right-24 top-0 hidden h-[140%] lg:block w-[2px] rotate-[32deg] origin-top bg-gradient-to-b from-transparent via-gold/25 to-transparent blur-[1px]" />
      <div className="absolute -left-10 bottom-0 hidden h-[90%] lg:block w-px -rotate-[32deg] origin-bottom bg-gradient-to-t from-transparent via-cyan/45 to-transparent" />
    </div>
  );
}
