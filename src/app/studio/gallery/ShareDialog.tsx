import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useT } from "../portal/i18n";
import { Button, Field, Input, Modal } from "../ui";
import { copyText } from "./share";

/** The group link and quick ways to pass it on: copy, WhatsApp, e-mail or the phone's own share sheet. */
export function ShareDialog({ open, onClose, url, title, guests, forGuest }: {
  open: boolean;
  onClose: () => void;
  url: string;
  /** The gallery's title, for the message that goes with the link. */
  title: string;
  /** How many people came in with the link so far. */
  guests: number;
  /** Opened by someone from the group rather than the client. */
  forGuest?: boolean;
}) {
  const t = useT();
  const id = useId();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);
  const text = `${t.shareText(title)}: ${url}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={t.shareTitle} description={forGuest ? t.shareIntroGuest : t.shareIntro}>
      <div className="s-stack">
        <Field label={t.shareLink} htmlFor={id}>
          <div className="s-row nowrap">
            <Input id={id} readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0 }} />
            <Button variant="primary" icon={copied ? <Check /> : <Copy />} onClick={async () => setCopied(await copyText(url))}>
              {copied ? t.copied : t.copy}
            </Button>
          </div>
        </Field>
        <div className="s-row">
          <a className="s-btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={15} aria-hidden="true" />WhatsApp
          </a>
          <a className="s-btn" href={`mailto:?subject=${encodeURIComponent(t.shareText(title))}&body=${encodeURIComponent(text)}`}>
            <Mail size={15} aria-hidden="true" />{t.email}
          </a>
          {canShare && (
            <Button icon={<Share2 />} onClick={() => navigator.share({ title, text: t.shareText(title), url }).catch(() => {})}>{t.shareMore}</Button>
          )}
        </div>
        <p className="s-small s-muted" aria-live="polite">{t.shareGuests(guests)}</p>
      </div>
    </Modal>
  );
}
