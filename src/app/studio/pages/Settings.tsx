import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Images, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { get, put } from "../api";
import { uploadPublic } from "../components/MediaGrid";
import { useAction } from "../queries";
import type { Business } from "../types";
import { Button, Card, Modal, PageHead, Photo, Skeleton, TextAreaField, TextField } from "../ui";
import type { Article } from "./Content";
import { useUnsavedChanges } from "../unsaved";

type Sections = { workProcess: boolean; portfolio: boolean; about: boolean; services: boolean; socialProof: boolean; customCTA: boolean };
type Settings = {
  heroImageUrl: string;
  heroImageMobileUrl: string;
  frameImageUrl: string;
  sections: Sections;
  studioName: string;
  contactEmail: string;
  business: Business;
};

const SECTION_LABELS: { key: keyof Sections; label: string }[] = [
  { key: "workProcess", label: "Werkwijze" },
  { key: "portfolio", label: "Portfolio" },
  { key: "about", label: "Over ons" },
  { key: "services", label: "Diensten" },
  { key: "socialProof", label: "Reviews en klanten" },
  { key: "customCTA", label: "Afsluitende oproep" },
];
const IMAGES: { key: "heroImageUrl" | "heroImageMobileUrl" | "frameImageUrl"; label: string; hint: string; ratio: string }[] = [
  { key: "heroImageUrl", label: "Achtergrond, computer", hint: "Liggend, minstens 2000 px breed", ratio: "16/9" },
  { key: "heroImageMobileUrl", label: "Achtergrond, telefoon", hint: "Staand; leeg laten gebruikt de computerversie", ratio: "9/16" },
  { key: "frameImageUrl", label: "Foto in het kader", hint: "De uitgelichte foto naast de titel", ratio: "4/5" },
];

const EMPTY: Settings = {
  heroImageUrl: "", heroImageMobileUrl: "", frameImageUrl: "",
  sections: { workProcess: true, portfolio: true, about: true, services: true, socialProof: true, customCTA: true },
  studioName: "", contactEmail: "",
  business: { name: "", address: "", kvk: "", vatNumber: "", iban: "", email: "" },
};

function normalize(s: Partial<Settings> | undefined): Settings {
  return { ...EMPTY, ...s, sections: { ...EMPTY.sections, ...(s?.sections || {}) }, business: { ...EMPTY.business, ...(s?.business || {}) } };
}

