import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, ExternalLink, File as FileIcon, FileArchive, FileText, Film, Folder as FolderIcon, FolderOpen, FolderTree, Image as ImageIcon, Music, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { get } from "../api";
import { ago, fileSize, fmtDateTime } from "../format";
import { useAction } from "../queries";
import { Button, Card, cx, Empty, ErrorState, Input, Modal, PageHead, Skeleton, SkeletonList } from "../ui";
import { useUrlState } from "../urlState";

// Everything stored for the site, folder by folder. Only to look through: what
// someone may see is decided per file on the server.

type Stored = { bucket: string; path: string; folder: string; name: string; size: number; type: string; updatedAt: string; public: boolean };
type Listing = { files: Stored[]; labels: Record<string, string>; used: number; limit: number };
type Folder = { path: string; part: string; folders: Folder[]; files: Stored[]; count: number; size: number };

const SECTIONS = ["website", "galerijen", "toestemming", "locaties", "bonnetjes", "investeringen", "pool", "overig"];

const HINTS: Record<string, string> = {
  website: "De foto's van de site",
  galerijen: "Foto's en video's van klanten, per project",
  toestemming: "Foto's die ouders meestuurden om hun kind te herkennen",
  locaties: "Foto's van locaties",
  bonnetjes: "Bonnetjes en facturen van declaraties",
  investeringen: "Foto's van aankopen en wensen",
  pool: "Wat met de oude bestandenpool is gestuurd",
};

// Only what a browser shows safely on its own, in the preview. The rest opens in a tab or downloads.
const SHOWS_AS_IMAGE = /^image\/(jpeg|png|webp|gif|avif)$/;
const SHOWS_AS_VIDEO = /^video\/(mp4|quicktime|webm)$/;

function iconFor(f: { type: string; name: string }) {
  if (f.type.startsWith("image/")) return <ImageIcon />;
  if (f.type.startsWith("video/")) return <Film />;
  if (f.type.startsWith("audio/")) return <Music />;
  if (f.type === "application/pdf" || f.type.startsWith("text/")) return <FileText />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(f.name)) return <FileArchive />;
  return <FileIcon />;
}

