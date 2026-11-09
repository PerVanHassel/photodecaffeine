import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownToLine, Check, ChevronLeft, ChevronRight, Download, EyeOff, FolderInput, Heart, ImagePlus, Mail, MegaphoneOff, Search,
  ShoppingBag, Sparkles, Star, Trash2, Upload, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, del, errorMessage, get, post, put } from "../../api";
import { ago, euro, fmtDate } from "../../format";
import { saveUrl } from "../../gallery/download";
import { keys, useAction, useChildTags, useInsights, usePriority } from "../../queries";
import type { ChildTag, GalleryImage, PriorityRequest, Project, Restriction } from "../../types";
import { Button, Card, cx, Empty, isVideo, Modal, Photo, Pill, Select, Sheet, TextField, useConfirm } from "../../ui";
import { prepareUpload } from "../../watermark";
import { ANSWER_LABEL, ConsentReminder } from "./ConsentTab";
import { useGroupLink } from "./GroupLink";
import { pickable, PriorityCard, priorityLabel } from "./PriorityCard";

// The photos of a project: upload, order, sort into sets, mark, and see per
// photo who liked, downloaded and bought it. How the gallery looks is on Stijl;
// who may see and buy it on Delen & verkoop.

/** Four per request: each photo goes up with its two copies. */
const BATCH = 4;

const MARK_LABEL: Record<Restriction, string> = { no_photo: "Niet in beeld", no_social: "Niet posten" };
const CHILD_LABEL: Record<ChildTag["answer"], string> = { full: "mag op de foto en op social media", no_social: "niet op social media", no_photo: "niet op de foto", unknown: "geen toestemming gevonden" };
// Who needs a decision comes first.
const CHILD_ORDER: Record<ChildTag["answer"], number> = { no_photo: 0, no_social: 1, unknown: 2, full: 3 };

type Filter = "all" | "favorites" | "popular" | "sold" | "unmarked" | "attention" | Restriction | `kid:${string}` | `prio:${string}`;
type Sort = "own" | "name" | "newest" | "hearts" | "downloads" | "sold";
type Size = "s" | "m" | "l";
const SORT_LABEL: Record<Sort, string> = { own: "Eigen volgorde", name: "Bestandsnaam", newest: "Nieuwste eerst", hearts: "Meeste hartjes", downloads: "Meest gedownload", sold: "Meest verkocht" };
const NO_SET = "__none__";

/** The same child can be pointed out by both parents: one entry per child. */
function byChild(tags: ChildTag[] = []): ChildTag[][] {
  const kids = new Map<string, ChildTag[]>();
  for (const t of tags) kids.set(t.name, [...(kids.get(t.name) || []), t]);
  return [...kids.values()];
}

const pointedOutBy = (tags: ChildTag[]) => [...new Set(tags.map((t) => t.by).filter(Boolean))].join(" en ") || "een ouder";

