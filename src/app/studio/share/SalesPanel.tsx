import { ArrowRight, Download, Images, LogIn, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../api";
import { euro, fmtDate } from "../format";
import type { PortalText } from "../portal/i18n";
import type { GalleryImage } from "../types";
import { Button, Modal } from "../ui";
import { AccountSignIn } from "./Account";

// Buying photos on the group page while the gallery shows watermarked copies.
// A guest taps the price on the photos they want, signs in (an account keeps
// the photos for later), pays at Mollie and comes back to the originals. The
// edge function's lib/orders.ts has the rest.

export type GuestSales = {
  /** Per photo now, and the normal price it is reduced from (start-up korting). */
  price: number;
  normalPrice: number;
  /** "5 photos for €20"; 0 when there is no bundle. */
  bundleSize: number;
  bundlePrice: number;
  /** The start-up price runs until this day; empty: no end. */
  discountUntil: string;
  /** Paying online works; not in the studio's preview. */
  payable: boolean;
  /** What a guest agrees to at checkout, in both languages. */
  statement: { nl: string; en: string };
};

const discounted = (s: GuestSales) => s.normalPrice > s.price;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a basket costs: as many bundles as fit, the rest one by one. The server counts the same way. */
export function basketTotal(count: number, s: Pick<GuestSales, "price" | "bundleSize" | "bundlePrice">) {
  if (s.bundleSize >= 2 && s.bundlePrice > 0) {
    const bundles = Math.floor(count / s.bundleSize);
    return { total: round2(bundles * s.bundlePrice + (count - bundles * s.bundleSize) * s.price), bundles };
  }
  return { total: round2(count * s.price), bundles: 0 };
}

/** Above the photos: the price, how it works, and the photos this guest bought. */
export function SalesPanel({ sales, bought, boughtElsewhere, signedIn, onSignIn, onlyMine, onOnly, onDownload, zip, preview, t }: {
  sales: GuestSales | null;
  bought: GalleryImage[];
  /** Bought with an account that is not signed in here. */
  boughtElsewhere: number;
  signedIn: boolean;
  onSignIn: () => void;
  onlyMine: boolean;
  onOnly: (on: boolean) => void;
  onDownload: (list: GalleryImage[]) => void;
  zip: { done: number; total: number } | null;
  preview: boolean;
  t: PortalText;
}) {
  return (
    <section id="g-sale" className="g-sale" aria-labelledby="g-sale-title">
      <div className="g-sale-head">
        <h2 id="g-sale-title">{t.saleTitle}</h2>
        {sales && <Price sales={sales} t={t} />}
      </div>
      {sales && <p>{t.saleIntro}</p>}
      {sales && !signedIn && !preview && <p className="g-small">{t.saleNeedsAccount}</p>}
      {sales?.discountUntil && <p className="g-small">{t.saleUntil(fmtDate(sales.discountUntil))}</p>}
      {boughtElsewhere > 0 && !signedIn && (
        <div className="g-sale-mine">
          <p>{t.saleBoughtElsewhere(boughtElsewhere)}</p>
          <div className="g-prio-actions">
            <button type="button" className="g-btn primary" onClick={onSignIn}><LogIn />{t.accountVerify}</button>
          </div>
        </div>
      )}
      {bought.length > 0 && (
        <div className="g-sale-mine">
          <p>{t.saleBought(bought.length)}</p>
          <div className="g-prio-actions">
            <button type="button" className="g-btn" aria-pressed={onlyMine} onClick={() => onOnly(!onlyMine)}>
              <Images />{onlyMine ? t.saleAll : t.saleMine}
            </button>
            <button type="button" className="g-btn primary" disabled={!!zip} onClick={() => onDownload(bought)}>
              <Download />{zip ? t.zipping(zip.done, zip.total) : t.saleDownload(bought.length)}
            </button>
          </div>
        </div>
      )}
      {preview && sales && <p className="g-small">{t.salePreview}</p>}
    </section>
  );
}

/** "~~€7,50~~ €5 per foto · 5 foto's voor €20" */
function Price({ sales, t }: { sales: GuestSales; t: PortalText }) {
  return (
    <p className="g-sale-price">
      {discounted(sales) && <s aria-label={t.saleNormal(euro(sales.normalPrice))}>{euro(sales.normalPrice)}</s>}
      <b>{euro(sales.price)}</b>
      <span>{t.salePer}</span>
      {sales.bundleSize > 0 && <span className="g-sale-badge">{t.saleBundle(sales.bundleSize, euro(sales.bundlePrice))}</span>}
      {discounted(sales) && <span className="g-sale-badge">{t.saleBadge}</span>}
    </p>
  );
}

/** At the bottom while something is in the basket. */
export function BasketDock({ count, sales, onCheckout, t }: { count: number; sales: GuestSales; onCheckout: () => void; t: PortalText }) {
  const { total } = basketTotal(count, sales);
  const left = sales.bundleSize ? sales.bundleSize - (count % sales.bundleSize) : 0;
  return (
    <div className="g-dock g-basket" role="region" aria-label={t.saleTitle}>
      <span className="g-dock-count" aria-live="polite">
        <ShoppingBag aria-hidden="true" />{t.saleCount(count)} · {euro(total)}
        {sales.bundleSize > 0 && left > 0 && left < sales.bundleSize && <small className="g-dock-hint">{t.saleBundleLeft(left, sales.bundleSize)}</small>}
      </span>
      <button type="button" className="g-btn primary" onClick={onCheckout}>{t.saleCheckout}<ArrowRight /></button>
    </div>
  );
}

/** The basket, signing in when needed, the words agreed to, and on to Mollie. */
export function CheckoutDialog({ open, onClose, sales, images, language, signedIn, guest, onSignedIn, onPay, onClear, t }: {
  open: boolean;
  onClose: () => void;
  sales: GuestSales;
  images: GalleryImage[];
  language: "nl" | "en";
  signedIn: boolean;
  /** Who came in at the door, to fill in the account step. */
  guest: { name: string; email: string } | null;
  onSignedIn: () => void;
  onPay: () => Promise<void>;
  onClear: () => void;
  t: PortalText;
}) {
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const agreeInput = useRef<HTMLInputElement>(null);
  const count = images.length;
  const { total, bundles } = basketTotal(count, sales);

  async function pay() {
    if (!agree) {
      setError(t.prioAgreeRequired);
      agreeInput.current?.focus();
      return;
    }
    setPaying(true);
    setError("");
    try {
      // Off to Mollie's page: the button stays busy until the browser leaves.
      await onPay();
    } catch (err) {
      setError(errorMessage(err));
      setPaying(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && !paying && onClose()} title={signedIn ? t.saleCheckout : t.signInTitle}
      description={`${t.saleCount(count)} · ${euro(total)}`}
      footer={signedIn ? (
        <>
          <Button variant="ghost" disabled={paying} onClick={() => { onClear(); onClose(); }}>{t.saleClear}</Button>
          <Button variant="primary" icon={<ShoppingBag />} loading={paying} disabled={!sales.payable || count === 0} onClick={pay}>{t.salePay(euro(total))}</Button>
        </>
      ) : undefined}>
      <div className="s-stack">
        <div className="g-basket-strip" aria-hidden="true">
          {images.slice(0, 12).map((g) => <img key={g.id} src={g.url} alt="" />)}
          {count > 12 && <span>+{count - 12}</span>}
        </div>
        {signedIn ? (
          <>
            <div className="s-row between" style={{ fontWeight: 600 }}>
              <span>{t.saleTotal}</span>
              <span className="s-num">
                {(discounted(sales) || bundles > 0) && <s className="s-faint" style={{ fontWeight: 400, marginRight: 8 }}>{euro(round2(Math.max(sales.normalPrice, sales.price) * count))}</s>}
                {euro(total)}
              </span>
            </div>
            {bundles > 0 && <span className="s-small s-muted">{t.saleBundleApplied(bundles)}: {t.saleBundle(sales.bundleSize, euro(sales.bundlePrice))}</span>}
            {discounted(sales) && <span className="s-small s-muted">{t.saleBadge}: {t.saleNormal(euro(sales.normalPrice))} {t.salePer}</span>}
            <label className="g-check">
              <input ref={agreeInput} type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(""); }}
                aria-invalid={error && !agree ? true : undefined} />
              <span>{sales.statement[language]} <a href="/algemene-voorwaarden" target="_blank" rel="noreferrer">{t.prioReadTerms}</a>.</span>
            </label>
            {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
            <span className="s-small s-muted">{t.saleSecure}</span>
          </>
        ) : (
          <>
            <p className="s-small">{t.saleNeedsAccount} {t.accountIntro}</p>
            <AccountSignIn email={guest?.email} name={guest?.name} language={language} t={t} onDone={onSignedIn} compact />
          </>
        )}
      </div>
    </Modal>
  );
}