function buildTree(files: Stored[], labels: Record<string, string>) {
  const empty = (path: string, part: string): Folder => ({ path, part, folders: [], files: [], count: 0, size: 0 });
  const root = empty("", "");
  const byPath = new Map([["", root]]);
  for (const f of files) {
    let node = root;
    node.count++;
    node.size += f.size;
    for (const part of f.folder.split("/")) {
      const path = node.path ? `${node.path}/${part}` : part;
      let next = byPath.get(path);
      if (!next) {
        next = empty(path, part);
        byPath.set(path, next);
        node.folders.push(next);
      }
      next.count++;
      next.size += f.size;
      node = next;
    }
    node.files.push(f);
  }
  for (const node of byPath.values()) {
    node.folders.sort((a, b) => (labels[a.part] ?? a.part).localeCompare(labels[b.part] ?? b.part, "nl"));
    node.files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const place = (f: Folder) => { const i = SECTIONS.indexOf(f.part); return i < 0 ? SECTIONS.length : i; };
  root.folders.sort((a, b) => place(a) - place(b));
  return { root, byPath };
}

const countOf = (n: number) => `${n} ${n === 1 ? "bestand" : "bestanden"}`;

export function FilesPage() {
  const [map, setMap] = useUrlState<string>("map", "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Stored | null>(null);
  const data = useQuery({ queryKey: ["stored-files"], queryFn: ({ signal }) => get<Listing>("/admin/files", signal) });
  const labels = data.data?.labels || {};
  const { root, byPath } = useMemo(() => buildTree(data.data?.files || [], data.data?.labels || {}), [data.data]);
  const label = (part: string) => labels[part] ?? part;
  const pathOf = (folder: string) => folder.split("/").map(label).join(" / ");

  // A folder that is no longer there, or an old link to one, starts over at the top.
  const here = byPath.get(map) || root;
  const crumbs = here.path ? here.path.split("/").map((part, i, all) => ({ part, path: all.slice(0, i + 1).join("/") })) : [];
  const q = query.trim().toLowerCase();
  const found = q ? (data.data?.files || []).filter((f) => f.name.toLowerCase().includes(q)).slice(0, 200) : null;
  const go = (path: string) => { setQuery(""); setMap(path); };
  const usedShare = data.data ? Math.min(1, data.data.used / data.data.limit) : 0;

  return (
    <div className="s-view">
      <PageHead title="Bestanden" sub="Alles wat er voor de site is opgeslagen, map voor map." />
      <div className="s-row between">
        <div className="s-files-search">
          <Search aria-hidden="true" />
          <Input type="search" aria-label="Zoek een bestand" placeholder="Zoek een bestand" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {data.data && (
          <div className="s-stack sm s-files-used">
            <span className="s-small s-muted">{fileSize(data.data.used)} van {fileSize(data.data.limit)} opslag gebruikt</span>
            <div className="s-progress" role="progressbar" aria-label="Opslag gebruikt" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedShare * 100)}>
              <i style={{ transform: `scaleX(${usedShare})`, background: usedShare > 0.9 ? "var(--bad)" : undefined }} />
            </div>
          </div>
        )}
      </div>
      {data.isError && <ErrorState error={data.error} retry={() => data.refetch()} />}
      <div className="s-files">
        <Card className="s-tree" bodyClass="none">
          <nav aria-label="Mappen">
            {data.isLoading ? <SkeletonList rows={5} /> : (
              <ul>
                <li>
                  <button type="button" aria-current={!here.path || undefined} onClick={() => go("")}>
                    <FolderTree /> <span className="s-truncate">Alle mappen</span> <span className="n">{root.count}</span>
                  </button>
                </li>
                {root.folders.map((f) => <TreeNode key={f.path} folder={f} current={here.path} label={label} onOpen={go} />)}
              </ul>
            )}
          </nav>
        </Card>
        <Card bodyClass="none">
          {found ? (
            <>
              <div className="s-crumbs" role="status">{found.length === 200 ? "De eerste 200 resultaten" : countOf(found.length)} voor “{query.trim()}”</div>
              {found.length === 0 ? <Empty icon={<Search />} title="Niets gevonden">Zoek op een deel van de naam.</Empty> : (
                <ul className="s-list">{found.map((f) => <FileRow key={f.bucket + f.path} file={f} where={pathOf(f.folder)} onOpen={setOpen} />)}</ul>
              )}
            </>
          ) : (
            <>
              <nav className="s-crumbs" aria-label="Waar je bent">
                <button type="button" aria-current={!here.path ? "page" : undefined} onClick={() => go("")}>Alle mappen</button>
                {crumbs.map((c, i) => (
                  <span key={c.path} className="s-row nowrap" style={{ gap: 4, minWidth: 0 }}>
                    <ChevronRight aria-hidden="true" />
                    <button type="button" className="s-truncate" aria-current={i === crumbs.length - 1 ? "page" : undefined} onClick={() => go(c.path)}>{label(c.part)}</button>
                  </span>
                ))}
              </nav>
              {data.isLoading ? <SkeletonList rows={6} /> : here.count === 0 ? (
                <Empty icon={<FolderTree />} title="Hier staan geen bestanden" />
              ) : (
                <ul className="s-list">
                  {here.folders.map((f) => (
                    <li key={f.path}>
                      <button type="button" className="s-item" onClick={() => go(f.path)}>
                        <span className="s-ico"><FolderIcon /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="t s-truncate">{label(f.part)}</div>
                          <div className="s">{!here.path && HINTS[f.part] ? `${HINTS[f.part]} · ` : ""}{countOf(f.count)} · {fileSize(f.size)}</div>
                        </div>
                        <ChevronRight aria-hidden="true" size={16} className="s-faint" />
                      </button>
                    </li>
                  ))}
                  {here.files.map((f) => <FileRow key={f.bucket + f.path} file={f} onOpen={setOpen} />)}
                </ul>
              )}
            </>
          )}
        </Card>
      </div>
      <FileDialog file={open} where={open ? pathOf(open.folder) : ""} onClose={() => setOpen(null)} />
    </div>
  );
}

