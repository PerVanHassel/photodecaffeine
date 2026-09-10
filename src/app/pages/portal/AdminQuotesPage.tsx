import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { portalFetch } from "../../../lib/supabase";
import { Select } from "../../components/portal/Select";
import { QuoteDocument, euro, quoteSum } from "../../components/quote/QuoteDocument";
import { useMobile } from "../../hooks/useMobile";
import {
  FileText, Plus, Trash2, Send, Save, X, Check, Link2, Pencil, Mail, Copy,
} from "lucide-react";

type QuoteType = "photo" | "web";
type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

interface Line {
  label: string;
  amount: number;
  note?: string;
}

interface Term {
  label: string;
  text: string;
}

interface Quote {
  id: string;
  number: string;
  type: QuoteType;
  title: string;
  subtitle: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  intro: string;
  monthly: Line[];
  oneTime: Line[];
  included: string[];
  terms: Term[];
  notes: string;
  validUntil: string;
  status: QuoteStatus;
  sentAt: string;
  respondedAt: string;
  response: string;
  createdAt: string;
  updatedAt: string;
  link: string;
  totals: { monthly: number; oneTime: number };
}

/** The form's own shape: amounts stay text while you are typing in them. */
interface DraftLine {
  label: string;
  amount: string;
  note: string;
}

interface Draft {
  id: string | null;
  type: QuoteType;
  title: string;
  subtitle: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  intro: string;
  monthly: DraftLine[];
  oneTime: DraftLine[];
  included: string[];
  terms: Term[];
  notes: string;
  validUntil: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
}

const STATUS_STYLE: Record<QuoteStatus, { label: string; color: string; border: string }> = {
  draft: { label: "Concept", color: "rgba(var(--admin-fg-rgb),calc(0.4 * var(--admin-fg-boost)))", border: "rgba(var(--admin-fg-rgb),calc(0.16 * var(--admin-fg-boost)))" },
  sent: { label: "Verstuurd", color: "#c8905a", border: "rgba(200,144,90,0.35)" },
  accepted: { label: "Geaccepteerd", color: "rgba(120,190,140,0.95)", border: "rgba(120,190,140,0.4)" },
  declined: { label: "Afgewezen", color: "#e07060", border: "rgba(224,112,96,0.35)" },
};

/** Starting points, so a standard offer is a few edits rather than a blank page. */
const TEMPLATES: Record<QuoteType, Omit<Draft, "id" | "clientId" | "clientName" | "clientEmail" | "type">> = {
  web: {
    title: "Prijsindicatie website",
    subtitle: "Website + admin-paneel",
    intro: "",
    monthly: [
      { label: "Hosting", amount: "25", note: "server, database, fotoopslag, SSL" },
      { label: "Onderhoud", amount: "20", note: "updates, monitoring, storingen oplossen" },
    ],
    oneTime: [
      { label: "Bouwen & launchen", amount: "200", note: "" },
      { label: "Deposit", amount: "75", note: "" },
    ],
    included: [
      "Responsive website ontwerp (op maat gebouwd)",
      "Admin-paneel voor foto's en artikelen",
      "Tot 200 GB fotoopslag",
      "Automatische HTTPS/SSL",
      "Dagelijkse back-ups",
      "Telefonische support",
    ],
    terms: [
      { label: "Deposit", text: "dit bedrag wordt verrekend in de eerste drie maanden hosting." },
      { label: "Contract", text: "maandelijks opzegbaar, geen bindingsduur." },
      { label: "Start", text: "website live in ~2 weken na betaling." },
    ],
    notes: "",
    validUntil: "",
  },
  photo: {
    title: "Prijsindicatie fotoshoot",
    subtitle: "Shoot + nabewerking",
    intro: "",
    monthly: [],
    oneTime: [
      { label: "Shoot (halve dag)", amount: "350", note: "tot 4 uur op locatie" },
      { label: "Nabewerking", amount: "150", note: "geselecteerde foto's, kleur en retouche" },
      { label: "Reiskosten", amount: "0", note: "binnen 30 km inbegrepen" },
    ],
    included: [
      "Voorgesprek over wat je nodig hebt",
      "Bewerkte foto's in hoge resolutie",
      "Eigen online galerij om te bekijken en downloaden",
      "Gebruiksrechten voor eigen website en social media",
    ],
    terms: [
      { label: "Aanbetaling", text: "50% bij het vastleggen van de datum." },
      { label: "Levering", text: "binnen 10 werkdagen na de shoot." },
      { label: "Verzetten", text: "kosteloos tot 48 uur van tevoren." },
    ],
    notes: "",
    validUntil: "",
  },
};

