import { Archive, ArrowLeft, ExternalLink, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { del, put } from "../../api";
import { fmtDate, hasGallery, hasKind, mainPart, PART_LABEL } from "../../format";
import { keys, useAction, useConsent, useProject } from "../../queries";
import type { Project } from "../../types";
import { Button, ErrorState, PageHead, Skeleton, useConfirm } from "../../ui";
import { ConsentTab } from "./ConsentTab";
import { FinanceTab } from "./FinanceTab";
import { GalleryTab } from "./GalleryTab";
import { MessagesTab } from "./MessagesTab";
import { NotesTab } from "./NotesTab";
import { OverviewTab } from "./OverviewTab";
import { PartControls, PartsBar } from "./parts";
import { PlanningTab } from "./PlanningTab";
import { SharingTab } from "./SharingTab";
import { StyleTab } from "./StyleTab";

// One project, made of parts (Foto, Video, Website). The parts sit on top with
// their own steps; the tabs below are the project's: Foto and Video share the
// gallery, its look and the link that sells it.

type Tab = { id: string; label: string; when?: (p: Project) => boolean };
const TABS: Tab[] = [
  { id: "overview", label: "Overzicht" },
  { id: "gallery", label: "Galerij", when: hasGallery },
  { id: "style", label: "Stijl", when: hasGallery },
  { id: "sharing", label: "Delen & verkoop", when: hasGallery },
  { id: "consent", label: "Toestemming", when: (p) => hasKind(p, "photo") },
  { id: "planning", label: "Planning" },
  { id: "messages", label: "Berichten" },
  { id: "finance", label: "Financieel" },
  { id: "notes", label: "Notities" },
];

export function ProjectPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const project = useProject(id);
  const p = project.data;
  // A website has no shoot to ask consent for.
  const consent = useConsent(id, !!p && hasKind(p, "photo"));
  const answers = consent.data?.children || [];
  const needCare = answers.filter((k) => k.answer !== "full").length;

  if (project.isError) {
    return (
      <div className="s-view">
        <Link to="/admin/pipeline" className="s-back"><ArrowLeft size={14} /> Pijplijn</Link>
        <ErrorState error={project.error} retry={() => project.refetch()} />
      </div>
    );
  }
  if (!p) {
    return (
      <div className="s-view" aria-busy="true">
        <Skeleton h={14} w={120} />
        <Skeleton h={34} w={360} />
        <Skeleton h={64} r={12} />
        <Skeleton h={32} w={560} r={16} />
        <Skeleton h={320} r={12} />
      </div>
    );
  }

  const tabs = TABS.filter((t) => !t.when || t.when(p));
  const asked = params.get("tab");
  const tab = tabs.some((t) => t.id === asked) ? asked! : "overview";
  const part = p.parts.find((x) => x.id === params.get("deel")) || mainPart(p);
  const set = (next: Record<string, string>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    setParams(q, { replace: true });
  };
  const clientLine = (p.clients || []).map((c) => c.company || c.name).join(", ");
  const partsLine = p.parts.length > 1 ? `${p.parts.length} onderdelen` : part ? PART_LABEL[part.kind] : "";

  return (
    <div className="s-view">
      <PageHead
        back={<Link to="/admin/pipeline" className="s-back"><ArrowLeft size={14} /> Pijplijn</Link>}
        eyebrow={[clientLine, partsLine, p.archivedAt ? `Gearchiveerd op ${fmtDate(p.archivedAt)}` : ""].filter(Boolean).join(" · ")}
        title={p.title}
        actions={<HeaderActions project={p} />}
      />
      <div className="s-stack" style={{ gap: 10 }}>
        <PartsBar project={p} selected={part} onSelect={(deel) => set({ deel: deel === mainPart(p)?.id ? "" : deel })} />
        {part && <PartControls project={p} part={part} />}
      </div>
      <div className="s-tabs" role="tablist" aria-label="Projectonderdelen">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            onClick={() => set({ tab: t.id === "overview" ? "" : t.id })}
          >
            {t.label}
            {t.id === "messages" && !!p.unreadMessages && <span className="badge">{p.unreadMessages}</span>}
            {t.id === "gallery" && p.gallery.length > 0 && <span className="s-faint s-mono" style={{ marginLeft: 6, fontSize: 11 }}>{p.gallery.length}</span>}
            {t.id === "consent" && (needCare > 0
              ? <span className="badge" title={`${needCare} ${needCare === 1 ? "kind" : "kinderen"} om op te letten`}>{needCare}</span>
              : answers.length > 0 && <span className="s-faint s-mono" style={{ marginLeft: 6, fontSize: 11 }}>{answers.length}</span>)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "overview" && <OverviewTab project={p} onSelectPart={(deel) => set({ deel })} />}
        {tab === "gallery" && <GalleryTab project={p} />}
        {tab === "style" && <StyleTab project={p} />}
        {tab === "sharing" && <SharingTab project={p} />}
        {tab === "consent" && <ConsentTab project={p} />}
        {tab === "planning" && <PlanningTab project={p} />}
        {tab === "messages" && <MessagesTab project={p} />}
        {tab === "finance" && <FinanceTab project={p} />}
        {tab === "notes" && <NotesTab project={p} />}
      </div>
    </div>
  );
}

