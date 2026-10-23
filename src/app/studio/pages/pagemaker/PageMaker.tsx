import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronLeft, Copy, ExternalLink, ImageOff, LayoutTemplate, Monitor, Plus, Redo2, Save, Smartphone, SpellCheck, Trash2, Undo2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArticleView, type EditorHooks } from "../../../components/article/ArticleView";
import { blockUrls, buildPage, heroCover, newBlock, newId, TEMPLATES, type BlockType, type TemplateId } from "../../../lib/articlePage";
import { del, put } from "../../api";
import { useAction } from "../../queries";
import { Button, Empty, Modal, Pill, Segmented, Skeleton, undoToast, useConfirm } from "../../ui";
import { useUnsavedChanges } from "../../unsaved";
import { usesAdobe } from "../../../lib/typefaces";
import { isWork, portfolioKey, useArticles } from "./data";
import { FontsProvider } from "./fonts";
import { LanguagePanel } from "./LanguagePanel";
import { MediaPicker, type PickRequest } from "./MediaPicker";
import { BlockPanel, blockName, HeroPanel, InsertPanel, PagePanel } from "./Panels";
import { TemplateSketch } from "./schematics";
import { addPhotos, draftOf, duplicateBlock, insertBlock, moveBlock, removeBlock, shownPage, useHistory, type Draft } from "./state";
import "./pagemaker.css";

// The page maker: the article as the site shows it, with every block
// clickable, and a panel on the right to change what is selected. Nothing
// reaches the site before Opslaan.

const WIDTH = { desktop: 1280, phone: 390 } as const;

