import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { errorMessage, get, post } from "../api";
import { ClientGallery } from "../gallery/ClientGallery";
import { saveUrl, saveZip } from "../gallery/download";
import { shareLink } from "../gallery/share";
import { ShareDialog } from "../gallery/ShareDialog";
import { useAction } from "../queries";
import type { GalleryImage, Project } from "../types";
import { Button, ErrorState, Modal, Skeleton, TextAreaField } from "../ui";
import { pkeys, usePortalProject } from "./data";
import { useT } from "./i18n";

export function PortalGallery() {
  const { id = "" } = useParams();
  const t = useT();
  const qc = useQueryClient();
  const data = usePortalProject(id);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);
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
      saveUrl(r.url, r.fileName);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function downloadAll(all: GalleryImage[]) {
    const list = all.filter((g) => g.download !== false);
    if (!p || !list.length) return;
    setZip({ done: 0, total: list.length });
    try {
      await saveZip(list, p.gallerySettings.title || p.title, { watermarked: downloads === "watermark", onProgress: (done) => setZip({ done, total: list.length }) });
      toast.success(t.downloadStarted);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setZip(null);
    }
  }

  if (data.isError) return <main className="p-main"><ErrorState error={data.error} /></main>;
  if (!p) return <main className="p-main"><Skeleton h={56} w="min(520px, 80%)" /><Skeleton h={320} r={4} /></main>;

  const title = p.gallerySettings.title || p.title;
  const share = p.share;
  // A link to one photo works for the group too, so it goes through the group link.
  async function sharePhoto(img: GalleryImage) {
    if (!share) return;
    if ((await shareLink({ title, text: t.shareText(title), url: `${share.url}?foto=${img.id}` })) === "copied") toast.success(t.linkCopied);
  }

  return (
    <>
      <ClientGallery
        project={p}
        favs={favs}
        counts={p.groupHearts}
        actions={{ toggle, downloadOne, downloadAll, zip, submit: () => setSubmitting(true), ...(share && { share: () => setSharing(true), sharePhoto }) }}
        back={<Link to={`/portal/project/${p.id}`}><ArrowLeft size={14} /> {p.title}</Link>}
      />
      <SubmitDialog project={p} open={submitting} onClose={() => setSubmitting(false)} count={favs.size} />
      {share && <ShareDialog open={sharing} onClose={() => setSharing(false)} url={share.url} title={title} guests={share.guests} />}
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
