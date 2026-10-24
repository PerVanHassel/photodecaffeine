import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronDown, CircleAlert, CircleCheck, CircleDashed, CopyPlus, Eye, ListChecks, Lock, Plus, Send, Trash2,
  TriangleAlert, WandSparkles, X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { QuoteDocument, QuoteFonts } from "../../components/quote/QuoteDocument";
import {
  CHANNELS, addWorkdays, euroCents, lineTotal, percentTotal, sumLines, todayIso, vatSplit,
  type QuoteDetails, type QuoteDoc, type QuoteLicense, type QuoteLine, type Service,
} from "../../components/quote/model";
import { del, post, put } from "../api";
import { checkSummary, quoteChecklist, STATE_ORDER, type CheckItem, type CheckSection, type CheckState } from "../quotes/checklist";
import { defaultLicense, fromTemplate, TEMPLATES, type QuoteDraft, type TemplateId } from "../quotes/templates";
import { keys, useAction, useClients, useProjects, useQuoteBusiness, useQuotes } from "../queries";
import type { Business, Quote } from "../types";
import { Button, Empty, Field, Input, Pill, Segmented, Select, Skeleton, Textarea, useConfirm } from "../ui";
import { useUnsavedChanges } from "../unsaved";
import { QUOTE_STATUS } from "./Money";
import { SendQuoteDialog } from "./SendQuoteDialog";
import "./quotebuilder.css";

/**
 * The quote builder: fill in on the left, the quote as the client will see it
 * in the middle, and on the right a checklist of everything a quote has to
 * say before it goes out. Clicking a point in the list opens the part of the
 * form it is about.
 */

// ---------------------------------------------------------------------------
// Draft <-> quote
// ---------------------------------------------------------------------------

function fromQuote(q: Quote): QuoteDraft {
  const details: QuoteDetails = { ...(q.details || {}) };
  if (!details.services?.length) details.services = [q.type === "photo" ? "photo" : "web"];
  return {
    type: q.type, title: q.title, subtitle: q.subtitle, clientId: q.clientId, clientName: q.clientName, clientEmail: q.clientEmail,
    projectId: q.projectId, intro: q.intro, oneTime: q.oneTime.map((l) => ({ ...l })), monthly: q.monthly.map((l) => ({ ...l })),
    included: [...q.included], terms: q.terms.map((t) => ({ ...t })), notes: q.notes, validUntil: q.validUntil,
    vatBasis: q.vatBasis, vatRate: q.vatRate, details,
  };
}

/** A new version of a quote: the same content, a fresh date, and it retires the old one when sent. */
function newVersion(q: Quote): QuoteDraft {
  const d = fromQuote(q);
  const { accepted: _a, issuedOn: _i, ...details } = d.details;
  return { ...d, validUntil: addWorkdays(todayIso(), 10), details: { ...details, replaces: { id: q.id, number: q.number } } };
}

