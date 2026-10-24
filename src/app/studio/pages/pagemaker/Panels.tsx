import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown, ArrowUp, Bold, Columns2, Copy, Film, GripVertical, Heading1, ImagePlus, Images, Italic, LayoutGrid,
  LayoutTemplate, Link2, ListChecks, Plus, Quote, Trash2, Type, X,
} from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import {
  BLOCK_TYPES, embedSrc, heroCover, isVideoUrl, LAYOUTS, mediaItem, seriesRest,
  type ArticlePage, type ArticleTheme, type Block, type BlockOf, type BlockType, type HeroStyle, type LetterCase, type MediaItem, type MediaLayout,
  type TextLook, type TextStyle,
} from "../../../lib/articlePage";
import { SEO_LIMITS, seoMeta } from "../../../lib/articlePage";
import { fontDef, PAIRS, pageFaces, pairOf, type FontDef } from "../../../lib/typefaces";
import { MediaGrid } from "../../components/MediaGrid";
import { Button, Field, Input, Photo, Segmented, Textarea, TextField } from "../../ui";
import type { PickRequest } from "./MediaPicker";
import { AdobeKitField, FontPicker, useFontDef, WeightPicker } from "./fonts";
import { HeroSketch, LayoutSketch } from "./schematics";
import { addPhotos, moveBlockTo, updateBlock, withPage, type Commit, type Draft } from "./state";

export interface PanelProps {
  draft: Draft;
  page: ArticlePage;
  commit: Commit;
  pick: (req: PickRequest) => void;
}

export const BLOCK_ICONS: Record<BlockType, ReactNode> = {
  text: <Type />,
  heading: <Heading1 />,
  media: <Images />,
  split: <Columns2 />,
  quote: <Quote />,
  facts: <ListChecks />,
  embed: <Film />,
  series: <LayoutGrid />,
};

export const blockName = (b: Block) =>
  b.type === "media" ? LAYOUTS[b.layout].label
    : b.type === "text" ? ({ body: "Tekst", lead: "Intro", statement: "Uitspraak" } as const)[b.style]
      : BLOCK_TYPES.find((t) => t.type === b.type)!.name;

