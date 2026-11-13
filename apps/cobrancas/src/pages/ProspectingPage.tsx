import {
  AtSign,
  Building2,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Phone,
  Plus,
  Radar,
  Search,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, inputBase } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toaster";
import { useData } from "@/data/DataProvider";
import { PROSPECT_VIDEO_URL } from "@/config/prospeccao";
import { RepoError, type Lead, type LeadInput } from "@/data/types";
import { formatPhone, maskPhoneInput, validatePhone, whatsappLink } from "@/domain/phone";
import {
  DEFAULT_PROSPECT_MESSAGE,
  filterCandidates,
  googleMapsLink,
  instagramLink,
  LEAD_STATUSES,
  leadStatusLabel,
  renderProspectMessage,
  bairroDoEndereco,
  leadsDeHoje,
  SEARCH_RADIUS,
  type GeoPlace,
  type LeadStatus,
  type ProspectCandidate,
  type ProspectSegment,
} from "@/domain/prospect";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { geocodeCity, searchBusinesses } from "@/lib/osm";

type Tab = "leads" | "buscar";

const statusTone: Record<LeadStatus, string> = {
  novo: "border-cyan/30 bg-cyan/[0.08] text-cyan-300",
  contatado: "border-warning/40 bg-warning/10 text-warning",
  interessado: "border-gold/45 bg-gold/[0.12] text-gold-200",
  proposta: "border-gold/45 bg-gold/[0.12] text-gold-200",
  fechado: "border-success/40 bg-success/10 text-success",
  sem_interesse: "border-white/10 bg-white/[0.04] text-mist-600",
};