export function SettingsPage() {
  const data = useQuery({ queryKey: ["settings"], queryFn: () => get<{ settings: Partial<Settings> }>("/admin/settings").then((r) => normalize(r.settings)) });
  const [s, setS] = useState<Settings | null>(null);
  const [picking, setPicking] = useState<(typeof IMAGES)[number]["key"] | null>(null);
  useEffect(() => { if (data.data) setS(data.data); }, [data.data]);
  const dirty = !!s && !!data.data && JSON.stringify(s) !== JSON.stringify(data.data);
  useUnsavedChanges(dirty);

  const save = useAction({
    fn: () => put("/admin/settings", s),
    invalidate: () => [["settings"]],
    success: "Instellingen opgeslagen. De site toont ze direct.",
  });

  if (!s) return <div className="s-view narrow"><Skeleton h={34} w={220} /><Skeleton h={420} r={12} /></div>;

  return (
    <div className="s-view narrow" style={{ maxWidth: 980 }}>
      <PageHead
        title="Instellingen"
        sub="De voorpagina van de site, contactgegevens en wat er op je facturen staat."
        actions={<>
          <a className="s-btn" href="/" target="_blank" rel="noreferrer"><ExternalLink size={15} />Bekijk site</a>
          <Button variant="primary" icon={<Save />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>{dirty ? "Opslaan" : "Opgeslagen"}</Button>
        </>}
      />
      <Card title="Voorpagina">
        <div className="s-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {IMAGES.map((img) => (
            <ImageSlot key={img.key} label={img.label} hint={img.hint} ratio={img.ratio} url={s[img.key]}
              onChange={(url) => setS({ ...s, [img.key]: url })} onPick={() => setPicking(img.key)} />
          ))}
        </div>
      </Card>
      <Card title="Secties op de voorpagina">
        <div className="s-grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {SECTION_LABELS.map((x) => (
            <label key={x.key} className="s-check" style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8 }}>
              <input type="checkbox" checked={s.sections[x.key]} onChange={(e) => setS({ ...s, sections: { ...s.sections, [x.key]: e.target.checked } })} />
              {x.label}
            </label>
          ))}
        </div>
      </Card>
      <Card title="Studio">
        <div className="s-form-grid">
          <TextField label="Naam van de studio" value={s.studioName} onChange={(e) => setS({ ...s, studioName: e.target.value })} />
          <TextField label="Contactadres op de site" type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} />
        </div>
      </Card>
      <Card title="Op facturen">
        <div className="s-form-grid">
          <TextField label="Bedrijfsnaam" value={s.business.name} placeholder="PhotoDeCaffeine Productions" onChange={(e) => setS({ ...s, business: { ...s.business, name: e.target.value } })} />
          <TextField label="E-mail voor facturen" type="email" value={s.business.email} onChange={(e) => setS({ ...s, business: { ...s.business, email: e.target.value } })} />
          <TextAreaField className="full" label="Adres" rows={2} value={s.business.address} onChange={(e) => setS({ ...s, business: { ...s.business, address: e.target.value } })} />
          <TextField label="KvK-nummer" inputMode="numeric" spellCheck={false} placeholder="12345678" value={s.business.kvk} onChange={(e) => setS({ ...s, business: { ...s.business, kvk: e.target.value } })} />
          <TextField label="Btw-nummer" spellCheck={false} autoCapitalize="characters" placeholder="NL123456789B01" value={s.business.vatNumber} onChange={(e) => setS({ ...s, business: { ...s.business, vatNumber: e.target.value } })} />
          <TextField className="full" label="IBAN" spellCheck={false} autoCapitalize="characters" placeholder="NL00 BANK 0123 4567 89" value={s.business.iban} onChange={(e) => setS({ ...s, business: { ...s.business, iban: e.target.value.toUpperCase() } })} />
        </div>
      </Card>
      <PortfolioPicker open={!!picking} onClose={() => setPicking(null)} onPick={(url) => { if (picking) setS({ ...s, [picking]: url }); setPicking(null); }} />
    </div>
  );
}

function ImageSlot({ label, hint, ratio, url, onChange, onPick }: {
  label: string; hint: string; ratio: string; url: string; onChange: (url: string) => void; onPick: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="s-stack sm">
      <b className="s-small">{label}</b>
      <Photo src={url} style={{ aspectRatio: ratio, maxHeight: 280 }}>
        {url && <div className="corner"><button type="button" className="s-fav" aria-label="Weghalen" onClick={() => onChange("")}><X /></button></div>}
      </Photo>
      <div className="s-row">
        <Button size="sm" icon={<ImagePlus />} loading={busy} onClick={() => input.current?.click()}>Uploaden</Button>
        <Button size="sm" variant="ghost" icon={<Images />} onClick={onPick}>Uit portfolio</Button>
      </div>
      <span className="s-small s-faint">{hint}</span>
      <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { onChange(await uploadPublic(f)); } finally { setBusy(false); }
      }} />
    </div>
  );
}

function PortfolioPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const articles = useQuery({ queryKey: ["portfolio"], queryFn: () => get<{ articles: Article[] }>("/admin/portfolio").then((r) => r.articles), enabled: open });
  const urls = [...new Set((articles.data || []).flatMap((a) => [a.coverType === "image" ? a.coverUrl : "", ...a.galleryUrls]).filter((u) => u && !/\.(mp4|mov)$/i.test(u)))];
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Kies uit het portfolio" wide>
      {articles.isLoading ? <Skeleton h={200} /> : (
        <div className="s-contact-sheet" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {urls.map((u) => (
            <button key={u} type="button" onClick={() => onPick(u)} style={{ border: 0, padding: 0, background: "none" }} aria-label="Deze foto kiezen">
              <Photo src={u} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
