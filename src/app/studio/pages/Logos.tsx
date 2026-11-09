import { downloadZip } from "client-zip";
import { Copy, Download, PenTool } from "lucide-react";
import { saveFile } from "../portal/data";
import { useAction } from "../queries";
import { Button, Card, PageHead } from "../ui";
import { copyText } from "./Money";

// Every version of the PDC logo, ready to download. The files are in
// public/brand/logo; a new version goes there and in VARIANTS below.

const DIR = "/brand/logo";

const VARIANTS = [
  { id: "01", name: "Crème op bruin", use: "Met bruine achtergrond", slug: "creme-op-bruin", tile: "brown" },
  { id: "02", name: "Bruin op crème", use: "Met crème achtergrond", slug: "bruin-op-creme", tile: "cream" },
  { id: "03", name: "Bruin, zonder achtergrond", use: "Voor op een lichte achtergrond", slug: "bruin-zonder-achtergrond", tile: "light" },
  { id: "04", name: "Crème, zonder achtergrond", use: "Voor op een donkere achtergrond", slug: "creme-zonder-achtergrond", tile: "dark" },
] as const;

const FORMATS = [
  { key: "svg", label: "SVG", detail: "Vector, scherp op elk formaat", folder: "SVG" },
  { key: "1181", label: "PNG groot", detail: "1181 × 1181 px", folder: "PNG 1181 px" },
  { key: "591", label: "PNG middel", detail: "591 × 591 px", folder: "PNG 591 px" },
  { key: "284", label: "PNG klein", detail: "284 × 284 px", folder: "PNG 284 px" },
] as const;

type Variant = (typeof VARIANTS)[number];
type Format = (typeof FORMATS)[number];

const COLORS = [
  { name: "Bruin", hex: "#3E250A", rgb: "62, 37, 10" },
  { name: "Crème", hex: "#FFFBE0", rgb: "255, 251, 224" },
];

const SOURCE = { url: `${DIR}/pdc-logo.ai`, name: "PDC-logo.ai" };

const urlOf = (v: Variant, key: Format["key"]) => `${DIR}/pdc-logo-${v.id}${key === "svg" ? ".svg" : `-${key}.png`}`;

/** The name a file gets once downloaded: which version and which size, readable. */
const nameOf = (v: Variant, f: Format) => `PDC-logo-${v.id}-${v.slug}${f.key === "svg" ? ".svg" : `-${f.key}px.png`}`;

/** Everything in one zip, a folder per format, made in the browser from the same files. */
async function zipAll() {
  const entries = [
    ...FORMATS.flatMap((f) => VARIANTS.map((v) => ({ url: urlOf(v, f.key), name: `${f.folder}/${nameOf(v, f)}` }))),
    { url: SOURCE.url, name: `Illustrator/${SOURCE.name}` },
  ];
  const files = await Promise.all(entries.map(async (e) => {
    const res = await fetch(e.url);
    if (!res.ok) throw new Error(`${e.name.split("/").pop()} kon niet worden opgehaald.`);
    return { name: e.name, input: res };
  }));
  saveFile("PDC-logo.zip", await downloadZip(files).blob(), "application/zip");
}

export function LogosPage() {
  const all = useAction({ fn: zipAll });

  return (
    <div className="s-view">
      <PageHead
        title="Logo's"
        sub="Alle versies van het PDC-logo. Klik op een formaat om het te downloaden."
        actions={<Button variant="primary" icon={<Download />} loading={all.isPending} onClick={() => all.mutate()}>Alles downloaden</Button>}
      />
      <div className="s-grid-cards">
        {VARIANTS.map((v) => (
          <Card key={v.id} bodyClass="none">
            <div className={`s-logo-tile ${v.tile}`}>
              <img
                src={urlOf(v, "591")}
                srcSet={`${urlOf(v, "591")} 591w, ${urlOf(v, "1181")} 1181w`}
                sizes="(max-width: 860px) 100vw, 320px"
                width={591}
                height={591}
                alt={`PDC-logo, ${v.name.toLowerCase()}`}
              />
            </div>
            <div className="s-logo-meta">
              <h2><span className="s-mono s-faint">{v.id}</span> {v.name}</h2>
              <p className="s-small s-muted">{v.use}</p>
            </div>
            <ul className="s-logo-files">
              {FORMATS.map((f) => (
                <li key={f.key}>
                  <a href={urlOf(v, f.key)} download={nameOf(v, f)}>
                    <b>{f.label}</b>
                    <span className="d">{f.detail}</span>
                    <span className="s-sr">downloaden, {v.name}</span>
                    <Download aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="s-grid-2 even">
        <Card title="Kleuren">
          <ul className="s-colors">
            {COLORS.map((c) => (
              <li key={c.hex}>
                <span className="s-swatch" style={{ background: c.hex }} aria-hidden="true" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ display: "block" }}>{c.name}</b>
                  <span className="s-small s-muted">RGB {c.rgb}</span>
                </div>
                <Button size="sm" variant="ghost" icon={<Copy />} aria-label={`${c.hex} kopiëren`} onClick={() => copyText(c.hex, "Kleurcode")}>
                  <span className="s-mono">{c.hex}</span>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Bronbestand">
          <div className="s-row between nowrap">
            <div className="s-row nowrap" style={{ gap: 12, minWidth: 0 }}>
              <span className="s-ico"><PenTool aria-hidden="true" /></span>
              <div style={{ minWidth: 0 }}>
                <b className="s-truncate" style={{ display: "block" }}>{SOURCE.name}</b>
                <span className="s-small s-muted">Voor Illustrator. Hierin pas je het logo aan.</span>
              </div>
            </div>
            <a className="s-btn sm" href={SOURCE.url} download={SOURCE.name}><Download aria-hidden="true" />Downloaden</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
