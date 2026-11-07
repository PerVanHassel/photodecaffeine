import { ArrowRight, Download, Images, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../api";
import { euro } from "../format";
import type { PortalText } from "../portal/i18n";
import type { GalleryImage } from "../types";
import { Button, Modal } from "../ui";

// Buying photos on the group page while the gallery shows watermarked copies.
// A guest taps the price on the photos they want, checks out once, pays at
// Mollie and comes back to the originals. The edge function's lib/orders.ts
// has the rest.

export type GuestSales = {
  /** Per photo now, and the normal price it is reduced from (start-up korting). */
  price: number;
  normalPrice: number;
  /** Paying online works; not in the studio's preview. */
  payable: boolean;
  /** What a guest agrees to at checkout, in both languages. */
  statement: { nl: string; en: string };
};

const discounted = (s: GuestSales) => s.normalPrice > s.price;

/** Above the photos: the price, how it works, and the photos this guest bought. */
export function SalesPanel({ sales, bought, onlyMine, onOnly, onDownload, zip, preview, t }: {
  sales: GuestSales | null;
  bought: GalleryImage[];
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

/** "~~€7,50~~ €2,99 per foto · Start-up korting" */
function Price({ sales, t }: { sales: GuestSales; t: PortalText }) {
  return (
    <p className="g-sale-price">
      {discounted(sales) && <s aria-label={t.saleNormal(euro(sales.normalPrice))}>{euro(sales.normalPrice)}</s>}
      <b>{euro(sales.price)}</b>
      <span>{t.salePer}</span>
      {discounted(sales) && <span className="g-sale-badge">{t.saleBadge}</span>}
    </p>
  );
}

/** At the bottom while something is in the basket. */
export function BasketDock({ count, sales, onCheckout, t }: { count: number; sales: GuestSales; onCheckout: () => void; t: PortalText }) {
  return (
    <div className="g-dock g-basket" role="region" aria-label={t.saleTitle}>
      <span className="g-dock-count" aria-live="polite"><ShoppingBag aria-hidden="true" />{t.saleCount(count)} · {euro(Math.round(sales.price * count * 100) / 100)}</span>
      <button type="button" className="g-btn primary" onClick={onCheckout}>{t.saleCheckout}<ArrowRight /></button>
    </div>
  );
}

/** The basket, the words agreed to, and on to Mollie. */
export function CheckoutDialog({ open, onClose, sales, images, language, onPay, onClear, t }: {
  open: boolean;
  onClose: () => void;
  sales: GuestSales;
  images: GalleryImage[];
  language: "nl" | "en";
  onPay: () => Promise<void>;
  onClear: () => void;
  t: PortalText;
}) {
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const agreeInput = useRef<HTMLInputElement>(null);
  const count = images.length;
  const total = Math.round(sales.price * count * 100) / 100;

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
    <Modal open={open} onOpenChange={(o) => !o && !paying && onClose()} title={t.saleCheckout}
      description={`${t.saleCount(count)} × ${euro(sales.price)}`}
      footer={
        <>
          <Button variant="ghost" disabled={paying} onClick={() => { onClear(); onClose(); }}>{t.saleClear}</Button>
          <Button variant="primary" icon={<ShoppingBag />} loading={paying} disabled={!sales.payable || count === 0} onClick={pay}>{t.salePay(euro(total))}</Button>
        </>
      }>
      <div className="s-stack">
        <div className="g-basket-strip" aria-hidden="true">
          {images.slice(0, 12).map((g) => <img key={g.id} src={g.url} alt="" />)}
          {count > 12 && <span>+{count - 12}</span>}
        </div>
        <div className="s-row between" style={{ fontWeight: 600 }}>
          <span>{t.saleTotal}</span>
          <span className="s-num">
            {discounted(sales) && <s className="s-faint" style={{ fontWeight: 400, marginRight: 8 }}>{euro(Math.round(sales.normalPrice * count * 100) / 100)}</s>}
            {euro(total)}
          </span>
        </div>
        {discounted(sales) && <span className="s-small s-muted">{t.saleBadge}: {t.saleNormal(euro(sales.normalPrice))} {t.salePer}</span>}
        <label className="g-check">
          <input ref={agreeInput} type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setError(""); }}
            aria-invalid={error && !agree ? true : undefined} />
          <span>{sales.statement[language]} <a href="/algemene-voorwaarden" target="_blank" rel="noreferrer">{t.prioReadTerms}</a>.</span>
        </label>
        {error && <p className="s-small" role="alert" style={{ color: "var(--bad)" }}>{error}</p>}
        <span className="s-small s-muted">{t.saleSecure}</span>
      </div>
    </Modal>
  );
}