function snippet(b: Block, draft: Draft, page: ArticlePage) {
  const cut = (s: string) => (s.length > 48 ? `${s.slice(0, 46).trimEnd()}…` : s);
  switch (b.type) {
    case "text": case "heading": return cut(b.text) || "Leeg";
    case "media": return b.items.length ? `${b.items.length} ${b.items.length === 1 ? "foto" : "foto's"}` : "Nog geen foto's";
    case "split": return cut(b.heading || b.text) || (b.media ? "Foto, nog geen tekst" : "Leeg");
    case "quote": return cut(b.text) || "Leeg";
    case "facts": return b.items.filter((f) => f.value.trim()).map((f) => f.value).join(" · ") || "Nog niet ingevuld";
    case "embed": return b.url ? (embedSrc(b.url) ? "Video gekoppeld" : "Link werkt niet") : "Nog geen link";
    case "series": { const n = seriesRest(draft, page).length; return n ? `${n} ${n === 1 ? "foto" : "foto's"}` : "Geen foto's over"; }
  }
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="pm-section">
      <div className="s-row between nowrap"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The whole page
// ---------------------------------------------------------------------------

export function PagePanel({ draft, page, commit, pick, categories, selected, onSelect, onInsert, onTemplate, footer }: PanelProps & {
  categories: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  onInsert: (index: number) => void;
  onTemplate: () => void;
  footer: ReactNode;
}) {
  return (
    <>
      {!draft.page && (
        <div className="pm-banner">
          <b>Automatische opmaak</b>
          <p>De site verdeelt je tekst en foto's nu zelf over de pagina. Kies een template of pas een blok aan om de opmaak vast te zetten.</p>
          <Button size="sm" icon={<LayoutTemplate />} onClick={onTemplate}>Template kiezen</Button>
        </div>
      )}
      <Section title="Inhoud">
        <ArticleFields draft={draft} commit={commit} categories={categories} />
        <TextAreaRich
          label="Tekst van het stuk"
          hint={draft.page
            ? "Een template verdeelt deze tekst over de pagina. Pas je hem hier aan, kies dan opnieuw een template, of wijzig de tekstblokken zelf."
            : "Een lege regel begint een nieuwe alinea. Een korte regel zonder punt wordt een tussenkop."}
          rows={10}
          value={draft.description}
          onChange={(description) => commit((d) => ({ ...d, description }), "description")}
        />
      </Section>
      <Section title={`Foto's en video's (${draft.galleryUrls.length})`}>
        <MediaGrid
          urls={draft.galleryUrls}
          onChange={(galleryUrls) => commit((d) => ({ ...d, galleryUrls }))}
          cover={draft.coverUrl}
          onCover={(u) => commit((d) => ({ ...d, coverUrl: u, coverType: isVideoUrl(u) ? "video" : "image" }))}
        />
        <p className="s-small s-faint">De ster maakt een foto de omslag. Foto's die nog in geen blok staan, komen in "Rest van de serie".</p>
      </Section>
      <Section title="Blokken" action={<Button size="sm" icon={<Plus />} onClick={() => onInsert(page.blocks.length)}>Blok</Button>}>
        <Outline draft={draft} page={page} commit={commit} selected={selected} onSelect={onSelect} />
      </Section>
      <Section title="Letters, kop en kleur">
        <HeroFields draft={draft} page={page} commit={commit} pick={pick} compact />
      </Section>
      <Section title="In Google">
        <GoogleFields draft={draft} page={page} commit={commit} />
      </Section>
      <Section title="Op de site">
        <label className="s-check"><input type="checkbox" checked={draft.published} onChange={(e) => commit((d) => ({ ...d, published: e.target.checked }))} /> Op de site zetten</label>
        <label className="s-check"><input type="checkbox" checked={draft.featured} onChange={(e) => commit((d) => ({ ...d, featured: e.target.checked }))} /> Uitlichten (bovenaan en in mails)</label>
      </Section>
      {footer}
    </>
  );
}

/** How the piece shows in Google, with its own title and description or the ones made from the article. */
function GoogleFields({ draft, page, commit }: { draft: Draft; page: ArticlePage; commit: Commit }) {
  const seo = seoMeta(draft, page);
  const count = (text: string, max: number) => (
    <span className={text.length > max ? "pm-count over" : "pm-count"}>{text.length} / {max}</span>
  );
  return (
    <>
      <div className="pm-serp" aria-label="Zo ziet het eruit in Google">
        <span className="pm-serp-url">photodecaffeine.com › portfolio</span>
        <span className="pm-serp-title">{seo.title}</span>
        <span className="pm-serp-text">{seo.description}</span>
      </div>
      <TextField
        label={<span className="s-row between nowrap">Titel in Google {count(seo.title, SEO_LIMITS.title)}</span>}
        hint="Leeg laten: de titel van het stuk met Portfolio en PhotoDeCaffeine erachter."
        placeholder={seo.autoTitle} lang="nl" spellCheck value={draft.seoTitle || ""}
        onChange={(e) => commit((d) => ({ ...d, seoTitle: e.target.value }), "seoTitle")}
      />
      <Field label={<span className="s-row between nowrap">Beschrijving in Google {count(seo.description, SEO_LIMITS.description)}</span>}
        hint="Leeg laten: de eerste alinea van het stuk. Schrijf wat iemand die zoekt wil weten: wat, waar en voor wie.">
        <Textarea rows={4} lang="nl" spellCheck placeholder={seo.autoDescription} value={draft.seoDescription || ""} aria-label="Beschrijving in Google"
          onChange={(e) => commit((d) => ({ ...d, seoDescription: e.target.value }), "seoDescription")} />
      </Field>
    </>
  );
}

function ArticleFields({ draft, commit, categories }: { draft: Draft; commit: Commit; categories: string[] }) {
  const list = useId();
  return (
    <>
      <TextField label="Titel" value={draft.title} lang="nl" spellCheck onChange={(e) => commit((d) => ({ ...d, title: e.target.value }), "title")} />
      <TextField label="Categorie" list={list} value={draft.category} onChange={(e) => commit((d) => ({ ...d, category: e.target.value }), "category")} />
      <datalist id={list}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
    </>
  );
}

function Outline({ draft, page, commit, selected, onSelect }: { draft: Draft; page: ArticlePage; commit: Commit; selected: string | null; onSelect: (id: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    commit(moveBlockTo(String(e.active.id), page.blocks.findIndex((b) => b.id === e.over!.id)));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ol className="pm-outline">
          {page.blocks.map((b) => <OutlineRow key={b.id} block={b} active={selected === b.id} text={snippet(b, draft, page)} onSelect={() => onSelect(b.id)} />)}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function OutlineRow({ block, active, text, onSelect }: { block: Block; active: boolean; text: string; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <li ref={setNodeRef} className={`pm-row${active ? " on" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <button type="button" className="s-handle" aria-label={`${blockName(block)} verslepen`} {...attributes} {...listeners}><GripVertical /></button>
      <button type="button" className="pm-row-main" onClick={onSelect}>
        <span className="s-ico">{BLOCK_ICONS[block.type]}</span>
        <span className="s-stack" style={{ gap: 0, minWidth: 0 }}>
          <b>{blockName(block)}</b>
          <span className="s-truncate">{text}</span>
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// The header
// ---------------------------------------------------------------------------

const HEROES: { value: HeroStyle; label: string }[] = [
  { value: "cinema", label: "Groot beeld" },
  { value: "offset", label: "Verspringend" },
  { value: "split", label: "Naast elkaar" },
  { value: "plain", label: "Alleen titel" },
];

/** The ready-made pairs, each shown in its own letters, and a face of your own for headings or text. */
function TypeFields({ page, commit }: { page: ArticlePage; commit: Commit }) {
  const pair = pairOf(page);
  const custom = !!(page.displayFont || page.textFont);
  return (
    <>
      <Field label="Lettertype" hint={custom ? "Eigen combinatie: de kop- of tekstletter is hieronder gekozen." : pair.about}>
        <div className="pm-tiles" role="group" aria-label="Lettertype">
          {PAIRS.map((t) => {
            const head = fontDef(t.display);
            const text = fontDef(t.text);
            return (
              <button key={t.id} type="button" className="pm-tile pm-type" aria-pressed={!custom && pair.id === t.id}
                onClick={() => commit(withPage((p) => ({ ...p, type: t.id, displayFont: undefined, textFont: undefined })))}>
                <span className="pm-type-sample" aria-hidden="true">
                  <span className="pm-type-head" style={{ fontFamily: head.family, fontWeight: head.head.w, textTransform: head.head.upper ? "uppercase" : undefined, fontSize: `${26 * Math.min(head.head.ds, 1.2)}px` }}>Ag</span>
                  <span className="pm-type-text" style={{ fontFamily: text.family }}>Leesletter</span>
                </span>
                {t.name}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Kopletter">
        <FontPicker label="Kopletter" value={page.displayFont} inherit={fontDef(pair.display)}
          onChange={(displayFont) => commit(withPage((p) => ({ ...p, displayFont })))} />
      </Field>
      <Field label="Tekstletter">
        <FontPicker label="Tekstletter" value={page.textFont} inherit={fontDef(pair.text)}
          onChange={(textFont) => commit(withPage((p) => ({ ...p, textFont })))} />
      </Field>
      <AdobeKitField />
    </>
  );
}

export function HeroFields({ draft, page, commit, pick, compact }: PanelProps & { compact?: boolean }) {
  const cover = heroCover(draft);
  return (
    <>
      <TypeFields page={page} commit={commit} />
      {!compact && (
        <LookFields label="Letters van de titel" look={page.titleLook} inherit={pageFaces(page).display} show={["font", "weight", "size", "case", "italic", "tracking"]}
          onChange={(titleLook) => commit(withPage((p) => ({ ...p, titleLook })))} />
      )}
      <div className="pm-tiles four" role="group" aria-label="Kop">
        {HEROES.map((h) => (
          <button key={h.value} type="button" className="pm-tile" aria-pressed={page.hero === h.value}
            onClick={() => commit(withPage((p) => ({ ...p, hero: h.value })))}>
            <HeroSketch hero={h.value} />
            {h.label}
          </button>
        ))}
      </div>
      <Field label="Kleur">
        <Segmented<ArticleTheme> label="Kleur" value={page.theme} onChange={(theme) => commit(withPage((p) => ({ ...p, theme })))}
          options={[{ value: "dark", label: "Donker" }, { value: "light", label: "Licht" }]} />
      </Field>
      {!compact && (
        <TextField label="Ondertitel" hint="Een korte regel onder de titel." lang="nl" spellCheck value={page.subtitle}
          onChange={(e) => commit(withPage((p) => ({ ...p, subtitle: e.target.value })), "subtitle")} />
      )}
      {page.hero !== "plain" && (
        <Field label="Omslag">
          <div className="s-row nowrap" style={{ alignItems: "flex-start" }}>
            <Photo src={cover?.url} video={cover?.kind === "video"} style={{ width: 132, flex: "none" }} />
            <div className="s-stack sm">
              <Button size="sm" icon={<ImagePlus />} onClick={() => pick({
                title: "Omslag kiezen",
                multiple: false,
                accept: "any",
                onPick: ([u]) => commit((d) => ({ ...addPhotos([u])(d), coverUrl: u, coverType: isVideoUrl(u) ? "video" : "image" })),
              })}>{draft.coverUrl ? "Andere omslag" : "Omslag kiezen"}</Button>
              {!draft.coverUrl && cover && <span className="s-small s-faint">Nu de eerste foto.</span>}
            </div>
          </div>
        </Field>
      )}
    </>
  );
}

export function HeroPanel(props: PanelProps & { categories: string[] }) {
  return (
    <>
      <Section title="Titel">
        <ArticleFields draft={props.draft} commit={props.commit} categories={props.categories} />
      </Section>
      <Section title="Letters, kop en kleur">
        <HeroFields {...props} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// One block
// ---------------------------------------------------------------------------

export function BlockPanel({ block, onAction, ...props }: PanelProps & {
  block: Block;
  onAction: (a: "up" | "down" | "copy" | "remove") => void;
}) {
  const set = <T extends Block>(fn: (b: T) => T, key?: string) => props.commit(updateBlock(block.id, (b) => fn(b as T)), key && `${block.id}:${key}`);
  const index = props.page.blocks.findIndex((b) => b.id === block.id);
  const faces = pageFaces(props.page);
  return (
    <>
      <div className="s-row">
        <Button size="sm" icon={<ArrowUp />} disabled={index <= 0} onClick={() => onAction("up")}>Omhoog</Button>
        <Button size="sm" icon={<ArrowDown />} disabled={index >= props.page.blocks.length - 1} onClick={() => onAction("down")}>Omlaag</Button>
        <Button size="sm" icon={<Copy />} onClick={() => onAction("copy")}>Kopie</Button>
        <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => onAction("remove")}>Weg</Button>
      </div>
      {block.type === "text" && <TextForm block={block} set={set} faces={faces} />}
      {block.type === "heading" && <HeadingForm block={block} set={set} pick={props.pick} draft={props.draft} faces={faces} />}
      {block.type === "media" && <MediaForm block={block} set={set} pick={props.pick} />}
      {block.type === "split" && <SplitForm block={block} set={set} pick={props.pick} faces={faces} />}
      {block.type === "quote" && <QuoteForm block={block} set={set} faces={faces} />}
      {block.type === "facts" && <FactsForm block={block} set={set} />}
      {block.type === "embed" && <EmbedForm block={block} set={set} />}
      {block.type === "series" && <SeriesInfo draft={props.draft} page={props.page} />}
    </>
  );
}

type Setter = <T extends Block>(fn: (b: T) => T, key?: string) => void;

type Faces = { display: FontDef; text: FontDef };

function TextForm({ block, set, faces }: { block: BlockOf<"text">; set: Setter; faces: Faces }) {
  return (
    <>
      <Field label="Soort">
        <Segmented<TextStyle> label="Soort tekst" value={block.style} onChange={(style) => set<BlockOf<"text">>((b) => ({ ...b, style }))}
          options={[{ value: "body", label: "Alinea" }, { value: "lead", label: "Intro" }, { value: "statement", label: "Uitspraak" }]} />
      </Field>
      <TextAreaRich
        label="Tekst"
        rows={block.style === "statement" ? 3 : 12}
        value={block.text}
        plain={block.style === "statement"}
        hint={block.style === "statement" ? "Groot en kort: één of twee zinnen. Licht op tijdens het scrollen." : "Een lege regel begint een nieuwe alinea."}
        onChange={(text) => set<BlockOf<"text">>((b) => ({ ...b, text }), "text")}
      />
      <LookFields look={block.look} onChange={(look) => set<BlockOf<"text">>((b) => ({ ...b, look }))}
        inherit={block.style === "statement" ? faces.display : faces.text}
        show={block.style === "body" ? ["font", "weight", "size", "align", "dropcap", "italic"] : ["font", "weight", "size", "align", "case", "tracking", "italic"]} />
    </>
  );
}

function HeadingForm({ block, set, pick, draft, faces }: { block: BlockOf<"heading">; set: Setter; pick: PanelProps["pick"]; draft: Draft; faces: Faces }) {
  const words = block.text.trim() ? block.text.trim().split(/\s+/).length : 0;
  return (
    <>
      <TextField label="Kop" lang="nl" spellCheck value={block.text} hint="Kort houden: hooguit twee regels op een computer."
        onChange={(e) => set<BlockOf<"heading">>((b) => ({ ...b, text: e.target.value }), "text")} />
      <Field label="Fotootje in de kop" hint="Een kleine ronde foto tussen de woorden.">
        <div className="s-row nowrap" style={{ alignItems: "center" }}>
          {block.inline && <Photo src={block.inline.url} video={block.inline.kind === "video"} style={{ width: 84, aspectRatio: "5 / 2", borderRadius: 999, flex: "none" }} />}
          <Button size="sm" icon={<ImagePlus />} onClick={() => pick({
            title: "Foto voor in de kop",
            multiple: false,
            accept: "image",
            selected: block.inline ? [block.inline.url] : [],
            onPick: ([u]) => set<BlockOf<"heading">>((b) => ({ ...b, inline: mediaItem(u) })),
          })}>{block.inline ? "Andere foto" : "Foto kiezen"}</Button>
          {block.inline && <Button size="sm" variant="ghost" icon={<X />} onClick={() => set<BlockOf<"heading">>((b) => ({ ...b, inline: null }))}>Weg</Button>}
        </div>
      </Field>
      {block.inline && words > 0 && (
        <Field label={`Na woord ${Math.min(block.after, words)} van ${words}`}>
          <input type="range" min={0} max={words} value={Math.min(block.after, words)} aria-label="Plek van de foto in de kop"
            onChange={(e) => set<BlockOf<"heading">>((b) => ({ ...b, after: Number(e.target.value) }))} style={{ accentColor: "var(--accent)" }} />
        </Field>
      )}
      {draft.galleryUrls.length === 0 && <p className="s-small s-faint">Upload eerst foto's bij Pagina.</p>}
      <LookFields look={block.look} onChange={(look) => set<BlockOf<"heading">>((b) => ({ ...b, look }))}
        inherit={faces.display} show={["font", "weight", "size", "align", "case", "tracking", "italic"]} />
    </>
  );
}

const LAYOUT_ORDER: MediaLayout[] = ["full", "wide", "inset", "duo", "offset", "trio", "mosaic", "slices", "marquee"];

function MediaForm({ block, set, pick }: { block: BlockOf<"media">; set: Setter; pick: PanelProps["pick"] }) {
  const { min, max } = LAYOUTS[block.layout];
  const setItems = (fn: (items: MediaItem[]) => MediaItem[]) => set<BlockOf<"media">>((b) => ({ ...b, items: fn(b.items) }));
  const count = min === max ? `${min} ${min === 1 ? "foto" : "foto's"}` : `${min} tot ${max} foto's`;
  return (
    <>
      <Field label="Opmaak">
        <div className="pm-tiles" role="group" aria-label="Opmaak">
          {LAYOUT_ORDER.map((l) => (
            <button key={l} type="button" className="pm-tile" aria-pressed={block.layout === l} onClick={() => set<BlockOf<"media">>((b) => ({ ...b, layout: l }))}>
              <LayoutSketch layout={l} />
              {LAYOUTS[l].label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Foto's (${block.items.length})`} hint={`Deze opmaak toont ${count}.${block.items.length > max ? ` De laatste ${block.items.length - max} staan er nu niet op.` : ""}`}>
        <div className="pm-thumbs">
          {block.items.map((item, i) => (
            <div key={`${item.url}-${i}`} className={`pm-thumb${i >= max ? " off" : ""}`}>
              <Photo src={item.url} video={item.kind === "video"} caption={String(i + 1)} />
              <div className="pm-thumb-tools">
                <button type="button" className="s-fav" aria-label="Naar voren" disabled={i === 0}
                  onClick={() => setItems((it) => { const n = [...it]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}><ArrowUp style={{ transform: "rotate(-90deg)" }} /></button>
                <button type="button" className="s-fav" aria-label="Uit dit blok halen" onClick={() => setItems((it) => it.filter((_, j) => j !== i))}><X /></button>
              </div>
            </div>
          ))}
          <button type="button" className="pm-thumb-add" onClick={() => pick({
            title: "Foto's voor dit blok",
            multiple: true,
            accept: "any",
            selected: block.items.map((i) => i.url),
            // Keeps what was set per photo when it stays in the block.
            onPick: (urls) => setItems((it) => urls.map((u) => it.find((x) => x.url === u) ?? mediaItem(u))),
          })}>
            <Plus />
            <span>Kiezen</span>
          </button>
        </div>
      </Field>
      {block.items.slice(0, max).map((item, i) => <ItemSettings key={`${item.url}-${i}`} item={item} n={i + 1}
        onChange={(patch) => setItems((it) => it.map((x, j) => (j === i ? { ...x, ...patch } : x)))} />)}
      <TextField label="Onderschrift" lang="nl" spellCheck value={block.caption} hint="Mag leeg blijven."
        onChange={(e) => set<BlockOf<"media">>((b) => ({ ...b, caption: e.target.value }), "caption")} />
    </>
  );
}

/** Per photo: what it shows, and which part stays in view when it is cropped. */
function ItemSettings({ item, n, onChange }: { item: MediaItem; n: number; onChange: (patch: Partial<MediaItem>) => void }) {
  return (
    // A photo without a description opens by itself, so the empty field is in view.
    <details className="pm-item" open={item.kind === "image" && !item.alt?.trim() ? true : undefined}>
      <summary>Foto {n}: beschrijving en uitsnede{item.kind === "image" && !item.alt?.trim() ? " (nog geen beschrijving)" : ""}</summary>
      <div className="s-stack" style={{ paddingTop: 10 }}>
        <Field label="Wat blijft in beeld bij bijsnijden">
          <Segmented<"top" | "center" | "bottom"> label="Uitsnede" value={item.focus || "center"} onChange={(focus) => onChange({ focus })}
            options={[{ value: "top", label: "Boven" }, { value: "center", label: "Midden" }, { value: "bottom", label: "Onder" }]} />
        </Field>
        {item.kind === "image" ? (
          <TextField label="Wat staat erop" hint="Voor wie de foto niet kan zien. Mag leeg." lang="nl" spellCheck value={item.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} />
        ) : (
          <label className="s-check"><input type="checkbox" checked={!!item.sound} onChange={(e) => onChange({ sound: e.target.checked })} /> Met geluid en knoppen (anders speelt hij stil in een lus)</label>
        )}
      </div>
    </details>
  );
}

function SplitForm({ block, set, pick, faces }: { block: BlockOf<"split">; set: Setter; pick: PanelProps["pick"]; faces: Faces }) {
  return (
    <>
      <Field label="Foto">
        <div className="s-row nowrap" style={{ alignItems: "flex-start" }}>
          <Photo src={block.media?.url} video={block.media?.kind === "video"} style={{ width: 120, flex: "none" }} />
          <Button size="sm" icon={<ImagePlus />} onClick={() => pick({
            title: "Foto naast de tekst",
            multiple: false,
            accept: "any",
            selected: block.media ? [block.media.url] : [],
            onPick: ([u]) => set<BlockOf<"split">>((b) => ({ ...b, media: mediaItem(u) })),
          })}>{block.media ? "Andere foto" : "Foto kiezen"}</Button>
        </div>
      </Field>
      <Field label="Foto staat">
        <Segmented<"left" | "right"> label="Kant van de foto" value={block.side} onChange={(side) => set<BlockOf<"split">>((b) => ({ ...b, side }))}
          options={[{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }]} />
      </Field>
      <TextField label="Kopje" hint="Mag leeg." lang="nl" spellCheck value={block.heading} onChange={(e) => set<BlockOf<"split">>((b) => ({ ...b, heading: e.target.value }), "heading")} />
      <TextAreaRich label="Tekst" rows={9} value={block.text} onChange={(text) => set<BlockOf<"split">>((b) => ({ ...b, text }), "text")} />
      <LookFields label="Letters van het kopje" look={block.look} onChange={(look) => set<BlockOf<"split">>((b) => ({ ...b, look }))}
        inherit={faces.display} show={["font", "weight", "size", "case", "tracking", "italic"]} />
    </>
  );
}

function QuoteForm({ block, set, faces }: { block: BlockOf<"quote">; set: Setter; faces: Faces }) {
  return (
    <>
      <TextAreaRich label="Citaat" rows={4} plain value={block.text} onChange={(text) => set<BlockOf<"quote">>((b) => ({ ...b, text }), "text")} />
      <TextField label="Naam" value={block.name} onChange={(e) => set<BlockOf<"quote">>((b) => ({ ...b, name: e.target.value }), "name")} />
      <TextField label="Wie" hint="Bijvoorbeeld: eigenaar van de BMW. Mag leeg." lang="nl" spellCheck value={block.role}
        onChange={(e) => set<BlockOf<"quote">>((b) => ({ ...b, role: e.target.value }), "role")} />
      <LookFields look={block.look} onChange={(look) => set<BlockOf<"quote">>((b) => ({ ...b, look }))}
        inherit={faces.display.group === "serif" ? faces.display : faces.text} show={["font", "weight", "size", "align", "case", "italic"]} italicDefault />
    </>
  );
}

function FactsForm({ block, set }: { block: BlockOf<"facts">; set: Setter }) {
  const setItems = (fn: (items: BlockOf<"facts">["items"]) => BlockOf<"facts">["items"], key?: string) => set<BlockOf<"facts">>((b) => ({ ...b, items: fn(b.items) }), key);
  return (
    <>
      <p className="s-small s-faint">Lege regels komen niet op de site.</p>
      {block.items.map((f, i) => (
        <div key={i} className="pm-fact">
          <Input aria-label={`Naam ${i + 1}`} placeholder="Bijv. Locatie" value={f.label} onChange={(e) => setItems((it) => it.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)), `l${i}`)} />
          <Input aria-label={`Waarde ${i + 1}`} placeholder="Bijv. Rotterdam" lang="nl" spellCheck value={f.value} onChange={(e) => setItems((it) => it.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)), `v${i}`)} />
          <Button size="sm" variant="ghost" iconOnly aria-label="Regel weghalen" icon={<X />} onClick={() => setItems((it) => it.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button size="sm" icon={<Plus />} disabled={block.items.length >= 6} onClick={() => setItems((it) => [...it, { label: "", value: "" }])}>Regel</Button>
    </>
  );
}

function EmbedForm({ block, set }: { block: BlockOf<"embed">; set: Setter }) {
  const ok = !block.url.trim() || !!embedSrc(block.url);
  return (
    <>
      <TextField label="Link naar de video" placeholder="https://www.youtube.com/watch?v=…" value={block.url} inputMode="url" spellCheck={false}
        error={ok ? null : "Deze link herken ik niet. Plak een link van YouTube of Vimeo."}
        hint="YouTube of Vimeo. Een eigen videobestand zet je in een fotoblok."
        onChange={(e) => set<BlockOf<"embed">>((b) => ({ ...b, url: e.target.value }), "url")} />
      <TextField label="Onderschrift" hint="Mag leeg." lang="nl" spellCheck value={block.caption}
        onChange={(e) => set<BlockOf<"embed">>((b) => ({ ...b, caption: e.target.value }), "caption")} />
    </>
  );
}

function SeriesInfo({ draft, page }: { draft: Draft; page: ArticlePage }) {
  const rest = seriesRest(draft, page);
  return (
    <>
      <p className="s-small s-muted">Toont de foto's van dit stuk die nog in geen ander blok staan, in de volgorde van Foto's en video's. Klikken maakt ze groot.</p>
      {rest.length ? (
        <div className="pm-thumbs">{rest.map((u) => <div key={u} className="pm-thumb"><Photo src={u} video={isVideoUrl(u)} /></div>)}</div>
      ) : (
        <p className="s-small s-faint">Alle foto's staan al in een blok. Dit blok blijft dan leeg op de site.</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Adding a block
// ---------------------------------------------------------------------------

export function InsertPanel({ onInsert }: { onInsert: (type: BlockType) => void }) {
  return (
    <div className="pm-add">
      {BLOCK_TYPES.map((t) => (
        <button key={t.type} type="button" className="pm-add-item" onClick={() => onInsert(t.type)}>
          <span className="s-ico acc">{BLOCK_ICONS[t.type]}</span>
          <span className="s-stack" style={{ gap: 2 }}>
            <b>{t.name}</b>
            <span>{t.about}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A text's look: size, alignment, capitals, slant, spacing
// ---------------------------------------------------------------------------

type LookPart = "font" | "weight" | "size" | "align" | "case" | "italic" | "tracking" | "dropcap";

const CASES: { value: LetterCase; label: string; style: React.CSSProperties }[] = [
  { value: "auto", label: "Standaard", style: {} },
  { value: "upper", label: "Hoofdletters", style: { textTransform: "uppercase", letterSpacing: "0.04em" } },
  { value: "smallcaps", label: "Kleinkapitalen", style: { fontVariantCaps: "small-caps", letterSpacing: "0.04em" } },
  { value: "normal", label: "Gewoon", style: {} },
  { value: "lower", label: "kleine letters", style: { textTransform: "lowercase" } },
];

/** The look on top of the typeface; every choice can go back to Standaard. */
function LookFields({ look, onChange, show, inherit, label = "Letters", italicDefault = false }: {
  look?: TextLook;
  onChange: (look: TextLook) => void;
  show: LookPart[];
  /** The face this text has when none is chosen. */
  inherit: FontDef;
  label?: string;
  /** Whether the text is slanted when nothing is chosen (quotes are). */
  italicDefault?: boolean;
}) {
  const l = look ?? {};
  const set = (patch: Partial<TextLook>) => onChange({ ...l, ...patch });
  const chosen = useFontDef(l.font);
  const face = l.font ? chosen : inherit;
  return (
    <details className="pm-item pm-look" open>
      <summary>{label}</summary>
      <div className="s-stack" style={{ paddingTop: 10 }}>
        {show.includes("font") && (
          <Field label="Lettertype">
            {/* A new face starts at its own weight. */}
            <FontPicker label="Lettertype" value={l.font} inherit={inherit} onChange={(font) => set({ font, weight: undefined })} />
          </Field>
        )}
        {show.includes("weight") && face.weights.length > 1 && (
          <Field label="Dikte">
            <WeightPicker font={face} value={l.weight} onChange={(weight) => set({ weight })} />
          </Field>
        )}
        {show.includes("size") && (
          <Field label="Grootte">
            <Segmented<"s" | "m" | "l" | "xl"> label="Grootte" value={l.size || "m"} onChange={(size) => set({ size })}
              options={[{ value: "s", label: "Klein" }, { value: "m", label: "Normaal" }, { value: "l", label: "Groot" }, { value: "xl", label: "XL" }]} />
          </Field>
        )}
        {show.includes("align") && (
          <Field label="Uitlijnen">
            <Segmented<"left" | "center" | "right"> label="Uitlijnen" value={l.align || "left"}
              onChange={(align) => set({ align: align === "left" ? undefined : align })}
              options={[{ value: "left", label: "Links" }, { value: "center", label: "Midden" }, { value: "right", label: "Rechts" }]} />
          </Field>
        )}
        {show.includes("case") && (
          <Field label="Hoofdletters">
            <div className="s-chips" role="group" aria-label="Hoofdletters">
              {CASES.map((c) => (
                <button key={c.value} type="button" className="s-chip" aria-pressed={(l.case || "auto") === c.value} style={c.style}
                  onClick={() => set({ case: c.value === "auto" ? undefined : c.value })}>{c.label}</button>
              ))}
            </div>
          </Field>
        )}
        {show.includes("tracking") && (
          <Field label="Ruimte tussen de letters">
            <Segmented<"tight" | "normal" | "wide"> label="Ruimte tussen de letters" value={l.tracking || "normal"}
              onChange={(tracking) => set({ tracking: tracking === "normal" ? undefined : tracking })}
              options={[{ value: "tight", label: "Krap" }, { value: "normal", label: "Standaard" }, { value: "wide", label: "Ruim" }]} />
          </Field>
        )}
        {show.includes("italic") && (
          <label className="s-check"><input type="checkbox" checked={l.italic ?? italicDefault} onChange={(e) => set({ italic: e.target.checked })} /> Schuin</label>
        )}
        {show.includes("dropcap") && (
          <label className="s-check"><input type="checkbox" checked={!!l.dropcap} onChange={(e) => set({ dropcap: e.target.checked || undefined })} /> Grote beginletter</label>
        )}
        {Object.values(l).some((v) => v !== undefined) && (
          <Button size="sm" variant="ghost" style={{ alignSelf: "flex-start" }} onClick={() => onChange({})}>Terug naar standaard</Button>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Text with bold, italic and links
// ---------------------------------------------------------------------------

/** A Dutch-spellchecked text area with buttons for **bold**, *italic* and links. */
function TextAreaRich({ label, hint, rows, value, onChange, plain }: {
  label: string; hint?: string; rows: number; value: string; onChange: (v: string) => void; plain?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(before: string, after: string, fallback: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const chosen = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + before + chosen + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  }
  function link() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const text = value.slice(s, e) || "linktekst";
    const url = "https://";
    onChange(`${value.slice(0, s)}[${text}](${url})${value.slice(e)}`);
    requestAnimationFrame(() => {
      el.focus();
      const at = s + text.length + 3 + url.length;
      el.setSelectionRange(at, at);
    });
  }
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {!plain && (
        <div className="pm-format" role="toolbar" aria-label="Opmaak van de tekst">
          <button type="button" title="Vet" aria-label="Vet" onClick={() => wrap("**", "**", "vet")}><Bold /></button>
          <button type="button" title="Schuin" aria-label="Schuin" onClick={() => wrap("*", "*", "schuin")}><Italic /></button>
          <button type="button" title="Link" aria-label="Link" onClick={link}><Link2 /></button>
        </div>
      )}
      <Textarea id={id} ref={ref} rows={rows} lang="nl" spellCheck value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