function HeaderActions({ project: p }: { project: Project }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const archived = !!p.archivedAt;
  const archive = useAction({
    fn: () => put(`/admin/project/${p.id}`, { archived: !archived }),
    invalidate: () => [keys.project(p.id), keys.projects, keys.overview],
    success: archived ? "Teruggezet uit het archief" : "Gearchiveerd, zonder mail",
  });
  const remove = useAction({
    fn: () => del(`/admin/project/${p.id}`),
    invalidate: () => [keys.projects, keys.overview],
    success: "Project verwijderd",
    onSuccess: () => navigate("/admin/pipeline"),
  });

  return (
    <>
      {hasGallery(p) && <Link className="s-btn" to={`/admin/project/${p.id}/gallery`}><Eye size={15} />Galerij als klant</Link>}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild><Button iconOnly aria-label="Meer acties" icon={<MoreHorizontal />} /></Popover.Trigger>
        <Popover.Portal>
          <div className="studio" style={{ minHeight: 0 }}>
            <Popover.Content align="end" sideOffset={6} className="s-card s-menu" style={{ zIndex: 50 }}>
              {/* The whole portal as this project's (first) client sees it, in a new tab. */}
              {p.clientIds?.[0] && (
                <a className="s-menu-item" href={`/portal/project/${p.id}?als=${p.clientIds[0]}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                  <span className="s-menu-ico" aria-hidden="true"><ExternalLink size={15} /></span>
                  <span><b>Portaal als klant bekijken</b><small>In een nieuw tabblad, alleen kijken</small></span>
                </a>
              )}
              <button type="button" className="s-menu-item" onClick={() => { setOpen(false); archive.mutate(); }}>
                <span className="s-menu-ico" aria-hidden="true"><Archive size={15} /></span>
                <span><b>{archived ? "Uit het archief halen" : "Archiveren"}</b><small>{archived ? "Het project komt terug op het bord" : "Geen mail. Het project houdt zijn stappen."}</small></span>
              </button>
              <span className="s-menu-sep" aria-hidden="true" />
              <button
                type="button"
                className="s-menu-item danger"
                onClick={async () => {
                  setOpen(false);
                  const ok = await confirm({
                    title: "Project verwijderen?",
                    body: "Galerij, toestemmingen, berichten, shotlist en afspraken van dit project gaan definitief weg. Dit kan niet ongedaan worden.",
                    confirm: "Definitief verwijderen",
                    danger: true,
                  });
                  if (ok) remove.mutate();
                }}
              >
                <span className="s-menu-ico" aria-hidden="true"><Trash2 size={15} /></span>
                <span><b>Verwijderen</b><small>Alles van dit project gaat weg</small></span>
              </button>
            </Popover.Content>
          </div>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
