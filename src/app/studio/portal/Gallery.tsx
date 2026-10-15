import { useQueryClient } from "@tanstack/react-query";
import { downloadZip } from "client-zip";
import { ArrowLeft, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, get, post } from "../api";
import { ClientGallery } from "../gallery/ClientGallery";
import { useAction } from "../queries";
import type { GalleryImage, Project } from "../types";
import { Button, ErrorState, Modal, Skeleton, TextAreaField } from "../ui";
import { pkeys, saveFile, usePortalProject } from "./data";
import { useT } from "./i18n";

export function PortalGallery() {
  const { id = "" } = useParams();
  const t = useT();
  const qc = useQueryClient();
  const data = usePortalProject(id);
  const [submitting, setSubmitting] = useState(false);
  const [zip, setZip] = useState<{ done: number; total: number } | null>(null);

  const p = data.data?.project;
  const favs = new Set(p?.favoriteIds || []);
  const downloads = p?.downloads || "original";

  const toggle = useCallback(async (img: GalleryImage) => {
    if (!p) return;
    const on = !favs.has(img.id);
    const key = pkeys.project(id);
    const before = qc.getQueryData(key);
    qc.setQueryData(key, (d: any) => d && { ...d, project: { ...d.project, favoriteIds: on ? [...(d.project.favoriteIds || []), img.id] : (d.project.favoriteIds || []).filter((x: string) => x !== img.id) } });
    try {
      await post(`/portal/project/${id}/favorites`, { imageId: img.id, favorite: on });
    } catch (err) {
      qc.setQueryData(key, before);
      toast.error(errorMessage(err));
    }
  }, [p, favs, id, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadOne(img: GalleryImage) {
    try {
      const r = await get<{ url: string; fileName: string }>(`/portal/project/${id}/download/${img.id}`);
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function downloadAll(all: GalleryImage[]) {
    const list = all.filter((g) => g.download !== false);
    if (!p || !list.length) return;
    setZip({ done: 0, total: list.length });
    try {
      let done = 0;
      // Files are fetched one after another and streamed into the zip, so a
      // large gallery never has to sit in memory twice.
      async function* files() {
        const used = new Set<string>();
        for (const img of list) {
          const res = await fetch(img.url);
          if (!res.ok) throw new Error(`${img.fileName || "Een foto"} kon niet worden opgehaald.`);
          let name = img.fileName || `foto-${done + 1}.jpg`;
          if (downloads === "watermark") name = `${name.replace(/\.\w+$/, "")}-voorbeeld.jpg`;
          while (used.has(name)) name = name.replace(/(\.\w+)?$/, (ext) => `-${done}${ext}`);
          used.add(name);
          yield { name, input: res };
          done += 1;
          setZip({ done, total: list.length });
        }
      }
      const blob = await downloadZip(files()).blob();
      saveFile(`${(p.gallerySettings.title || p.title).replace(/[^\w-]+/g, "-").toLowerCase()}.zip`, blob, "application/zip");
      toast.success(t.downloadStarted);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setZip(null);
    }
  }

  if (data.isError) return <main className="p-main"><ErrorState error={data.error} /></main>;
  if (!p) return <main className="p-main"><Skeleton h={56} w="min(520px, 80%)" /><Skeleton h={320} r={4} /></main>;

  return (
    <>
      <ClientGallery
        project={p}
        favs={favs}
        actions={{ toggle, downloadOne, downloadAll, zip, submit: () => setSubmitting(true) }}
        back={<Link to={`/portal/project/${p.id}`}><ArrowLeft size={14} /> {p.title}</Link>}
      />
      <SubmitDialog project={p} open={submitting} onClose={() => setSubmitting(false)} count={favs.size} />
    </>
  );
}

function SubmitDialog({ project: p, open, onClose, count }: { project: Project; open: boolean; onClose: () => void; count: number }) {
  const t = useT();
  const [note, setNote] = useState("");
  const submit = useAction({
    fn: () => post(`/portal/project/${p.id}/favorites/submit`, { note }),
    success: t.submitted,
    onSuccess: onClose,
  });
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={t.submitTitle(count)} description={t.submitIntro}
      footer={<><Button onClick={onClose}>{t.keepLooking}</Button><Button variant="primary" icon={<Send />} loading={submit.isPending} onClick={() => submit.mutate()}>{t.submit}</Button></>}>
      <TextAreaField label={t.noteOptional} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} />
    </Modal>
  );
}
