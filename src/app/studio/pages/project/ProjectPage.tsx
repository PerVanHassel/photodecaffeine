import { ArrowLeft, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { del, put } from "../../api";
import { PIPELINE, STAGE_LABEL, TYPE_LABEL } from "../../format";
import { keys, useAction, useProject } from "../../queries";
import type { Project, Stage } from "../../types";
import { Button, ErrorState, PageHead, Skeleton, useConfirm } from "../../ui";
import { FinanceTab } from "./FinanceTab";
import { GalleryTab } from "./GalleryTab";
import { MessagesTab } from "./MessagesTab";
import { NotesTab } from "./NotesTab";
import { OverviewTab } from "./OverviewTab";
import { PlanningTab } from "./PlanningTab";

const TABS = [
  { id: "overview", label: "Overzicht" },
  { id: "planning", label: "Planning" },
  { id: "gallery", label: "Galerij" },
  { id: "messages", label: "Berichten" },
  { id: "finance", label: "Financieel" },
  { id: "notes", label: "Notities" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function ProjectPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "overview") as TabId;
  const project = useProject(id);
  const p = project.data;

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
        <Skeleton h={32} w={560} r={16} />
        <Skeleton h={320} r={12} />
      </div>
    );
  }

  const clientLine = (p.clients || []).map((c) => c.company || c.name).join(", ");

  return (
    <div className="s-view">
      <PageHead
        back={<Link to="/admin/pipeline" className="s-back"><ArrowLeft size={14} /> Pijplijn</Link>}
        eyebrow={[clientLine, TYPE_LABEL[p.type]].filter(Boolean).join(" · ")}
        title={p.title}
        actions={<HeaderActions project={p} />}
      />
      <Stepper project={p} />
      <div className="s-tabs" role="tablist" aria-label="Projectonderdelen">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            onClick={() => setParams(t.id === "overview" ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
            {t.id === "messages" && !!p.unreadMessages && <span className="badge">{p.unreadMessages}</span>}
            {t.id === "gallery" && p.gallery.length > 0 && <span className="s-faint s-mono" style={{ marginLeft: 6, fontSize: 11 }}>{p.gallery.length}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "overview" && <OverviewTab project={p} />}
        {tab === "planning" && <PlanningTab project={p} />}
        {tab === "gallery" && <GalleryTab project={p} />}
        {tab === "messages" && <MessagesTab project={p} />}
        {tab === "finance" && <FinanceTab project={p} />}
        {tab === "notes" && <NotesTab project={p} />}
      </div>
    </div>
  );
}

function Stepper({ project: p }: { project: Project }) {
  const confirm = useConfirm();
  const index = PIPELINE.indexOf(p.stage);
  const move = useAction({
    fn: (stage: Stage) => put(`/admin/project/${p.id}`, { stage }),
    invalidate: () => [keys.project(p.id), keys.projects, keys.overview],
    success: (_d, stage) => `Verplaatst naar ${STAGE_LABEL[stage]}`,
  });

  async function go(stage: Stage) {
    if (stage === p.stage) return;
    if (stage === "delivered" && !["delivered", "review", "archived"].includes(p.stage)) {
      const ok = await confirm({ title: "Project leveren?", body: "De klant krijgt een mail dat de galerij klaarstaat.", confirm: "Leveren en mailen" });
      if (!ok) return;
    }
    move.mutate(stage);
  }

  return (
    <div className="s-row">
      <div className="s-stepper" role="group" aria-label="Stap in de pijplijn">
        {PIPELINE.map((s, i) => (
          <button
            key={s}
            type="button"
            className={s === p.stage ? "now" : i < index ? "done" : undefined}
            aria-current={s === p.stage ? "step" : undefined}
            onClick={() => go(s)}
            disabled={move.isPending}
          >
            {STAGE_LABEL[s]}
          </button>
        ))}
      </div>
      {p.stage === "archived" && <span className="s-pill plain">Gearchiveerd</span>}
    </div>
  );
}

function HeaderActions({ project: p }: { project: Project }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const archive = useAction({
    fn: () => put(`/admin/project/${p.id}`, { stage: p.stage === "archived" ? "delivered" : "archived" }),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: p.stage === "archived" ? "Teruggezet uit het archief" : "Gearchiveerd",
  });
  const remove = useAction({
    fn: () => del(`/admin/project/${p.id}`),
    invalidate: () => [keys.projects, keys.overview],
    success: "Project verwijderd",
    onSuccess: () => navigate("/admin/pipeline"),
  });

  return (
    <>
      <Link className="s-btn" to={`/admin/project/${p.id}/gallery`}><Eye size={15} />Voorbeeld als klant</Link>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild><Button iconOnly aria-label="Meer acties" icon={<MoreHorizontal />} /></Popover.Trigger>
        <Popover.Portal>
          <div className="studio" style={{ minHeight: 0 }}>
            <Popover.Content align="end" sideOffset={6} className="s-card" style={{ padding: 6, minWidth: 200, zIndex: 50, boxShadow: "var(--shadow)" }}>
              <button className="s-item" style={{ padding: "8px 10px", gridTemplateColumns: "1fr" }} onClick={() => { setOpen(false); archive.mutate(); }}>
                <span className="t">{p.stage === "archived" ? "Uit archief halen" : "Archiveren"}</span>
              </button>
              <button
                className="s-item"
                style={{ padding: "8px 10px", gridTemplateColumns: "auto 1fr", color: "var(--bad)" }}
                onClick={async () => {
                  setOpen(false);
                  const ok = await confirm({
                    title: "Project verwijderen?",
                    body: "Galerij, berichten, shotlist en afspraken van dit project gaan definitief weg. Dit kan niet ongedaan worden.",
                    confirm: "Definitief verwijderen",
                    danger: true,
                  });
                  if (ok) remove.mutate();
                }}
              >
                <Trash2 size={15} /><span className="t">Verwijderen</span>
              </button>
            </Popover.Content>
          </div>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
