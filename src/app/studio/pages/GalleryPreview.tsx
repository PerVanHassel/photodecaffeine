import { ArrowLeft, Heart } from "lucide-react";
import { Link, useParams } from "react-router";
import { useProject } from "../queries";
import { ErrorState, isVideo, Photo, Pill, Skeleton } from "../ui";

/** The gallery the way the client sees it, with their favourites marked. */
export function GalleryPreviewPage() {
  const { id = "" } = useParams();
  const project = useProject(id);
  const p = project.data;
  if (project.isError) return <ErrorState error={project.error} />;
  if (!p) return <div className="s-view"><Skeleton h={34} w={260} /><Skeleton h={400} r={12} /></div>;
  const favs = p.favorites || {};
  return (
    <div className="s-view">
      <Link to={`/admin/project/${p.id}?tab=gallery`} className="s-back"><ArrowLeft size={14} /> Terug naar project</Link>
      <div className="s-stack sm">
        <p className="s-eyebrow">Voorbeeld zoals de klant het ziet</p>
        <h1 style={{ fontSize: 30 }}>{p.gallerySettings.title || p.title}</h1>
        {p.gallerySettings.subtitle && <p className="s-muted">{p.gallerySettings.subtitle}</p>}
        <div className="s-row"><Pill plain>{p.gallery.length} foto's</Pill>{Object.keys(favs).length > 0 && <Pill tone="acc"><Heart size={11} /> {Object.keys(favs).length} favorieten</Pill>}</div>
      </div>
      <div className="p-proof">
        {p.gallery.map((g) => (
          <Photo key={g.id} src={g.url} video={isVideo(g.fileName || g.url)} alt={g.fileName}>
            {favs[g.id] && <div className="corner"><span className="s-fav on" title={`Favoriet van ${favs[g.id].join(", ")}`}><Heart fill="currentColor" /></span></div>}
          </Photo>
        ))}
      </div>
    </div>
  );
}
