import { motion } from "motion/react";
import { Eye, EyeOff, ImagePlus, Images, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApi, useQuery } from "../useApi";
import { AUTOMOTIVE_GALLERY_ID } from "../../lib/actionItems";
import { BUCKETS, type Article } from "../api";
import { c, dateShort, radius, spring } from "../theme";
import { Card, Chip, Ellipsis, Press, Row, Stack } from "../ui/base";
import { Button, Field, FilePicker, Input, Segmented, Switch, Textarea } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "../ui/Sheet";

/** The automotive gallery is stored as an article; it is not portfolio work. */
const GALLERY_TITLE = "__automotive_gallery__";

type Filter = "all" | "published" | "draft";

const EMPTY_FORM: Partial<Article> = {
  title: "",
  category: "",
  coverUrl: "",
  coverType: "image",
  description: "",
  galleryUrls: [],
  published: false,
  featured: false,
};

export function PortfolioScreen() {
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.articles(), [api]);

  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [menuFor, setMenuFor] = useState<Article | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const articles = useMemo(
    () =>
      (query.data ?? []).filter(
        (a) => a.id !== AUTOMOTIVE_GALLERY_ID && a.title !== GALLERY_TITLE
      ),
    [query.data]
  );

  const counts = useMemo(
    () => ({
      published: articles.filter((a) => a.published).length,
      draft: articles.filter((a) => !a.published).length,
      featured: articles.filter((a) => a.featured && a.published).length,
    }),
    [articles]
  );

  const visible = useMemo(
    () =>
      articles.filter((a) =>
        filter === "published" ? a.published : filter === "draft" ? !a.published : true
      ),
    [articles, filter]
  );

  /** Optimistic flag flip for the publish / featured toggles. */
  async function toggle(article: Article, field: "published" | "featured") {
    const next = !article[field];
    query.set((prev) =>
      (prev ?? []).map((a) => (a.id === article.id ? { ...a, [field]: next } : a))
    );
    try {
      await api.updateArticle(article.id, { [field]: next });
    } catch (err) {
      query.set((prev) =>
        (prev ?? []).map((a) => (a.id === article.id ? { ...a, [field]: !next } : a))
      );
      toast(err instanceof Error ? err.message : "Bijwerken mislukt", "error");
    }
  }

  async function remove(article: Article) {
    const before = query.data;
    query.set((prev) => (prev ?? []).filter((a) => a.id !== article.id));
    setPendingDelete(null);
    try {
      await api.deleteArticle(article.id);
      toast("Artikel verwijderd", "success");
    } catch (err) {
      if (before) query.set(before);
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <Screen
      title="Portfolio"
      eyebrow={`${counts.published} gepubliceerd · ${counts.featured}/6 uitgelicht`}
      back="/app/more"
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction
          label="Nieuw artikel"
          icon={<Plus size={21} />}
          tone={c.copper}
          onClick={() => setEditing({ ...EMPTY_FORM })}
        />
      }
      hero={
        <div style={{ marginBottom: 18 }}>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "all", label: "Alles", badge: articles.length },
              { value: "published", label: "Live", badge: counts.published },
              { value: "draft", label: "Concept", badge: counts.draft },
            ]}
          />
        </div>
      }
    >
      {query.loading ? (
        <SkeletonList rows={4} height={96} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : visible.length === 0 ? (
        <Empty
          icon={<Images size={22} />}
          title={filter === "all" ? "Nog geen werk" : "Niets in deze weergave"}
          body="Voeg een project toe zodat bezoekers zien wat je maakt."
          action={{ label: "Artikel toevoegen", onClick: () => setEditing({ ...EMPTY_FORM }) }}
        />
      ) : (
        <Stack gap={10}>
          {visible.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: Math.min(i, 8) * 0.03 }}
            >
              <Card padded={false} style={{ overflow: "hidden" }}>
                <Row gap={0} align="stretch">
                  <div
                    style={{
                      width: 96,
                      flexShrink: 0,
                      backgroundColor: c.surface2,
                      position: "relative",
                    }}
                  >
                    {a.coverUrl ? (
                      a.coverType === "video" ? (
                        <video
                          src={a.coverUrl}
                          muted
                          playsInline
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <img
                          src={a.coverUrl}
                          alt=""
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      )
                    ) : (
                      <div style={{ display: "grid", placeItems: "center", height: "100%", color: c.fg4 }}>
                        <Images size={20} />
                      </div>
                    )}
                    {a.featured && (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: c.copper,
                          color: "#1a0c04",
                        }}
                      >
                        <Star size={11} fill="#1a0c04" strokeWidth={0} />
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, padding: 13 }}>
                    <Ellipsis style={{ fontSize: 14, fontWeight: 650, color: c.fg }}>
                      {a.title || "Zonder titel"}
                    </Ellipsis>
                    <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 3 }}>
                      {a.category || "Geen categorie"} · {dateShort(a.createdAt)}
                    </Ellipsis>

                    <Row gap={7} style={{ marginTop: 9 }}>
                      <Chip tone={a.published ? "ok" : "neutral"}>
                        {a.published ? "Live" : "Concept"}
                      </Chip>
                      {!!a.galleryUrls?.length && (
                        <Chip tone="neutral">{a.galleryUrls.length}</Chip>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                        <Press
                          onClick={() => toggle(a, "published")}
                          aria-label={a.published ? "Depubliceren" : "Publiceren"}
                          style={{
                            width: 34,
                            height: 34,
                            display: "grid",
                            placeItems: "center",
                            color: a.published ? c.ok : c.fg4,
                          }}
                        >
                          {a.published ? <Eye size={15} /> : <EyeOff size={15} />}
                        </Press>
                        <Press
                          onClick={() => toggle(a, "featured")}
                          aria-label="Uitlichten"
                          style={{
                            width: 34,
                            height: 34,
                            display: "grid",
                            placeItems: "center",
                            color: a.featured ? c.copper : c.fg4,
                          }}
                        >
                          <Star size={15} fill={a.featured ? c.copper : "none"} />
                        </Press>
                        <Press
                          onClick={() => setMenuFor(a)}
                          aria-label="Meer"
                          style={{
                            width: 34,
                            height: 34,
                            display: "grid",
                            placeItems: "center",
                            color: c.fg3,
                          }}
                        >
                          <Pencil size={15} />
                        </Press>
                      </div>
                    </Row>
                  </div>
                </Row>
              </Card>
            </motion.div>
          ))}
        </Stack>
      )}

      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        actions={[
          {
            label: "Bewerken",
            icon: <Pencil size={17} />,
            onClick: () => menuFor && setEditing(menuFor),
          },
          {
            label: "Verwijderen",
            icon: <Trash2 size={17} />,
            onClick: () => menuFor && setPendingDelete(menuFor),
            destructive: true,
          },
        ]}
      />

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title={`${pendingDelete?.title} verwijderen?`}
        body="Het artikel verdwijnt van de site. De geüploade beelden blijven in de opslag staan."
      />

      <ArticleSheet
        article={editing}
        knownCategories={[...new Set(articles.map((a) => a.category).filter(Boolean))]}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          query.refresh();
        }}
      />
    </Screen>
  );
}