const fg = (a: number) => `rgba(var(--admin-fg-rgb),calc(${a} * var(--admin-fg-boost)))`;

function emptyDraft(type: QuoteType): Draft {
  return {
    id: null,
    type,
    clientId: "",
    clientName: "",
    clientEmail: "",
    ...TEMPLATES[type],
    monthly: TEMPLATES[type].monthly.map((l) => ({ ...l })),
    oneTime: TEMPLATES[type].oneTime.map((l) => ({ ...l })),
    included: [...TEMPLATES[type].included],
    terms: TEMPLATES[type].terms.map((t) => ({ ...t })),
  };
}

function toDraft(q: Quote): Draft {
  return {
    id: q.id,
    type: q.type,
    title: q.title,
    subtitle: q.subtitle,
    clientId: q.clientId || "",
    clientName: q.clientName || "",
    clientEmail: q.clientEmail || "",
    intro: q.intro || "",
    monthly: (q.monthly || []).map((l) => ({ label: l.label, amount: String(l.amount ?? ""), note: l.note || "" })),
    oneTime: (q.oneTime || []).map((l) => ({ label: l.label, amount: String(l.amount ?? ""), note: l.note || "" })),
    included: [...(q.included || [])],
    terms: (q.terms || []).map((t) => ({ ...t })),
    notes: q.notes || "",
    validUntil: q.validUntil || "",
  };
}

function draftLines(lines: DraftLine[]): Line[] {
  return lines
    .filter((l) => l.label.trim() !== "")
    .map((l) => ({
      label: l.label.trim(),
      amount: Number(String(l.amount).replace(",", ".")) || 0,
      note: l.note.trim(),
    }));
}

function draftToBody(d: Draft) {
  return {
    type: d.type,
    title: d.title.trim(),
    subtitle: d.subtitle.trim(),
    clientId: d.clientId,
    clientName: d.clientName.trim(),
    clientEmail: d.clientEmail.trim(),
    intro: d.intro.trim(),
    monthly: draftLines(d.monthly),
    oneTime: draftLines(d.oneTime),
    included: d.included.map((s) => s.trim()).filter(Boolean),
    terms: d.terms.filter((t) => t.label.trim() !== "" || t.text.trim() !== ""),
    notes: d.notes.trim(),
    validUntil: d.validUntil,
  };
}

function formatDate(str: string) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: fg(0.03),
  border: `1px solid ${fg(0.1)}`,
  color: "var(--admin-fg-solid)",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
  padding: "10px 12px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  color: fg(0.3),
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "8px",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function IconButton({
  onClick, title, children, tone = "muted",
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  tone?: "muted" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        background: "none",
        border: "none",
        padding: "8px",
        cursor: "pointer",
        color: tone === "danger" ? "#e07060" : fg(0.35),
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: "none", border: `1px dashed ${fg(0.15)}`,
        color: fg(0.4), fontSize: "11px", fontFamily: "'Inter', sans-serif",
        padding: "9px 12px", cursor: "pointer", width: "100%", justifyContent: "center",
      }}
    >
      <Plus size={12} /> {label}
    </button>
  );
}

