import { useQuery } from "@tanstack/react-query";
import {
  Check, Copy, ExternalLink, Eye, EyeOff, Link2Off, MessageSquareHeart, Pencil, Plus, RefreshCw, Reply, Star, Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { GoogleG } from "../../components/GoogleG";
import { del, errorMessage, get, post, put } from "../api";
import { ago, decimal1, fmtDate, initials } from "../format";
import { copyText } from "../gallery/share";
import { useAction, useProjects } from "../queries";
import {
  Button, Card, Empty, ErrorState, Field, Input, Modal, PageHead, Photo, Pill, Segmented, Select, SelectField, Skeleton,
  SkeletonList, Textarea, TextAreaField, TextField, useConfirm,
} from "../ui";
import type { Article } from "./Content";
import { useUrlState } from "../urlState";

type Review = {
  id: string; source: "google" | "portal"; googleId: string | null; clientName: string; photoUrl: string; rating: number; text: string;
  reply: { text: string; updatedAt: string } | null; projectId: string | null; projectTitle: string;
  portfolioArticleId: string | null; published: boolean; createdAt: string;
};
type Feedback = {
  id: string; projectId: string; projectTitle: string; clientName: string; createdAt: string;
  items: { id: string; scope: "photos" | "general"; photoUrls: string[]; category: string; text: string }[];
};
type GoogleStatus = {
  configured: boolean; clientId: string; fromEnv: boolean; connected: boolean; email: string; title: string;
  mapsUrl: string; rating: number; count: number; lastSyncAt: string | null; lastError: string;
};

const k = { reviews: ["reviews"] as const, feedback: ["feedback"] as const, google: ["google"] as const };
// Google sends the owner back here after the consent screen.
const CALLBACK_PATH = "/admin/reviews/google";
const callbackUrl = () => `${window.location.origin}${CALLBACK_PATH}`;

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="s-row nowrap" style={{ gap: 1, color: "var(--accent)" }} aria-label={`${rating} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={n <= rating ? "currentColor" : "none"} style={{ opacity: n <= rating ? 1 : 0.35 }} />)}
    </span>
  );
}

function Avatar({ review }: { review: Review }) {
  const [failed, setFailed] = useState(false);
  if (review.photoUrl && !failed) {
    return <img className="s-avatar" src={review.photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ width: 36, height: 36, objectFit: "cover" }} />;
  }
  return <span className="s-avatar" aria-hidden="true" style={{ width: 36, height: 36 }}>{initials(review.clientName)}</span>;
}

const sourceLabel = (r: Review) => (r.source === "portal" ? "Via het portaal" : r.googleId ? "Google" : "Google, zelf ingevoerd");

export function ReviewsPage() {
  const [tab, setTab] = useUrlState<"reviews" | "feedback">("tab", "reviews", ["reviews", "feedback"]);
  const reviews = useQuery({ queryKey: k.reviews, queryFn: () => get<{ reviews: Review[] }>("/admin/reviews").then((r) => r.reviews) });
  const feedback = useQuery({ queryKey: k.feedback, queryFn: () => get<{ feedback: Feedback[] }>("/admin/feedback").then((r) => r.feedback) });
  const google = useQuery({ queryKey: k.google, queryFn: () => get<GoogleStatus>("/admin/google") });
  const [editing, setEditing] = useState<Review | "new" | null>(null);

  const list = reviews.data || [];
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  return (
    <div className="s-view">
      <PageHead
        title="Reviews en feedback"
        sub={list.length
          ? `${list.length} review${list.length === 1 ? "" : "s"}, gemiddeld ${decimal1(avg)} sterren. Alleen wat je publiceert komt op de site.`
          : "Reviews komen van Google. Vraag erom vanaf een geleverd project."}
        actions={tab === "reviews" && <Button icon={<Plus />} onClick={() => setEditing("new")}>Review toevoegen</Button>}
      />
      <Segmented<"reviews" | "feedback"> label="Weergave" value={tab} onChange={setTab} options={[
        { value: "reviews", label: `Reviews (${list.length})` },
        { value: "feedback", label: `Feedback (${feedback.data?.length ?? 0})` },
      ]} />
      {tab === "reviews" ? (
        <>
          <GoogleCard status={google.data} error={google.error} />
          <Card bodyClass="none">
            {reviews.isError ? <div className="s-card-body"><ErrorState error={reviews.error} /></div> : reviews.isLoading ? <SkeletonList rows={3} /> : list.length === 0 ? (
              <Empty icon={<Star />} title="Nog geen reviews">
                {google.data?.connected ? "Zodra er een review op Google staat, verschijnt hij hier." : "Koppel Google hierboven, of voeg een Google-review zelf toe."}
              </Empty>
            ) : (
              <ul className="s-list">
                {list.map((r) => <ReviewItem key={r.id} review={r} canReply={!!google.data?.connected} onEdit={() => setEditing(r)} />)}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card bodyClass="none">
          {feedback.isError ? <div className="s-card-body"><ErrorState error={feedback.error} /></div> : feedback.isLoading ? <SkeletonList rows={3} /> : !feedback.data?.length ? (
            <Empty icon={<MessageSquareHeart />} title="Nog geen feedback" />
          ) : (
            <ul className="s-list">
              {feedback.data.map((f) => (
                <li key={f.id} className="s-card-body s-stack">
                  <div className="s-row"><b>{f.clientName}</b><span className="s-small s-muted">· <Link to={`/admin/project/${f.projectId}`}>{f.projectTitle}</Link> · {fmtDate(f.createdAt)}</span></div>
                  {f.items.map((i) => (
                    <div key={i.id} className="s-stack sm" style={{ padding: 12, background: "var(--sunken)", borderRadius: 8 }}>
                      <span className="s-eyebrow">{i.scope === "photos" ? `${i.photoUrls.length} foto${i.photoUrls.length === 1 ? "" : "'s"}` : i.category}</span>
                      <p style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{i.text}</p>
                      {i.photoUrls.length > 0 && (
                        <div className="s-row">{i.photoUrls.slice(0, 8).map((u) => <Photo key={u} src={u} style={{ width: 72, aspectRatio: "1" }} />)}</div>
                      )}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <ReviewDialog review={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// One review
// ---------------------------------------------------------------------------

function ReviewItem({ review: r, canReply, onEdit }: { review: Review; canReply: boolean; onEdit: () => void }) {
  const projects = useProjects();
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: () => get<{ articles: Article[] }>("/admin/portfolio").then((x) => x.articles) });
  const confirm = useConfirm();
  const update = useAction({
    fn: (patch: Partial<Pick<Review, "published" | "portfolioArticleId" | "projectId">>) => put(`/admin/reviews/${r.id}`, patch),
    invalidate: () => [k.reviews, ["engagement"]],
    success: (_d, patch) => (patch.published === undefined ? "Gekoppeld" : patch.published ? "Staat op de site" : "Van de site gehaald"),
  });
  const remove = useAction({ fn: () => del(`/admin/reviews/${r.id}`), invalidate: () => [k.reviews, ["engagement"]], success: "Review verwijderd" });

  const pieces = (portfolio.data || []).filter((a) => !a.category.startsWith("_"));
  // Linking makes sense for finished work; the project it already belongs to stays in the list.
  const linkable = (projects.data || [])
    .filter((p) => ["delivered", "review", "archived"].includes(p.stage) || p.id === r.projectId)
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));

  return (
    <li className="s-card-body s-stack">
      <div className="s-row between" style={{ alignItems: "flex-start" }}>
        <div className="s-row nowrap" style={{ minWidth: 0, alignItems: "flex-start" }}>
          <Avatar review={r} />
          <div className="s-stack sm" style={{ minWidth: 0, gap: 3 }}>
            <div className="s-row" style={{ gap: 8 }}><b>{r.clientName}</b><Stars rating={r.rating} /></div>
            <span className="s-small s-muted s-row" style={{ gap: 5 }}>
              {r.source === "google" && <GoogleG size={12} />}
              {sourceLabel(r)} · {fmtDate(r.createdAt)}
              {r.projectId && <> · <Link to={`/admin/project/${r.projectId}`} style={{ textDecoration: "underline" }}>{r.projectTitle}</Link></>}
            </span>
          </div>
        </div>
        <Pill tone={r.published ? "ok" : undefined}>{r.published ? "Op de site" : "Niet op de site"}</Pill>
      </div>
      {r.text
        ? <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{r.text}</p>
        : <p className="s-small s-muted">Alleen sterren, zonder tekst.</p>}
      {r.googleId && <ReplyBox review={r} canReply={canReply} />}
      <div className="s-row">
        <Button size="sm" variant={r.published ? "default" : "primary"} icon={r.published ? <EyeOff /> : <Eye />}
          disabled={!r.text && !r.published} title={!r.text ? "Een review zonder tekst zegt op de site niets" : undefined}
          onClick={() => update.mutate({ published: !r.published })}>
          {r.published ? "Van de site halen" : "Publiceren"}
        </Button>
        <Select aria-label="Koppel aan project" value={r.projectId || ""} style={{ width: 230 }}
          onChange={(e) => update.mutate({ projectId: e.target.value || null })}>
          <option value="">Niet gekoppeld aan project</option>
          {linkable.map((p) => <option key={p.id} value={p.id}>{p.title}{p.clientNames?.length ? ` · ${p.clientNames.join(", ")}` : ""}</option>)}
        </Select>
        <Select aria-label="Koppel aan portfoliostuk" value={r.portfolioArticleId || ""} style={{ width: 230 }}
          onChange={(e) => update.mutate({ portfolioArticleId: e.target.value || null })}>
          <option value="">Niet gekoppeld aan portfolio</option>
          {pieces.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </Select>
        {!r.googleId && (
          <span className="s-row nowrap" style={{ marginLeft: "auto", gap: 2 }}>
            {r.source === "google" && <Button size="sm" variant="ghost" iconOnly aria-label="Aanpassen" icon={<Pencil />} onClick={onEdit} />}
            <Button size="sm" variant="ghost" iconOnly aria-label="Verwijderen" icon={<Trash2 />}
              onClick={async () => { if (await confirm({ title: "Review verwijderen?", body: "Hij verdwijnt hier en van de site. Op Google blijft hij staan.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }} />
          </span>
        )}
      </div>
    </li>
  );
}

/** Your public answer under the review on Google. */
function ReplyBox({ review: r, canReply }: { review: Review; canReply: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(r.reply?.text || "");
  const confirm = useConfirm();
  const save = useAction({
    fn: () => put(`/admin/reviews/${r.id}/reply`, { text }),
    invalidate: () => [k.reviews],
    success: "Antwoord staat op Google",
    onSuccess: () => setOpen(false),
  });
  const remove = useAction({ fn: () => del(`/admin/reviews/${r.id}/reply`), invalidate: () => [k.reviews], success: "Antwoord verwijderd" });

  if (open) {
    return (
      <div className="s-stack sm">
        <Textarea aria-label="Je antwoord" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus
          placeholder={`Bedankt ${r.clientName.split(" ")[0]}! …`} />
        <span className="s-small s-muted">Iedereen op Google ziet dit antwoord onder de review.</span>
        <div className="s-row">
          <Button size="sm" variant="primary" disabled={!text.trim()} loading={save.isPending} onClick={() => save.mutate()}>Plaatsen op Google</Button>
          <Button size="sm" onClick={() => { setOpen(false); setText(r.reply?.text || ""); }}>Annuleren</Button>
        </div>
      </div>
    );
  }
  if (r.reply) {
    return (
      <div className="s-stack sm" style={{ padding: 12, background: "var(--sunken)", borderRadius: 8 }}>
        <div className="s-row between">
          <span className="s-eyebrow">Jouw antwoord · {fmtDate(r.reply.updatedAt)}</span>
          {canReply && (
            <span className="s-row nowrap" style={{ gap: 2 }}>
              <Button size="sm" variant="ghost" iconOnly aria-label="Antwoord aanpassen" icon={<Pencil />} onClick={() => setOpen(true)} />
              <Button size="sm" variant="ghost" iconOnly aria-label="Antwoord verwijderen" icon={<Trash2 />} loading={remove.isPending}
                onClick={async () => { if (await confirm({ title: "Antwoord verwijderen?", body: "Het verdwijnt ook van Google.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }} />
            </span>
          )}
        </div>
        <p style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{r.reply.text}</p>
      </div>
    );
  }
  if (!canReply) return null;
  return <Button size="sm" variant="ghost" icon={<Reply />} style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>Antwoorden op Google</Button>;
}

// ---------------------------------------------------------------------------
// Adding a Google review by hand
// ---------------------------------------------------------------------------

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="s-row nowrap" role="radiogroup" aria-label="Sterren" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} ster${n === 1 ? "" : "ren"}`} onClick={() => onChange(n)}
          style={{ border: 0, background: "none", padding: 2, cursor: "pointer", color: n <= value ? "var(--accent)" : "var(--line-strong)" }}>
          <Star size={24} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function ReviewDialog({ review, onClose }: { review: Review | "new" | null; onClose: () => void }) {
  const projects = useProjects();
  const isNew = review === "new";
  const [form, setForm] = useState({ clientName: "", rating: 5, text: "", date: today(), projectId: "", published: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!review) return;
    setError(null);
    setForm(review === "new"
      ? { clientName: "", rating: 5, text: "", date: today(), projectId: "", published: true }
      : { clientName: review.clientName, rating: review.rating, text: review.text, date: review.createdAt.slice(0, 10), projectId: review.projectId || "", published: review.published });
  }, [review]);

  const save = useAction({
    fn: () => {
      const body = {
        clientName: form.clientName, rating: form.rating, text: form.text,
        createdAt: new Date(`${form.date}T12:00:00`).toISOString(), projectId: form.projectId || null, published: form.published,
      };
      return isNew ? post("/admin/reviews", body) : put(`/admin/reviews/${(review as Review).id}`, body);
    },
    invalidate: () => [k.reviews, ["engagement"]],
    success: isNew ? "Review toegevoegd" : "Review aangepast",
    onSuccess: onClose,
  });

  const projectOptions = (projects.data || []).filter((p) => p.stage !== "lead").sort((a, b) => a.title.localeCompare(b.title, "nl"));

  return (
    <Modal
      open={!!review}
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "Google-review toevoegen" : "Review aanpassen"}
      description={isNew ? "Neem een review van Google over. Zodra Google gekoppeld is, neemt de echte review deze plek in." : undefined}
      footer={
        <>
          <Button onClick={onClose}>Annuleren</Button>
          <Button variant="primary" type="submit" form="review-form" loading={save.isPending}>{isNew ? "Toevoegen" : "Opslaan"}</Button>
        </>
      }
    >
      <form id="review-form" className="s-stack" onSubmit={(e) => {
        e.preventDefault();
        if (!form.clientName.trim()) return setError("Vul de naam in zoals die op Google staat.");
        setError(null);
        save.mutate();
      }}>
        <TextField label="Naam" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} hint="Zoals die op Google staat" autoFocus />
        <Field label="Sterren"><StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></Field>
        <TextAreaField label="Tekst" rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        <div className="s-form-grid">
          <Field label="Datum" htmlFor="rv-date"><Input id="rv-date" type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <SelectField label="Project (optioneel)" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Geen project</option>
            {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </SelectField>
        </div>
        <label className="s-row nowrap" style={{ gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Op de site zetten
        </label>
        {error && <p className="s-small" style={{ color: "var(--bad)" }} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// The Google connection
// ---------------------------------------------------------------------------

const CONSOLE = "https://console.cloud.google.com";

function GoogleCard({ status: s, error }: { status?: GoogleStatus; error: unknown }) {
  const confirm = useConfirm();
  const [editClient, setEditClient] = useState(false);
  const start = useAction({
    fn: () => post<{ url: string }>("/admin/google/start", { redirectUri: callbackUrl() }),
    onSuccess: (r) => window.location.assign(r.url),
  });
  const sync = useAction({
    fn: () => post<{ synced: { added: number; updated: number; removed: number } }>("/admin/google/sync"),
    invalidate: () => [k.google, k.reviews, ["engagement"]],
    success: (r) => (r.synced.added ? `${r.synced.added} nieuwe review${r.synced.added === 1 ? "" : "s"} binnengehaald` : "Alles is bijgewerkt"),
  });
  const disconnect = useAction({ fn: () => del("/admin/google"), invalidate: () => [k.google], success: "Google ontkoppeld" });

  if (error) return <Card><ErrorState error={error} /></Card>;
  if (!s) return <Card><Skeleton h={44} /></Card>;

  if (s.connected) {
    return (
      <Card
        title={<h2 className="s-row" style={{ gap: 8 }}><GoogleG size={18} /> Google</h2>}
        action={
          <span className="s-row nowrap" style={{ gap: 6 }}>
            <Button size="sm" icon={<RefreshCw />} loading={sync.isPending} onClick={() => sync.mutate()}>Nu ophalen</Button>
            <Button size="sm" variant="ghost" iconOnly aria-label="Ontkoppelen" title="Ontkoppelen" icon={<Link2Off />}
              onClick={async () => { if (await confirm({ title: "Google ontkoppelen?", body: "De reviews blijven hier staan, maar nieuwe komen niet meer vanzelf binnen.", confirm: "Ontkoppelen" })) disconnect.mutate(); }} />
          </span>
        }
      >
        <div className="s-stack sm">
          <div className="s-row" style={{ gap: 10 }}>
            <b>{s.title || "Bedrijfsprofiel"}</b>
            {s.count > 0 && <span className="s-row nowrap" style={{ gap: 6 }}><Stars rating={Math.round(s.rating)} size={13} /><span className="s-small">{decimal1(s.rating)} uit {s.count} review{s.count === 1 ? "" : "s"}</span></span>}
            {s.mapsUrl && <a className="s-small s-row nowrap" style={{ gap: 4, color: "var(--accent)" }} href={s.mapsUrl} target="_blank" rel="noopener noreferrer">Bekijk op Google <ExternalLink size={12} /></a>}
          </div>
          <span className="s-small s-muted">
            Gekoppeld{s.email ? ` met ${s.email}` : ""}. {s.lastSyncAt ? `Opgehaald ${ago(s.lastSyncAt)}.` : "Nog niet opgehaald."} Nieuwe reviews komen vanzelf binnen; ze staan pas op de site als jij ze publiceert.
          </span>
          {s.lastError && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{s.lastError}</p>}
        </div>
      </Card>
    );
  }

  const setup = !s.configured || editClient;
  return (
    <Card title={<h2 className="s-row" style={{ gap: 8 }}><GoogleG size={18} /> Google koppelen</h2>}>
      <div className="s-stack">
        <p className="s-small">Koppel je Google-bedrijfsprofiel. Dan komen nieuwe reviews hier vanzelf binnen en kun je ze vanaf hier beantwoorden.</p>
        {setup ? (
          <>
            <SetupSteps />
            <ClientForm initialId={s.clientId} onSaved={() => setEditClient(false)} onCancel={s.configured ? () => setEditClient(false) : undefined} />
          </>
        ) : (
          <div className="s-row">
            <Button variant="primary" icon={<GoogleG size={15} />} loading={start.isPending} onClick={() => start.mutate()}>Koppelen met Google</Button>
            {!s.fromEnv && <Button variant="ghost" size="sm" onClick={() => setEditClient(true)}>Client-gegevens wijzigen</Button>}
          </div>
        )}
        <p className="s-small s-muted">Tot die tijd kun je een review van Google zelf overnemen met Review toevoegen.</p>
      </div>
    </Card>
  );
}

function SetupSteps() {
  const [copied, setCopied] = useState(false);
  const a = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{label}</a>
  );
  return (
    <ol className="s-small s-stack sm" style={{ listStyle: "decimal", paddingLeft: 20, margin: 0, lineHeight: 1.6 }}>
      <li>Maak in {a(`${CONSOLE}/projectcreate`, "Google Cloud")} een project, bijvoorbeeld PhotoDeCaffeine.</li>
      <li>Vraag met {a("https://support.google.com/business/contact/api_default", "dit formulier")} toegang tot de Business Profile API. Google keurt dat meestal binnen een paar dagen goed.</li>
      <li>
        Zet deze drie API's aan: {a(`${CONSOLE}/apis/library/mybusinessaccountmanagement.googleapis.com`, "Account Management")},{" "}
        {a(`${CONSOLE}/apis/library/mybusinessbusinessinformation.googleapis.com`, "Business Information")} en{" "}
        {a(`${CONSOLE}/apis/library/mybusiness.googleapis.com`, "Google My Business")}.
      </li>
      <li>Kies bij het {a(`${CONSOLE}/apis/credentials/consent`, "toestemmingsscherm")} voor Extern en zet de app op In productie.</li>
      <li className="s-stack sm">
        <span>Maak bij {a(`${CONSOLE}/apis/credentials`, "Inloggegevens")} een OAuth-client-ID van het type Webapplicatie, met deze doorstuur-URL:</span>
        <span className="s-row nowrap" style={{ gap: 6 }}>
          <code className="s-mono s-truncate" style={{ padding: "4px 8px", background: "var(--sunken)", borderRadius: 6, minWidth: 0 }}>{callbackUrl()}</code>
          <Button size="sm" icon={copied ? <Check /> : <Copy />} onClick={async () => setCopied(await copyText(callbackUrl()))}>{copied ? "Gekopieerd" : "Kopieer"}</Button>
        </span>
      </li>
      <li>Plak hieronder de client-ID en het clientgeheim.</li>
    </ol>
  );
}

function ClientForm({ initialId, onSaved, onCancel }: { initialId: string; onSaved: () => void; onCancel?: () => void }) {
  const [clientId, setClientId] = useState(initialId);
  const [clientSecret, setClientSecret] = useState("");
  const save = useAction({
    fn: () => put("/admin/google/client", { clientId, clientSecret }),
    invalidate: () => [k.google],
    success: "Opgeslagen. Klik nu op Koppelen met Google.",
    onSuccess: onSaved,
  });
  return (
    <form className="s-stack sm" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="s-form-grid">
        <TextField label="Client-ID" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="…apps.googleusercontent.com" spellCheck={false} />
        <TextField label="Clientgeheim" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="new-password" />
      </div>
      <div className="s-row">
        <Button type="submit" variant="primary" disabled={!clientId.trim() || !clientSecret.trim()} loading={save.isPending}>Opslaan</Button>
        {onCancel && <Button onClick={onCancel}>Annuleren</Button>}
      </div>
    </form>
  );
}

/** Where Google sends the owner back: finishes the connection and returns to the reviews. */
export function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // The code works once; React's development double-run must not spend it twice.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setError(params.get("error") === "access_denied" ? "Je hebt geen toestemming gegeven. Er is niets gekoppeld." : "Google stuurde geen code terug. Probeer het opnieuw.");
      return;
    }
    post<{ synced: { added: number } | null; lastError: string }>("/admin/google/connect", { code, state })
      .then((r) => {
        toast.success(r.synced ? `Google gekoppeld. ${r.synced.added} review${r.synced.added === 1 ? "" : "s"} binnengehaald.` : "Google gekoppeld.");
        navigate("/admin/reviews", { replace: true });
      })
      .catch((err) => setError(errorMessage(err)));
  }, [params, navigate]);

  return (
    <div className="s-view narrow">
      <PageHead title="Google koppelen" />
      <Card>
        {error ? (
          <div className="s-stack">
            <ErrorState error={new Error(error)} />
            <Link to="/admin/reviews" className="s-btn" style={{ alignSelf: "flex-start" }}>Terug naar reviews</Link>
          </div>
        ) : (
          <div className="s-row" role="status"><RefreshCw className="spin" size={16} /> Bezig met koppelen en reviews ophalen…</div>
        )}
      </Card>
    </div>
  );
}