/** The mark a photo should have for the children parents pointed out on it, when that is stricter than the one it has. */
function missingMark(g: GalleryImage, tags: ChildTag[] = []): Restriction | "" {
  if (g.restriction === "no_photo") return "";
  if (tags.some((t) => t.answer === "no_photo")) return "no_photo";
  return !g.restriction && tags.some((t) => t.answer === "no_social") ? "no_social" : "";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const nameSort = new Intl.Collator("nl", { numeric: true, sensitivity: "base" });

function readSize(): Size {
  try {
    const v = localStorage.getItem("pdc-gallery-size");
    return v === "s" || v === "l" ? v : "m";
  } catch {
    return "m";
  }
}

export function GalleryTab({ project: p }: { project: Project }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [setView, setSetView] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("own");
  const [size, setSizeState] = useState<Size>(readSize);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ ids: string[]; current?: string } | null>(null);
  const lastPicked = useRef<string | null>(null);
  const uploader = useUploader(p);
  const copies = useCopies(p);
  const reportSize = useSizeBackfill(p);
  const insights = useInsights(p.id).data;
  const groupLink = useGroupLink(p.id).data;
  const favorites = p.favorites || {};
  const coverId = p.gallerySettings.coverImageId;
  const setSize = (s: Size) => {
    setSizeState(s);
    try { localStorage.setItem("pdc-gallery-size", s); } catch { /* private mode */ }
  };

  // Voorrang: the photos picked per request, and the requests a photo can still go to.
  const priority = usePriority(p.id).data || [];
  const forPriority = priority.filter(pickable);
  const priorityOf: Record<string, PriorityRequest[]> = {};
  for (const r of forPriority) for (const id of r.images) (priorityOf[id] ||= []).push(r);
  const shownPriority = filter.startsWith("prio:") ? forPriority.find((r) => `prio:${r.id}` === filter) : undefined;

  const allTags = useChildTags(p.id).data;
  const tagsOf: Record<string, ChildTag[]> = {};
  for (const t of allTags || []) (tagsOf[t.imageId] ||= []).push(t);
  const toMark = p.gallery.filter((g) => missingMark(g, tagsOf[g.id]));
  // A child no form names: nothing to apply by itself, so the studio looks at it.
  const unknownKids = p.gallery.filter((g) => !g.restriction && tagsOf[g.id]?.some((t) => t.answer === "unknown"));
  const attention = new Set([...toMark, ...unknownKids].map((g) => g.id));
  const kids = byChild(allTags).sort((a, b) => CHILD_ORDER[a[0].answer] - CHILD_ORDER[b[0].answer] || a[0].name.localeCompare(b[0].name, "nl"));
  const kid = filter.startsWith("kid:") && kids.some(([t]) => `kid:${t.name}` === filter) ? filter.slice(4) : "";

  const stat = insights?.perImage;
  const hearts = (g: GalleryImage) => (favorites[g.id]?.length || 0) + (stat?.hearts[g.id] || 0);
  const sets = useMemo(() => {
    const used = new Map<string, number>();
    for (const g of p.gallery) if (g.set) used.set(g.set, (used.get(g.set) || 0) + 1);
    const order = (p.gallerySettings.sets || []).filter((s) => used.has(s));
    return [...order, ...[...used.keys()].filter((s) => !order.includes(s))].map((name) => ({ name, count: used.get(name)! }));
  }, [p.gallery, p.gallerySettings.sets]);
  const noSet = p.gallery.filter((g) => !g.set).length;
  const photosOnly = p.gallery.filter((g) => !isVideo(g.fileName || g.url));
  const unmarked = photosOnly.filter((g) => !g.watermark).length;
  const unlit = photosOnly.filter((g) => !g.light).length;

  // What shows: the set, then the filter, then the search, then the order.
  const term = q.trim().toLowerCase();
  let shown = p.gallery;
  if (setView === NO_SET) shown = shown.filter((g) => !g.set);
  else if (setView !== "all") shown = shown.filter((g) => g.set === setView);
  if (kid) shown = shown.filter((g) => tagsOf[g.id]?.some((t) => t.name === kid));
  else if (shownPriority) shown = shown.filter((g) => shownPriority.images.includes(g.id));
  else if (filter === "favorites") shown = shown.filter((g) => favorites[g.id]);
  else if (filter === "popular") shown = shown.filter((g) => (stat?.hearts[g.id] || 0) > 0);
  else if (filter === "sold") shown = shown.filter((g) => (stat?.sold[g.id] || 0) > 0);
  else if (filter === "unmarked") shown = shown.filter((g) => !g.watermark && !isVideo(g.fileName || g.url));
  else if (filter === "attention") shown = shown.filter((g) => attention.has(g.id));
  else if (filter === "no_photo" || filter === "no_social") shown = shown.filter((g) => g.restriction === filter);
  if (term) shown = shown.filter((g) => (g.fileName || "").toLowerCase().includes(term));
  if (sort !== "own") {
    const by: Record<Exclude<Sort, "own">, (a: GalleryImage, b: GalleryImage) => number> = {
      name: (a, b) => nameSort.compare(a.fileName || "", b.fileName || ""),
      newest: (a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")),
      hearts: (a, b) => hearts(b) - hearts(a),
      downloads: (a, b) => (stat?.downloads[b.id] || 0) - (stat?.downloads[a.id] || 0),
      sold: (a, b) => (stat?.sold[b.id] || 0) - (stat?.sold[a.id] || 0),
    };
    shown = [...shown].sort(by[sort]);
  }
  // Dragging only makes sense in the studio's own order with everything in view.
  const canDrag = sort === "own" && filter === "all" && setView === "all" && !term;
  const numberOf = useMemo(() => new Map(p.gallery.map((g, i) => [g.id, i + 1])), [p.gallery]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const patch = (fn: (old: Project) => Partial<Project>) => qc.setQueryData(keys.project(p.id), (old: Project | undefined) => old && { ...old, ...fn(old) });

  async function reorder(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(p.gallery, p.gallery.findIndex((g) => g.id === e.active.id), p.gallery.findIndex((g) => g.id === e.over!.id));
    patch(() => ({ gallery: next }));
    try {
      await put(`/admin/project/${p.id}/gallery/order`, { ids: next.map((g) => g.id) });
    } catch (err) {
      toast.error(errorMessage(err));
      qc.invalidateQueries({ queryKey: keys.project(p.id) });
    }
  }

  /** One photo, or with shift everything between it and the one picked before: a burst goes in one go. */
  function pick(id: string, range: boolean) {
    const ids = shown.map((g) => g.id);
    const from = lastPicked.current ? ids.indexOf(lastPicked.current) : -1;
    const to = ids.indexOf(id);
    setPicked((old) => {
      const next = new Set(old);
      if (range && from >= 0) ids.slice(Math.min(from, to), Math.max(from, to) + 1).forEach((x) => next.add(x));
      else if (!next.delete(id)) next.add(id);
      return next;
    });
    lastPicked.current = id;
  }

  const assign = useAction({
    fn: (v: { r: PriorityRequest; ids: string[]; on: boolean }) => put<{ requests: PriorityRequest[]; skipped: number }>(`/admin/priority/${v.r.id}/images`, { ids: v.ids, on: v.on }),
    success: (res, v) => {
      const n = v.ids.length - (res.skipped || 0);
      const what = plural(n, "foto", "foto's");
      return v.on ? `${what} voor ${priorityLabel(v.r)}${res.skipped ? `. ${res.skipped} niet: niet in beeld` : ""}` : `${what} weg bij ${priorityLabel(v.r)}`;
    },
    onSuccess: (res, v) => {
      qc.setQueryData(keys.priority(p.id), res.requests);
      if (v.on) setPicked(new Set());
    },
  });
  const mark = useAction({
    fn: (v: { ids: string[]; restriction: Restriction | "" }) => put(`/admin/project/${p.id}/gallery/restriction`, v),
    success: (_r, { ids, restriction }) => {
      const what = plural(ids.length, "foto", "foto's");
      return restriction ? `${what}: ${MARK_LABEL[restriction].toLowerCase()}` : `Markering weg bij ${what}`;
    },
    onSuccess: (_r, { ids, restriction }) => {
      patch((old) => ({ gallery: old.gallery.map((g) => (ids.includes(g.id) ? { ...g, restriction: restriction || undefined } : g)) }));
      setPicked(new Set());
    },
  });
  const markTagged = useAction({
    fn: async () => {
      for (const restriction of ["no_photo", "no_social"] as const) {
        const ids = toMark.filter((g) => missingMark(g, tagsOf[g.id]) === restriction).map((g) => g.id);
        if (ids.length) await put(`/admin/project/${p.id}/gallery/restriction`, { ids, restriction });
      }
    },
    invalidate: () => [keys.project(p.id)],
    success: "Foto's gemarkeerd",
  });
  const removeTag = useAction({
    fn: (tags: ChildTag[]) => Promise.all(tags.map((t) => del(`/admin/project/${p.id}/child-tags/${t.id}`))),
    invalidate: () => [keys.childTags(p.id)],
    success: "Aanwijzing weggehaald",
  });
  async function askRemoveTag(tags: ChildTag[]) {
    if (await confirm({ title: `${tags[0].name} staat hier niet op?`, body: `Aangewezen door ${pointedOutBy(tags)}. De aanwijzing gaat weg; de foto blijft staan.`, confirm: "Weghalen" })) removeTag.mutate(tags);
  }
  const setCover = useAction({
    fn: (img: GalleryImage) => put(`/admin/project/${p.id}`, { gallerySettings: { ...p.gallerySettings, coverImageId: img.id, coverUrl: undefined } }),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: "Omslagfoto ingesteld",
  });
  const remove = useAction({
    fn: (ids: string[]) => post<{ project: Project; removed: number; kept: number }>(`/admin/project/${p.id}/gallery/remove`, { ids }),
    success: (r) => (r.kept ? `${plural(r.removed, "foto", "foto's")} verwijderd. ${plural(r.kept, "gekochte foto bleef", "gekochte foto's bleven")} staan.` : `${plural(r.removed, "foto", "foto's")} verwijderd`),
    onSuccess: (r) => {
      patch(() => ({ gallery: r.project.gallery, gallerySettings: r.project.gallerySettings }));
      setPicked(new Set());
      setOpenId(null);
      qc.invalidateQueries({ queryKey: keys.projects });
    },
  });
  async function askRemove(ids: string[]) {
    const sold = ids.filter((id) => (stat?.sold[id] || 0) > 0).length;
    const ok = await confirm({
      title: ids.length === 1 ? "Foto verwijderen?" : `${ids.length} foto's verwijderen?`,
      body: `${ids.length === 1 ? "De foto verdwijnt" : "Ze verdwijnen"} uit de galerij van de klant en van de groepslink. Dit kan niet ongedaan worden.${sold ? ` ${plural(sold, "foto is", "foto's zijn")} gekocht en ${sold === 1 ? "blijft" : "blijven"} staan.` : ""}`,
      confirm: "Verwijderen",
      danger: true,
    });
    if (ok) remove.mutate(ids);
  }
  const toSet = useAction({
    fn: (v: { ids: string[]; set: string }) => put<{ project: Project }>(`/admin/project/${p.id}/gallery/set`, v),
    success: (_r, v) => (v.set ? `${plural(v.ids.length, "foto", "foto's")} in ${v.set}` : `${plural(v.ids.length, "foto", "foto's")} uit hun set`),
    onSuccess: (r) => {
      patch(() => ({ gallery: r.project.gallery, gallerySettings: r.project.gallerySettings }));
      setPicked(new Set());
      setNaming(null);
    },
  });
  const notify = useAction({
    fn: (added: number) => post<{ sentTo: string[]; guests: number }>(`/admin/project/${p.id}/gallery/notify`, { added }),
    success: (r) => `Mail verstuurd naar ${[...r.sentTo, ...(r.guests ? [plural(r.guests, "gast", "gasten")] : [])].join(", ")}`,
    onSuccess: () => uploader.resetAdded(),
  });
  const publicCount = p.gallery.filter((g) => g.url.includes("/object/public/")).length;
  const privatize = useAction({
    fn: () => post<{ moved: number; failed: string[] }>(`/admin/project/${p.id}/gallery/privatize`),
    invalidate: () => [keys.project(p.id), keys.projects],
    success: (r) => (r.failed.length ? `${r.moved} verplaatst, ${r.failed.length} mislukt` : `${r.moved} foto's staan nu privé`),
  });

  const open = openId ? shown.find((g) => g.id === openId) || p.gallery.find((g) => g.id === openId) : null;
  const openIndex = open ? shown.findIndex((g) => g.id === open.id) : -1;
  const pickedIds = [...picked];
  const totals = insights?.totals;
  const guestHearts = Object.values(stat?.hearts || {}).reduce((s, n) => s + n, 0);

  return (
    <div className="s-stack lg">
      {publicCount > 0 && (
        <div className="s-banner warn">
          <span>{plural(publicCount, "foto staat", "foto's staan")} nog in de openbare opslag, van vóór de privé-galerijen. Iedereen met de link kan ze zien.</span>
          <Button size="sm" loading={privatize.isPending} onClick={() => privatize.mutate()}>Privé maken</Button>
        </div>
      )}
      {attention.size > 0 && (
        <div className="s-banner bad" role="status">
          <span>
            {toMark.length > 0 && <><b>{plural(toMark.length, "foto", "foto's")}</b> met een kind dat niet in beeld of niet gepost mag worden, volgens de ouders. </>}
            {unknownKids.length > 0 && <><b>{plural(unknownKids.length, "foto", "foto's")}</b> met een kind zonder toestemming.</>}
          </span>
          <div className="s-row">
            <Button size="sm" aria-pressed={filter === "attention"} variant={filter === "attention" ? "primary" : "default"} onClick={() => setFilter((v) => (v === "attention" ? "all" : "attention"))}>Bekijken</Button>
            {toMark.length > 0 && <Button size="sm" variant="primary" loading={markTagged.isPending} onClick={() => markTagged.mutate()}>Goed markeren</Button>}
          </div>
        </div>
      )}
      {(unmarked > 0 || unlit > 0) && !uploader.progress && (
        <div className="s-banner" role="status">
          <Sparkles size={16} aria-hidden="true" />
          <span>
            {copies.progress ? <>Foto's klaarmaken… {copies.progress.done} van {copies.progress.total}. Laat dit venster open.</>
              : <>{unmarked > 0 && <><b>{plural(unmarked, "foto heeft", "foto's hebben")}</b> nog geen watermerk{(p.gallerySettings.watermark || groupLink?.share?.sales) ? ": wie het watermerk ziet, krijgt ze niet te zien" : ""}. </>}
                {unlit > 0 && <><b>{plural(unlit, "foto heeft", "foto's hebben")}</b> nog geen lichte kopie, dus de galerij laadt trager.</>}</>}
          </span>
          {!copies.progress && <Button size="sm" variant="primary" onClick={() => copies.run(photosOnly.filter((g) => !g.watermark || !g.light))}>Klaarmaken</Button>}
        </div>
      )}

      <Uploader project={p} uploader={uploader} sets={sets.map((s) => s.name)} />

      {p.gallery.length > 0 && (
        <section className="s-card s-gm" aria-label="Foto's beheren">
          <div className="s-gm-stats">
            <div><b>{photosOnly.length}</b><span>foto's{p.gallery.length > photosOnly.length ? ` · ${p.gallery.length - photosOnly.length} video` : ""}</span></div>
            <div><b>{Object.keys(favorites).length}</b><span>favoriet bij de klant</span></div>
            <div><b>{guestHearts}</b><span>{guestHearts === 1 ? "hartje" : "hartjes"} van gasten</span></div>
            <div><b>{totals?.downloads ?? "…"}</b><span>{totals?.downloads === 1 ? "download" : "downloads"}{totals?.downloaders ? ` · ${plural(totals.downloaders, "persoon", "mensen")}` : ""}</span></div>
            <div><b>{totals?.sold ?? "…"}</b><span>verkocht{totals?.revenue ? ` · ${euro(totals.revenue)}` : ""}</span></div>
          </div>

          <div className="s-gm-sets" role="group" aria-label="Sets">
            <button type="button" className="s-fchip" aria-pressed={setView === "all"} onClick={() => setSetView("all")}>Alles<span>{p.gallery.length}</span></button>
            {sets.map((s) => (
              <button key={s.name} type="button" className="s-fchip" aria-pressed={setView === s.name} onClick={() => setSetView(s.name)}
                onDoubleClick={() => setNaming({ ids: p.gallery.filter((g) => g.set === s.name).map((g) => g.id), current: s.name })}
                title="Dubbelklik om de naam te wijzigen">
                {s.name}<span>{s.count}</span>
              </button>
            ))}
            {sets.length > 0 && noSet > 0 && <button type="button" className="s-fchip" aria-pressed={setView === NO_SET} onClick={() => setSetView(NO_SET)}>Zonder set<span>{noSet}</span></button>}
            <span className="s-small s-faint s-gm-hint">{sets.length ? "Selecteer foto's en kies Naar set om ze te verplaatsen." : "Sets zijn hoofdstukken, zoals Eerste helft of Ceremonie. Selecteer foto's en kies Naar set."}</span>
          </div>

          <div className="s-gm-tools">
            <div className="s-gm-filters" role="group" aria-label="Filter">
              {([
                ["all", "Alle", p.gallery.length],
                ["favorites", "Favoriet klant", Object.keys(favorites).length],
                ["popular", "Hartjes gasten", Object.keys(stat?.hearts || {}).length],
                ["sold", "Verkocht", Object.keys(stat?.sold || {}).length],
                ["unmarked", "Zonder watermerk", unmarked],
                ["no_photo", "Niet in beeld", p.gallery.filter((g) => g.restriction === "no_photo").length],
                ["no_social", "Niet posten", p.gallery.filter((g) => g.restriction === "no_social").length],
              ] as [Filter, string, number][]).filter(([f, , n]) => f === "all" || n > 0 || filter === f).map(([f, label, n]) => (
                <button key={f} type="button" className="s-fchip ghost" aria-pressed={filter === f} onClick={() => setFilter(f === filter ? "all" : f)}>
                  {label}{f !== "all" && <span>{n}</span>}
                </button>
              ))}
            </div>
            <div className="s-row" style={{ gap: 8 }}>
              <div className="s-searchbox" style={{ width: 190 }}>
                <Search aria-hidden="true" />
                <input aria-label="Zoek op bestandsnaam" placeholder="Bestandsnaam" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select aria-label="Volgorde" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: 168 }}>
                {(Object.keys(SORT_LABEL) as Sort[]).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
              </Select>
              <div className="s-seg" role="group" aria-label="Grootte van de foto's">
                {(["s", "m", "l"] as Size[]).map((s) => <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>{s.toUpperCase()}</button>)}
              </div>
            </div>
          </div>

          <div className="s-gm-meta s-row between">
            <span className="s-small s-muted">
              {shown.length === p.gallery.length ? plural(shown.length, "bestand", "bestanden") : `${shown.length} van ${p.gallery.length}`}
              {canDrag ? " · sleep om de volgorde te wijzigen" : sort === "own" ? "" : ` · ${SORT_LABEL[sort].toLowerCase()}`}
              {" · klik op een foto voor de details, vink aan om te selecteren"}
            </span>
            <div className="s-row" style={{ gap: 6 }}>
              {shown.length > 0 && <Button size="sm" variant="ghost" onClick={() => setPicked(new Set(shown.map((g) => g.id)))}>Alles selecteren</Button>}
              <Button size="sm" icon={<Mail />} loading={notify.isPending}
                onClick={async () => {
                  const n = uploader.added || p.gallery.length - p.gallery.filter((g) => g.restriction === "no_photo").length;
                  const waiting = groupLink?.share?.active ? groupLink.guests.filter((g) => g.notifyPhotos).length : 0;
                  const who = waiting ? `De klant en ${waiting} ${waiting === 1 ? "gast krijgen" : "gasten krijgen"}` : "De klant krijgt";
                  if (await confirm({ title: "Klant laten weten?", body: `${who} een mail dat er ${n} ${n === 1 ? "nieuwe foto staat" : "nieuwe foto's staan"}.`, confirm: "Mail versturen" })) notify.mutate(n);
                }}>
                Klant laten weten{uploader.added ? ` (${uploader.added} nieuw)` : ""}
              </Button>
            </div>
          </div>

          {shown.length === 0 ? (
            <Empty title={term ? "Niets gevonden" : "Geen foto's hier"}>{term ? `Geen bestandsnaam met "${q.trim()}".` : "Kies een ander filter of een andere set."}</Empty>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
              <SortableContext items={shown.map((g) => g.id)} strategy={rectSortingStrategy} disabled={!canDrag}>
                <div className={cx("s-gm-grid", `size-${size}`, picked.size > 0 && "s-picking")}>
                  {shown.map((g) => (
                    <PhotoTile
                      key={g.id}
                      image={g}
                      number={numberOf.get(g.id) || 0}
                      isCover={g.id === coverId}
                      draggable={canDrag}
                      tags={tagsOf[g.id]}
                      focusKid={kid}
                      onRemoveTag={askRemoveTag}
                      priority={priorityOf[g.id]}
                      onRemovePriority={async (r) => {
                        if (await confirm({ title: `Weg bij ${priorityLabel(r)}?`, body: `${r.guest.name} krijgt deze foto dan niet bij voorrang. De foto blijft in de galerij.`, confirm: "Weghalen" })) {
                          assign.mutate({ r, ids: [g.id], on: false });
                        }
                      }}
                      picked={picked.has(g.id)}
                      picking={picked.size > 0}
                      onPick={(range) => pick(g.id, range)}
                      onOpen={() => setOpenId(g.id)}
                      onSize={(w, h) => reportSize(g, w, h)}
                      favoritedBy={favorites[g.id]}
                      guestHearts={stat?.hearts[g.id] || 0}
                      downloads={stat?.downloads[g.id] || 0}
                      sold={stat?.sold[g.id] || 0}
                      showSet={setView === "all" && sets.length > 0}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      )}

      {picked.size > 0 && (
        <div className="s-selbar" role="toolbar" aria-label="Geselecteerde foto's">
          <b aria-live="polite">{picked.size} geselecteerd</b>
          <SetMenu sets={sets.map((s) => s.name)} disabled={toSet.isPending}
            onPick={(set) => (set === null ? setNaming({ ids: pickedIds }) : toSet.mutate({ ids: pickedIds, set }))} />
          {picked.size === 1 && <Button size="sm" icon={<Star />} onClick={() => { const g = p.gallery.find((x) => x.id === pickedIds[0]); if (g) setCover.mutate(g); }}>Omslag</Button>}
          <Button size="sm" variant="danger" icon={<EyeOff />} loading={mark.isPending} title="De klant en de groepslink zien deze foto's niet" onClick={() => mark.mutate({ ids: pickedIds, restriction: "no_photo" })}>Niet in beeld</Button>
          <Button size="sm" icon={<MegaphoneOff />} disabled={mark.isPending} title="De foto's blijven in de galerij, met het label 'Niet posten'" onClick={() => mark.mutate({ ids: pickedIds, restriction: "no_social" })}>Niet posten</Button>
          <Button size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate({ ids: pickedIds, restriction: "" })}>Markering weg</Button>
          {/* Voorrang: these photos go to that guest. While their photos are shown alone, they can go off again. */}
          {shownPriority ? (
            <Button size="sm" icon={<X />} loading={assign.isPending} onClick={() => assign.mutate({ r: shownPriority, ids: pickedIds, on: false })}>
              Weg bij {priorityLabel(shownPriority)}
            </Button>
          ) : forPriority.length > 0 && (
            <Select aria-label="Foto's voor voorrang" value="" disabled={assign.isPending} style={{ width: 190, height: 32 }}
              onChange={(e) => { const r = forPriority.find((x) => x.id === e.target.value); if (r) assign.mutate({ r, ids: pickedIds, on: true }); }}>
              <option value="">Voor voorrang…</option>
              {forPriority.map((r) => <option key={r.id} value={r.id}>{priorityLabel(r)}</option>)}
            </Select>
          )}
          <Button size="sm" variant="danger" icon={<Trash2 />} loading={remove.isPending} onClick={() => askRemove(pickedIds)}>Verwijderen</Button>
          <span className="s-selbar-end">
            <Button size="sm" variant="ghost" onClick={() => setPicked(new Set(shown.map((g) => g.id)))}>Alles</Button>
            <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label="Selectie wissen" title="Selectie wissen" onClick={() => setPicked(new Set())} />
          </span>
        </div>
      )}

      <ConsentReminder project={p} />
      <PriorityCard project={p} shownId={shownPriority?.id || ""} onShow={(id) => setFilter(id ? `prio:${id}` : "all")} />

      {kids.length > 0 && (
        <Card title={`Aangewezen door ouders: ${plural(kids.length, "kind", "kinderen")}`}>
          <div className="s-stack">
            <div className="s-row">
              {kids.map((tags) => {
                const t = tags[0];
                const photos = new Set(tags.map((x) => x.imageId)).size;
                const on = kid === t.name;
                return (
                  <Button key={t.name} size="sm" aria-pressed={on} variant={on ? "primary" : "default"} title={`Aangewezen door ${pointedOutBy(tags)}`} onClick={() => setFilter(on ? "all" : `kid:${t.name}`)}>
                    {t.name}{t.number && ` #${t.number}`} · {plural(photos, "foto", "foto's")}{t.answer !== "full" && ` · ${t.answer === "unknown" ? "Geen toestemming" : ANSWER_LABEL[t.answer]}`}
                  </Button>
                );
              })}
            </div>
            <span className="s-small s-faint">Klik op een naam om alleen de foto's van dat kind te zien.</span>
          </div>
        </Card>
      )}

      {p.gallery.length === 0 && !uploader.progress && (
        <Card><Empty icon={<ImagePlus />} title="Nog geen foto's">Sleep ze hierboven in het vak, of kies bestanden. Ze worden privé opgeslagen.</Empty></Card>
      )}

      <Inspector
        project={p}
        image={open || null}
        number={open ? numberOf.get(open.id) || 0 : 0}
        isCover={!!open && open.id === coverId}
        onClose={() => setOpenId(null)}
        onPrev={openIndex > 0 ? () => setOpenId(shown[openIndex - 1].id) : undefined}
        onNext={openIndex >= 0 && openIndex < shown.length - 1 ? () => setOpenId(shown[openIndex + 1].id) : undefined}
        onCover={(g) => setCover.mutate(g)}
        onMark={(g, restriction) => mark.mutate({ ids: [g.id], restriction })}
        onSet={(g) => setNaming({ ids: [g.id], current: g.set })}
        onRemove={(g) => askRemove([g.id])}
        favoritedBy={open ? favorites[open.id] : undefined}
      />

      <SetDialog
        open={!!naming}
        current={naming?.current}
        count={naming?.ids.length || 0}
        sets={sets.map((s) => s.name)}
        saving={toSet.isPending}
        onClose={() => setNaming(null)}
        onSave={(name) => naming && toSet.mutate({ ids: naming.ids, set: name })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

type Uploader = ReturnType<typeof useUploader>;

/** Uploads in small batches, each photo with its two copies, and remembers what failed. */
function useUploader(p: Project) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number; name: string } | null>(null);
  const [failed, setFailed] = useState<File[]>([]);
  const [added, setAdded] = useState(0);

  async function upload(files: File[], set: string) {
    const media = files.filter((f) => /^(image|video)\//.test(f.type));
    if (media.length === 0) return toast.error("Kies foto's of video's.");
    setFailed([]);
    setProgress({ done: 0, total: media.length, name: media[0].name });
    let ok = 0;
    const lost: File[] = [];
    for (let i = 0; i < media.length; i += BATCH) {
      const chunk = media.slice(i, i + BATCH);
      try {
        const form = new FormData();
        if (set) form.append("set", set);
        for (const [j, file] of chunk.entries()) {
          setProgress({ done: i + j, total: media.length, name: file.name });
          form.append("files", file);
          const { preview, display, w, h } = await prepareUpload(file, file.name);
          if (preview) form.append(`preview-${j}`, preview);
          if (display) form.append(`display-${j}`, display);
          if (w && h) form.append(`size-${j}`, `${w}x${h}`);
        }
        const r = await api<{ project: Project; added: number }>(`/admin/project/${p.id}/gallery`, { method: "POST", form });
        ok += r.added;
        qc.setQueryData(keys.project(p.id), (old: Project | undefined) => (old ? { ...old, ...r.project, favorites: old.favorites, unreadMessages: old.unreadMessages } : r.project));
      } catch (err) {
        lost.push(...chunk);
        toast.error(errorMessage(err));
      }
      setProgress({ done: Math.min(i + BATCH, media.length), total: media.length, name: "" });
    }
    setProgress(null);
    setFailed(lost);
    setAdded((n) => n + ok);
    if (ok) toast.success(`${plural(ok, "bestand", "bestanden")} toegevoegd${set ? ` aan ${set}` : ""}`);
    qc.invalidateQueries({ queryKey: keys.project(p.id) });
    qc.invalidateQueries({ queryKey: keys.projects });
  }

  return { progress, failed, added, upload, resetAdded: () => setAdded(0), clearFailed: () => setFailed([]) };
}

function Uploader({ project: p, uploader, sets }: { project: Project; uploader: Uploader; sets: string[] }) {
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [set, setSet] = useState("");
  const compact = p.gallery.length > 0;

  async function take(files: File[]) {
    // The same file twice is how dubbele uploads happen: the names say so.
    const have = new Set(p.gallery.map((g) => (g.fileName || "").toLowerCase()));
    const twice = files.filter((f) => have.has(f.name.toLowerCase()));
    let list = files;
    if (twice.length) {
      const skip = await confirm({
        title: `${plural(twice.length, "foto staat", "foto's staan")} er al in`,
        body: `Met dezelfde bestandsnaam${twice.length <= 3 ? `: ${twice.map((f) => f.name).join(", ")}` : ""}. Overslaan voorkomt dubbele foto's in de galerij.`,
        confirm: "Overslaan",
      });
      if (skip) list = files.filter((f) => !have.has(f.name.toLowerCase()));
    }
    if (list.length) await uploader.upload(list, set);
  }

  const pr = uploader.progress;
  return (
    <div
      className={cx("s-dropzone s-gm-drop", over && "over", compact && "compact")}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!pr) take(Array.from(e.dataTransfer.files)); }}
    >
      {pr ? (
        <div className="s-stack" style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
          <b>Uploaden… {pr.done} van {pr.total}</b>
          <div className="s-progress" role="progressbar" aria-valuemin={0} aria-valuemax={pr.total} aria-valuenow={pr.done}><i style={{ transform: `scaleX(${pr.done / pr.total})` }} /></div>
          <span className="s-small s-faint">{pr.name ? `${pr.name} · ` : ""}Laat dit venster open tot het klaar is.</span>
        </div>
      ) : (
        <div className={compact ? "s-row between" : "s-stack"} style={compact ? undefined : { alignItems: "center" }}>
          <div className={compact ? "s-row" : "s-stack"} style={compact ? { gap: 10 } : { alignItems: "center" }}>
            <Upload size={compact ? 18 : 22} aria-hidden="true" />
            <span>{compact ? "Meer foto's? Sleep ze hierheen, of" : "Sleep foto's of video's hierheen, of"}</span>
            <Button icon={<ImagePlus />} variant={compact ? "default" : "primary"} onClick={() => input.current?.click()}>Kies bestanden</Button>
          </div>
          <div className="s-row" style={{ gap: 8 }}>
            {(sets.length > 0 || compact) && (
              <Select aria-label="In set" value={set} onChange={(e) => setSet(e.target.value)} style={{ width: 170 }}>
                <option value="">Zonder set</option>
                {sets.map((s) => <option key={s} value={s}>In {s}</option>)}
              </Select>
            )}
            {!compact && <span className="s-small s-faint">Privé opgeslagen, met een lichte kopie en een met watermerk.</span>}
          </div>
        </div>
      )}
      {uploader.failed.length > 0 && !pr && (
        <div className="s-row between s-small" style={{ marginTop: 12, color: "var(--bad)" }}>
          <span><AlertTriangle size={14} aria-hidden="true" /> {plural(uploader.failed.length, "bestand ging", "bestanden gingen")} niet goed.</span>
          <span className="s-row" style={{ gap: 6 }}>
            <Button size="sm" onClick={() => { const list = uploader.failed; uploader.clearFailed(); uploader.upload(list, set); }}>Opnieuw proberen</Button>
            <Button size="sm" variant="ghost" onClick={uploader.clearFailed}>Laten</Button>
          </span>
        </div>
      )}
      <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime" multiple hidden onChange={(e) => { take(Array.from(e.target.files || [])); e.target.value = ""; }} />
    </div>
  );
}

/** The copies of photos from before they existed: made here from the original, or from the light copy. */
function useCopies(p: Project) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  async function run(list: GalleryImage[]) {
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    for (const [i, g] of list.entries()) {
      try {
        const res = await fetch(g.url);
        if (!res.ok) throw new Error(String(res.status));
        const made = await prepareUpload(await res.blob(), g.fileName || "foto.jpg");
        const form = new FormData();
        if (!g.watermark && made.preview) form.append("preview", made.preview);
        // A light copy is only made from the original, never from itself.
        if (!g.light && made.display) form.append("display", made.display);
        if (!form.has("preview") && !form.has("display")) throw new Error("onleesbaar");
        await api(`/admin/project/${p.id}/gallery/${g.id}/copies`, { method: "PUT", form });
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    qc.invalidateQueries({ queryKey: keys.project(p.id) });
    if (failed) toast.error(`${plural(failed, "foto kon", "foto's konden")} niet worden klaargemaakt.`);
    else toast.success("Foto's klaargemaakt");
  }
  return { progress, run };
}

// ---------------------------------------------------------------------------
// One photo in the grid
// ---------------------------------------------------------------------------

function PhotoTile({ image, number, isCover, draggable, tags, focusKid, onRemoveTag, priority, onRemovePriority, picked, picking, favoritedBy, guestHearts, downloads, sold, showSet, onPick, onOpen, onSize }: {
  image: GalleryImage; number: number; isCover: boolean; draggable: boolean; tags?: ChildTag[]; focusKid: string; onRemoveTag: (tags: ChildTag[]) => void;
  /** The voorrang requests this photo goes to. */
  priority?: PriorityRequest[]; onRemovePriority: (r: PriorityRequest) => void;
  picked: boolean; picking: boolean; favoritedBy?: string[]; guestHearts: number; downloads: number; sold: number; showSet: boolean;
  onPick: (range: boolean) => void; onOpen: () => void; onSize: (w: number, h: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id, disabled: !draggable });
  const label = String(number).padStart(3, "0");
  const [allNames, setAllNames] = useState(false);
  const kids = byChild(tags);
  // A team photo can have the whole team on it: who needs care gets a name, the rest on request.
  const fine = kids.filter(([t]) => t.answer === "full" && t.name !== focusKid);
  const named = allNames ? kids : kids.filter(([t]) => t.answer !== "full" || t.name === focusKid);
  const firstName = (t: ChildTag) => t.name.trim().split(/\s+/)[0];
  const video = isVideo(image.fileName || image.url);
  return (
    <div ref={setNodeRef} className="s-gm-cell" style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        // Once a photo is picked, a tap anywhere on the next one picks it too.
        if (picking) onPick(e.shiftKey);
        else onOpen();
      }}>
      <Photo src={image.url} video={video} caption={label} onSize={image.w ? undefined : onSize}
        className={cx(picked && "picked", image.restriction === "no_photo" && "held", draggable && "drag")}>
        <button type="button" role="checkbox" aria-checked={picked} className={cx("s-pick", picked && "on")} title="Selecteren (met shift een reeks)" aria-label={`Foto ${label} selecteren`}
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => onPick(e.shiftKey)}><Check /></button>
        <div className="corner">
          {isCover && <span className="s-fav on" title="Omslagfoto"><Star /></span>}
          {favoritedBy && <span className="s-fav on" title={`Favoriet van ${favoritedBy.join(", ")}`}><Heart /></span>}
          {!image.watermark && !video && <span className="s-fav warn" title="Nog geen watermerk"><AlertTriangle /></span>}
        </div>
        {/* Names, marks and counts stack up from the bottom, so on a small tile they never cover each other. */}
        <div className="s-gm-foot">
        {(kids.length > 0 || !!priority?.length) && (
          <div className="s-tagchips">
            {priority?.map((r) => (
              <button key={r.id} type="button" className="s-tagchip prio" title={`Voorrang voor ${priorityLabel(r)} (${r.guest.name}). Klik om weg te halen.`}
                aria-label={`Voorrang voor ${priorityLabel(r)}. Weghalen`} onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemovePriority(r)}>
                <Star aria-hidden="true" />{r.person.trim().split(/\s+/)[0]}{r.number ? ` #${r.number}` : ""}
              </button>
            ))}
            {named.map((list) => {
              const t = list[0];
              return (
                <button key={t.name} type="button" className={`s-tagchip ${t.answer}`} title={`${t.name}: ${CHILD_LABEL[t.answer]}. Aangewezen door ${pointedOutBy(list)}. Klik om weg te halen.`}
                  aria-label={`${t.name}, ${CHILD_LABEL[t.answer]}. Aanwijzing weghalen`} onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemoveTag(list)}>
                  {/* Two Finns on one photo need their last names. */}
                  {kids.filter(([x]) => firstName(x) === firstName(t)).length > 1 ? t.name : firstName(t)}{t.number ? ` #${t.number}` : ""}{t.answer === "unknown" ? " ?" : ""}
                </button>
              );
            })}
            {fine.length > 0 && (
              <button type="button" className="s-tagchip" aria-expanded={allNames} title={allNames ? "Namen verbergen" : `Mogen op de foto en op social media: ${fine.map(([t]) => t.name).join(", ")}`}
                onPointerDown={(e) => e.stopPropagation()} onClick={() => setAllNames((v) => !v)}>
                {allNames ? "Minder" : `${fine.length} ok`}
              </button>
            )}
          </div>
        )}
        {(image.restriction || guestHearts > 0 || downloads > 0 || sold > 0 || (showSet && image.set)) && (
          <div className="s-gm-badges">
            {/* The set's name takes what room is left and is cut short, so it never pushes the counts onto a second line. */}
            {showSet && image.set && <span className="set" aria-hidden="true"><b>{image.set}</b></span>}
            {guestHearts > 0 && <span aria-hidden="true" title={`${guestHearts} hartjes van gasten`}><Heart />{guestHearts}</span>}
            {downloads > 0 && <span aria-hidden="true" title={`${downloads}× gedownload`}><ArrowDownToLine />{downloads}</span>}
            {sold > 0 && <span className="sold" aria-hidden="true" title={`${sold}× verkocht`}><ShoppingBag />{sold}</span>}
            {image.restriction && <span className={`s-mark ${image.restriction}`}>{MARK_LABEL[image.restriction]}</span>}
          </div>
        )}
        </div>
      </Photo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The details of one photo
// ---------------------------------------------------------------------------

function Inspector({ project: p, image: g, number, isCover, favoritedBy, onClose, onPrev, onNext, onCover, onMark, onSet, onRemove }: {
  project: Project; image: GalleryImage | null; number: number; isCover: boolean; favoritedBy?: string[];
  onClose: () => void; onPrev?: () => void; onNext?: () => void;
  onCover: (g: GalleryImage) => void; onMark: (g: GalleryImage, r: Restriction | "") => void; onSet: (g: GalleryImage) => void; onRemove: (g: GalleryImage) => void;
}) {
  const insights = useInsights(p.id).data;
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!g) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g, onPrev, onNext]);
  if (!g) return null;
  const video = isVideo(g.fileName || g.url);
  const buyers = (insights?.orders || []).filter((o) => o.paid && o.images.includes(g.id));
  const downloads = (insights?.downloads || []).filter((d) => d.images.includes(g.id));
  const hearts = insights?.perImage.hearts[g.id] || 0;
  const downloadCount = insights?.perImage.downloads[g.id] || 0;

  async function original() {
    if (!g) return;
    setSaving(true);
    try {
      // The studio's own copy: through the portal route would count as the client's.
      const r = await get<{ url: string; fileName: string }>(`/admin/project/${p.id}/gallery/${g.id}/original`);
      saveUrl(r.url, r.fileName);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`Foto ${String(number).padStart(3, "0")}`}
      footer={
        <div className="s-row between" style={{ width: "100%" }}>
          <div className="s-row" style={{ gap: 4 }}>
            <Button size="sm" variant="ghost" iconOnly icon={<ChevronLeft />} aria-label="Vorige foto" disabled={!onPrev} onClick={onPrev} />
            <Button size="sm" variant="ghost" iconOnly icon={<ChevronRight />} aria-label="Volgende foto" disabled={!onNext} onClick={onNext} />
          </div>
          <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => onRemove(g)}>Verwijderen</Button>
        </div>
      }>
      <div className="s-stack lg">
        <div className="s-gm-look">
          {video ? <video key={g.id} src={g.url} controls playsInline /> : <img key={g.id} src={g.url} alt={`Foto ${number}`} />}
        </div>
        <div className="s-stack sm">
          <b className="s-truncate" title={g.fileName}>{g.fileName || "Zonder naam"}</b>
          <span className="s-small s-muted">
            {[g.w && g.h ? `${g.w} × ${g.h}` : "", g.addedAt ? `geüpload ${fmtDate(g.addedAt)}` : "", g.set ? `set ${g.set}` : "zonder set"].filter(Boolean).join(" · ")}
          </span>
          <div className="s-row" style={{ gap: 6 }}>
            {isCover && <Pill tone="acc">Omslag</Pill>}
            {g.restriction && <Pill tone={g.restriction === "no_photo" ? "bad" : "warn"}>{MARK_LABEL[g.restriction]}</Pill>}
            {!video && <Pill tone={g.watermark ? "ok" : "warn"} plain>{g.watermark ? "Watermerk klaar" : "Nog geen watermerk"}</Pill>}
          </div>
        </div>
        <div className="s-row" style={{ gap: 6 }}>
          {!isCover && g.restriction !== "no_photo" && !video && <Button size="sm" icon={<Star />} onClick={() => onCover(g)}>Maak omslag</Button>}
          <Button size="sm" icon={<FolderInput />} onClick={() => onSet(g)}>{g.set ? "Andere set" : "Naar set"}</Button>
          <Button size="sm" icon={<Download />} loading={saving} onClick={original}>Origineel</Button>
          {g.restriction ? <Button size="sm" variant="ghost" onClick={() => onMark(g, "")}>Markering weg</Button> : (
            <>
              <Button size="sm" icon={<EyeOff />} onClick={() => onMark(g, "no_photo")}>Niet in beeld</Button>
              <Button size="sm" icon={<MegaphoneOff />} onClick={() => onMark(g, "no_social")}>Niet posten</Button>
            </>
          )}
        </div>
        <div className="s-stack sm">
          <span className="s-eyebrow">Wat ermee gebeurde</span>
          <div className="s-kv"><span>Favoriet van de klant</span><span>{favoritedBy?.length ? favoritedBy.join(", ") : "Nee"}</span></div>
          <div className="s-kv"><span>Hartjes van gasten</span><span className="s-num">{hearts}</span></div>
          <div className="s-kv"><span>Gedownload</span><span className="s-num">{downloadCount}×</span></div>
          <div className="s-kv"><span>Verkocht</span><span>{buyers.length ? buyers.map((o) => o.guest.name || o.guest.email).join(", ") : "Nee"}</span></div>
        </div>
        {downloads.length > 0 && (
          <div className="s-stack sm">
            <span className="s-eyebrow">Laatste downloads</span>
            <ul className="s-list s-small">
              {downloads.slice(0, 8).map((d) => (
                <li key={d.id} className="s-row between" style={{ padding: "6px 0" }}>
                  <span>{d.who || "Iemand"}{d.version === "watermark" ? " · met watermerk" : ""}{d.count > 1 ? ` · in een zip van ${d.count}` : ""}</span>
                  <span className="s-faint">{ago(d.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

function SetMenu({ sets, onPick, disabled }: { sets: string[]; onPick: (set: string | null) => void; disabled?: boolean }) {
  return (
    <Select aria-label="Naar set" value="" disabled={disabled} style={{ width: 150, height: 32 }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__new__") onPick(null);
        else if (v === "__out__") onPick("");
        else if (v) onPick(v);
      }}>
      <option value="">Naar set…</option>
      {sets.map((s) => <option key={s} value={s}>{s}</option>)}
      <option value="__new__">Nieuwe set…</option>
      {sets.length > 0 && <option value="__out__">Uit de set halen</option>}
    </Select>
  );
}

function SetDialog({ open, current, count, sets, saving, onClose, onSave }: {
  open: boolean; current?: string; count: number; sets: string[]; saving: boolean; onClose: () => void; onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(current || ""); }, [open, current]);
  const clean = name.trim().slice(0, 60);
  const renaming = !!current && count > 1;
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={renaming ? `Set ${current} hernoemen` : "Naar een set"}
      description={renaming ? `${count} foto's krijgen de nieuwe naam.` : `${plural(count, "foto gaat", "foto's gaan")} naar deze set. Gasten zien de sets als hoofdstukken bovenaan.`}
      footer={<><Button onClick={onClose}>Annuleren</Button><Button variant="primary" loading={saving} disabled={!clean} onClick={() => onSave(clean)}>{renaming ? "Hernoemen" : "Opslaan"}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (clean) onSave(clean); }} className="s-stack">
        <TextField label="Naam van de set" value={name} autoFocus maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Eerste helft, Teamfoto, Ceremonie" />
        {sets.length > 0 && !renaming && (
          <div className="s-row" style={{ gap: 6 }}>
            {sets.map((s) => <button key={s} type="button" className="s-fchip ghost" onClick={() => setName(s)}>{s}</button>)}
          </div>
        )}
      </form>
    </Modal>
  );
}

/**
 * Photos from before sizes were stored get theirs here: the grid loads them
 * anyway, so their size is sent along once they have loaded.
 */
function useSizeBackfill(p: Project) {
  const qc = useQueryClient();
  const pending = useRef(new Map<string, { id: string; w: number; h: number }>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (img: GalleryImage, w: number, h: number) => {
    if (img.w || !w || !h) return;
    pending.current.set(img.id, { id: img.id, w, h });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const sizes = [...pending.current.values()];
      pending.current.clear();
      try {
        await put(`/admin/project/${p.id}/gallery/sizes`, { sizes });
        const byId = new Map(sizes.map((s) => [s.id, s]));
        qc.setQueryData(keys.project(p.id), (old: Project | undefined) => old && {
          ...old,
          gallery: old.gallery.map((g) => (byId.has(g.id) ? { ...g, w: byId.get(g.id)!.w, h: byId.get(g.id)!.h } : g)),
        });
      } catch {
        // Not worth bothering anyone: the client's browser measures them too.
      }
    }, 1500);
  };
}
