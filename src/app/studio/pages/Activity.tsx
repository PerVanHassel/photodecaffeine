import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, History, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { get } from "../api";
import { dayLabel, euro, fmt, initials, KIND_LABEL, LIGHT_LABEL, LOCATION_KIND_LABEL, STAGE_LABEL, TYPE_LABEL } from "../format";
import { useMe } from "../queries";
import { Button, Card, Empty, ErrorState, PageHead, Pill, Segmented, Select, SkeletonList } from "../ui";

// Logboek: every change anyone made, newest first. Written by the edge
// function (lib/activity.ts); only the owner can open it.

type ActorKind = "owner" | "team" | "client" | "guest" | "visitor";
type Change = { field: string; from?: unknown; to?: unknown };
type Entry = {
  id: string;
  at: string;
  actor: { id: string | null; name: string; email: string; kind: ActorKind };
  area: string;
  action: string;
  targetId: string;
  targetLabel: string;
  projectId: string | null;
  projectTitle: string;
  detail: string;
  changes: Change[];
  link: string;
};
type Person = { id: string | null; name: string; email: string; kind: ActorKind; entries: number; lastAt: string };

const ACTOR_LABEL: Record<ActorKind, string> = { owner: "Eigenaar", team: "Team", client: "Klant", guest: "Gast", visitor: "Bezoeker" };
const ACTOR_TONE: Record<ActorKind, string> = { owner: "acc", team: "info", client: "ok", guest: "", visitor: "" };

const AREAS = [
  "Projecten", "Galerij", "Berichten", "Planning", "Locaties", "Taken", "Klanten", "Aanvragen", "Offertes", "Facturen",
  "Declaraties", "Investeringen", "Portfolio", "Reviews", "Advertenties", "Instellingen", "Bestanden", "Team", "Documenten", "Portaal", "Meldingen", "Overig",
];

type Who = "all" | "studio" | "clients" | "guests";
const WHO_KINDS: Record<Who, string> = { all: "", studio: "owner,team", clients: "client", guests: "guest,visitor" };

const PAGE_KEY = ["activity"] as const;

export function ActivityPage() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Who>("all");
  const [person, setPerson] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const people = useQuery({
    queryKey: [...PAGE_KEY, "people"],
    queryFn: ({ signal }) => get<{ people: Person[] }>("/admin/activity/people", signal).then((r) => r.people),
    enabled: !!me.data?.isOwner,
  });

  const log = useInfiniteQuery({
    queryKey: [...PAGE_KEY, q, who, person, area],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) => {
      const qs = new URLSearchParams();
      if (pageParam) qs.set("before", pageParam);
      if (q) qs.set("q", q);
      if (WHO_KINDS[who]) qs.set("kind", WHO_KINDS[who]);
      if (person) qs.set("who", person);
      if (area) qs.set("area", area);
      return get<{ entries: Entry[]; more: boolean }>(`/admin/activity?${qs}`, signal);
    },
    getNextPageParam: (last) => (last.more ? last.entries[last.entries.length - 1]?.at : undefined),
    refetchInterval: 60_000,
    enabled: !!me.data?.isOwner,
  });

  const days = useMemo(() => {
    const out: { day: string; entries: Entry[] }[] = [];
    for (const e of log.data?.pages.flatMap((p) => p.entries) || []) {
      const day = fmt(e.at, "yyyy-MM-dd");
      if (out[out.length - 1]?.day !== day) out.push({ day, entries: [] });
      out[out.length - 1].entries.push(e);
    }
    return out;
  }, [log.data]);

  if (me.data && !me.data.isOwner) return <Navigate to="/admin" replace />;

  const filtered = !!(q || who !== "all" || person || area);
  const loading = me.isLoading || log.isLoading;

  return (
    <div className="s-view" style={{ maxWidth: 1040 }}>
      <PageHead title="Logboek" sub="Elke aanpassing in de studio, het portaal en op de site: wie, wat en wanneer. Alleen jij ziet dit." />

      <div className="s-log-filters">
        <label className="s-searchbox"><Search /><input type="search" aria-label="Zoeken in het logboek" placeholder="Zoek op naam, project of actie" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <Select aria-label="Persoon" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">Iedereen</option>
          {(people.data || []).map((p) => {
            const value = p.id || p.email || p.name;
            return <option key={value} value={value}>{p.name || p.email || "Onbekend"} ({ACTOR_LABEL[p.kind].toLowerCase()})</option>;
          })}
        </Select>
        <Select aria-label="Onderdeel" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Alle onderdelen</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Segmented<Who> label="Wie" value={who} onChange={setWho} options={[
          { value: "all", label: "Alles" },
          { value: "studio", label: "Studio" },
          { value: "clients", label: "Klanten" },
          { value: "guests", label: "Gasten" },
        ]} />
      </div>

      {log.isError && <ErrorState error={log.error} retry={() => log.refetch()} />}
      {loading ? (
        <Card bodyClass="none"><SkeletonList rows={6} /></Card>
      ) : days.length === 0 ? (
        <Card>
          <Empty icon={<History />} title={filtered ? "Niets gevonden" : "Nog niets in het logboek"}>
            {filtered ? "Probeer een andere zoekterm of zet de filters terug." : "Vanaf nu komt hier elke aanpassing te staan, van jou, je team, klanten en gasten."}
          </Empty>
        </Card>
      ) : (
        days.map((d) => (
          <Card key={d.day} title={<h2>{dayHeading(d.entries[0].at)}</h2>} action={<span className="s-mono s-faint s-small">{d.entries.length}</span>} bodyClass="none">
            <ul className="s-list">{d.entries.map((e) => <EntryRow key={e.id} entry={e} />)}</ul>
          </Card>
        ))
      )}
      {log.hasNextPage && (
        <Button style={{ alignSelf: "center" }} loading={log.isFetchingNextPage} onClick={() => log.fetchNextPage()}>Oudere laten zien</Button>
      )}
    </div>
  );
}