/** A folder in the tree; what is inside only unfolds along the way to where you are. */
function TreeNode({ folder, current, label, onOpen, depth = 0 }: {
  folder: Folder; current: string; label: (part: string) => string; onOpen: (path: string) => void; depth?: number;
}) {
  const active = current === folder.path;
  const unfolded = active || current.startsWith(`${folder.path}/`);
  return (
    <li>
      <button type="button" aria-current={active || undefined} style={{ paddingLeft: 10 + depth * 14 }} onClick={() => onOpen(folder.path)}>
        {unfolded ? <FolderOpen /> : <FolderIcon />} <span className="s-truncate">{label(folder.part)}</span> <span className="n">{folder.count}</span>
      </button>
      {unfolded && folder.folders.length > 0 && (
        <ul>{folder.folders.map((f) => <TreeNode key={f.path} folder={f} current={current} label={label} onOpen={onOpen} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}

function FileRow({ file, where, onOpen }: { file: Stored; where?: string; onOpen: (f: Stored) => void }) {
  return (
    <li>
      <button type="button" className="s-item" onClick={() => onOpen(file)}>
        <span className="s-ico">{iconFor(file)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="t s-truncate" title={file.name}>{file.name}</div>
          <div className="s">{where ? `${where} · ` : ""}{file.public ? "Openbaar" : "Privé"} · {fileSize(file.size)} · {ago(file.updatedAt)}</div>
        </div>
        <ChevronRight aria-hidden="true" size={16} className="s-faint" />
      </button>
    </li>
  );
}

function FileDialog({ file, where, onClose }: { file: Stored | null; where: string; onClose: () => void }) {
  const link = useQuery({
    queryKey: ["stored-file-link", file?.bucket, file?.path],
    queryFn: ({ signal }) => get<{ url: string }>(`/admin/files/link?${new URLSearchParams({ bucket: file!.bucket, path: file!.path })}`, signal),
    enabled: !!file,
    staleTime: 30 * 60_000,
  });
  // The link makes the browser save the file, so this page stays where it is.
  const download = useAction({
    fn: (f: Stored) => get<{ url: string }>(`/admin/files/link?${new URLSearchParams({ bucket: f.bucket, path: f.path, download: f.name })}`),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const url = link.data?.url;

  return (
    <Modal
      wide
      open={!!file}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={file?.name || ""}
      footer={file && (
        <>
          {url && <a className="s-btn" href={url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Openen</a>}
          <Button variant="primary" icon={<Download />} loading={download.isPending} onClick={() => download.mutate(file)}>Downloaden</Button>
        </>
      )}
    >
      {file && (
        <>
          <Preview key={file.bucket + file.path} file={file} url={url} failed={link.isError} />
          <dl className="s-file-facts">
            <dt>Map</dt><dd>{where}</dd>
            <dt>Grootte</dt><dd>{fileSize(file.size)}</dd>
            <dt>Gewijzigd</dt><dd>{fmtDateTime(file.updatedAt)}</dd>
            <dt>Zichtbaar</dt><dd>{file.public ? "Openbaar: iedereen met de link kan dit zien" : "Privé: alleen via de admin of een tijdelijke link"}</dd>
            <dt>Opslag</dt><dd className="s-mono s-small">{file.bucket}/{file.path}</dd>
          </dl>
        </>
      )}
    </Modal>
  );
}

function Preview({ file, url, failed }: { file: Stored; url?: string; failed: boolean }) {
  const [broken, setBroken] = useState(false);
  const image = SHOWS_AS_IMAGE.test(file.type);
  const video = SHOWS_AS_VIDEO.test(file.type);
  if (failed || broken || !(image || video)) {
    return (
      <div className={cx("s-file-preview", "none")}>
        <span className="s-ico">{iconFor(file)}</span>
        <span className="s-small s-muted">{failed ? "Dit bestand kon niet worden geopend." : "Hier is geen voorbeeld van. Open of download het bestand."}</span>
      </div>
    );
  }
  if (!url) return <Skeleton h={240} r={12} />;
  return (
    <div className="s-file-preview">
      {image
        ? <img src={url} alt={file.name} onError={() => setBroken(true)} />
        : <video src={url} controls playsInline preload="metadata" onError={() => setBroken(true)} />}
    </div>
  );
}
