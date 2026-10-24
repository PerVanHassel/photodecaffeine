import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// The fixed packages for private clients on the photography page, with a tab
// per category. Picking one hands it to the request form below; the look lives
// in src/styles/site.css (.pdc-pkg*).

export interface PickedPackage {
  category: string;
  name: string;
  price: number;
}

/** "€50", "€2,48": whole euros without cents, as everywhere on the site. */
export const euro = (n: number) => `€${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}`;

const same = (a: string, b: string | undefined) => a.toLowerCase() === b?.trim().toLowerCase();

export function PhotoPackages({
  focus,
  picked,
  onPick,
}: {
  focus?: string;
  picked: PickedPackage | null;
  onPick: (pkg: PickedPackage) => void;
}) {
  const tp = useLanguage().t.servicePages.packages;
  // Opens on the niche picked in the admin, until the visitor picks a tab.
  const [tab, setTab] = useState<string | null>(null);
  const category =
    tp.categories.find((c) => c.id === tab) ?? tp.categories.find((c) => same(c.name, focus)) ?? tp.categories[0];

  return (
    <section id="pakketten" className="pdc-section pdc-pkgs" aria-labelledby="pakketten-title">
      <div className="pdc-wrap" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div className="pdc-pkgs-head">
          <div>
            <span className="pdc-pkgs-label">{tp.label}</span>
            <h2 id="pakketten-title" className="pdc-pkgs-title">
              {tp.title1}
              <br />
              <span>{tp.title2}</span>
            </h2>
          </div>
          <p className="pdc-pkgs-body">{tp.body}</p>
        </div>

        <div className="pdc-pkgs-tabs" role="group" aria-label={tp.categoriesLabel}>
          {tp.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="pdc-filter"
              aria-pressed={c.id === category.id}
              onClick={() => setTab(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="pdc-pkg-grid">
          {category.tiers.map((tier, i) => {
            const previous = category.tiers[i - 1];
            const isPicked = picked?.category === category.name && picked.name === tier.name;
            const titleId = `pkg-${category.id}-${tier.id}`;
            return (
              <article key={tier.id} className={`pdc-pkg${tier.best ? " pdc-pkg--best" : ""}`} aria-labelledby={titleId}>
                {tier.best && <span className="pdc-pkg-badge">{tp.best}</span>}
                <h3 id={titleId} className="pdc-pkg-name">
                  {tier.name}
                </h3>
                <p className="pdc-pkg-pitch">{tier.pitch}</p>

                <p className="pdc-pkg-price">{euro(tier.price)}</p>
                {tier.best && previous && (
                  <p className="pdc-pkg-upsell">{tp.upsell(euro(tier.price - previous.price), previous.name)}</p>
                )}
                <p className="pdc-pkg-photos">
                  <strong>{tp.photos(tier.photos)}</strong>
                  <span>{tp.perPhoto(euro(tier.price / tier.photos))}</span>
                </p>

                <ul className="pdc-pkg-list">
                  {tier.items.map((item) => (
                    <li key={item}>
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                  {tier.missing.map((item) => (
                    <li key={item} className="pdc-pkg-off">
                      <X size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span>
                        <span className="pdc-visually-hidden">{tp.notIncluded} </span>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`pdc-btn ${tier.best ? "pdc-btn-solid" : "pdc-btn-quiet"} pdc-pkg-btn`}
                  onClick={() => onPick({ category: category.name, name: tier.name, price: tier.price })}
                >
                  {isPicked ? tp.chosen : tp.choose(tier.name)}
                </button>
              </article>
            );
          })}
        </div>

        <p className="pdc-pkgs-note">{tp.note}</p>
      </div>
    </section>
  );
}
