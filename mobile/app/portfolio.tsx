import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { AUTOMOTIVE_GALLERY_ID } from "@shared/actionItems";
import { useApi, useQuery } from "@/useApi";
import { BUCKETS, type Article } from "@/api";
import { pickImages, pickMedia } from "@/pickers";
import { useColors } from "@/ThemeContext";
import { dateShort, radius } from "@/theme";
import { Card, Chip, Press, Row, Stack, Txt } from "@/ui/base";
import { Button, Field, Input, PickTarget, Segmented, Switch } from "@/ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";
import { ActionSheet, ConfirmSheet, Sheet } from "@/ui/Sheet";

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

export default function PortfolioScreen() {
  const c = useColors();
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.articles(), [api]);

  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [menuFor, setMenuFor] = useState<Article | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const articles = useMemo(
    () =>
      (query.data ?? []).filter((a) => a.id !== AUTOMOTIVE_GALLERY_ID && a.title !== GALLERY_TITLE),
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

  /** Optimistic flag flip for the publish and featured toggles. */
  async function toggle(article: Article, field: "published" | "featured") {
    const next = !article[field];
    query.set((prev) => (prev ?? []).map((a) => (a.id === article.id ? { ...a, [field]: next } : a)));
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
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        <HeaderAction
          label="Nieuw artikel"
          icon="plus"
          onPress={() => setEditing({ ...EMPTY_FORM })}
        />
      }
      hero={
        <View style={{ marginBottom: 18 }}>
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v)}
            options={[
              { value: "all", label: "Alles", badge: articles.length },
              { value: "published", label: "Live", badge: counts.published },
              { value: "draft", label: "Concept", badge: counts.draft },
            ]}
          />
        </View>
      }
    >
      {query.loading ? (
        <SkeletonList rows={4} height={96} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : visible.length === 0 ? (
        <Empty
          icon="image"
          title={filter === "all" ? "Nog geen werk" : "Niets in deze weergave"}
          body="Voeg een project toe zodat bezoekers zien wat je maakt."
          action={{ label: "Artikel toevoegen", onPress: () => setEditing({ ...EMPTY_FORM }) }}
        />
      ) : (
        <Stack gap={10}>
          {visible.map((a, i) => (
            <Animated.View
              key={a.id}
              layout={LinearTransition.springify().damping(22)}
              entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().damping(20)}
            >
              <Card padded={false}>
                <Row gap={0} align="stretch">
                  <View style={{ width: 96, backgroundColor: c.surface2 }}>
                    {a.coverUrl ? (
                      <Image
                        source={{ uri: a.coverUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="image" size={20} color={c.fg4} />
                      </View>
                    )}
                    {a.featured && (
                      <View
                        style={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: c.copper,
                        }}
                      >
                        <Feather name="star" size={11} color="#1a0c04" />
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, padding: 13 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>
                      {a.title || "Zonder titel"}
                    </Text>
                    <Txt variant="meta" numberOfLines={1} style={{ fontSize: 11.5, marginTop: 3 }}>
                      {`${a.category || "Geen categorie"} · ${dateShort(a.createdAt)}`}
                    </Txt>

                    <Row gap={7} style={{ marginTop: 9 }}>
                      <Chip tone={a.published ? "ok" : "neutral"}>
                        {a.published ? "Live" : "Concept"}
                      </Chip>
                      {!!a.galleryUrls?.length && (
                        <Chip tone="neutral">{String(a.galleryUrls.length)}</Chip>
                      )}
                      <View style={{ flex: 1 }} />
                      <Press
                        onPress={() => toggle(a, "published")}
                        accessibilityLabel={a.published ? "Depubliceren" : "Publiceren"}
                        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather
                          name={a.published ? "eye" : "eye-off"}
                          size={15}
                          color={a.published ? c.ok : c.fg4}
                        />
                      </Press>
                      <Press
                        onPress={() => toggle(a, "featured")}
                        accessibilityLabel="Uitlichten"
                        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather name="star" size={15} color={a.featured ? c.copper : c.fg4} />
                      </Press>
                      <Press
                        onPress={() => setMenuFor(a)}
                        accessibilityLabel="Meer"
                        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                      >
                        <Feather name="edit-2" size={15} color={c.fg3} />
                      </Press>
                    </Row>
                  </View>
                </Row>
              </Card>
            </Animated.View>
          ))}
        </Stack>
      )}

      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        actions={[
          { label: "Bewerken", icon: "edit-2", onPress: () => menuFor && setEditing(menuFor) },
          {
            label: "Verwijderen",
            icon: "trash-2",
            onPress: () => menuFor && setPendingDelete(menuFor),
            destructive: true,
          },
        ]}
      />

      <ConfirmSheet
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete)}
        title={`${pendingDelete?.title ?? "Artikel"} verwijderen?`}
        body="Het artikel verdwijnt van de site. De geüploade beelden blijven in de opslag staan."
      />

      <ArticleSheet
        article={editing}
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
  onClose,
  onSaved,
}: {
  article: Partial<Article> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useColors();
  const api = useApi();
  const toast = useToast();

  const [form, setForm] = useState<Partial<Article>>(article ?? EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "gallery" | null>(null);
  const [seededFor, setSeededFor] = useState<string | undefined>(article?.id);

  // Re-seed when a different article is opened, without remounting (which would
  // lose the sheet's exit animation).
  if (article && seededFor !== article.id) {
    setSeededFor(article.id);
    setForm(article);
  }

  function patch(updates: Partial<Article>) {
    setForm((f) => ({ ...f, ...updates }));
  }

  async function uploadCover() {
    let assets;
    try {
      assets = await pickMedia();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon media niet openen", "error");
      return;
    }
    if (!assets?.length) return;

    setUploading("cover");
    try {
      const url = await api.upload(assets[0], BUCKETS.images);
      patch({ coverUrl: url, coverType: assets[0].type?.startsWith("video") ? "video" : "image" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload mislukt", "error");
    } finally {
      setUploading(null);
    }
  }

  async function uploadGallery() {
    let assets;
    try {
      assets = await pickImages(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon fotobibliotheek niet openen", "error");
      return;
    }
    if (!assets?.length) return;

    setUploading("gallery");
    const added: string[] = [];
    for (const asset of assets) {
      try {
        added.push(await api.upload(asset, BUCKETS.images));
      } catch {
        toast(`${asset.name} mislukt`, "error");
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
        <Button full busy={busy} onPress={save}>
          Opslaan
        </Button>
      }
    >
      <Stack gap={14} style={{ paddingBottom: 4 }}>
        <Field label="Titel">
          <Input
            value={form.title ?? ""}
            onChangeText={(v) => patch({ title: v })}
            placeholder="Bijv. BMW M4 — nachtshoot"
          />
        </Field>

        <Field label="Categorie">
          <Input
            value={form.category ?? ""}
            onChangeText={(v) => patch({ category: v })}
            placeholder="Automotive"
          />
        </Field>

        <Field label="Cover">
          <PickTarget
            onPress={uploadCover}
            busy={uploading === "cover"}
            label="Cover kiezen"
            height={150}
            active={!!form.coverUrl}
          >
            {form.coverUrl ? (
              <Image
                source={{ uri: form.coverUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : undefined}
          </PickTarget>
        </Field>

        <Field label="Omschrijving">
          <Input
            value={form.description ?? ""}
            onChangeText={(v) => patch({ description: v })}
            multiline
          />
        </Field>

        <Field label={form.galleryUrls?.length ? `Galerij · ${form.galleryUrls.length}` : "Galerij"}>
          <Stack gap={10}>
            {!!form.galleryUrls?.length && (
              <Row gap={5} style={{ flexWrap: "wrap" }}>
                {form.galleryUrls.map((url) => (
                  <View key={url}>
                    <Image
                      source={{ uri: url }}
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: radius.sm,
                        borderWidth: StyleSheet.hairlineWidth * 2,
                        borderColor: c.line,
                      }}
                    />
                    <Press
                      onPress={() =>
                        patch({ galleryUrls: (form.galleryUrls ?? []).filter((u) => u !== url) })
                      }
                      accessibilityLabel="Verwijderen"
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: c.danger,
                      }}
                    >
                      <Feather name="x" size={12} color="#fff" />
                    </Press>
                  </View>
                ))}
              </Row>
            )}
            <PickTarget
              onPress={uploadGallery}
              busy={uploading === "gallery"}
              label="Foto's toevoegen"
              height={52}
            />
          </Stack>
        </Field>

        <Card style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
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
