import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { ClientGallery } from "../gallery/ClientGallery";
import { styleOf } from "../gallery/styles";
import { useProject } from "../queries";
import { ErrorState, Skeleton } from "../ui";

/** The gallery the way the client sees it, in its chosen style, with their favourites marked. */
export function GalleryPreviewPage() {
  const { id = "" } = useParams();
  const project = useProject(id);
  const p = project.data;
  if (project.isError) return <ErrorState error={project.error} />;
  if (!p) return <div className="s-view"><Skeleton h={34} w={260} /><Skeleton h={400} r={12} /></div>;
  const favs = p.favorites || {};
  // What is held back from the client stays out of this view of it too.
  const gallery = p.gallery.filter((g) => g.restriction !== "no_photo");
  const coverGone = gallery.length < p.gallery.length && !gallery.some((g) => g.id === p.gallerySettings.coverImageId);
  const shown = { ...p, gallery, gallerySettings: coverGone ? { ...p.gallerySettings, coverImageId: undefined, coverUrl: undefined } : p.gallerySettings };
  return (
    <div className="s-view">
      <div className="s-row between">
        <Link to={`/admin/project/${p.id}?tab=gallery`} className="s-back"><ArrowLeft size={14} /> Terug naar project</Link>
        <span className="s-small s-muted">Voorbeeld zoals de klant het ziet · stijl {styleOf(p).name}</span>
      </div>
      <ClientGallery project={shown} favs={new Set(Object.keys(favs))} favNames={favs} actions={{}} back={null} preview />
    </div>
  );
}