/** Label + bedrag + toelichting, herhaalbaar. */
function LineEditor({
  lines, onChange, addLabel,
}: {
  lines: DraftLine[];
  onChange: (next: DraftLine[]) => void;
  addLabel: string;
}) {
  const update = (i: number, patch: Partial<DraftLine>) =>
    onChange(lines.map((l, x) => (x === i ? { ...l, ...patch } : l)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px", border: `1px solid ${fg(0.07)}`, padding: "10px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              value={l.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Bijv. Hosting"
              aria-label="Omschrijving"
              style={{ ...inputStyle, flex: 1 }}
            />
            <div style={{ position: "relative", width: "110px", flexShrink: 0 }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: fg(0.3), fontSize: "13px", pointerEvents: "none" }}>
                €
              </span>
              <input
                value={l.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                aria-label="Bedrag"
                style={{ ...inputStyle, paddingLeft: "24px" }}
              />
            </div>
            <IconButton tone="danger" title="Regel verwijderen" onClick={() => onChange(lines.filter((_, x) => x !== i))}>
              <Trash2 size={13} />
            </IconButton>
          </div>
          <input
            value={l.note}
            onChange={(e) => update(i, { note: e.target.value })}
            placeholder="Toelichting (optioneel)"
            aria-label="Toelichting"
            style={{ ...inputStyle, fontSize: "12px" }}
          />
        </div>
      ))}
      <AddButton onClick={() => onChange([...lines, { label: "", amount: "", note: "" }])} label={addLabel} />
    </div>
  );
}

function TextListEditor({
  items, onChange, placeholder, addLabel,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            value={item}
            onChange={(e) => onChange(items.map((x, n) => (n === i ? e.target.value : x)))}
            placeholder={placeholder}
            aria-label={placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <IconButton tone="danger" title="Regel verwijderen" onClick={() => onChange(items.filter((_, n) => n !== i))}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ""])} label={addLabel} />
    </div>
  );
}

function TermsEditor({ terms, onChange }: { terms: Term[]; onChange: (next: Term[]) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {terms.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            value={t.label}
            onChange={(e) => onChange(terms.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))}
            placeholder="Deposit"
            aria-label="Kop"
            style={{ ...inputStyle, width: "130px", flexShrink: 0 }}
          />
          <input
            value={t.text}
            onChange={(e) => onChange(terms.map((x, n) => (n === i ? { ...x, text: e.target.value } : x)))}
            placeholder="wordt verrekend met de eerste maanden"
            aria-label="Tekst"
            style={{ ...inputStyle, flex: 1 }}
          />
          <IconButton tone="danger" title="Voorwaarde verwijderen" onClick={() => onChange(terms.filter((_, n) => n !== i))}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      ))}
      <AddButton onClick={() => onChange([...terms, { label: "", text: "" }])} label="Voorwaarde toevoegen" />
    </div>
  );
}

