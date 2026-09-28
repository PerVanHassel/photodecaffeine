import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff, ImagePlus, Plus, Save, Search, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { del, get, post, put } from "../api";
import { MediaGrid, uploadPublic } from "../components/MediaGrid";
import { fmtDate } from "../format";
import { useAction } from "../queries";
import { Button, Card, Empty, ErrorState, Field, Input, isVideo, PageHead, Photo, Pill, Segmented, Sheet, SkeletonList, TextAreaField, TextField, useConfirm } from "../ui";

// Portfolio articles and the automotive gallery live in the kv store; the
// automotive gallery is one special article that the public page looks up by
// its title.
export type Article = {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

const AUTOMOTIVE_TITLE = "__automotive_gallery__";
const AUTOMOTIVE_CATEGORY = "_automotive-gallery";
const portfolioKey = ["portfolio"] as const;

function useArticles() {
  return useQuery({
    queryKey: portfolioKey,
    queryFn: ({ signal }) => get<{ articles: Article[] }>("/admin/portfolio", signal).then((r) => r.articles || []),
  });
}

type Filter = "all" | "published" | "draft" | "featured";

export function PortfolioPage() {
  const articles = useArticles();
  const [editing, setEditing] = useState<Article | "new" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  const list = (articles.data || []).filter((a) => a.title !== AUTOMOTIVE_TITLE && !a.category.startsWith("_"));
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
        actions={<Button variant="primary" icon={<Plus />} onClick={() => setEditing("new")}>Nieuw stuk</Button>}
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
        <Card><Empty icon={<ImagePlus />} title="Niets gevonden" action={<Button onClick={() => setEditing("new")}>Nieuw stuk</Button>} /></Card>
      ) : (
        <div className="s-grid-cards">
          {rows.map((a) => (
            <article key={a.id} className="s-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <button type="button" onClick={() => setEditing(a)} style={{ border: 0, padding: 0, background: "none", textAlign: "left" }} aria-label={`${a.title} bewerken`}>
                <Photo src={a.coverUrl} video={a.coverType === "video" || isVideo(a.coverUrl)} style={{ borderRadius: 0, aspectRatio: "4/3" }} />
              </button>
              <div className="s-card-body s-stack sm" style={{ flex: 1 }}>
                <div className="s-row between nowrap">
                  <b className="s-truncate">{a.title}</b>
                  {a.featured && <Star size={15} fill="currentColor" style={{ color: "var(--accent)" }} aria-label="Uitgelicht" />}
                </div>
                <span className="s-small s-muted">{a.category || "Geen categorie"} · {a.galleryUrls.length} foto's · {fmtDate(a.updatedAt)}</span>
                <div className="s-row" style={{ marginTop: "auto", paddingTop: 6 }}>
                  <Pill tone={a.published ? "ok" : undefined}>{a.published ? "Op de site" : "Concept"}</Pill>
                  <span className="s-spacer" />
                  <Button size="sm" variant="ghost" iconOnly title={a.published ? "Van de site halen" : "Op de site zetten"} aria-label={a.published ? "Van de site halen" : "Op de site zetten"}
                    icon={a.published ? <EyeOff /> : <Eye />} onClick={() => toggle.mutate({ a, patch: { published: !a.published } })} />
                  <Button size="sm" variant="ghost" iconOnly title={a.featured ? "Niet uitlichten" : "Uitlichten"} aria-label={a.featured ? "Niet uitlichten" : "Uitlichten"}
                    icon={<Star fill={a.featured ? "currentColor" : "none"} />} onClick={() => toggle.mutate({ a, patch: { featured: !a.featured } })} />
                  <Button size="sm" onClick={() => setEditing(a)}>Bewerken</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <ArticleEditor article={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ArticleEditor({ article, categories, onClose }: { article: Article | null; categories: string[]; onClose: () => void }) {
  const confirm = useConfirm();
  const coverInput = useRef<HTMLInputElement>(null);
  const [f, setF] = useState(() => ({
    title: article?.title || "",
    category: article?.category || "",
    description: article?.description || "",
    coverUrl: article?.coverUrl || "",
    coverType: article?.coverType || ("image" as "image" | "video"),
    galleryUrls: article?.galleryUrls || [],
    published: article?.published ?? false,
    featured: article?.featured ?? false,
  }));
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useAction({
    fn: () => (article ? put(`/admin/portfolio/${article.id}`, f) : post("/admin/portfolio", f)),
    invalidate: () => [portfolioKey],
    success: article ? "Opgeslagen" : "Stuk aangemaakt",
    onSuccess: onClose,
  });
  const remove = useAction({ fn: () => del(`/admin/portfolio/${article!.id}`), invalidate: () => [portfolioKey], success: "Verwijderd", onSuccess: onClose });

  async function setCover(file: File) {
    setUploadingCover(true);
    try {
      const url = await uploadPublic(file);
      setF((x) => ({ ...x, coverUrl: url, coverType: file.type.startsWith("video/") ? "video" : "image" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={article ? article.title : "Nieuw portfoliostuk"}
      footer={
        <>
          {article && (
            <Button variant="danger" icon={<Trash2 />} style={{ marginRight: "auto" }} loading={remove.isPending}
              onClick={async () => { if (await confirm({ title: `${article.title} verwijderen?`, body: "Het verdwijnt meteen van de site.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>
              Verwijderen
            </Button>
          )}
          {article?.published && <a className="s-btn ghost" href={`/portfolio/${article.id}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />Bekijk</a>}
          <Button variant="primary" icon={<Save />} loading={save.isPending} onClick={() => { if (!f.title.trim()) return setError("Geef het stuk een titel."); setError(null); save.mutate(); }}>Opslaan</Button>
        </>
      }
    >
      <TextField label="Titel" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Field label="Categorie" htmlFor="art-cat" hint="Kies een bestaande of typ een nieuwe">
        <Input id="art-cat" list="art-categories" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <datalist id="art-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <TextAreaField label="Tekst" rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <Field label="Omslag">
        <div className="s-row nowrap" style={{ alignItems: "flex-start" }}>
          <Photo src={f.coverUrl} video={f.coverType === "video"} style={{ width: 180, flex: "none" }} />
          <div className="s-stack sm">
            <Button size="sm" icon={<ImagePlus />} loading={uploadingCover} onClick={() => coverInput.current?.click()}>{f.coverUrl ? "Vervangen" : "Uploaden"}</Button>
            <span className="s-small s-faint">Foto of video. Of kies hieronder een foto met de ster.</span>
          </div>
        </div>
        <input ref={coverInput} type="file" accept="image/*,video/mp4,video/quicktime" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) setCover(file); e.target.value = ""; }} />
      </Field>
      <Field label={`Galerij (${f.galleryUrls.length})`}>
        <MediaGrid urls={f.galleryUrls} onChange={(galleryUrls) => setF({ ...f, galleryUrls })} cover={f.coverUrl}
          onCover={(u) => setF({ ...f, coverUrl: u, coverType: isVideo(u) ? "video" : "image" })} />
      </Field>
      <label className="s-check"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Op de site zetten</label>
      <label className="s-check"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Uitlichten (bovenaan en in mails)</label>
      {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
    </Sheet>
  );
}

export function AutomotivePage() {
  const articles = useArticles();
  const gallery = (articles.data || []).find((a) => a.title === AUTOMOTIVE_TITLE) || null;
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => { if (articles.data) setUrls(gallery?.galleryUrls || []); }, [articles.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!urls && JSON.stringify(urls) !== JSON.stringify(gallery?.galleryUrls || []);

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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
            <a className="s-btn" href="/services/automotive" target="_blank" rel="noreferrer"><ExternalLink size={15} />Bekijk pagina</a>
            <Button variant="primary" icon={<Save />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{dirty ? "Opslaan" : "Opgeslagen"}</Button>
          </>
        }
      />
      {articles.isError && <ErrorState error={articles.error} />}
      <Card>{urls ? <MediaGrid urls={urls} onChange={setUrls} accept="image/*" emptyText="Nog geen foto's op de automotive-pagina." /> : <SkeletonList rows={2} />}</Card>
    </div>
  );
}
