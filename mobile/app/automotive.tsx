import { useMemo, useState } from "react";
import { useApi, useQuery } from "@/useApi";
import { BUCKETS, type Article } from "@/api";
import { pickImages } from "@/pickers";
import { Stack } from "@/ui/base";
import { PickTarget } from "@/ui/form";
import { Gallery } from "@/ui/Gallery";
import { Empty, ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { Screen } from "@/ui/Screen";
import { ConfirmSheet } from "@/ui/Sheet";

/**
 * The automotive gallery is stored as one portfolio article with a reserved
 * title and category rather than in its own collection — that is how the
 * website's admin panel and the public automotive page already read it, so this
 * follows the same convention instead of introducing a second source.
 */
const GALLERY_TITLE = "__automotive_gallery__";
const GALLERY_CATEGORY = "_automotive-gallery";

export default function AutomotiveScreen() {
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.articles(), [api]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const gallery = useMemo<Article | undefined>(
    () => (query.data ?? []).find((a) => a.title === GALLERY_TITLE),
    [query.data]
  );

  const urls = gallery?.galleryUrls ?? [];

  /** Creates the holder article on first upload, updates it thereafter. */
  async function persist(nextUrls: string[]) {
    if (gallery) {
      const saved = await api.updateArticle(gallery.id, { galleryUrls: nextUrls });
      query.set((prev) => (prev ?? []).map((a) => (a.id === saved.id ? saved : a)));
      return;
    }
    const created = await api.createArticle({
      title: GALLERY_TITLE,
      category: GALLERY_CATEGORY,
      coverUrl: nextUrls[0] ?? "",
      coverType: "image",
      description: "",
      galleryUrls: nextUrls,
      published: true,
      featured: false,
    });
    query.set((prev) => [...(prev ?? []), created]);
  }

  async function upload() {
    let assets;
    try {
      assets = await pickImages(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon fotobibliotheek niet openen", "error");
      return;
    }
    if (!assets?.length) return;

    setUploading(true);
    setProgress({ done: 0, total: assets.length });

    const added: string[] = [];
    for (const asset of assets) {
      try {
        added.push(await api.upload(asset, BUCKETS.images));
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload mislukt", "error");
      }
    }

    if (added.length) {
      try {
        await persist([...urls, ...added]);
        toast(`${added.length} foto${added.length === 1 ? "" : "'s"} toegevoegd`, "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
      }
    }

    setUploading(false);
    setProgress({ done: 0, total: 0 });
  }

  async function remove(url: string) {
    setPendingRemove(null);
    try {
      await persist(urls.filter((u) => u !== url));
      toast("Foto verwijderd", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
      // The list is derived from the server copy, so a failed write leaves the
      // photo in place once this re-read lands.
      query.refresh();
    }
  }

  return (
    <Screen
      title="Automotive"
      eyebrow={`${urls.length} foto${urls.length === 1 ? "" : "'s"} op de dienstenpagina`}
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      {query.loading ? (
        <SkeletonList rows={3} height={90} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : (
        <Stack gap={18}>
          <PickTarget
            onPress={upload}
            busy={uploading}
            label={
              uploading && progress.total
                ? `Uploaden… ${progress.done}/${progress.total}`
                : "Foto's toevoegen"
            }
            hint="Verschijnen direct op /services/automotive"
          />

          {urls.length === 0 ? (
            <Empty
              icon="truck"
              title="Galerij is leeg"
              body="Voeg je sterkste automotive-werk toe — dit is wat bezoekers van de dienstenpagina zien."
            />
          ) : (
            <Gallery urls={urls} onDelete={(url) => setPendingRemove(url)} />
          )}
        </Stack>
      )}

      <ConfirmSheet
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove && remove(pendingRemove)}
        title="Foto verwijderen?"
        body="De foto verdwijnt van de automotive-pagina."
      />
    </Screen>
  );
}