export function AdminQuotesPage() {
  const { session } = useAuth();
  const isMobile = useMobile();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const [sendFor, setSendFor] = useState<Quote | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([
      portalFetch("/admin/quotes", {}, session.access_token),
      portalFetch("/admin/clients", {}, session.access_token).catch(() => ({ clients: [] })),
    ])
      .then(([q, c]) => {
        setQuotes(q.quotes || []);
        setClients(c.clients || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Prijsopgaves konden niet geladen worden."))
      .finally(() => setLoading(false));
  }, [session]);

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 2600);
  }

  const previewQuote = useMemo(() => {
    if (!draft) return null;
    const body = draftToBody(draft);
    const existing = draft.id ? quotes.find((q) => q.id === draft.id) : null;
    return { ...body, number: existing?.number || "" };
  }, [draft, quotes]);

  async function save() {
    if (!draft || !session) return;
    const body = draftToBody(draft);
    if (!body.title) {
      setError("Vul een titel in.");
      return;
    }
    if (body.monthly.length === 0 && body.oneTime.length === 0) {
      setError("Zet er minstens één bedrag in.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = draft.id
        ? await portalFetch(`/admin/quotes/${draft.id}`, { method: "PUT", body: JSON.stringify(body) }, session.access_token)
        : await portalFetch("/admin/quotes", { method: "POST", body: JSON.stringify(body) }, session.access_token);
      const saved: Quote = data.quote;
      setQuotes((prev) => (draft.id ? prev.map((q) => (q.id === saved.id ? saved : q)) : [saved, ...prev]));
      setDraft(null);
      flash(draft.id ? "Opgeslagen." : "Prijsopgave aangemaakt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!session) return;
    setError("");
    try {
      await portalFetch(`/admin/quotes/${id}`, { method: "DELETE" }, session.access_token);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setConfirmDelete(null);
      flash("Verwijderd.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt.");
    }
  }

  async function send() {
    if (!sendFor || !session) return;
    setSending(true);
    setError("");
    try {
      const data = await portalFetch(
        `/admin/quotes/${sendFor.id}/send`,
        { method: "POST", body: JSON.stringify({ email: sendEmail.trim(), message: sendMessage.trim() }) },
        session.access_token
      );
      const saved: Quote = data.quote;
      setQuotes((prev) => prev.map((q) => (q.id === saved.id ? saved : q)));
      setSendFor(null);
      flash(`Verstuurd naar ${saved.clientEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen mislukt.");
    } finally {
      setSending(false);
    }
  }

  function copyLink(quote: Quote) {
    navigator.clipboard?.writeText(quote.link).then(
      () => flash("Link gekopieerd."),
      () => setError("Kopiëren lukte niet. De link staat in de mail naar de klant.")
    );
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(var(--admin-bg-card-rgb),0.6)",
    border: `1px solid ${fg(0.1)}`,
    padding: isMobile ? "18px" : "22px",
  };

  return (
    <div style={{ padding: isMobile ? "24px 16px 60px" : "48px 40px 80px", maxWidth: "1180px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
        <div>
          <div style={{ color: fg(0.2), fontSize: "9px", fontWeight: 500, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "10px" }}>
            Wat het gaat kosten
          </div>
          <h1 style={{ color: "var(--admin-fg-solid)", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>
            Prijsopgaves
          </h1>
          <p style={{ color: fg(0.35), fontSize: "13px", lineHeight: 1.7, margin: "14px 0 0", maxWidth: "620px" }}>
            Maak een prijsopgave voor een fotoklus of een website, mail hem naar de klant en zie hier
            of ze akkoord gaan.
          </p>
        </div>
        {!draft && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { setDraft(emptyDraft("web")); setError(""); }}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
                color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", padding: "11px 16px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Plus size={12} /> Nieuwe website-opgave
            </button>
            <button
              type="button"
              onClick={() => { setDraft(emptyDraft("photo")); setError(""); }}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: "none", border: `1px solid ${fg(0.15)}`,
                color: fg(0.5), fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                textTransform: "uppercase", padding: "11px 16px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Plus size={12} /> Foto-opgave
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", border: "1px solid rgba(224,112,96,0.25)", color: "#e07060", fontSize: "13px", marginBottom: "16px" }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ padding: "12px 16px", border: "1px solid rgba(120,190,140,0.25)", color: "rgba(120,190,140,0.95)", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Check size={13} /> {notice}
        </div>
      )}

      {draft && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,440px)", gap: "16px", marginBottom: "32px" }}>
          {/* Editor */}
          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>
                {draft.id ? "Prijsopgave bewerken" : "Nieuwe prijsopgave"}
              </span>
              <IconButton title="Sluiten" onClick={() => { setDraft(null); setError(""); }}>
                <X size={15} />
              </IconButton>
            </div>

            <Field label="Soort">
              <Select
                value={draft.type}
                onChange={(v) => setDraft({ ...draft, type: v as QuoteType })}
                ariaLabel="Soort prijsopgave"
                options={[
                  { value: "web", label: "Website", hint: "maandelijks + eenmalig" },
                  { value: "photo", label: "Foto / video", hint: "meestal alleen eenmalig" },
                ]}
              />
            </Field>

            <Field label="Titel">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={inputStyle} placeholder="Prijsindicatie website" />
            </Field>

            <Field label="Ondertitel">
              <input value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} style={inputStyle} placeholder="Fotograaf portfolio + admin-paneel" />
            </Field>

            <Field label="Klant">
              <Select
                value={draft.clientId}
                onChange={(id) => {
                  const c = clients.find((x) => x.id === id);
                  setDraft({ ...draft, clientId: id, clientName: c?.name || draft.clientName, clientEmail: c?.email || draft.clientEmail });
                }}
                placeholder="Kies een klant uit het portaal…"
                ariaLabel="Klant uit het portaal"
                options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.email }))}
              />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                <input value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value, clientId: "" })} style={inputStyle} placeholder="Naam" aria-label="Naam van de klant" />
                <input value={draft.clientEmail} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value, clientId: "" })} style={inputStyle} placeholder="E-mailadres" aria-label="E-mailadres van de klant" type="email" />
              </div>
              <p style={{ color: fg(0.28), fontSize: "11.5px", margin: "8px 0 0", lineHeight: 1.6 }}>
                Een klant hoeft geen account te hebben — naam en e-mailadres is genoeg.
              </p>
            </Field>

            <Field label="Inleiding">
              <textarea
                value={draft.intro}
                onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Wat je hierboven in de mail wil zeggen (optioneel)"
              />
            </Field>

            <Field label="Maandelijks">
              <LineEditor lines={draft.monthly} onChange={(monthly) => setDraft({ ...draft, monthly })} addLabel="Maandelijkse post toevoegen" />
            </Field>

            <Field label="Eenmalig">
              <LineEditor lines={draft.oneTime} onChange={(oneTime) => setDraft({ ...draft, oneTime })} addLabel="Eenmalige post toevoegen" />
            </Field>

            <Field label="Wat is inbegrepen">
              <TextListEditor items={draft.included} onChange={(included) => setDraft({ ...draft, included })} placeholder="Bijv. Dagelijkse back-ups" addLabel="Regel toevoegen" />
            </Field>

            <Field label="Voorwaarden">
              <TermsEditor terms={draft.terms} onChange={(terms) => setDraft({ ...draft, terms })} />
            </Field>

            <Field label="Extra notitie">
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Optioneel"
              />
            </Field>

            <Field label="Geldig tot">
              <input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} style={{ ...inputStyle, maxWidth: "200px" }} />
            </Field>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: `1px solid ${fg(0.08)}`, paddingTop: "16px" }}>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
                  color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", padding: "11px 18px",
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Save size={12} /> {saving ? "Opslaan…" : "Opslaan"}
              </button>
              <button
                type="button"
                onClick={() => { setDraft(null); setError(""); }}
                style={{
                  background: "none", border: `1px solid ${fg(0.12)}`, color: fg(0.4),
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                  padding: "11px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Annuleren
              </button>
            </div>
          </div>

          {/* Preview — exactly what the client gets */}
          <div>
            <div style={{ color: fg(0.25), fontSize: "9px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: "10px" }}>
              Zo ziet de klant het
            </div>
            <div style={{ backgroundColor: "#0d0703", border: "1px solid rgba(255,251,224,0.08)", padding: isMobile ? "20px" : "26px", position: isMobile ? "static" : "sticky", top: "24px" }}>
              {previewQuote && <QuoteDocument quote={previewQuote} />}
            </div>
          </div>
        </div>
      )}

      {/* The list */}
      {loading ? (
        <div style={{ color: fg(0.3), fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Laden…</div>
      ) : quotes.length === 0 ? (
        <div style={{ ...cardStyle, color: fg(0.35), fontSize: "13px", lineHeight: 1.8 }}>
          Nog geen prijsopgaves. Begin er hierboven een — de standaardregels staan er al in.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {quotes.map((q) => {
            const st = STATUS_STYLE[q.status] || STATUS_STYLE.draft;
            const monthly = quoteSum(q.monthly || []);
            const oneTime = quoteSum(q.oneTime || []);
            return (
              <div key={q.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <FileText size={14} color="#c8905a" />
                      <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700 }}>{q.title}</span>
                      <span style={{
                        border: `1px solid ${st.border}`, color: st.color, fontSize: "9px", fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 8px",
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ color: fg(0.35), fontSize: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>{q.number}</span>
                      <span>{q.clientName || q.clientEmail || "Geen klant"}</span>
                      <span>{q.type === "web" ? "Website" : "Foto / video"}</span>
                      {q.sentAt && <span>Verstuurd {formatDate(q.sentAt)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {monthly > 0 && (
                      <div style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {euro(monthly)} <span style={{ color: fg(0.3), fontSize: "11px", fontWeight: 400 }}>p/m</span>
                      </div>
                    )}
                    {oneTime > 0 && (
                      <div style={{ color: monthly > 0 ? fg(0.4) : "var(--admin-fg-solid)", fontSize: monthly > 0 ? "12px" : "15px", fontWeight: monthly > 0 ? 400 : 700, fontVariantNumeric: "tabular-nums" }}>
                        {euro(oneTime)} eenmalig
                      </div>
                    )}
                  </div>
                </div>

                {q.response && (
                  <p style={{ color: fg(0.45), fontSize: "12.5px", lineHeight: 1.7, margin: "12px 0 0", borderLeft: `2px solid ${fg(0.12)}`, paddingLeft: "12px" }}>
                    “{q.response}”
                  </p>
                )}

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "14px", borderTop: `1px solid ${fg(0.07)}`, paddingTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => { setSendFor(q); setSendEmail(q.clientEmail || ""); setSendMessage(""); setError(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
                      color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                      textTransform: "uppercase", padding: "9px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <Send size={11} /> {q.sentAt ? "Opnieuw versturen" : "Versturen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDraft(toDraft(q)); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px", background: "none",
                      border: `1px solid ${fg(0.13)}`, color: fg(0.45), fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px 14px",
                      cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <Pencil size={11} /> Bewerken
                  </button>
                  {q.sentAt && (
                    <>
                      <button
                        type="button"
                        onClick={() => copyLink(q)}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", background: "none",
                          border: "none", color: fg(0.4), fontSize: "10px", fontWeight: 700,
                          letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px 8px",
                          cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <Copy size={11} /> Link kopiëren
                      </button>
                      <a
                        href={q.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", color: fg(0.4),
                          fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                          textTransform: "uppercase", textDecoration: "none", padding: "9px 8px",
                        }}
                      >
                        <Link2 size={11} /> Openen
                      </a>
                    </>
                  )}
                  <span style={{ flex: 1 }} />
                  {confirmDelete === q.id ? (
                    <span style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ color: fg(0.4), fontSize: "11.5px" }}>Zeker weten?</span>
                      <button
                        type="button"
                        onClick={() => remove(q.id)}
                        style={{
                          background: "none", border: "1px solid rgba(224,112,96,0.35)", color: "#e07060",
                          fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                          padding: "8px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Verwijderen
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        style={{
                          background: "none", border: `1px solid ${fg(0.12)}`, color: fg(0.4),
                          fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                          padding: "8px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        Nee
                      </button>
                    </span>
                  ) : (
                    <IconButton tone="danger" title={`${q.title} verwijderen`} onClick={() => setConfirmDelete(q.id)}>
                      <Trash2 size={13} />
                    </IconButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send panel */}
      {sendFor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prijsopgave versturen"
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px", zIndex: 200,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !sending) setSendFor(null); }}
        >
          <div style={{ backgroundColor: "rgb(var(--admin-bg-card-rgb))", border: `1px solid ${fg(0.14)}`, padding: "24px", width: "100%", maxWidth: "460px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <span style={{ color: "var(--admin-fg-solid)", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={14} color="#c8905a" /> Versturen
              </span>
              <IconButton title="Sluiten" onClick={() => setSendFor(null)}>
                <X size={15} />
              </IconButton>
            </div>

            <p style={{ color: fg(0.4), fontSize: "12.5px", lineHeight: 1.7, margin: "0 0 16px" }}>
              De klant krijgt de hele prijsopgave in de mail, met een link om hem online te bekijken en
              ja of nee te zeggen.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <Field label="Naar">
                <input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} style={inputStyle} placeholder="klant@voorbeeld.nl" />
              </Field>
              <Field label="Persoonlijk bericht">
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="hierbij de prijsopgave waar we het over hadden."
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={send}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  backgroundColor: "rgba(200,144,90,0.12)", border: "1px solid rgba(200,144,90,0.3)",
                  color: "#c8905a", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", padding: "11px 18px",
                  cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Send size={12} /> {sending ? "Versturen…" : "Nu versturen"}
              </button>
              <button
                type="button"
                onClick={() => setSendFor(null)}
                style={{
                  background: "none", border: `1px solid ${fg(0.12)}`, color: fg(0.4),
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                  padding: "11px 18px", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
