import { ArrowRight, Download, Images } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { errorMessage } from "../api";
import { euro } from "../format";
import type { PortalText } from "../portal/i18n";

// Voorrang on the group page: a guest asks for the photos of one person before
// the rest. Asking costs nothing: the studio first looks whether there are
// enough photos, then mails a payment link, or an offer for a shoot of their own.

export type GuestPriorityRequest = {
  id: string;
  person: string;
  number: string;
  status: "new" | "offered" | "delivered" | "booking";
  price: number;
  days: number;
  /** How many photos the studio said it found. */
  photos: number | null;
  paid: boolean;
  /** The invoice, while there is something to pay. */
  payUrl: string;
  /** Too few photos: where to book a shoot of their own. */
  bookingUrl: string;
  /** Delivered: the photos the studio picked. */
  images: string[];
};

export type GuestPriority = {
  /** Asking is possible: what it costs and how fast it comes, and the words agreed to. */
  offer: { price: number; days: number; statement: { nl: string; en: string } } | null;
  requests: GuestPriorityRequest[];
};

export type PriorityAsk = { person: string; number: string; note: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0];

export function PriorityPanel({ priority, language, preview, names, onlyId, onOnly, onAsk, onWithdraw, onDownload, zip, t }: {
  priority: GuestPriority;
  language: "nl" | "en";
  preview: boolean;
  /** This parent's children, from the consent form, to pick from. */
  names: string[];
  /** The request whose photos are shown alone. */
  onlyId: string;
  onOnly: (id: string) => void;
  onAsk: (b: PriorityAsk) => Promise<void>;
  onWithdraw: (r: GuestPriorityRequest) => void;
  onDownload: (r: GuestPriorityRequest) => void;
  zip: { done: number; total: number } | null;
  t: PortalText;
}) {
  const { offer, requests } = priority;
  const [asking, setAsking] = useState(false);
  // A child who already has a request is not offered again.
  const taken = new Set(requests.map((r) => r.person.trim().toLowerCase()));
  const free = names.filter((n) => !taken.has(n.trim().toLowerCase()));
  return (
    <section id="g-prio" className="g-prio" aria-labelledby="g-prio-title">
      <h2 id="g-prio-title">{offer ? t.prioTitle : t.prioYours}</h2>
      {offer && <p>{t.prioIntro(euro(offer.price), offer.days)}</p>}

      {requests.length > 0 && (
        <ul className="g-prio-list">
          {requests.map((r) => (
            <Request key={r.id} r={r} only={onlyId === r.id} onOnly={onOnly} onWithdraw={onWithdraw} onDownload={onDownload} zip={zip} t={t} />
          ))}
        </ul>
      )}

      {offer && (asking
        ? <AskForm statement={offer.statement[language]} names={free} onAsk={onAsk} onDone={() => setAsking(false)} t={t} />
        : (
          <div className="g-prio-actions">
            <button type="button" className="g-btn primary" disabled={preview} onClick={() => setAsking(true)}>
              {requests.length ? t.prioAskOther : t.prioAsk}<ArrowRight />
            </button>
          </div>
        ))}
      {preview && <p className="g-small">{t.prioPreview}</p>}
    </section>
  );
}