/** What goes to the server: empty rows dropped, the type taken from the services. */
function toBody(d: QuoteDraft) {
  const s = d.details.services || [];
  const keep = (xs: string[] | undefined) => (xs || []).map((x) => x.trim()).filter(Boolean);
  const details: QuoteDetails = {
    ...d.details,
    excluded: keep(d.details.excluded),
    extraCosts: keep(d.details.extraCosts),
    clientDelivers: keep(d.details.clientDelivers),
    openPoints: keep(d.details.openPoints),
    ...(d.details.maintenance ? { maintenance: { ...d.details.maintenance, covers: keep(d.details.maintenance.covers) } } : {}),
    ...(d.details.ownership ? { ownership: { ...d.details.ownership, rows: d.details.ownership.rows.filter((r) => r.what.trim()) } } : {}),
  };
  const lines = (ls: QuoteLine[]) => ls.filter((l) => l.label.trim()).map((l) => ({ ...l, label: l.label.trim(), note: (l.note || "").trim(), amount: lineTotal(l) }));
  return {
    ...d,
    type: s.includes("web") || s.length === 0 ? "web" : "photo",
    oneTime: lines(d.oneTime),
    monthly: lines(d.monthly),
    included: keep(d.included),
    terms: d.terms.filter((t) => t.label.trim() || t.text.trim()),
    details,
    projectId: d.projectId || null,
    clientId: d.clientId || null,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function QuoteBuilderPage() {
  const { id = "new" } = useParams();
  const [params] = useSearchParams();
  const quotes = useQuotes();
  const business = useQuoteBusiness();

  if (quotes.isLoading) {
    return (
      <div className="qb" role="status" aria-busy="true">
        <span className="s-sr">Laden…</span>
        <div className="qb-top"><Skeleton h={18} w={240} /></div>
        <div className="qb-body"><div className="qb-form" /><div className="qb-stage"><Skeleton h={640} r={24} /></div></div>
      </div>
    );
  }
  const quote = id === "new" ? null : (quotes.data || []).find((q) => q.id === id) || null;
  if (id !== "new" && !quote) {
    return (
      <div className="s-view narrow">
        <Empty title="Deze offerte bestaat niet (meer)" action={<Link className="s-btn" to="/admin/quotes">Naar de offertes</Link>} />
      </div>
    );
  }
  const source = !quote && params.get("from") ? (quotes.data || []).find((q) => q.id === params.get("from")) || null : null;
  return (
    <Builder
      key={id}
      quote={quote}
      source={source}
      defaults={{ projectId: params.get("projectId") || "", clientId: params.get("clientId") || "" }}
      business={business.data ?? null}
      all={quotes.data || []}
    />
  );
}

type View = "form" | "preview" | "check";

function Builder({ quote, source, defaults, business, all }: {
  quote: Quote | null; source: Quote | null; defaults: { projectId?: string; clientId?: string }; business: Business | null; all: Quote[];
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const clients = useClients();
  const projects = useProjects();

  const initial = useMemo(() => (quote ? fromQuote(quote) : source ? newVersion(source) : fromTemplate("web", defaults)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [d, setD] = useState<QuoteDraft>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(d) !== saved;
  useUnsavedChanges(dirty);

  const [openSecs, setOpenSecs] = useState<Set<string>>(() => new Set(quote || source ? [] : ["basis"]));
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<View>("form");
  const [sending, setSending] = useState<Quote | null>(null);
  const [goTo, setGoTo] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  // A new quote gets its own address once it is saved, without the
  // "unsaved changes" question: that waits until the saved state has landed.
  useEffect(() => {
    if (goTo && !dirty) navigate(goTo, { replace: true });
  }, [goTo, dirty, navigate]);

  const set = <K extends keyof QuoteDraft>(k: K, v: QuoteDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setDetail = <K extends keyof QuoteDetails>(k: K, v: QuoteDetails[K]) => setD((x) => ({ ...x, details: { ...x.details, [k]: v } }));

  // Picking a client fills in the name, address and company the quote goes to.
  useEffect(() => {
    if (!d.clientId || !clients.data) return;
    const c = clients.data.find((x) => x.id === d.clientId);
    if (!c) return;
    setD((x) => ({
      ...x,
      clientName: x.clientName || c.name,
      clientEmail: x.clientEmail || c.email,
      details: { ...x.details, client: { ...x.details.client, company: x.details.client?.company || c.company, phone: x.details.client?.phone || c.phone } },
    }));
  }, [d.clientId, clients.data]);

  const doc: QuoteDoc = { ...d, number: quote?.number, status: quote?.status, sentAt: quote?.sentAt, createdAt: quote?.createdAt };
  const items = useMemo(() => quoteChecklist(doc, business), [JSON.stringify(doc), business]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = checkSummary(items);
  const worst = (section: CheckSection): CheckState | null => {
    const mine = items.filter((i) => i.section === section);
    if (!mine.length) return null;
    return mine.reduce<CheckState>((w, i) => (STATE_ORDER[i.state] < STATE_ORDER[w] ? i.state : w), "ok");
  };

  // The part of the preview that belongs to what is being edited scrolls into view.
  useEffect(() => {
    if (!active || !stage.current) return;
    const target = stage.current.querySelector(`[data-section="${active}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  function openSection(id: CheckSection) {
    setOpenSecs((s) => new Set(s).add(id));
    setActive(id);
    setView("form");
    requestAnimationFrame(() => document.getElementById(`qb-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const toggle = (id: string) => setOpenSecs((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  function fix(item: CheckItem) {
    if (item.fix === "validUntil") set("validUntil", addWorkdays(todayIso(), 10));
    if (item.fix === "vatIncl") setD((x) => ({ ...x, vatBasis: "incl" }));
  }

  function applyTemplate(t: TemplateId) {
    const next = fromTemplate(t, defaults);
    setD((x) => {
      const holder = x.details.client?.company || x.clientName;
      return {
        ...next,
        clientId: x.clientId, clientName: x.clientName, clientEmail: x.clientEmail, projectId: x.projectId,
        details: {
          ...next.details,
          client: x.details.client,
          audience: x.details.audience ?? next.details.audience,
          ...(next.details.license ? { license: { ...next.details.license, holder: next.details.license.holder || holder } } : {}),
        },
      };
    });
  }

  const save = useAction({
    fn: (_send: boolean) => (quote ? put<{ quote: Quote }>(`/admin/quotes/${quote.id}`, toBody(d)) : post<{ quote: Quote }>("/admin/quotes", toBody(d))),
    invalidate: () => [keys.quotes, keys.overview, keys.projects],
    success: (_r, send) => (send ? null : "Offerte opgeslagen"),
    onSuccess: (r, send) => {
      setSaved(JSON.stringify(d));
      if (!quote) {
        // Put it in the list straight away, so its own page finds it.
        qc.setQueryData<{ quotes: Quote[]; business?: Business }>(keys.quotes, (old) => (old ? { ...old, quotes: [r.quote, ...old.quotes] } : old));
        setGoTo(`/admin/quote/${r.quote.id}`);
      }
      if (send) setSending(r.quote);
    },
  });
  const remove = useAction({
    fn: () => del(`/admin/quotes/${quote!.id}`),
    invalidate: () => [keys.quotes],
    success: "Offerte verwijderd",
    onSuccess: () => { setSaved(JSON.stringify(d)); setGoTo("/admin/quotes"); },
  });

  async function submit(send: boolean) {
    if (!d.title.trim()) return openSection("basis");
    const blocking = summary.error + summary.todo;
    if (send && blocking > 0) {
      const ok = await confirm({
        title: `Nog ${blocking} ${blocking === 1 ? "punt" : "punten"} open`,
        body: "De checklist is nog niet helemaal groen. Weet je zeker dat de offerte zo de deur uit kan?",
        confirm: "Toch versturen",
      });
      if (!ok) return setView("check");
    }
    save.mutate(send);
  }

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!save.isPending) void submit(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const services = d.details.services || [];
  const web = services.includes("web");
  const media = services.includes("photo") || services.includes("video");
  const otherQuotes = all.filter((q) => q.id !== quote?.id && (!d.clientId || q.clientId === d.clientId || q.clientEmail === d.clientEmail));
  const sec = (id: CheckSection, title: string, sub: string, children: ReactNode) => (
    <Section id={id} title={title} sub={sub} state={worst(id)} open={openSecs.has(id)} onToggle={() => toggle(id)} onFocus={() => setActive(id)}>
      {children}
    </Section>
  );
  const ready = summary.error === 0 && summary.todo === 0;
  const previewLink = quote?.link && quote.status !== "draft" ? `${new URL(quote.link).pathname}${new URL(quote.link).search}&preview=1` : null;

  return (
    <div className="qb" data-view={view}>
      <QuoteFonts />
      <header className="qb-top">
        <Link to="/admin/quotes" className="s-btn ghost sm icon" aria-label="Terug naar de offertes"><ArrowLeft size={15} /></Link>
        <div className="qb-name">
          <span className="s-row nowrap" style={{ gap: 6 }}>
            <b className="s-mono">{quote?.number || "Nieuwe offerte"}</b>
            {quote && <Pill tone={QUOTE_STATUS[quote.status].tone}>{QUOTE_STATUS[quote.status].label}</Pill>}
            {dirty && <span className="s-faint s-small">niet opgeslagen</span>}
          </span>
          <span className="s-truncate s-small s-muted">{d.title || "Zonder titel"}{d.clientName ? ` · ${d.clientName}` : ""}</span>
        </div>
        <div className="qb-tabs" role="tablist" aria-label="Weergave">
          {([["form", "Invullen"], ["preview", "Voorbeeld"], ["check", `Checklist ${summary.ok}/${summary.total}`]] as [View, string][]).map(([v, label]) => (
            <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)}>{label}</button>
          ))}
        </div>
        <button type="button" className={`qb-meter ${ready ? "ok" : summary.error ? "bad" : "warn"}`} onClick={() => setView(view === "check" ? "form" : "check")} title="Checklist">
          <Ring value={summary.total ? summary.ok / summary.total : 0} />
          <span><b>{summary.ok}</b>/{summary.total}</span>
        </button>
        <div className="qb-actions">
          {quote && quote.status !== "draft" && (
            <Button size="sm" variant="ghost" icon={<CopyPlus />} onClick={() => navigate(`/admin/quote/new?from=${quote.id}`)}>Nieuwe versie</Button>
          )}
          {previewLink && <a className="s-btn ghost sm" href={previewLink} target="_blank" rel="noreferrer"><Eye size={15} />Als klant</a>}
          <Button size="sm" onClick={() => submit(false)} loading={save.isPending && save.variables === false} disabled={!dirty && !!quote}>Opslaan</Button>
          <Button size="sm" variant="primary" icon={<Send />} onClick={() => submit(true)} loading={save.isPending && save.variables === true}>
            <span className="qb-long">{quote?.sentAt ? "Opslaan en opnieuw versturen" : "Opslaan en versturen"}</span><span className="qb-short">Versturen</span>
          </Button>
        </div>
      </header>

      <div className="qb-body">
        {/* ── Form ── */}
        <aside className="qb-form" aria-label="Invullen">
          {quote?.status === "replaced" && <div className="qb-banner warn">Deze offerte is vervangen door een nieuwere. De klant kan hem niet meer accepteren.</div>}
          {d.details.replaces?.number && quote?.status !== "replaced" && (
            <div className="qb-banner">Vervangt <b className="s-mono">{d.details.replaces.number}</b>. Zodra je deze verstuurt, kan de klant de oude niet meer accepteren.</div>
          )}

          {sec("basis", "Basis", services.length ? services.map((s) => ({ web: "Website", photo: "Foto", video: "Video" })[s]).join(" + ") : "Soort werk en titel", (
            <>
              {!quote && (
                <Field label="Begin met">
                  <div className="qb-templates">
                    {TEMPLATES.map((t) => (
                      <button key={t.id} type="button" className="qb-template" onClick={async () => {
                        if (dirty && !(await confirm({ title: `Sjabloon ${t.label.toLowerCase()} gebruiken?`, body: "Wat je hebt ingevuld, behalve de klant, wordt vervangen.", confirm: "Gebruiken" }))) return;
                        applyTemplate(t.id);
                      }}>
                        <b>{t.label}</b><span>{t.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              <Field label="Soort werk" hint="Bepaalt welke afspraken erop moeten.">
                <div className="qb-chips">
                  {(["web", "photo", "video"] as Service[]).map((s) => {
                    const on = services.includes(s);
                    return (
                      <button key={s} type="button" aria-pressed={on} onClick={() => setDetail("services", on ? services.filter((x) => x !== s) : [...services, s])}>
                        {{ web: "Website", photo: "Fotografie", video: "Video" }[s]}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Klant is">
                <Segmented label="Klant is" value={d.details.audience || "business"} onChange={(a) => setD((x) => ({ ...x, vatBasis: a === "consumer" ? "incl" : x.vatBasis, details: { ...x.details, audience: a } }))}
                  options={[{ value: "business", label: "Zakelijk" }, { value: "consumer", label: "Particulier" }]} />
              </Field>
              <Text label="Titel" value={d.title} onChange={(v) => set("title", v)} placeholder="Bijv. Website voor Suroh" />
              <Text label="Ondertitel" value={d.subtitle} onChange={(v) => set("subtitle", v)} placeholder="Eén zin over wat het is" />
              <div className="qb-grid">
                <Field label="Vervangt" htmlFor="qb-replaces" hint="Een oudere offerte die hiermee vervalt.">
                  <Select id="qb-replaces" value={d.details.replaces?.id || ""} onChange={(e) => {
                    const q = all.find((x) => x.id === e.target.value);
                    setDetail("replaces", q ? { id: q.id, number: q.number } : null);
                  }}>
                    <option value="">Niets</option>
                    {otherQuotes.map((q) => <option key={q.id} value={q.id}>{q.number} · {q.title}</option>)}
                  </Select>
                </Field>
                <Text label="Referentie" value={d.details.reference || ""} onChange={(v) => setDetail("reference", v)} placeholder="Optioneel" />
              </div>
            </>
          ))}

          {sec("client", "Klant", d.details.client?.company || d.clientName || "Voor wie", (
            <>
              <div className="qb-grid">
                <Field label="Klant in het systeem" htmlFor="qb-client">
                  <Select id="qb-client" value={d.clientId} onChange={(e) => set("clientId", e.target.value)}>
                    <option value="">Geen</option>
                    {(clients.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
                  </Select>
                </Field>
                <Field label="Project" htmlFor="qb-project">
                  <Select id="qb-project" value={d.projectId} onChange={(e) => set("projectId", e.target.value)}>
                    <option value="">Geen</option>
                    {(projects.data || []).filter((p) => p.stage !== "archived").map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </Select>
                </Field>
                {d.details.audience !== "consumer" && <Text label="Bedrijf" value={d.details.client?.company || ""} onChange={(v) => setDetail("client", { ...d.details.client, company: v })} />}
                <Text label={d.details.audience === "consumer" ? "Naam" : "Contactpersoon"} value={d.clientName} onChange={(v) => set("clientName", v)} />
                <Text label="E-mail" type="email" value={d.clientEmail} onChange={(v) => set("clientEmail", v)} />
                <Text label="Telefoon" value={d.details.client?.phone || ""} onChange={(v) => setDetail("client", { ...d.details.client, phone: v })} />
              </div>
              <Area label="Adres" rows={2} value={d.details.client?.address || ""} onChange={(v) => setDetail("client", { ...d.details.client, address: v })} placeholder={"Straat en huisnummer\nPostcode en plaats"} />
              <div className="qb-grid">
                <Text label="Land" value={d.details.client?.country || ""} onChange={(v) => setDetail("client", { ...d.details.client, country: v })} placeholder="Nederland" />
                <Text label="Btw-nummer klant" value={d.details.client?.vatId || ""} onChange={(v) => setDetail("client", { ...d.details.client, vatId: v })} placeholder="Alleen bij buitenland" />
              </div>
            </>
          ))}

          {sec("intro", "Inleiding", d.intro ? "Ingevuld" : "Waar het over gaat", (
            <Area label="Inleiding" rows={4} value={d.intro} onChange={(v) => set("intro", v)} placeholder="Bijv. Zoals besproken op 21 oktober…" />
          ))}

          {sec("problem", "Wat het oplevert", d.details.problem ? "Ingevuld" : "Het probleem dat je oplost", (
            <Area label="Wat de klant ermee wint" rows={3} value={d.details.problem || ""} onChange={(v) => setDetail("problem", v)}
              hint="In de woorden van de klant. Niet wat je maakt, maar wat het oplost." placeholder="Bijv. Wie je werk ziet, weet meteen: zij is de persoon die we bellen." />
          ))}

          {sec("scope", "Wat je krijgt", `${d.included.filter(Boolean).length} punten, ${(d.details.excluded || []).filter(Boolean).length} niet`, (
            <>
              <StringList label="Inbegrepen" items={d.included} onChange={(v) => set("included", v)} placeholder="Bijv. Beheeromgeving voor je eigen teksten" />
              <StringList label="Niet inbegrepen" items={d.details.excluded || []} onChange={(v) => setDetail("excluded", v)} placeholder="Bijv. Teksten schrijven" />
            </>
          ))}

          {sec("price", "Prijs", priceSummary(d), (
            <>
              <div className="qb-grid">
                <Field label="Bedragen zijn">
                  <Segmented label="Bedragen zijn" value={d.vatBasis} onChange={(v) => set("vatBasis", v)} options={[{ value: "excl", label: "Excl. btw" }, { value: "incl", label: "Incl. btw" }]} />
                </Field>
                <Field label="Btw" htmlFor="qb-vat">
                  <Select id="qb-vat" value={String(d.vatRate)} onChange={(e) => set("vatRate", Number(e.target.value))}>
                    <option value="21">21%</option><option value="9">9%</option><option value="0">0% (verlegd of vrijgesteld)</option>
                  </Select>
                </Field>
              </div>
              <LineList label="Eenmalig" lines={d.oneTime} onChange={(v) => set("oneTime", v)} basis={d.vatBasis} rate={d.vatRate} />
              <LineList label="Per maand" lines={d.monthly} onChange={(v) => set("monthly", v)} basis={d.vatBasis} rate={d.vatRate} perMonth />
              <StringList label="Komt er nog bij" items={d.details.extraCosts || []} onChange={(v) => setDetail("extraCosts", v)} placeholder="Bijv. Hosting en domein, doorbelast zonder opslag" />
            </>
          ))}

          {sec("payment", "Betaling", paymentSummary(d), (
            <PaymentEditor d={d} onChange={(p) => setDetail("payment", p)} />
          ))}

          {sec("planning", "Planning en samenwerking", d.details.revisions ? (d.details.revisions.untilRight ? "Tot het klopt" : `${d.details.revisions.rounds} revisierondes`) : "Wanneer en wie wat doet", (
            <>
              <Area label="Planning" rows={3} value={d.details.planning || ""} onChange={(v) => setDetail("planning", v)} placeholder="Wanneer je start, wanneer het klaar is, en waar dat van afhangt" />
              <StringList label="Jij levert aan" items={d.details.clientDelivers || []} onChange={(v) => setDetail("clientDelivers", v)} placeholder="Bijv. Teksten" />
              {(web || services.includes("video") || d.details.revisions) && (
                <div className="qb-grid">
                  <Field label="Revisies">
                    <Segmented label="Revisies" value={d.details.revisions?.untilRight ? "until" : "rounds"}
                      onChange={(v) => setDetail("revisions", { rounds: d.details.revisions?.rounds || 3, feedbackDays: d.details.revisions?.feedbackDays || 10, untilRight: v === "until" })}
                      options={[{ value: "rounds", label: "Aantal rondes" }, { value: "until", label: "Tot het klopt" }]} />
                  </Field>
                  {!d.details.revisions?.untilRight && (
                    <NumberField label="Rondes na eerste ontwerp" value={d.details.revisions?.rounds ?? 3} onChange={(n) => setDetail("revisions", { untilRight: false, feedbackDays: d.details.revisions?.feedbackDays || 10, rounds: n })} />
                  )}
                  <NumberField label="Feedback binnen (werkdagen)" value={d.details.revisions?.feedbackDays ?? 10} onChange={(n) => setDetail("revisions", { untilRight: !!d.details.revisions?.untilRight, rounds: d.details.revisions?.rounds || 3, feedbackDays: n })} />
                </div>
              )}
            </>
          ))}

          {web && sec("maintenance", "Onderhoud", d.details.maintenance ? "Ingevuld" : "Wat het onderhoud dekt", (
            d.details.maintenance ? (
              <>
                <StringList label="Wat het dekt" items={d.details.maintenance.covers} onChange={(v) => setDetail("maintenance", { ...d.details.maintenance!, covers: v })} />
                <Area label="Een kleine wijziging is" rows={3} value={d.details.maintenance.smallChange} onChange={(v) => setDetail("maintenance", { ...d.details.maintenance!, smallChange: v })} />
                <Area label="Valt er niet onder" rows={2} value={d.details.maintenance.excluded} onChange={(v) => setDetail("maintenance", { ...d.details.maintenance!, excluded: v })} />
                <Area label="Opzeggen" rows={2} value={d.details.maintenance.cancel} onChange={(v) => setDetail("maintenance", { ...d.details.maintenance!, cancel: v })} />
              </>
            ) : <FillIn onClick={() => setDetail("maintenance", fromTemplate("web").details.maintenance)}>Standaardafspraken voor onderhoud invullen</FillIn>
          ))}

          {(web || media) && sec("rights", web ? "Eigendom en rechten" : "Gebruiksrechten", rightsSummary(d), (
            <>
              {web && (d.details.ownership ? <OwnershipEditor d={d} onChange={(o) => setDetail("ownership", o)} /> : (
                <FillIn onClick={() => setDetail("ownership", fromTemplate("web").details.ownership)}>Standaardafspraken over eigendom invullen</FillIn>
              ))}
              {media && (d.details.license ? <LicenseEditor value={d.details.license} onChange={(l) => setDetail("license", l)} /> : (
                <FillIn onClick={() => setDetail("license", defaultLicense(d.details.client?.company || d.clientName))}>Standaardlicentie invullen</FillIn>
              ))}
            </>
          ))}

          {sec("aftercare", "Nazorg en meerwerk", d.details.extraWork?.hourly ? `${euroCents(d.details.extraWork.hourly)} per uur` : "Na de oplevering", (
            <>
              <div className="qb-grid">
                <NumberField label="Gratis nazorg (dagen)" value={d.details.aftercare?.days ?? 0} onChange={(n) => setDetail("aftercare", { note: d.details.aftercare?.note || "", days: n })} />
                <MoneyField label={`Uurtarief meerwerk (${d.vatBasis === "incl" ? "incl." : "excl."} btw)`} value={d.details.extraWork?.hourly ?? null} onChange={(n) => setDetail("extraWork", { note: d.details.extraWork?.note || "", hourly: n ?? 0 })} />
              </div>
              <Area label="Nazorg in eigen woorden (optioneel)" rows={3} value={d.details.aftercare?.note || ""} onChange={(v) => setDetail("aftercare", { days: d.details.aftercare?.days || 0, note: v })}
                hint="Leeg laten geeft een standaardzin met het aantal dagen." />
            </>
          ))}

          {sec("terms", "Afspraken en geldigheid", d.validUntil ? `Geldig tot ${new Date(`${d.validUntil}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` : "Geldig tot", (
            <>
              <div className="qb-grid">
                <Field label="Geldig tot" htmlFor="qb-valid">
                  <div className="s-row nowrap">
                    <Input id="qb-valid" type="date" value={d.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
                    <Button size="sm" variant="ghost" onClick={() => set("validUntil", addWorkdays(todayIso(), 10))}>10 werkdagen</Button>
                  </div>
                </Field>
                <Text label="Algemene voorwaarden" value={d.details.termsVersion || ""} onChange={(v) => setDetail("termsVersion", v)} placeholder="Bijv. versie 1.1" hint="Pas invullen als ze op de site staan." />
              </div>
              <PairList label="Overige afspraken" rows={d.terms.map((t) => ({ a: t.label, b: t.text }))} onChange={(rows) => set("terms", rows.map((r) => ({ label: r.a, text: r.b })))} aLabel="Kopje" bLabel="Afspraak" />
              <Area label="Slotzin" rows={2} value={d.notes} onChange={(v) => set("notes", v)} placeholder="Vragen, of wil je iets anders? Laat het weten." />
            </>
          ))}

          {sec("open", "Open punten", (d.details.openPoints || []).filter(Boolean).length ? `${(d.details.openPoints || []).filter(Boolean).length} nog uitzoeken` : "Alleen voor jou", (
            <>
              <p className="s-small s-muted qb-lock"><Lock size={13} /> De klant ziet dit niet. Elk punt staat in de checklist tot je het weghaalt.</p>
              <StringList label="Nog uitzoeken" items={d.details.openPoints || []} onChange={(v) => setDetail("openPoints", v)} placeholder="Bijv. Maandkosten nakijken met de Be Hosted-inlog" />
            </>
          ))}

          {quote && (
            <div className="qb-danger">
              <Button variant="danger" size="sm" icon={<Trash2 />} loading={remove.isPending}
                onClick={async () => { if (await confirm({ title: "Offerte verwijderen?", body: "De link naar deze offerte werkt daarna niet meer.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>
                Offerte verwijderen
              </Button>
            </div>
          )}
        </aside>

        {/* ── Preview ── */}
        <div className="qb-stage" ref={stage} aria-label="Voorbeeld">
          <div className="qb-paper">
            <QuoteDocument quote={doc} business={business} activeSection={active} />
          </div>
        </div>

        {/* ── Checklist ── */}
        <aside className="qb-check" aria-label="Checklist">
          <Checklist items={items} onJump={openSection} onFix={fix} />
        </aside>
      </div>

      <SendQuoteDialog quote={sending} onClose={() => setSending(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summaries for the closed sections
// ---------------------------------------------------------------------------

function priceSummary(d: QuoteDraft) {
  const one = sumLines(d.oneTime, "o");
  const month = sumLines(d.monthly, "m");
  const side = d.vatBasis === "incl" ? "incl." : "excl.";
  return [one ? `${euroCents(one)} ${side}` : "", month ? `${euroCents(month)} p/m` : ""].filter(Boolean).join(" + ") || "Nog geen bedragen";
}

function paymentSummary(d: QuoteDraft) {
  const steps = d.details.payment?.steps || [];
  if (!steps.length) return "Nog geen betaalmomenten";
  return `${steps.map((s) => `${s.percent}%`).join(" / ")} · ${d.details.payment?.termDays || "?"} dagen`;
}

function rightsSummary(d: QuoteDraft) {
  const own = d.details.ownership;
  const parts = [];
  if (own) parts.push(own.model === "buy" ? "Klant koopt" : own.buyout ? `Huur, afkoop ${euroCents(own.buyout)}` : "Huur, afkoop nog leeg");
  if (d.details.license?.holder) parts.push(`Licentie: ${d.details.license.holder}`);
  return parts.join(" · ") || "Van wie wat is";
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({ id, title, sub, state, open, onToggle, onFocus, children }: {
  id: string; title: string; sub: string; state: CheckState | null; open: boolean; onToggle: () => void; onFocus: () => void; children: ReactNode;
}) {
  return (
    <section id={`qb-${id}`} className="qb-sec" data-open={open || undefined}>
      <button type="button" className="qb-sec-head" aria-expanded={open} onClick={() => { onToggle(); onFocus(); }}>
        <StateDot state={state} />
        <span className="qb-sec-title"><b>{title}</b><span className="s-truncate">{sub}</span></span>
        <ChevronDown size={16} className="qb-chev" />
      </button>
      {open && <div className="qb-sec-body" onFocusCapture={onFocus}>{children}</div>}
    </section>
  );
}

function StateDot({ state }: { state: CheckState | null }) {
  return <span className={`qb-dot ${state || "none"}`} aria-label={state ? { ok: "In orde", warn: "Nakijken", todo: "Nog open", error: "Fout" }[state] : undefined} />;
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === "ok") return <CircleCheck size={16} className="qb-si ok" aria-label="In orde" />;
  if (state === "warn") return <TriangleAlert size={16} className="qb-si warn" aria-label="Nakijken" />;
  if (state === "todo") return <CircleDashed size={16} className="qb-si todo" aria-label="Nog open" />;
  return <CircleAlert size={16} className="qb-si error" aria-label="Fout" />;
}

function Ring({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle cx="11" cy="11" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 11 11)" style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.32,0.72,0,1)" }} />
    </svg>
  );
}

function Checklist({ items, onJump, onFix }: { items: CheckItem[]; onJump: (s: CheckSection) => void; onFix: (i: CheckItem) => void }) {
  const s = checkSummary(items);
  const groups = ["Gegevens", "Wat je krijgt", "Prijs", "Afspraken", "Rechten", "Versturen"] as const;
  const [hideOk, setHideOk] = useState(false);
  const ready = s.error === 0 && s.todo === 0;
  return (
    <div className="qb-check-inner">
      <div className={`qb-ready ${ready ? "ok" : s.error ? "bad" : "warn"}`}>
        <Ring value={s.total ? s.ok / s.total : 0} />
        <div>
          <b>{ready ? (s.warn ? "Klaar om te versturen, met een paar aandachtspunten" : "Klaar om te versturen") : s.error ? `${s.error} ${s.error === 1 ? "fout" : "fouten"} om op te lossen` : `${s.todo} ${s.todo === 1 ? "punt" : "punten"} nog open`}</b>
          <span>{s.ok} van {s.total} in orde{s.warn ? `, ${s.warn} nakijken` : ""}</span>
        </div>
      </div>
      <div className="s-row between">
        <span className="s-eyebrow"><ListChecks size={13} /> Wat er op moet</span>
        <button type="button" className="s-btn ghost sm" onClick={() => setHideOk(!hideOk)}>{hideOk ? "Alles tonen" : "Verberg wat klopt"}</button>
      </div>
      {groups.map((g) => {
        const mine = items.filter((i) => i.group === g && (!hideOk || i.state !== "ok"));
        if (!mine.length) return null;
        return (
          <div key={g} className="qb-group">
            <h3>{g}</h3>
            <ul>
              {mine.map((i) => (
                <li key={i.id} className={`qb-item ${i.state}`}>
                  <button type="button" onClick={() => onJump(i.section)}>
                    <StateIcon state={i.state} />
                    <span><b>{i.label}</b>{i.hint && <small>{i.hint}</small>}</span>
                  </button>
                  {i.fix && <Button size="sm" variant="ghost" icon={<WandSparkles />} onClick={() => onFix(i)}>Herstel</Button>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function FillIn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="qb-fillin" onClick={onClick}><WandSparkles size={15} />{children}</button>;
}

function Text({ label, value, onChange, hint, ...rest }: { label: string; value: string; onChange: (v: string) => void; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return <Field label={label} hint={hint} htmlFor={id}><Input id={id} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} {...rest} /></Field>;
}

function Area({ label, value, onChange, hint, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number; placeholder?: string }) {
  const id = useId();
  return <Field label={label} hint={hint} htmlFor={id}><Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></Field>;
}

const fmtMoney = (v: number | null | undefined) => (v == null || v === 0 ? "" : String(v).replace(".", ","));
function parseMoney(s: string): number | null | undefined {
  const t = s.trim().replace(/€|\s/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

/** A money field that lets you type "1.250,50" and hands back a number as you go. */
function MoneyInput({ value, onChange, ...rest }: { value: number | null | undefined; onChange: (n: number | null) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(fmtMoney(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(fmtMoney(value)); }, [value]);
  return (
    <Input
      inputMode="decimal"
      placeholder="0"
      value={text}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setText(fmtMoney(value)); }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseMoney(e.target.value);
        if (n !== undefined) onChange(n);
      }}
      {...rest}
    />
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number | null) => void }) {
  const id = useId();
  return <Field label={label} htmlFor={id}><MoneyInput id={id} value={value} onChange={onChange} style={{ textAlign: "right" }} /></Field>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const id = useId();
  return <Field label={label} htmlFor={id}><Input id={id} type="number" min={0} inputMode="numeric" value={String(value)} onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))} /></Field>;
}

function StringList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => {
    if (focusLast) { refs.current[items.length - 1]?.focus(); setFocusLast(false); }
  }, [focusLast, items.length]);
  const add = () => { onChange([...items, ""]); setFocusLast(true); };
  return (
    <div className="s-stack sm">
      <span className="s-label">{label}</span>
      {items.map((s, i) => (
        <div key={i} className="qb-listrow">
          <Input
            ref={(el) => { refs.current[i] = el; }}
            aria-label={`${label} ${i + 1}`}
            value={s}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <Button variant="ghost" size="sm" iconOnly aria-label="Weghalen" icon={<X />} onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus />} onClick={add} style={{ alignSelf: "flex-start" }}>Toevoegen</Button>
    </div>
  );
}

function PairList({ label, rows, onChange, aLabel, bLabel }: { label: string; rows: { a: string; b: string }[]; onChange: (r: { a: string; b: string }[]) => void; aLabel: string; bLabel: string }) {
  return (
    <div className="s-stack sm">
      <span className="s-label">{label}</span>
      {rows.map((r, i) => (
        <div key={i} className="qb-pair">
          <Input aria-label={aLabel} placeholder={aLabel} value={r.a} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
          <Textarea aria-label={bLabel} placeholder={bLabel} rows={2} value={r.b} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} />
          <Button variant="ghost" size="sm" iconOnly aria-label="Weghalen" icon={<X />} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...rows, { a: "", b: "" }])} style={{ alignSelf: "flex-start" }}>Toevoegen</Button>
    </div>
  );
}

function LineList({ label, lines, onChange, basis, rate, perMonth }: {
  label: string; lines: QuoteLine[]; onChange: (v: QuoteLine[]) => void; basis: "incl" | "excl"; rate: number; perMonth?: boolean;
}) {
  const update = (i: number, patch: Partial<QuoteLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const total = sumLines(lines, perMonth ? "m" : "o");
  const split = vatSplit(total, basis, rate);
  return (
    <div className="s-stack sm">
      <div className="s-row between">
        <span className="s-label">{label}</span>
        {lines.length > 0 && <span className="s-mono s-small s-muted">{euroCents(split.excl)} excl. · {euroCents(split.incl)} incl.{perMonth ? " p/m" : ""}</span>}
      </div>
      {lines.map((l, i) => {
        const perUnit = l.qty !== undefined;
        return (
          <div key={i} className={`qb-line${l.optional ? " optional" : ""}`}>
            <div className="qb-line-main">
              <Input aria-label="Omschrijving" placeholder="Omschrijving" value={l.label} onChange={(e) => update(i, { label: e.target.value })} />
              {perUnit ? (
                <div className="qb-unit">
                  <Input aria-label="Aantal" inputMode="decimal" value={String(l.qty ?? "")} onChange={(e) => update(i, { qty: Number(e.target.value.replace(",", ".")) || 0 })} />
                  <span>×</span>
                  <MoneyInput aria-label="Prijs per stuk" value={l.price ?? null} onChange={(n) => update(i, { price: n ?? 0 })} />
                </div>
              ) : (
                <MoneyInput aria-label="Bedrag" className="qb-amount" value={l.amount} onChange={(n) => update(i, { amount: n ?? 0 })} />
              )}
            </div>
            <div className="qb-line-sub">
              <Input aria-label="Toelichting" placeholder="Toelichting (optioneel)" value={l.note || ""} onChange={(e) => update(i, { note: e.target.value })} />
              {perUnit && <Input aria-label="Eenheid" className="qb-unitname" placeholder="eenheid" value={l.unit || ""} onChange={(e) => update(i, { unit: e.target.value })} />}
            </div>
            <div className="qb-line-tools">
              <label className="qb-toggle"><input type="checkbox" checked={perUnit} onChange={(e) => update(i, e.target.checked ? { qty: 1, price: lineTotal(l), unit: "" } : { qty: undefined, price: undefined, unit: undefined, amount: lineTotal(l) })} />Per stuk</label>
              <label className="qb-toggle"><input type="checkbox" checked={!!l.optional} onChange={(e) => update(i, { optional: e.target.checked || undefined })} />Optie</label>
              <span className="qb-line-total s-mono">{l.optional ? "+ " : ""}{euroCents(lineTotal(l))}</span>
              <Button variant="ghost" size="sm" iconOnly aria-label="Omhoog" icon={<ArrowUp />} disabled={i === 0} onClick={() => move(i, -1)} />
              <Button variant="ghost" size="sm" iconOnly aria-label="Omlaag" icon={<ArrowDown />} disabled={i === lines.length - 1} onClick={() => move(i, 1)} />
              <Button variant="ghost" size="sm" iconOnly aria-label="Regel weghalen" icon={<X />} onClick={() => onChange(lines.filter((_, j) => j !== i))} />
            </div>
          </div>
        );
      })}
      <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => onChange([...lines, { label: "", amount: 0, note: "" }])} style={{ alignSelf: "flex-start" }}>Regel</Button>
    </div>
  );
}

const PRESETS: { label: string; steps: { label: string; percent: number; moment: string }[] }[] = [
  { label: "40 / 60", steps: [{ label: "Aanbetaling", percent: 40, moment: "bij akkoord" }, { label: "Restant", percent: 60, moment: "bij oplevering" }] },
  { label: "50 / 50", steps: [{ label: "Aanbetaling", percent: 50, moment: "bij akkoord" }, { label: "Restant", percent: 50, moment: "bij oplevering" }] },
  { label: "Alles vooraf", steps: [{ label: "Vooraf", percent: 100, moment: "voor de opnamedag" }] },
  { label: "Alles achteraf", steps: [{ label: "Bij oplevering", percent: 100, moment: "bij oplevering" }] },
];

function PaymentEditor({ d, onChange }: { d: QuoteDraft; onChange: (p: QuoteDetails["payment"]) => void }) {
  const p = d.details.payment || { steps: [], termDays: 14 };
  const pct = percentTotal(p.steps);
  const total = sumLines(d.oneTime, "o");
  const steps = (s: typeof p.steps) => onChange({ ...p, steps: s });
  return (
    <>
      <div className="qb-chips">
        {PRESETS.map((x) => <button key={x.label} type="button" onClick={() => steps(x.steps.map((s) => ({ ...s })))}>{x.label}</button>)}
      </div>
      <div className="s-stack sm">
        {p.steps.map((s, i) => (
          <div key={i} className="qb-step">
            <Input aria-label="Naam" placeholder="Bijv. Aanbetaling" value={s.label} onChange={(e) => steps(p.steps.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <div className="qb-pct"><Input aria-label="Percentage" inputMode="decimal" value={String(s.percent)} onChange={(e) => steps(p.steps.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value.replace(",", ".")) || 0 } : x)))} /><span>%</span></div>
            <Input aria-label="Wanneer" placeholder="Bijv. bij akkoord" value={s.moment} onChange={(e) => steps(p.steps.map((x, j) => (j === i ? { ...x, moment: e.target.value } : x)))} />
            <span className="s-mono s-small s-muted qb-step-amt">{euroCents((total * (Number(s.percent) || 0)) / 100)}</span>
            <Button variant="ghost" size="sm" iconOnly aria-label="Weghalen" icon={<X />} onClick={() => steps(p.steps.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="s-row between">
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => steps([...p.steps, { label: "", percent: Math.max(0, 100 - pct), moment: "" }])}>Betaalmoment</Button>
          <span className={`s-small s-mono ${Math.abs(pct - 100) < 0.01 ? "s-muted" : "qb-bad"}`}>Samen {pct}%</span>
        </div>
      </div>
      <NumberField label="Betaaltermijn (dagen na factuurdatum)" value={p.termDays} onChange={(n) => onChange({ ...p, termDays: n })} />
    </>
  );
}

function OwnershipEditor({ d, onChange }: { d: QuoteDraft; onChange: (o: NonNullable<QuoteDetails["ownership"]>) => void }) {
  const o = d.details.ownership!;
  return (
    <>
      <Field label="De klant">
        <Segmented label="De klant" value={o.model} onChange={(m) => onChange({ ...o, model: m })} options={[{ value: "rent", label: "Huurt de website" }, { value: "buy", label: "Koopt de website" }]} />
      </Field>
      {o.model === "rent" && (
        <MoneyField label={`Afkoopprijs als de klant toch wil kopen (${d.vatBasis === "incl" ? "incl." : "excl."} btw)`} value={o.buyout} onChange={(n) => onChange({ ...o, buyout: n })} />
      )}
      <PairList label="Van wie is wat" rows={o.rows.map((r) => ({ a: r.what, b: r.owner }))} onChange={(rows) => onChange({ ...o, rows: rows.map((r) => ({ what: r.a, owner: r.b })) })} aLabel="Wat" bLabel="Van wie" />
      <Area label="Toelichting (optioneel)" rows={2} value={o.note} onChange={(v) => onChange({ ...o, note: v })} />
    </>
  );
}

function LicenseEditor({ value: l, onChange }: { value: QuoteLicense; onChange: (l: QuoteLicense) => void }) {
  const set = <K extends keyof QuoteLicense>(k: K, v: QuoteLicense[K]) => onChange({ ...l, [k]: v });
  return (
    <div className="s-stack">
      <span className="s-label">Licentie op foto en video</span>
      <div className="qb-grid">
        <Text label="Licentiehouder" value={l.holder} onChange={(v) => set("holder", v)} placeholder="Bedrijf of naam" />
        <Field label="Gebruik">
          <Segmented label="Gebruik" value={l.use} onChange={(v) => set("use", v)} options={[{ value: "business", label: "Zakelijk" }, { value: "private", label: "Particulier" }, { value: "custom", label: "Anders" }]} />
        </Field>
      </div>
      <Field label="Kanalen">
        <div className="qb-chips">
          {CHANNELS.map((c) => {
            const on = l.channels.includes(c);
            return <button key={c} type="button" aria-pressed={on} onClick={() => set("channels", on ? l.channels.filter((x) => x !== c) : [...l.channels, c])}>{c}</button>;
          })}
        </div>
      </Field>
      <div className="qb-grid">
        <Text label="Gebied" value={l.territory} onChange={(v) => set("territory", v)} />
        <Text label="Duur" value={l.duration} onChange={(v) => set("duration", v)} />
        <label className="qb-toggle"><input type="checkbox" checked={l.exclusive} onChange={(e) => set("exclusive", e.target.checked)} />Exclusief</label>
        <label className="qb-toggle"><input type="checkbox" checked={l.transferable} onChange={(e) => set("transferable", e.target.checked)} />Overdraagbaar</label>
      </div>
      <Area label="Aanpassen" rows={2} value={l.edits} onChange={(v) => set("edits", v)} />
      <div className="qb-grid">
        <Text label="Naamsvermelding" value={l.credit} onChange={(v) => set("credit", v)} />
        <Text label="Ruwe bestanden" value={l.rawFiles} onChange={(v) => set("rawFiles", v)} />
      </div>
      <Text label="Portfolio" value={l.portfolio} onChange={(v) => set("portfolio", v)} hint="Altijd apart vragen, nooit vooraf aangevinkt." />
    </div>
  );
}