function ArticleSheet({
  article,
  knownCategories,
  onClose,
  onSaved,
}: {
  article: Partial<Article> | null;
  knownCategories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useApi();
  const toast = useToast();

  const [form, setForm] = useState<Partial<Article>>(article ?? EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);

  // Keyed remount (see the `key` on this component's call site) would be the
  // other option; syncing on identity change keeps the sheet's exit animation.
  const [seededFor, setSeededFor] = useState<string | undefined>(article?.id);
  if (article && seededFor !== article.id) {
    setSeededFor(article.id);
    setForm(article);
  }

  function patch(updates: Partial<Article>) {
    setForm((f) => ({ ...f, ...updates }));
  }

  async function uploadCover(files: File[]) {
    setUploading("cover");
    try {
      const url = await api.upload(files[0], BUCKETS.images);
      patch({ coverUrl: url, coverType: files[0].type.startsWith("video") ? "video" : "image" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload mislukt", "error");
    } finally {
      setUploading(null);
    }
  }

  async function uploadGallery(files: File[]) {
    setUploading("gallery");
    const added: string[] = [];
    for (const file of files) {
      try {
        added.push(await api.upload(file, BUCKETS.images));
      } catch {
        toast(`${file.name} mislukt`, "error");
      }
    }
    if (added.length) patch({ galleryUrls: [...(form.galleryUrls ?? []), ...added] });
    setUploading(null);
  }

  async function save() {
    if (!form.title?.trim()) {
      toast("Geef het artikel een titel", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category ?? "",
        coverUrl: form.coverUrl ?? "",
        coverType: form.coverType ?? "image",
        description: form.description ?? "",
        galleryUrls: form.galleryUrls ?? [],
        published: !!form.published,
        featured: !!form.featured,
      };
      if (form.id) await api.updateArticle(form.id, payload);
      else await api.createArticle(payload);
      toast("Opgeslagen", "success");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!article}
      onClose={onClose}
      title={article?.id ? "Artikel bewerken" : "Nieuw artikel"}
      footer={
        <Button full busy={busy} onClick={save}>
          Opslaan
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={form.title ?? ""}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Bijv. BMW M4 — nachtshoot"
          />
        </Field>

        <Field label="Categorie" hint={knownCategories.length ? "Bestaand of nieuw" : undefined}>
          <Input
            value={form.category ?? ""}
            onChange={(e) => patch({ category: e.target.value })}
            list="pdc-categories"
            placeholder="Automotive"
          />
          <datalist id="pdc-categories">
            {knownCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </Field>

        <Field label="Cover">
          <FilePicker onFiles={uploadCover} accept="image/*,video/*" busy={uploading === "cover"}>
            <div
              style={{
                position: "relative",
                height: 150,
                borderRadius: radius.md,
                border: `1px dashed ${form.coverUrl ? c.line : c.line2}`,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                backgroundColor: c.surface,
                color: c.fg3,
              }}
            >
              {form.coverUrl ? (
                form.coverType === "video" ? (
                  <video
                    src={form.coverUrl}
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={form.coverUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )
              ) : (
                <Row gap={8}>
                  <ImagePlus size={18} color={c.copper} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {uploading === "cover" ? "Uploaden…" : "Cover kiezen"}
                  </span>
                </Row>
              )}
            </div>
          </FilePicker>
        </Field>

        <Field label="Omschrijving">
          <Textarea
            value={form.description ?? ""}
            onChange={(e) => patch({ description: e.target.value })}
            rows={4}
          />
        </Field>

        <Field label={`Galerij${form.galleryUrls?.length ? ` · ${form.galleryUrls.length}` : ""}`}>
          <Stack gap={10}>
            {!!form.galleryUrls?.length && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                {form.galleryUrls.map((url) => (
                  <div key={url} style={{ position: "relative", aspectRatio: "1" }}>
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: radius.sm,
                        border: `1px solid ${c.line}`,
                      }}
                    />
                    <Press
                      onClick={() =>
                        patch({ galleryUrls: (form.galleryUrls ?? []).filter((u) => u !== url) })
                      }
                      aria-label="Verwijderen"
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: c.danger,
                        color: "#fff",
                      }}
                    >
                      <X size={11} strokeWidth={3} />
                    </Press>
                  </div>
                ))}
              </div>
            )}
            <FilePicker
              onFiles={uploadGallery}
              accept="image/*"
              multiple
              busy={uploading === "gallery"}
            >
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  minHeight: 46,
                  borderRadius: radius.md,
                  border: `1px dashed ${c.line2}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: c.fg3,
                }}
              >
                {uploading === "gallery" ? "Uploaden…" : "Foto's toevoegen"}
              </div>
            </FilePicker>
          </Stack>
        </Field>

        <Card style={{ padding: "4px 14px" }}>
          <Switch
            checked={!!form.published}
            onChange={(v) => patch({ published: v })}
            label="Gepubliceerd"
            description="Zichtbaar op de portfoliopagina"
          />
          <Switch
            checked={!!form.featured}
            onChange={(v) => patch({ featured: v })}
            label="Uitgelicht"
            description="Kandidaat voor de homepage (max. 6)"
          />
        </Card>
      </Stack>
    </Sheet>
  );
}
