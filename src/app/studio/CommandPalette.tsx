import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  CalendarDays, CheckSquare, Euro, FileText, Inbox, Kanban, MapPin, Plus, Sun, UserPlus, Users, Image as ImageIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { STAGE_LABEL } from "./format";
import { useSearch } from "./queries";

type Item = { id: string; label: string; meta?: string; icon: React.ReactNode; to: string; keywords?: string };

const ACTIONS: Item[] = [
  { id: "new-project", label: "Nieuwe shoot of project", icon: <Plus />, to: "/admin/pipeline?new=1", keywords: "project shoot opdracht nieuw" },
  { id: "new-client", label: "Nieuwe klant", icon: <UserPlus />, to: "/admin/clients?new=1", keywords: "klant nieuw uitnodigen" },
  { id: "new-location", label: "Nieuwe locatie", icon: <MapPin />, to: "/admin/locations?new=1", keywords: "locatie plek scout" },
  { id: "new-event", label: "Afspraak inplannen", icon: <CalendarDays />, to: "/admin/planning?new=1", keywords: "afspraak meeting shoot agenda" },
  { id: "new-quote", label: "Nieuwe offerte", icon: <FileText />, to: "/admin/quotes?new=1", keywords: "offerte prijsopgave" },
  { id: "new-invoice", label: "Nieuwe factuur", icon: <Euro />, to: "/admin/invoices?new=1", keywords: "factuur" },
  { id: "new-task", label: "Nieuwe taak", icon: <CheckSquare />, to: "/admin/tasks?new=1", keywords: "taak todo herinnering" },
];

const PAGES: Item[] = [
  { id: "p-today", label: "Vandaag", icon: <Sun />, to: "/admin" },
  { id: "p-pipeline", label: "Pijplijn", icon: <Kanban />, to: "/admin/pipeline" },
  { id: "p-planning", label: "Planning", icon: <CalendarDays />, to: "/admin/planning" },
  { id: "p-locations", label: "Locaties", icon: <MapPin />, to: "/admin/locations" },
  { id: "p-clients", label: "Klanten", icon: <Users />, to: "/admin/clients" },
  { id: "p-inquiries", label: "Aanvragen", icon: <Inbox />, to: "/admin/inquiries" },
  { id: "p-quotes", label: "Offertes", icon: <FileText />, to: "/admin/quotes" },
  { id: "p-invoices", label: "Facturen", icon: <Euro />, to: "/admin/invoices" },
  { id: "p-tasks", label: "Taken", icon: <CheckSquare />, to: "/admin/tasks" },
  { id: "p-portfolio", label: "Portfolio", icon: <ImageIcon />, to: "/admin/portfolio" },
];

function matches(item: Item, q: string) {
  const hay = `${item.label} ${item.keywords || ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 180);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const search = useSearch(debounced);
  const r = search.data;

  const results: Item[] = useMemo(() => {
    if (!r || debounced.trim().length < 2) return [];
    return [
      ...r.projects.map((p) => ({ id: `pr-${p.id}`, label: p.title, meta: STAGE_LABEL[p.stage], icon: <Kanban />, to: `/admin/project/${p.id}` })),
      ...r.clients.map((c) => ({ id: `cl-${c.id}`, label: c.name || c.email, meta: c.company || c.email, icon: <Users />, to: `/admin/client/${c.id}` })),
      ...r.locations.map((l) => ({ id: `lo-${l.id}`, label: l.name, meta: l.address, icon: <MapPin />, to: `/admin/locations?open=${l.id}` })),
      ...r.quotes.map((x) => ({ id: `qu-${x.id}`, label: `${x.number} · ${x.title}`, meta: x.client_name, icon: <FileText />, to: `/admin/quotes?open=${x.id}` })),
      ...r.invoices.map((x) => ({ id: `in-${x.id}`, label: x.number, meta: x.client_name, icon: <Euro />, to: `/admin/invoice/${x.id}` })),
    ];
  }, [r, debounced]);

  const actions = q ? ACTIONS.filter((a) => matches(a, q)) : ACTIONS;
  const pages = q ? PAGES.filter((a) => matches(a, q)) : PAGES;

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  const row = (item: Item) => (
    <Command.Item key={item.id} value={item.id} onSelect={() => go(item.to)}>
      {item.icon}
      <span className="s-truncate">{item.label}</span>
      {item.meta && <span className="meta s-truncate">{item.meta}</span>}
    </Command.Item>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className="studio" style={{ minHeight: 0 }}>
          <Dialog.Overlay className="s-overlay" style={{ zIndex: 70 }} />
          <Dialog.Content className="s-palette" aria-label="Zoeken">
            <Dialog.Title className="s-sr">Zoeken of actie</Dialog.Title>
            <Dialog.Description className="s-sr">Zoek klanten, projecten, locaties, offertes en facturen, of kies een actie.</Dialog.Description>
            <Command shouldFilter={false} loop>
              <Command.Input value={q} onValueChange={setQ} placeholder="Zoek klant, project, locatie of typ een actie" autoFocus />
              <Command.List>
                {results.length === 0 && actions.length === 0 && pages.length === 0 && (
                  <Command.Empty>{search.isFetching ? "Zoeken…" : `Niets gevonden voor "${q}".`}</Command.Empty>
                )}
                {results.length > 0 && <Command.Group heading="Resultaten">{results.map(row)}</Command.Group>}
                {actions.length > 0 && <Command.Group heading="Acties">{actions.map(row)}</Command.Group>}
                {pages.length > 0 && <Command.Group heading="Ga naar">{pages.map(row)}</Command.Group>}
              </Command.List>
            </Command>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