function dayHeading(at: string): string {
  const label = dayLabel(at);
  const date = fmt(at, "EEEE d MMMM yyyy");
  const text = /^(vandaag|gisteren|morgen)$/.test(label) ? `${label} · ${date}` : date;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EntryRow({ entry: e }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const name = e.actor.name || e.actor.email || ACTOR_LABEL[e.actor.kind];
  const shown = open ? e.changes : e.changes.slice(0, 4);
  const target = e.targetLabel && e.targetLabel !== e.projectTitle ? e.targetLabel : "";
  const showProject = e.projectTitle && e.projectTitle !== target;
  return (
    <li className="s-log-item">
      <time className="s-mono s-faint s-small" dateTime={e.at}>{fmt(e.at, "HH:mm")}</time>
      <div className={`s-avatar ${ACTOR_TONE[e.actor.kind]}`} aria-hidden="true">{initials(name)}</div>
      <div className="s-log-body">
        <div className="s-log-line">
          <span>{e.action}</span>
          {target && (e.link ? <Link to={e.link} className="s-log-target">{target}</Link> : <b>{target}</b>)}
        </div>
        <div className="s-small s-muted s-log-meta">
          <span title={e.actor.email || undefined}><b className="s-log-who">{name}</b> · {ACTOR_LABEL[e.actor.kind].toLowerCase()}</span>
          {showProject && (
            <span>
              {" · project "}
              {e.projectId ? <Link to={`/admin/project/${e.projectId}`}>{e.projectTitle}</Link> : e.projectTitle}
            </span>
          )}
        </div>
        {e.detail && <p className="s-log-detail">{e.detail}</p>}
        {e.changes.length > 0 && (
          <ul className="s-log-changes">
            {shown.map((c, i) => (
              <li key={`${c.field}-${i}`}>
                <span className="f">{fieldLabel(c.field)}</span>
                {"from" in c || "to" in c ? (
                  <>
                    <span className="from">{valueLabel(e.area, c.field, c.from)}</span>
                    <span aria-label="wordt">→</span>
                    <span className="to">{valueLabel(e.area, c.field, c.to)}</span>
                  </>
                ) : <span className="s-faint">aangepast</span>}
              </li>
            ))}
            {e.changes.length > 4 && (
              <li><button type="button" className="s-log-more" onClick={() => setOpen((v) => !v)}>{open ? "Minder laten zien" : `Nog ${e.changes.length - 4} ${e.changes.length - 4 === 1 ? "wijziging" : "wijzigingen"}`}</button></li>
            )}
          </ul>
        )}
      </div>
      <div className="s-log-side">
        <Pill plain>{e.area}</Pill>
        {e.link && <Link to={e.link} className="s-btn ghost sm" aria-label={`Open ${target || e.projectTitle || e.area}`} title="Openen"><ArrowUpRight size={14} /></Link>}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Field names and values, in words
// ---------------------------------------------------------------------------

const FIELD: Record<string, string> = {
  title: "Titel", name: "Naam", stage: "Fase", status: "Status", phase: "Fase", type: "Soort", kind: "Soort",
  description: "Omschrijving", notes: "Notities", briefing: "Briefing", deliverables: "Op te leveren",
  due_date: "Deadline", due_at: "Deadline", done_at: "Afgevinkt", starts_at: "Begin", ends_at: "Einde", all_day: "Hele dag",
  location_id: "Locatie", location_text: "Plek", link: "Link", client_visible: "Zichtbaar voor klant",
  email: "E-mail", phone: "Telefoon", company: "Bedrijf", address: "Adres", parking: "Parkeren",
  permit_required: "Vergunning nodig", best_light: "Beste licht", tags: "Tags", lat: "Breedtegraad", lng: "Lengtegraad",
  caption: "Onderschrift", label: "Omschrijving", required: "Verplicht", done: "Gedaan", sort: "Volgorde",
  value_cents: "Waarde", demos: "Webdemo's", demo_url: "Demo-link", demo_notes: "Demo-notities", inquiry_id: "Aanvraag",
  number: "Nummer", subtitle: "Ondertitel", intro: "Intro", client_id: "Klant", client_name: "Klantnaam",
  client_email: "E-mail klant", client_address: "Adres klant", project_id: "Project", quote_id: "Offerte",
  lines: "Regels", monthly: "Maandbedragen", one_time: "Eenmalige bedragen", included: "Inbegrepen", terms: "Voorwaarden",
  vat_basis: "Btw-basis", vat_rate: "Btw-tarief", valid_until: "Geldig tot", issued_on: "Factuurdatum", due_on: "Vervaldatum",
  paid_at: "Betaald op", sent_at: "Verstuurd op", send_count: "Keer verstuurd", reminded_at: "Herinnerd op",
  handled_at: "Afgehandeld", responded_at: "Antwoord op", response: "Antwoord", active: "Aan", hidden: "Verborgen",
  downloads: "Downloaden", published: "Gepubliceerd", featured: "Uitgelicht", category: "Categorie", coverUrl: "Omslagfoto",
  coverType: "Soort omslag", galleryUrls: "Foto's", blocks: "Inhoud", template: "Template", amount: "Bedrag", date: "Datum",
  vatRate: "Btw-tarief", receiptUrl: "Bonnetje", receiptRef: "Bonnetje", adminName: "Van", rating: "Sterren", text: "Tekst",
  reply: "Antwoord", clientName: "Naam", projectId: "Project", projectTitle: "Project", portfolioArticleId: "Portfolio-artikel",
  permissions: "Rechten", gallery_settings: "Galerij",
};

const PERMISSION: Record<string, string> = {
  manageAdmins: "Team & rollen", manageClients: "Klanten en projecten", manageQuotes: "Offertes en facturen",
  managePortfolio: "Portfolio", manageInquiries: "Aanvragen", manageReminders: "Herinneringen", manageAds: "Advertenties",
  manageSettings: "Instellingen", manageDeclarations: "Declaraties", viewAllDeclarations: "Alle declaraties zien",
};

const GALLERY: Record<string, string> = {
  title: "titel", subtitle: "ondertitel", style: "stijl", accentColor: "accentkleur", coverImageId: "omslagfoto",
  downloads: "downloaden", watermark: "watermerk",
};

const humanize = (s: string) => s.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function fieldLabel(field: string): string {
  const [head, sub] = field.split(".");
  if (sub && head === "permissions") return `Recht: ${PERMISSION[sub] || humanize(sub)}`;
  if (sub && head === "gallery_settings") return `Galerij: ${GALLERY[sub] || humanize(sub).toLowerCase()}`;
  if (sub) return `${FIELD[head] || humanize(head)}: ${humanize(sub).toLowerCase()}`;
  return FIELD[field] || humanize(field);
}

const STATUS: Record<string, string> = {
  draft: "concept", sent: "verstuurd", accepted: "geaccepteerd", declined: "afgewezen", paid: "betaald", overdue: "te laat",
  active: "actief", archived: "gearchiveerd",
};

function valueLabel(area: string, field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "leeg";
  if (typeof v === "boolean") return v ? "aan" : "uit";
  if (field === "value_cents" && typeof v === "number") return euro(v / 100);
  if (field === "amount" && typeof v === "number") return euro(v);
  if (typeof v === "number") return String(v);
  const s = String(v);
  const key = field.split(".").pop() || field;
  if (key === "stage" && s in STAGE_LABEL) return STAGE_LABEL[s as keyof typeof STAGE_LABEL];
  if (key === "type" && s in TYPE_LABEL) return TYPE_LABEL[s as keyof typeof TYPE_LABEL];
  if (key === "kind") {
    const labels: Record<string, string> = area === "Locaties" ? LOCATION_KIND_LABEL : KIND_LABEL;
    if (s in labels) return labels[s];
  }
  if (key === "best_light" && s in LIGHT_LABEL) return LIGHT_LABEL[s];
  if (key === "status" && s in STATUS) return STATUS[s];
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return fmt(s, "d MMM yyyy, HH:mm");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmt(s, "d MMM yyyy");
  return s;
}