export function ProspectingPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("aba") === "buscar" ? "buscar" : "leads";
  const { leads } = useData();
  const [manualOpen, setManualOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  const setTab = (t: Tab) => setParams(t === "leads" ? {} : { aba: t }, { replace: true });

  return (
    <>
      <PageHeader
        title="Prospecção"
        description="Encontre barbearias sem site e acompanhe cada abordagem até virar cliente."
        actions={
          <>
            <Button variant="secondary" icon={<MessageSquareText />} onClick={() => setMessageOpen(true)}>
              Mensagem de apresentação
            </Button>
            <Button variant="secondary" icon={<Plus />} onClick={() => setManualOpen(true)}>
              Adicionar manualmente
            </Button>
          </>
        }
      />

      <div role="tablist" aria-label="Prospecção" className="mb-5 inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<Star />} label={`Meus leads (${leads.length})`} />
        <TabButton active={tab === "buscar"} onClick={() => setTab("buscar")} icon={<Radar />} label="Buscar empresas" />
      </div>

      {tab === "leads" ? <LeadsTab onSearch={() => setTab("buscar")} /> : <SearchTab />}

      <ManualLeadDialog open={manualOpen} onClose={() => setManualOpen(false)} />
      <MessageDialog open={messageOpen} onClose={() => setMessageOpen(false)} />
    </>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors [&_svg]:size-4",
        active ? "border-gold/50 bg-gold/[0.14] text-gold-200" : "border-transparent text-mist hover:text-ice",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

function SearchTab() {
  const { leads, saveLead } = useData();
  const toast = useToast();
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState<number>(SEARCH_RADIUS.default);
  const [places, setPlaces] = useState<GeoPlace[]>([]);
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [results, setResults] = useState<ProspectCandidate[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<ProspectSegment | "todos">("barbearia");
  const [onlyWithoutSite, setOnlyWithoutSite] = useState(true);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const savedRefs = useMemo(() => new Set(leads.map((l) => l.sourceRef).filter(Boolean)), [leads]);
  const visible = results ? filterCandidates(results, { segment, onlyWithoutSite, onlyWithPhone }) : [];
  const barberCount = results?.filter((r) => r.segment === "barbearia").length ?? 0;
  const barberNoSite = results?.filter((r) => r.segment === "barbearia" && !r.website).length ?? 0;

  const run = async (target: GeoPlace) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPlace(target);
    setStatus("loading");
    setError(null);
    try {
      setResults(await searchBusinesses(target, radius, ctrl.signal));
      setStatus("idle");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setStatus("error");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    setStatus("loading");
    setError(null);
    try {
      const found = await geocodeCity(city.trim());
      setPlaces(found);
      if (found.length === 0) {
        setError("Cidade não encontrada. Tente incluir o estado, ex.: Joinville, SC.");
        setStatus("error");
        return;
      }
      await run(found[0]);
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  };

  const save = async (c: ProspectCandidate) => {
    setSaving(c.ref);
    try {
      await saveLead({
        name: c.name,
        segment: c.segment,
        phone: c.phone && /^\d{10,11}$/.test(c.phone) ? c.phone : null,
        instagram: c.instagram,
        website: c.website,
        address: c.address,
        city: c.city,
        lat: c.lat,
        lon: c.lon,
        source: "osm",
        sourceRef: c.ref,
        status: "novo",
        notes: null,
        lastContactAt: null,
      });
      toast({ title: "Lead salvo", description: c.name });
    } catch (e) {
      toast({
        title: e instanceof RepoError && e.code === "duplicate" ? "Já está nos seus leads" : "Não foi possível salvar",
        description: c.name,
        tone: "warning",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Onde procurar" icon={<MapPin />}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end">
          <Field label="Cidade">
            {(id) => <Input id={id} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Joinville, SC" autoFocus />}
          </Field>
          <Field label={`Raio: ${radius} km`}>
            {(id) => (
              <input
                id={id}
                type="range"
                min={SEARCH_RADIUS.min}
                max={SEARCH_RADIUS.max}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-11 w-full accent-[#d9a441]"
              />
            )}
          </Field>
          <Button type="submit" size="lg" icon={status === "loading" ? <Loader2 className="animate-spin" /> : <Search />} disabled={status === "loading" || !city.trim()}>
            Buscar
          </Button>
        </form>
        {places.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-mist">
            <span>Não é essa?</span>
            {places.map((p) => (
              <button
                key={`${p.lat},${p.lon}`}
                onClick={() => void run(p)}
                className={cn(
                  "rounded-full border px-3 py-1 transition-colors",
                  place === p ? "border-gold/50 text-gold-200" : "border-white/10 hover:border-white/25 hover:text-ice",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-mist-600">
          Dados do OpenStreetMap (gratuito). Nem toda barbearia está cadastrada lá — para as que você encontrar no Google
          Maps ou no Instagram, use <b className="font-semibold text-mist">Adicionar manualmente</b>.
        </p>
      </Panel>

      {status === "error" && error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-[#ffb3ba]">
          {error}
        </p>
      )}

      {status === "loading" && (
        <div className="glass grid place-items-center rounded-2xl py-16 text-sm text-mist" role="status">
          <Loader2 className="mb-3 size-6 animate-spin text-gold" />
          Procurando empresas{place ? ` perto de ${place.label.split(", ")[0]}` : ""}…
        </div>
      )}

      {results && status !== "loading" && (
        <Panel
          title={`${barberCount} barbearia${barberCount === 1 ? "" : "s"} encontrada${barberCount === 1 ? "" : "s"} · ${barberNoSite} sem site`}
          icon={<Building2 />}
          bodyClassName="p-0 sm:p-0"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] p-4">
            {(
              [
                ["barbearia", "Barbearias"],
                ["salao", "Salões"],
                ["todos", "Todos"],
              ] as const
            ).map(([v, l]) => (
              <Chip key={v} active={segment === v} onClick={() => setSegment(v)}>
                {l}
              </Chip>
            ))}
            <span className="mx-1 h-5 w-px bg-white/10" />
            <Chip active={onlyWithoutSite} onClick={() => setOnlyWithoutSite((v) => !v)}>
              Só sem site
            </Chip>
            <Chip active={onlyWithPhone} onClick={() => setOnlyWithPhone((v) => !v)}>
              Só com telefone
            </Chip>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="Nenhuma empresa com esses filtros"
              description="Aumente o raio, troque os filtros ou procure em outra cidade."
            />
          ) : (
            <ul>
              {visible.map((c) => (
                <CandidateRow key={c.ref} c={c} saved={savedRefs.has(c.ref)} saving={saving === c.ref} onSave={() => void save(c)} />
              ))}
            </ul>
          )}
        </Panel>
      )}

      {!results && status === "idle" && (
        <Panel>
          <EmptyState
            icon={<Radar />}
            title="Comece pela cidade"
            description="Digite a cidade e o raio. Mostramos as barbearias da região e destacamos as que não têm site."
          />
        </Panel>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
        active ? "border-gold/50 bg-gold/[0.14] text-gold-200" : "border-white/10 text-mist hover:border-white/25 hover:text-ice",
      )}
    >
      {children}
    </button>
  );
}

function CandidateRow({ c, saved, saving, onSave }: { c: ProspectCandidate; saved: boolean; saving: boolean; onSave: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/[0.05] px-4 py-4 last:border-b-0 hover:bg-white/[0.02] md:px-5">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{c.name}</p>
          {c.website ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-mist-600">Tem site</span>
          ) : (
            <span className="rounded-full border border-gold/45 bg-gold/[0.12] px-2 py-0.5 text-[11px] font-semibold text-gold-200">Sem site</span>
          )}
          {c.segment === "salao" && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-mist-600">Salão</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mist">
          {c.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {c.address}
            </span>
          )}
          {c.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5" /> {formatPhone(c.phone)}
              {c.isMobile && <span className="text-success">· celular</span>}
            </span>
          )}
          {c.instagram && (
            <a href={instagramLink(c.instagram)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-cyan">
              <AtSign className="size-3.5" />
              {c.instagram}
            </a>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-cyan">
              <Globe className="size-3.5" /> site
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <a href={googleMapsLink(c.name, c.lat, c.lon)} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
          <ExternalLink /> Google Maps
        </a>
        <Button variant={saved ? "ghost" : "primary"} size="sm" icon={<Star />} loading={saving} disabled={saved} onClick={onSave}>
          {saved ? "Já é lead" : "Salvar lead"}
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

function LeadsTab({ onSearch }: { onSearch: () => void }) {
  const { leads, today } = useData();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<LeadStatus | "todos" | "hoje">(params.get("hoje") === "1" ? "hoje" : "todos");
  const deHoje = useMemo(() => leadsDeHoje(leads, today), [leads, today]);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const q = query.trim().toLowerCase();
  const base = filter === "hoje" ? deHoje : leads;
  const visible = base.filter(
    (l) => (filter === "todos" || filter === "hoje" || l.status === filter) && (!q || l.name.toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q)),
  );

  if (leads.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Star />}
          title="Nenhum lead ainda"
          description="Busque barbearias na sua cidade e salve as que não têm site — elas aparecem aqui para você abordar."
          action={
            <Button icon={<Radar />} onClick={onSearch}>
              Buscar empresas
            </Button>
          }
        />
      </Panel>
    );
  }

  return (
    <Panel title="Leads" icon={<Star />} bodyClassName="p-0 sm:p-0">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mist-600" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou cidade" className="pl-10" aria-label="Buscar lead" />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          <Chip active={filter === "hoje"} onClick={() => setFilter("hoje")}>
            Hoje {deHoje.length}
          </Chip>
          <Chip active={filter === "todos"} onClick={() => setFilter("todos")}>
            Todos {leads.length}
          </Chip>
          {LEAD_STATUSES.map((s) => (
            <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
              {leadStatusLabel[s]} {counts[s]}
            </Chip>
          ))}
        </div>
      </div>
      {filter === "hoje" && deHoje.length > 0 && (
        <div className="border-b border-white/[0.06] bg-gold/[0.06] px-4 py-3 text-sm md:px-5">
          <b className="font-semibold text-gold-200">Leads de hoje: {deHoje.length}.</b>{" "}
          <span className="text-mist">Toque em WhatsApp para abrir a mensagem pronta e anexe o vídeo nas barbearias e salões.</span>
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Nada encontrado"
          description={filter === "hoje" ? "Nenhum lead criado hoje. Fale \"Olá, Bob\" no iPhone ou busque empresas." : "Nenhum lead com esse filtro."}
          className="py-8"
        />
      ) : (
        <ul>
          {visible.map((l) => (
            <LeadRow key={l.id} lead={l} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const { today, settings, updateLead, deleteLead } = useData();
  const { displayName } = useAuth();
  const toast = useToast();
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const phoneOk = lead.phone ? validatePhone(lead.phone).ok : false;

  const contact = async () => {
    if (!lead.phone || !phoneOk) return;
    const text = renderProspectMessage(settings.prospectMessage ?? DEFAULT_PROSPECT_MESSAGE, {
      empresa: lead.name,
      cidade: lead.city,
      bairro: bairroDoEndereco(lead.address),
      segmento: lead.segment,
      meu_nome: settings.myName ?? displayName,
    });
    window.open(whatsappLink(lead.phone, text), "_blank", "noopener,noreferrer");
    // primeira abordagem: marca como contatado automaticamente
    await updateLead(lead.id, { lastContactAt: today, ...(lead.status === "novo" ? { status: "contatado" as LeadStatus } : {}) });
    toast({ title: "WhatsApp aberto", description: lead.status === "novo" ? "Lead marcado como contatado." : "Data do contato atualizada." });
  };

  const newClientHref = `/clientes/novo?${new URLSearchParams({ nome: lead.name, ...(lead.phone ? { whatsapp: lead.phone } : {}) })}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/[0.05] px-4 py-4 last:border-b-0 hover:bg-white/[0.02] md:px-5">
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{lead.name}</p>
          {!lead.website && <span className="rounded-full border border-gold/45 bg-gold/[0.12] px-2 py-0.5 text-[11px] font-semibold text-gold-200">Sem site</span>}
        </div>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-mist">
          {lead.city && <span>{lead.city}</span>}
          {lead.phone ? <span>{formatPhone(lead.phone)}</span> : <span className="text-mist-600">sem telefone</span>}
          {lead.lastContactAt && <span className="text-mist-600">último contato {formatDate(lead.lastContactAt)}</span>}
        </p>
        {lead.notes && <p className="mt-1 line-clamp-1 text-xs text-mist-600">{lead.notes}</p>}
      </div>

      <select
        aria-label={`Situação de ${lead.name}`}
        value={lead.status}
        onChange={(e) => void updateLead(lead.id, { status: e.target.value as LeadStatus })}
        className={cn("h-9 rounded-full border px-3 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-cyan/40", statusTone[lead.status])}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-ink-900 text-ice">
            {leadStatusLabel[s]}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="dark" size="sm" icon={<MessageCircle />} disabled={!phoneOk} title={phoneOk ? undefined : "Sem WhatsApp válido"} onClick={() => void contact()}>
          WhatsApp
        </Button>
        {(lead.segment === "barbearia" || lead.segment === "salao") && (
          <a href={PROSPECT_VIDEO_URL} target="_blank" rel="noreferrer" download className={buttonClass("ghost", "sm")} title="Vídeo de 23 s para anexar na mensagem">
            <Film /> Vídeo
          </a>
        )}
        {lead.instagram && (
          <a href={instagramLink(lead.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram" className={buttonClass("ghost", "sm")}>
            <AtSign />
          </a>
        )}
        {lead.lat !== null && lead.lon !== null && (
          <a href={googleMapsLink(lead.name, lead.lat, lead.lon)} target="_blank" rel="noreferrer" aria-label="Google Maps" className={buttonClass("ghost", "sm")}>
            <MapPin />
          </a>
        )}
        <Button variant="ghost" size="sm" icon={<NotebookPen />} aria-label={`Anotações de ${lead.name}`} onClick={() => setNotesOpen(true)} />
        {lead.status === "fechado" && (
          <Link to={newClientHref} className={buttonClass("primary", "sm")}>
            <UserPlus /> Virar cliente
          </Link>
        )}
        <Button variant="ghost" size="sm" icon={<Trash2 />} aria-label={`Excluir ${lead.name}`} onClick={() => setConfirmDelete(true)} />
      </div>

      <NotesDialog lead={lead} open={notesOpen} onClose={() => setNotesOpen(false)} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Excluir lead">
        <p className="text-sm">
          Excluir <b className="font-semibold">{lead.name}</b> dos leads?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 />}
            onClick={async () => {
              setConfirmDelete(false);
              await deleteLead(lead.id);
              toast({ title: "Lead excluído", description: lead.name, tone: "warning" });
            }}
          >
            Excluir
          </Button>
        </div>
      </Dialog>
    </li>
  );
}

function NotesDialog({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const { updateLead } = useData();
  const toast = useToast();
  const [notes, setNotes] = useState(lead.notes ?? "");
  return (
    <Dialog open={open} onClose={onClose} title={`Anotações · ${lead.name}`}>
      <textarea
        aria-label="Anotações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        className={cn(inputBase, "h-auto resize-y py-3")}
        placeholder="Ex.: falei com o dono, pediu para retornar na segunda; gostou da ideia de agendamento online…"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={async () => {
            await updateLead(lead.id, { notes: notes.trim() || null });
            toast({ title: "Anotações salvas" });
            onClose();
          }}
        >
          Salvar
        </Button>
      </div>
    </Dialog>
  );
}

function ManualLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { saveLead } = useData();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [city, setCity] = useState("");
  const [hasSite, setHasSite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setInstagram("");
    setCity("");
    setHasSite(false);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da empresa.");
    const v = phone ? validatePhone(phone) : null;
    if (v && !v.ok) return setError(v.error);
    setSaving(true);
    const input: LeadInput = {
      name: name.trim(),
      segment: "barbearia",
      phone: v?.ok ? v.national : null,
      instagram: instagram.trim().replace(/^@/, "") || null,
      website: hasSite ? "informado" : null,
      address: null,
      city: city.trim() || null,
      lat: null,
      lon: null,
      source: "manual",
      sourceRef: null,
      status: "novo",
      notes: null,
      lastContactAt: null,
    };
    try {
      await saveLead(input);
      toast({ title: "Lead adicionado", description: input.name });
      reset();
      onClose();
    } catch {
      setError("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Adicionar lead">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Nome da empresa">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp">
            {(id) => <Input id={id} prefix="+55" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhoneInput(e.target.value))} placeholder="(00) 00000-0000" />}
          </Field>
          <Field label="Instagram">{(id) => <Input id={id} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@barbearia" />}</Field>
        </div>
        <Field label="Cidade">{(id) => <Input id={id} value={city} onChange={(e) => setCity(e.target.value)} />}</Field>
        <label className="flex items-center gap-2 text-sm text-mist">
          <input type="checkbox" checked={hasSite} onChange={(e) => setHasSite(e.target.checked)} className="size-4 accent-[#d9a441]" />
          Essa empresa já tem site
        </label>
        {error && <p className="text-sm text-[#ff8f9a]">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} icon={<Plus />}>
            Adicionar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, saveSettings } = useData();
  const { displayName } = useAuth();
  const toast = useToast();
  const [text, setText] = useState(settings.prospectMessage ?? DEFAULT_PROSPECT_MESSAGE);
  const [myName, setMyName] = useState(settings.myName ?? displayName ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} title="Mensagem de apresentação" className="max-w-2xl">
      <p className="mb-4 text-sm text-mist">
        Usada no botão WhatsApp dos leads. Use <code className="text-gold-200">{"{empresa}"}</code>, <code className="text-gold-200">{"{cidade}"}</code> e{" "}
        <code className="text-gold-200">{"{meu_nome}"}</code>, que são trocados automaticamente. Inclua o link do seu portfólio, se tiver.
      </p>
      <Field label="Seu nome na mensagem">{(id) => <Input id={id} value={myName} onChange={(e) => setMyName(e.target.value)} />}</Field>
      <Field label="Mensagem" className="mt-4">
        {(id) => <textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={10} className={cn(inputBase, "h-auto resize-y py-3 text-[14px] leading-relaxed")} />}
      </Field>
      <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="eyebrow mb-2">Prévia</p>
        <p className="whitespace-pre-line text-sm text-ice/90">
          {renderProspectMessage(text, { empresa: "Barbearia Exemplo", cidade: "Joinville", meu_nome: myName })}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => setText(DEFAULT_PROSPECT_MESSAGE)}>
          Restaurar padrão
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveSettings({ prospectMessage: text.trim(), myName: myName.trim() || null });
                toast({ title: "Mensagem salva" });
                onClose();
              } catch {
                toast({ title: "Não foi possível salvar", tone: "warning" });
              } finally {
                setSaving(false);
              }
            }}
          >
            Salvar mensagem
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
