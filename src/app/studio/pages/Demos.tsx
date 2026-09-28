import { Copy, ExternalLink, Globe } from "lucide-react";
import { Link } from "react-router";
import { DEMOS } from "../../demos/registry";
import { put } from "../api";
import { keys, useAction, useProjects } from "../queries";
import type { Project } from "../types";
import { Button, Card, Empty, PageHead, Pill, Select, SkeletonList } from "../ui";
import { copyText } from "./Money";

/**
 * The website demos built into this site. Each is shown at /demo/<slug> only
 * while the web project it is attached to has it switched on.
 */
export function DemosPage() {
  const projects = useProjects();
  const web = (projects.data || []).filter((p) => p.type === "web");
  const owner = (slug: string) => web.find((p) => p.demos.some((d) => d.slug === slug));

  const setDemos = useAction({
    fn: (v: { project: Project; demos: { slug: string; live: boolean }[] }) => put(`/admin/project/${v.project.id}`, { demos: v.demos }),
    invalidate: () => [keys.projects],
    success: "Bijgewerkt",
  });

  function attach(slug: string, projectId: string) {
    const current = owner(slug);
    if (current) setDemos.mutate({ project: current, demos: current.demos.filter((d) => d.slug !== slug) });
    const target = web.find((p) => p.id === projectId);
    if (target) setDemos.mutate({ project: target, demos: [...target.demos, { slug, live: false }] });
  }

  return (
    <div className="s-view">
      <PageHead title="Webdemo's" sub="Demo's staan pas online als je ze bij het project aanzet. Tot die tijd zie alleen jij ze." />
      {projects.isLoading ? <Card bodyClass="none"><SkeletonList rows={3} /></Card> : DEMOS.length === 0 ? <Card><Empty icon={<Globe />} title="Nog geen demo's" /></Card> : (
        <div className="s-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {DEMOS.map((d) => {
            const p = owner(d.slug);
            const live = !!p?.demos.find((x) => x.slug === d.slug)?.live;
            const url = `https://www.photodecaffeine.com/demo/${d.slug}`;
            return (
              <Card key={d.slug} title={<h2 className="s-truncate">{d.name}</h2>} action={<Pill tone={live ? "ok" : undefined}>{live ? "Online" : "Offline"}</Pill>}>
                <div className="s-stack">
                  <p className="s-small s-muted">{d.description}</p>
                  <span className="s-mono s-small s-faint">/demo/{d.slug}</span>
                  <Select aria-label="Project" value={p?.id || ""} onChange={(e) => e.target.value && attach(d.slug, e.target.value)}>
                    <option value="">Nog niet aan een project gekoppeld</option>
                    {web.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </Select>
                  <div className="s-row">
                    {p && (
                      <Button size="sm" variant={live ? "default" : "primary"} loading={setDemos.isPending}
                        onClick={() => setDemos.mutate({ project: p, demos: p.demos.map((x) => (x.slug === d.slug ? { ...x, live: !x.live } : x)) })}>
                        {live ? "Offline halen" : "Online zetten"}
                      </Button>
                    )}
                    <a className="s-btn sm" href={`/demo/${d.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Bekijk</a>
                    <Button size="sm" variant="ghost" icon={<Copy />} onClick={() => copyText(url)}>Link</Button>
                    {p && <Link className="s-btn ghost sm" to={`/admin/project/${p.id}`}>Project</Link>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