export function PageMakerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const articles = useArticles();
  const article = articles.data?.find((a) => a.id === id) ?? null;
  const categories = useMemo(() => [...new Set((articles.data || []).filter(isWork).map((a) => a.category).filter(Boolean))].sort(), [articles.data]);

  const history = useHistory<Draft>();
  const { value: draft, commit, undo, redo } = history;
  const [saved, setSaved] = useState("");
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!article || loadedFor.current === article.id) return;
    loadedFor.current = article.id;
    const d = draftOf(article);
    history.reset(d);
    setSaved(JSON.stringify(d));
  }, [article]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useUnsavedChanges(dirty);

  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "insert" | "check">("edit");
  const [insertAt, setInsertAt] = useState(0);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [picking, setPicking] = useState<PickRequest | null>(null);
  const [choosingTemplate, setChoosingTemplate] = useState(false);
  const kit = useRef<string | null>(null);

  const page = useMemo(() => (draft ? shownPage(draft) : null), [draft]);
  const used = useMemo(() => new Set(page?.blocks.flatMap(blockUrls) ?? []), [page]);
  const block = page?.blocks.find((b) => b.id === selected) ?? null;

  const save = useAction({
    // Adobe faces need their project on the site; the page takes it along.
    fn: (d: Draft) => put(`/admin/portfolio/${id}`, d.page && usesAdobe(d.page) && kit.current && d.page.kit !== kit.current ? { ...d, page: { ...d.page, kit: kit.current } } : d),
    invalidate: () => [portfolioKey],
    success: "Opgeslagen",
    onSuccess: (_r, d) => setSaved(JSON.stringify(d)),
  });
  const remove = useAction({
    fn: () => del(`/admin/portfolio/${id}`),
    invalidate: () => [portfolioKey],
    success: "Verwijderd",
    onSuccess: () => navigate("/admin/portfolio"),
  });

  // The preview is the real page at computer or phone width, scaled to fit.
  const stage = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoom = stageWidth ? Math.min(1, stageWidth / WIDTH[device]) : 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        if (dirty && draft && !save.isPending) save.mutate(draft);
        return;
      }
      // Inside a text field the browser's own undo applies.
      if ((e.target as HTMLElement).closest("input, textarea, select, [role='dialog']")) return;
      if (mod && key === "z") { e.preventDefault(); (e.shiftKey ? redo : undo)(); }
      if (mod && key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Escape") { setSelected(null); setMode("edit"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (articles.isLoading || (article && !draft)) {
    return (
      <div className="pm" role="status" aria-busy="true">
        <span className="s-sr">Laden…</span>
        <div className="pm-top"><Skeleton h={18} w={220} /></div>
        <div className="pm-body"><div className="pm-stage"><Skeleton h={480} r={10} /></div><aside className="pm-panel"><div className="pm-panel-body"><Skeleton h={200} /></div></aside></div>
      </div>
    );
  }
  if (!article || !draft || !page) {
    return (
      <div className="s-view narrow">
        <Empty icon={<ImageOff />} title="Dit stuk bestaat niet (meer)" action={<Link className="s-btn" to="/admin/portfolio">Naar het portfolio</Link>} />
      </div>
    );
  }

  /** Selects a block and scrolls the preview to it. */
  function reveal(target: string) {
    setSelected(target);
    setMode("edit");
    requestAnimationFrame(() => stage.current?.querySelector(`[data-block="${CSS.escape(target)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  function act(target: string, a: "up" | "down" | "copy" | "remove") {
    if (a === "up" || a === "down") return commit(moveBlock(target, a === "up" ? -1 : 1));
    if (a === "copy") {
      const copy = newId();
      commit(duplicateBlock(target, copy));
      return reveal(copy);
    }
    const name = page ? blockName(page.blocks.find((b) => b.id === target)!) : "Blok";
    commit(removeBlock(target));
    setSelected(null);
    undoToast(`${name} weggehaald`, undo);
  }

  function insert(type: BlockType) {
    const b = newBlock(type);
    commit(insertBlock(insertAt, type, b));
    reveal(b.id);
    // Straight to typing in the new block.
    setTimeout(() => document.querySelector<HTMLElement>(".pm-panel-body textarea, .pm-panel-body input.s-input")?.focus({ preventScroll: true }), 60);
  }

  function applyTemplate(t: TemplateId) {
    const name = TEMPLATES.find((x) => x.id === t)!.name;
    commit((d) => {
      const built = buildPage({ ...d, page: null, createdAt: article?.createdAt }, t);
      // A chosen typeface and title look stay; the template only changes the layout then.
      return {
        ...d,
        page: { ...built, subtitle: built.subtitle || d.page?.subtitle || "", type: d.page?.type ?? built.type, titleLook: d.page?.titleLook },
      };
    });
    setChoosingTemplate(false);
    setSelected(null);
    setMode("edit");
    toast.success(`Template ${name} staat erop. Ongedaan maken kan met Ctrl+Z.`);
  }

  const editor: EditorHooks = {
    selected,
    onSelect: (target) => { setSelected(target); setMode("edit"); },
    between: (i) => (
      <button type="button" className="pm-plus" aria-label="Hier een blok toevoegen" title="Hier een blok toevoegen"
        onClick={() => { setInsertAt(i); setSelected(null); setMode("insert"); }}>
        <Plus />
      </button>
    ),
    tools: (target) => target === "hero" ? null : (
      <div className="pm-tools" role="toolbar" aria-label="Blok">
        <button type="button" aria-label="Omhoog" title="Omhoog" onClick={() => act(target, "up")}><ArrowUp /></button>
        <button type="button" aria-label="Omlaag" title="Omlaag" onClick={() => act(target, "down")}><ArrowDown /></button>
        <button type="button" aria-label="Kopie maken" title="Kopie maken" onClick={() => act(target, "copy")}><Copy /></button>
        <button type="button" aria-label="Weghalen" title="Weghalen" onClick={() => act(target, "remove")}><Trash2 /></button>
      </div>
    ),
  };

  const pick = (req: PickRequest) => setPicking(req);
  const back = (
    <Button size="sm" variant="ghost" icon={<ChevronLeft />} onClick={() => { setSelected(null); setMode("edit"); }}>Pagina</Button>
  );
  const panel =
    mode === "check" ? { title: "Taalcheck", body: <LanguagePanel draft={draft} page={page} commit={commit} onReveal={reveal} /> }
      : mode === "insert" ? { title: "Blok toevoegen", body: <InsertPanel onInsert={insert} /> }
        : selected === "hero" ? { title: "Kop", body: <HeroPanel draft={draft} page={page} commit={commit} pick={pick} categories={categories} /> }
          : block ? { title: blockName(block), body: <BlockPanel key={block.id} block={block} draft={draft} page={page} commit={commit} pick={pick} onAction={(a) => act(block.id, a)} /> }
            : null;

  return (
    <FontsProvider pageKit={draft.page?.kit} onKit={(k) => { kit.current = k; }}>
    <div className="pm">
      <header className="pm-top">
        <Link to="/admin/portfolio" className="s-btn ghost sm" aria-label="Terug naar het portfolio"><ArrowLeft size={15} /></Link>
        <div className="pm-name">
          <b className="s-truncate">{draft.title || "Zonder titel"}</b>
          <span className="s-row nowrap" style={{ gap: 6 }}>
            <Pill tone={draft.published ? "ok" : undefined}>{draft.published ? "Op de site" : "Concept"}</Pill>
            {dirty && <span className="s-small s-faint">Niet opgeslagen</span>}
          </span>
        </div>
        <span className="s-spacer" />
        <Segmented<"desktop" | "phone"> label="Voorbeeld" value={device} onChange={setDevice}
          options={[{ value: "desktop", label: <><Monitor size={14} /> Computer</> }, { value: "phone", label: <><Smartphone size={14} /> Telefoon</> }]} />
        <span className="s-spacer" />
        <div className="s-row nowrap" style={{ gap: 4 }}>
          <Button size="sm" variant="ghost" iconOnly icon={<Undo2 />} aria-label="Ongedaan maken" title="Ongedaan maken (Ctrl+Z)" disabled={!history.canUndo} onClick={undo} />
          <Button size="sm" variant="ghost" iconOnly icon={<Redo2 />} aria-label="Opnieuw" title="Opnieuw (Ctrl+Y)" disabled={!history.canRedo} onClick={redo} />
        </div>
        <Button size="sm" icon={<LayoutTemplate />} onClick={() => setChoosingTemplate(true)}>Template</Button>
        <Button size="sm" icon={<SpellCheck />} aria-pressed={mode === "check"} className={mode === "check" ? "pm-on" : undefined}
          onClick={() => { setSelected(null); setMode(mode === "check" ? "edit" : "check"); }}>Taalcheck</Button>
        {article.published && (
          <a className="s-btn sm" href={`/portfolio/${article.id}`} target="_blank" rel="noreferrer" title="De opgeslagen versie op de site"><ExternalLink size={15} />Bekijk</a>
        )}
        <Button size="sm" variant="primary" icon={<Save />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(draft)}>
          {dirty ? "Opslaan" : "Opgeslagen"}
        </Button>
      </header>

      <div className="pm-body">
        <div
          ref={stage}
          className="pm-stage"
          onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setMode("edit"); } }}
        >
          <div className={`pm-device pm-device--${device}`} style={{ ["--pm-unzoom" as string]: 1 / zoom }}>
            <div className="pm-canvas" style={{ width: WIDTH[device], zoom }}>
              <ArticleView source={draft} page={page} editor={editor} />
            </div>
          </div>
        </div>

        <aside className="pm-panel" lang="nl" aria-label="Instellingen">
          <div className="pm-panel-head">
            {panel ? back : <h2>Pagina</h2>}
            {panel && <h2 className="s-truncate">{panel.title}</h2>}
          </div>
          <div className="pm-panel-body">
            {panel ? panel.body : (
              <PagePanel
                draft={draft}
                page={page}
                commit={commit}
                pick={pick}
                categories={categories}
                selected={selected}
                onSelect={reveal}
                onInsert={(i) => { setInsertAt(i); setMode("insert"); }}
                onTemplate={() => setChoosingTemplate(true)}
                footer={
                  <Button variant="danger" icon={<Trash2 />} loading={remove.isPending} style={{ alignSelf: "flex-start" }}
                    onClick={async () => { if (await confirm({ title: `${draft.title} verwijderen?`, body: "Het verdwijnt meteen van de site.", danger: true, confirm: "Verwijderen" })) remove.mutate(); }}>
                    Stuk verwijderen
                  </Button>
                }
              />
            )}
          </div>
        </aside>
      </div>

      {picking && (
        <MediaPicker
          request={picking}
          gallery={draft.galleryUrls}
          used={used}
          cover={page.hero === "plain" ? undefined : heroCover(draft)?.url}
          onClose={() => setPicking(null)}
          onUploaded={(urls) => commit(addPhotos(urls))}
        />
      )}
      {choosingTemplate && <TemplatePicker onPick={applyTemplate} onClose={() => setChoosingTemplate(false)} current={draft.page?.template} />}
    </div>
    </FontsProvider>
  );
}

function TemplatePicker({ onPick, onClose, current }: { onPick: (t: TemplateId) => void; onClose: () => void; current?: TemplateId }) {
  return (
    <Modal
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title="Kies een template"
      description="Een template verdeelt je tekst en foto's opnieuw over de pagina. Je huidige opmaak wordt vervangen; met Ongedaan maken haal je hem terug."
    >
      <div className="pm-templates">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="pm-template" aria-pressed={current === t.id} onClick={() => onPick(t.id)}>
            <TemplateSketch id={t.id} />
            <b>{t.name}</b>
            <span>{t.about}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
