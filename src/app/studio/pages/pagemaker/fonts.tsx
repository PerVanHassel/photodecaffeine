import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Link2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  adobeFont, adobeKitCss, FONT_GROUPS, fontCss, fontDef, FONTS, parseKit, WEIGHT_NAMES, type FontDef,
} from "../../../lib/typefaces";
import { errorMessage, get, put } from "../../api";
import { Button, Input } from "../../ui";

// The page maker's letters: the Fontshare library plus the faces of the
// studio's Adobe Fonts web project. The project id is kept in the site
// settings, so everyone in the studio sees the same faces.

type Kit = { id: string | null; fonts: FontDef[]; state: "none" | "loading" | "ready" | "error" };

const FontsContext = createContext<{ fonts: FontDef[]; kit: Kit; connect: (id: string | null) => Promise<void> }>({
  fonts: FONTS,
  kit: { id: null, fonts: [], state: "none" },
  connect: async () => {},
});

export const useFonts = () => useContext(FontsContext);

/** The families in an Adobe Fonts project, read from its stylesheet. */
export async function readKit(id: string, url = adobeKitCss(id)): Promise<FontDef[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? "Dit project bestaat niet. Kijk de project-ID na." : `Adobe Fonts gaf een fout (${res.status}).`);
  const css = await res.text();
  const faces = new Map<string, { weights: Set<number>; italic: boolean }>();
  for (const block of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const family = block[1].match(/font-family:\s*"([^"]+)"/)?.[1];
    if (!family) continue;
    const f = faces.get(family) ?? { weights: new Set<number>(), italic: false };
    f.weights.add(Number(block[1].match(/font-weight:\s*(\d+)/)?.[1] ?? 400));
    if (/font-style:\s*italic/.test(block[1])) f.italic = true;
    faces.set(family, f);
  }
  // The .tk-<family> classes name the fallback, which tells a serif from a sans.
  const serif = new Set([...css.matchAll(/font-family:\s*"([^"]+)",\s*serif/g)].map((m) => m[1]));
  return [...faces].map(([family, f]) => adobeFont(family, serif.has(family), [...f.weights].sort((a, b) => a - b), f.italic));
}

export function FontsProvider({ pageKit, onKit, children }: { pageKit?: string; onKit?: (id: string | null) => void; children: React.ReactNode }) {
  const qc = useQueryClient();
  // Reading the settings needs the settings right; without it the page's own project still works.
  const settings = useQuery({
    queryKey: ["settings", "adobe"],
    queryFn: ({ signal }) => get<{ settings: { adobeFontsKit?: string } }>("/admin/settings", signal).then((r) => r.settings.adobeFontsKit || null),
    retry: false,
  });
  const id = settings.data ?? pageKit ?? null;
  const [kit, setKit] = useState<Kit>({ id: null, fonts: [], state: "none" });
  useEffect(() => onKit?.(id), [id, onKit]);

  useEffect(() => {
    if (!id) return setKit({ id: null, fonts: [], state: "none" });
    let live = true;
    setKit((k) => ({ ...k, id, state: "loading" }));
    readKit(id)
      .then((fonts) => live && setKit({ id, fonts, state: "ready" }))
      .catch(() => live && setKit({ id, fonts: [], state: "error" }));
    return () => { live = false; };
  }, [id]);

  async function connect(next: string | null) {
    if (next) await readKit(next); // throws with a readable message when the id is wrong
    await put("/admin/settings", { adobeFontsKit: next || "" });
    await qc.invalidateQueries({ queryKey: ["settings"] });
  }

  const links = [...FONTS.map((f) => fontCss(f.key)), kit.id ? adobeKitCss(kit.id) : null].filter((u): u is string => !!u);
  return (
    <FontsContext.Provider value={{ fonts: [...FONTS, ...kit.fonts], kit, connect }}>
      {/* Every face, so the choices show in their own letters. */}
      <Helmet>{links.map((href) => <link key={href} rel="stylesheet" href={href} />)}</Helmet>
      {children}
    </FontsContext.Provider>
  );
}

/** A face by key, with what the Adobe project knows about it. */
export function useFontDef(key: string | undefined): FontDef {
  const { fonts } = useFonts();
  return (key && fonts.find((f) => f.key === key)) || fontDef(key);
}