function Request({ r, only, onOnly, onWithdraw, onDownload, zip, t }: {
  r: GuestPriorityRequest; only: boolean; onOnly: (id: string) => void; onWithdraw: (r: GuestPriorityRequest) => void;
  onDownload: (r: GuestPriorityRequest) => void; zip: { done: number; total: number } | null; t: PortalText;
}) {
  const first = firstName(r.person);
  let text: string;
  let actions = null;
  if (r.status === "new") {
    text = t.prioStatusNew(first);
    actions = <button type="button" className="g-btn" onClick={() => onWithdraw(r)}>{t.prioWithdraw}</button>;
  } else if (r.status === "offered" && !r.paid) {
    text = t.prioStatusOffered(first, r.photos, euro(r.price));
    if (r.payUrl) actions = <a className="g-btn primary" href={r.payUrl}>{t.prioPay(euro(r.price))}<ArrowRight /></a>;
  } else if (r.status === "offered") {
    text = t.prioStatusPaid(first, r.days);
  } else if (r.status === "delivered") {
    text = t.prioStatusDelivered(first, r.images.length);
    actions = r.images.length > 0 && (
      <>
        <button type="button" className="g-btn" aria-pressed={only} onClick={() => onOnly(only ? "" : r.id)}>
          <Images />{only ? t.prioShowAll : t.prioShow(first)}
        </button>
        <button type="button" className="g-btn primary" disabled={!!zip} onClick={() => onDownload(r)}>
          <Download />{zip ? t.zipping(zip.done, zip.total) : t.prioDownload(r.images.length)}
        </button>
      </>
    );
  } else {
    text = t.prioStatusBooking(first);
    if (r.bookingUrl) actions = <a className="g-btn" href={r.bookingUrl}>{t.prioBooking}<ArrowRight /></a>;
  }
  return (
    <li className="g-prio-item" data-status={r.paid && r.status === "offered" ? "paid" : r.status}>
      <p className="g-prio-who"><b>{r.person}</b>{r.number && <span>#{r.number}</span>}</p>
      <p>{text}</p>
      {actions && <div className="g-prio-actions">{actions}</div>}
    </li>
  );
}

function AskForm({ statement, names, onAsk, onDone, t }: {
  statement: string; names: string[]; onAsk: (b: PriorityAsk) => Promise<void>; onDone: () => void; t: PortalText;
}) {
  const [person, setPerson] = useState(names.length === 1 ? names[0] : "");
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ person?: string; agree?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const personInput = useRef<HTMLInputElement>(null);
  const agreeInput = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = { person: person.trim() ? undefined : t.prioPersonRequired, agree: agree ? undefined : t.prioAgreeRequired };
    setErrors(found);
    if (found.person) return personInput.current?.focus();
    if (found.agree) return agreeInput.current?.focus();
    setSending(true);
    try {
      await onAsk({ person: person.trim(), number: number.trim(), note: note.trim() });
      onDone();
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="g-prio-form" onSubmit={submit} noValidate>
      {names.length > 0 && (
        <div className="g-kids-row" role="group" aria-label={t.prioPerson}>
          {names.map((n) => (
            <button key={n} type="button" className="g-kids-chip" aria-pressed={person === n} onClick={() => { setPerson(n); setErrors((x) => ({ ...x, person: undefined })); }}>
              {firstName(n)}
            </button>
          ))}
        </div>
      )}
      <div className="g-field">
        <label htmlFor="g-prio-person">{t.prioPerson}</label>
        <input ref={personInput} id="g-prio-person" autoComplete="off" autoCapitalize="words" maxLength={120} value={person}
          onChange={(e) => { setPerson(e.target.value); setErrors((x) => ({ ...x, person: undefined })); }}
          aria-invalid={errors.person ? true : undefined} aria-describedby={errors.person ? "g-prio-person-error" : "g-prio-person-hint"} />
        {errors.person
          ? <span id="g-prio-person-error" className="g-gate-error" role="alert">{errors.person}</span>
          : <span id="g-prio-person-hint" className="g-field-hint">{t.prioPersonHint}</span>}
      </div>
      <div className="g-prio-row">
        <div className="g-field g-field-number">
          <label htmlFor="g-prio-number">{t.prioNumber}</label>
          <input id="g-prio-number" autoComplete="off" maxLength={8} value={number} onChange={(e) => setNumber(e.target.value)} aria-describedby="g-prio-number-hint" />
          <span id="g-prio-number-hint" className="g-field-hint">{t.prioNumberHint}</span>
        </div>
        <div className="g-field g-prio-note">
          <label htmlFor="g-prio-note">{t.prioNote}</label>
          <input id="g-prio-note" autoComplete="off" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby="g-prio-note-hint" />
          <span id="g-prio-note-hint" className="g-field-hint">{t.prioNoteHint}</span>
        </div>
      </div>
      <label className="g-check">
        <input ref={agreeInput} type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((x) => ({ ...x, agree: undefined })); }}
          aria-invalid={errors.agree ? true : undefined} aria-describedby={errors.agree ? "g-prio-agree-error" : undefined} />
        <span>{statement} <a href="/algemene-voorwaarden" target="_blank" rel="noreferrer">{t.prioReadTerms}</a>.</span>
      </label>
      {errors.agree && <span id="g-prio-agree-error" className="g-gate-error" role="alert">{errors.agree}</span>}
      {errors.form && <p className="g-gate-error" role="alert">{errors.form}</p>}
      <div className="g-prio-actions">
        <button type="submit" className="g-btn primary" disabled={sending} aria-busy={sending || undefined}>{sending ? t.wait : t.prioSend}<ArrowRight /></button>
        <button type="button" className="g-btn" disabled={sending} onClick={onDone}>{t.prioCancel}</button>
      </div>
    </form>
  );
}
