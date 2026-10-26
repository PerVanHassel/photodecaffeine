import { ExternalLink, Eye, EyeOff, ImagePlus, LayoutTemplate, Plus, Save, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { post, put } from "../api";
import { MediaGrid } from "../components/MediaGrid";
import { fmtDate } from "../format";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, isVideo, Modal, PageHead, Photo, Pill, Segmented, SkeletonList, TextField } from "../ui";
import { useUnsavedChanges } from "../unsaved";
import { useUrlState } from "../urlState";
import { AUTOMOTIVE_CATEGORY, AUTOMOTIVE_TITLE, isWork, portfolioKey, useArticles, type Article } from "./pagemaker/data";

export type { Article };

type Filter = "all" | "published" | "draft" | "featured";

export function PortfolioPage() {
  const articles = useArticles();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useUrlState<Filter>("filter", "all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const open = (a: Article) => navigate(`/admin/portfolio/${a.id}`);

  const list = (articles.data || []).filter(isWork);
  const categories = useMemo(() => [...new Set(list.map((a) => a.category).filter(Boolean))].sort(), [list]);
  const rows = list.filter((a) =>
    (filter === "all" || (filter === "published" ? a.published : filter === "draft" ? !a.published : a.featured)) &&
    (!category || a.category === category) &&
    (!q.trim() || `${a.title} ${a.category} ${a.description}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const toggle = useAction({
    fn: (v: { a: Article; patch: Partial<Article> }) => put(`/admin/portfolio/${v.a.id}`, v.patch),
    invalidate: () => [portfolioKey],
    success: (_d, v) => (v.patch.published !== undefined ? (v.patch.published ? "Staat op de site" : "Van de site gehaald") : v.patch.featured ? "Uitgelicht" : "Niet meer uitgelicht"),
  });

  return (
    <div className="s-view">
      <PageHead
        title="Portfolio"
        sub={articles.data ? `${list.filter((a) => a.published).length} van ${list.length} stukken staan op de site.` : " "}
        actions={<Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>Nieuw stuk</Button>}
      />
      <div className="s-row between">
        <div className="s-row">
          <Segmented<Filter> label="Filter" value={filter} onChange={setFilter} options={[
            { value: "all", label: "Alles" }, { value: "published", label: "Op de site" }, { value: "draft", label: "Concept" }, { value: "featured", label: "Uitgelicht" },
          ]} />
          {categories.length > 1 && (
            <div className="s-chips">
              <button type="button" className="s-chip" aria-pressed={!category} onClick={() => setCategory("")}>Alle categorieën</button>
              {categories.map((c) => <button key={c} type="button" className="s-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
            </div>
          )}
        </div>
        <label className="s-searchbox" style={{ width: 240 }}><Search /><input aria-label="Zoek in portfolio" placeholder="Zoek titel of categorie" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      {articles.isError && <ErrorState error={articles.error} retry={() => articles.refetch()} />}
      {articles.isLoading ? <Card bodyClass="none"><SkeletonList rows={4} /></Card> : rows.length === 0 ? (
        <Card><Empty icon={<ImagePlus />} title="Niets gevonden" action={<Button onClick={() => setCreating(true)}>Nieuw stuk</Button>} /></Card>
      ) : (
        <div className="s-grid-cards">
          {rows.map((a) => (
            <article key={a.id} className="s-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <button type="button" onClick={() => open(a)} style={{ border: 0, padding: 0, background: "none", textAlign: "left" }} aria-label={`${a.title} opmaken`}>
                <Photo src={a.coverUrl} video={a.coverType === "video" || isVideo(a.coverUrl)} style={{ borderRadius: 0, aspectRatio: "4/3" }} />
              </button>
              <div className="s-card-body s-stack sm" style={{ flex: 1 }}>
                <div className="s-row between nowrap">
                  <b className="s-truncate">{a.title}</b>
                  {a.featured && <Star size={15} fill="currentColor" style={{ color: "var(--accent)" }} aria-label="Uitgelicht" />}
                </div>
                <span className="s-small s-muted">{a.category || "Geen categorie"} · {a.galleryUrls.length} foto's · {a.page ? "eigen opmaak" : "automatisch"} · {fmtDate(a.updatedAt)}</span>
                <div className="s-row" style={{ marginTop: "auto", paddingTop: 6 }}>
                  <Pill tone={a.published ? "ok" : undefined}>{a.published ? "Op de site" : "Concept"}</Pill>
                  <span className="s-spacer" />
                  <Button size="sm" variant="ghost" iconOnly title={a.published ? "Van de site halen" : "Op de site zetten"} aria-label={a.published ? "Van de site halen" : "Op de site zetten"}
                    icon={a.published ? <EyeOff /> : <Eye />} onClick={() => toggle.mutate({ a, patch: { published: !a.published } })} />
                  <Button size="sm" variant="ghost" iconOnly title={a.featured ? "Niet uitlichten" : "Uitlichten"} aria-label={a.featured ? "Niet uitlichten" : "Uitlichten"}
                    icon={<Star fill={a.featured ? "currentColor" : "none"} />} onClick={() => toggle.mutate({ a, patch: { featured: !a.featured } })} />
                  <Button size="sm" icon={<LayoutTemplate />} onClick={() => open(a)}>Opmaken</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {creating && <NewArticle categories={categories} onClose={() => setCreating(false)} onCreated={open} />}
    </div>
  );
}

/** A new piece starts with a title; the page maker does the rest. */
function NewArticle({ categories, onClose, onCreated }: { categories: string[]; onClose: () => void; onCreated: (a: Article) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useAction({
    fn: () => post<{ article: Article }>("/admin/portfolio", { title, category, description: "", coverUrl: "", coverType: "image", galleryUrls: [], published: false, featured: false }),
    invalidate: () => [portfolioKey],
    success: "Stuk aangemaakt",
    onSuccess: (r) => onCreated(r.article),
  });
  const submit = () => {
    if (!title.trim()) return setError("Geef het stuk een titel.");
    setError(null);
    create.mutate();
  };
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nieuw portfoliostuk"
      description="Daarna zet je er foto's en tekst in en kies je een template."
      footer={
        <>
          <Button onClick={onClose}>Annuleren</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>Aanmaken</Button>
        </>
      }
    >
      <TextField label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} error={error} autoFocus lang="nl" spellCheck
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <TextField label="Categorie" hint="Kies een bestaande of typ een nieuwe" list="new-art-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
      <datalist id="new-art-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
    </Modal>
  );
}

export function AutomotivePage() {
  const articles = useArticles();
  const gallery = (articles.data || []).find((a) => a.title === AUTOMOTIVE_TITLE) || null;
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => { if (articles.data) setUrls(gallery?.galleryUrls || []); }, [articles.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!urls && JSON.stringify(urls) !== JSON.stringify(gallery?.galleryUrls || []);

  // Leaving with unsaved changes asks first.
  useUnsavedChanges(dirty);

  const save = useAction({
    fn: () => {
      const body = { title: AUTOMOTIVE_TITLE, category: AUTOMOTIVE_CATEGORY, coverUrl: urls?.[0] || "", coverType: "image", description: "", galleryUrls: urls, published: true, featured: false };
      return gallery ? put(`/admin/portfolio/${gallery.id}`, body) : post("/admin/portfolio", body);
    },
    invalidate: () => [portfolioKey],
    success: "Automotive-galerij opgeslagen",
  });

  return (
    <div className="s-view">
      <PageHead
        title="Automotive"
        sub="De foto's op de automotive-pagina van de site, in deze volgorde. Sleep om te ordenen."
        actions={
          <>
            <a className="s-btn" href="/services/fotografie/automotive" target="_blank" rel="noreferrer"><ExternalLink size={15} />Bekijk pagina</a>
            <Button variant="primary" icon={<Save />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{dirty ? "Opslaan" : "Opgeslagen"}</Button>
          </>
        }
      />
      {articles.isError && <ErrorState error={articles.error} />}
      <Card>{urls ? <MediaGrid urls={urls} onChange={setUrls} accept="image/*" emptyText="Nog geen foto's op de automotive-pagina." /> : <SkeletonList rows={2} />}</Card>
    </div>
  );
}