/**
 * Picks a face, every name shown in its own letters. `inherit` is what
 * "no choice" means here (the page's face), shown as the first option.
 */
export function FontPicker({ value, onChange, inherit, label }: {
  value?: string;
  onChange: (key: string | undefined) => void;
  inherit: FontDef;
  label: string;
}) {
  const { fonts } = useFonts();
  const ref = useRef<HTMLDetailsElement>(null);
  const current = useFontDef(value);
  const choose = (key: string | undefined) => {
    onChange(key);
    if (ref.current) ref.current.open = false;
  };
  return (
    <details ref={ref} className="pm-font">
      <summary aria-label={`${label}: ${value ? current.name : `zoals de pagina (${inherit.name})`}`}>
        <span className="pm-font-now" style={{ fontFamily: (value ? current : inherit).family }}>{value ? current.name : inherit.name}</span>
        {!value && <span className="s-small s-faint">zoals de pagina</span>}
        <ChevronDown size={15} className="s-faint" style={{ marginLeft: "auto" }} />
      </summary>
      <div className="pm-font-list" role="listbox" aria-label={label}>
        <button type="button" role="option" aria-selected={!value} className="pm-font-item" onClick={() => choose(undefined)}>
          <span style={{ fontFamily: inherit.family }}>{inherit.name}</span>
          <small>Zoals de pagina</small>
          {!value && <Check size={14} />}
        </button>
        {FONT_GROUPS.map(({ group, label: groupLabel }) => {
          const list = fonts.filter((f) => f.group === group);
          if (!list.length) return null;
          return (
            <div key={group} role="group" aria-label={groupLabel}>
              <p className="pm-font-group">{groupLabel}</p>
              {list.map((f) => (
                <button key={f.key} type="button" role="option" aria-selected={value === f.key} className="pm-font-item" onClick={() => choose(f.key)}>
                  <span style={{ fontFamily: f.family, fontWeight: f.head.w, textTransform: f.head.upper ? "uppercase" : undefined }}>{f.name}</span>
                  <small>{f.about}</small>
                  {value === f.key && <Check size={14} />}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}

/** The weights a face has, as names. */
export function WeightPicker({ font, value, onChange }: { font: FontDef; value?: number; onChange: (w: number | undefined) => void }) {
  if (font.weights.length < 2) return null;
  return (
    <div className="s-chips" role="group" aria-label="Dikte">
      <button type="button" className="s-chip" aria-pressed={!value} onClick={() => onChange(undefined)}>Standaard</button>
      {font.weights.map((w) => (
        <button key={w} type="button" className="s-chip" aria-pressed={value === w} style={{ fontFamily: font.family, fontWeight: w }} onClick={() => onChange(w)}>
          {WEIGHT_NAMES[w] ?? w}
        </button>
      ))}
    </div>
  );
}

/** Links the studio's Adobe Fonts web project. */
export function AdobeKitField() {
  const { kit, connect } = useFonts();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function link(next: string | null) {
    setBusy(true);
    try {
      await connect(next);
      toast.success(next ? "Adobe Fonts gekoppeld" : "Adobe Fonts ontkoppeld");
      setInput("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pm-adobe">
      <b>Adobe Fonts</b>
      {kit.id ? (
        <>
          <p className="s-small s-muted">
            {kit.state === "loading" ? "Fonts laden…"
              : kit.state === "error" ? `Project ${kit.id} is niet te laden. Staat het nog in Adobe Fonts?`
                : `Project ${kit.id}: ${kit.fonts.length} ${kit.fonts.length === 1 ? "font" : "fonts"}. Ze staan in de lijst onder Adobe Fonts.`}
          </p>
          <div className="s-row">
            <Button size="sm" variant="ghost" loading={busy} onClick={() => void link(null)}>Ontkoppelen</Button>
          </div>
        </>
      ) : (
        <>
          <p className="s-small s-muted">
            Maak op fonts.adobe.com een webproject met de fonts die je wilt gebruiken. Plak hier de project-ID of de insluitcode.
          </p>
          <div className="s-row nowrap">
            <Input aria-label="Adobe Fonts project-ID" placeholder="bijv. abc1234" value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} />
            <Button size="sm" icon={<Link2 />} loading={busy} disabled={!parseKit(input)} onClick={() => void link(parseKit(input))}>Koppelen</Button>
          </div>
        </>
      )}
    </div>
  );
}
