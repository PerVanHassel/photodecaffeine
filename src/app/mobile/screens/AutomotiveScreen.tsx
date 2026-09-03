import { AnimatePresence, motion } from "motion/react";
import { Car, ImagePlus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApi, useQuery } from "../useApi";
import { BUCKETS, type Article } from "../api";
import { c, radius, spring } from "../theme";
import { haptic } from "../haptics";
import { Card, Press, Stack } from "../ui/base";
import { FilePicker } from "../ui/form";
import { Empty, ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { Screen } from "../ui/Screen";
import { ConfirmSheet } from "../ui/Sheet";

/**
 * The automotive gallery is stored as a single portfolio article with a
 * reserved title/category rather than in its own collection — that is how the
 * desktop panel and the public automotive page already read it, so the app
 * follows the same convention instead of introducing a second source.
 */
const GALLERY_TITLE = "__automotive_gallery__";
const GALLERY_CATEGORY = "_automotive-gallery";

export function AutomotiveScreen() {
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.articles(), [api]);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lightbox, setLightbox] = useState<string | null>(null);
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

  async function upload(files: File[]) {
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    const added: string[] = [];
    for (const file of files) {
      try {
        added.push(await api.upload(file, BUCKETS.images));
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast(err instanceof Error ? `${file.name}: ${err.message}` : `${file.name} mislukt`, "error");
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
    setLightbox(null);
    const before = urls;
    try {
      await persist(urls.filter((u) => u !== url));
      toast("Foto verwijderd", "success");
    } catch (err) {
      await persist(before).catch(() => {});
      toast(err instanceof Error ? err.message : "Verwijderen mislukt", "error");
    }
  }

  return (
    <Screen
      title="Automotive"
      eyebrow={`${urls.length} foto${urls.length === 1 ? "" : "'s"} op de dienstenpagina`}
      back="/app/more"
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
          <FilePicker onFiles={upload} accept="image/*" multiple busy={uploading}>
            <Card
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 96,
                borderStyle: "dashed",
                borderColor: c.line2,
              }}
            >
              {uploading ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 650, color: c.fg }}>
                    Uploaden… {progress.done}/{progress.total}
                  </span>
                  <div style={{ width: 140, height: 4, borderRadius: 999, backgroundColor: c.line }}>
                    <motion.div
                      animate={{
                        width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
                      }}
                      transition={spring.smooth}
                      style={{ height: "100%", borderRadius: 999, backgroundColor: c.copper }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={22} color={c.copper} />
                  <span style={{ fontSize: 13, fontWeight: 650, color: c.fg }}>
                    Foto's toevoegen
                  </span>
                  <span style={{ fontSize: 11.5, color: c.fg4 }}>
                    Verschijnen direct op /services/automotive
                  </span>
                </>
              )}
            </Card>
          </FilePicker>

          {urls.length === 0 ? (
            <Empty
              icon={<Car size={22} />}
              title="Galerij is leeg"
              body="Voeg je sterkste automotive-werk toe — dit is wat bezoekers van de dienstenpagina zien."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {urls.map((url, i) => (
                <motion.button
                  key={url}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...spring.smooth, delay: Math.min(i, 12) * 0.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    haptic("tap");
                    setLightbox(url);
                  }}
                  style={{
                    aspectRatio: "1",
                    border: `1px solid ${c.line}`,
                    borderRadius: radius.sm,
                    overflow: "hidden",
                    padding: 0,
                    background: c.surface,
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </motion.button>
              ))}
            </div>
          )}
        </Stack>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 250,
              backgroundColor: "rgba(0,0,0,0.94)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "calc(env(safe-area-inset-top, 0px) + 8px) 8px 8px",
              }}
            >
              <Press
                onClick={() => setLightbox(null)}
                aria-label="Sluiten"
                style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "#fff" }}
              >
                <X size={22} />
              </Press>
              <Press
                onClick={() => setPendingRemove(lightbox)}
                feedback="warning"
                aria-label="Verwijderen"
                style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: c.danger }}
              >
                <Trash2 size={20} />
              </Press>
            </div>
            <motion.img
              src={lightbox}
              alt=""
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring.smooth}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => Math.abs(info.offset.y) > 110 && setLightbox(null)}
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                objectFit: "contain",
                padding: "0 8px calc(env(safe-area-inset-bottom, 0px) + 16px)",
                boxSizing: "border-box",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
