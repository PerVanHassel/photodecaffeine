import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { translations, type Translations } from "../i18n/translations";

// The fixed packages on the photography page: a tab per category and, within
// it, a set per kind of client (Particulier/Zakelijk, Sporter/Teamgalerij/Eigen
// set per speler). Picking one hands it to the request form below; the look
// lives in src/styles/site.css (.pdc-pkg*).

type Texts = Translations["servicePages"]["packages"];
type Category = Texts["categories"][number];
type Group = Category["groups"][number];
type Tier = Group["tiers"][number];

/**
 * A picked package, by its ids, so it reads in whatever language the page is
 * in and the request can always be written in Dutch for the studio.
 */
export interface PickedPackage {
  category: string;
  group: string;
  /** A tier's id, or the id of the group's monthly plan. */
  tier: string;
}

/**
 * "€50", "€2,48", "€2.094" in Dutch and "€50", "€2.48", "€2,094" in English:
 * whole euros without cents, as everywhere on the site.
 */
export const euro = (n: number, locale = "nl-NL") => {
  const [whole, cents] = (Number.isInteger(n) ? String(n) : n.toFixed(2)).split(".");
  const [thousands, decimal] = locale.startsWith("nl") ? [".", ","] : [",", "."];
  return `€${whole.replace(/\B(?=(\d{3})+$)/g, thousands)}${cents ? `${decimal}${cents}` : ""}`;
};

/** A business price with 21% btw on top, to the cent. */
const withVat = (n: number) => Math.round(n * 121) / 100;

/** The texts and price of a picked package in one language; null when the ids are unknown. */
function resolve(t: Translations, pkg: PickedPackage) {
  const category = t.servicePages.packages.categories.find((c) => c.id === pkg.category);
  const group = category?.groups.find((g) => g.id === pkg.group);
  const plan = group?.plan?.id === pkg.tier ? group.plan : null;
  const tier = plan ?? group?.tiers.find((x) => x.id === pkg.tier);
  if (!category || !group || !tier) return null;
  const tp = t.servicePages.packages;
  return {
    category,
    group,
    tier,
    // "per speler" or "per maand" when the price is not for the whole shoot.
    priceUnit: plan ? tp.perMonth : tier.units === 1 ? group.unit : null,
    // "excl. btw" for a business price; nothing when the price includes btw.
    vat: group.vat === "excl" ? tp.exclVat : null,
  };
}

/** How a picked package reads in the form ("Sport · Teamgalerij · Groot"). */
export function packageName(t: Translations, pkg: PickedPackage) {
  const p = resolve(t, pkg);
  return p ? `${p.category.name} · ${p.group.name} · ${p.tier.name}` : "";
}

/** "€399 excl. btw", "€35 per speler": the picked price and what it covers. */
export function packagePrice(t: Translations, pkg: PickedPackage) {
  const p = resolve(t, pkg);
  return p ? [euro(p.tier.price, t.locale), p.priceUnit, p.vat].filter(Boolean).join(" ") : "";
}

/** The tier's own name, for the submit button. */
export const packageTierName = (t: Translations, pkg: PickedPackage) => resolve(t, pkg)?.tier.name ?? "";

/** The category's name in Dutch, the way the request form's options say it. */
export const packageCategoryName = (pkg: PickedPackage) => resolve(translations.nl, pkg)?.category.name ?? "";

const same = (a: string, b: string | undefined) => a.toLowerCase() === b?.trim().toLowerCase();

export function PhotoPackages({
  category: only,
  focus,
  picked,
  onPick,
}: {
  /** On a category's own page: just that category, without the tabs. */
  category?: string;
  focus?: string;
  picked: PickedPackage | null;
  onPick: (pkg: PickedPackage) => void;
}) {
  const { t } = useLanguage();
  const tp = t.servicePages.packages;
  // Opens on the niche picked in the admin, until the visitor picks a tab. The
  // niche is a portfolio category, so it matches the Dutch names.
  const [tab, setTab] = useState<string | null>(null);
  const [groups, setGroups] = useState<Record<string, string>>({});
  const focusId = translations.nl.servicePages.packages.categories.find((c) => same(c.name, focus))?.id;
  const category =
    tp.categories.find((c) => c.id === (only ?? tab ?? focusId)) ?? tp.categories[0];
  const group = category.groups.find((g) => g.id === groups[category.id]) ?? category.groups[0];
  // Where private and business prices sit side by side, the switch says which carry btw.
  const mixedVat = category.groups.some((g) => g.vat !== category.groups[0].vat);
  const card = { tp, locale: t.locale, category, group, picked, onPick };

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

        {!only && (
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
        )}

        <div className="pdc-pkgs-groups">
          <div className="pdc-pkgs-switch" role="group" aria-label={tp.groupsLabel}>
            <span className="pdc-pkgs-switch-label" aria-hidden="true">
              {tp.groupsLabel}
            </span>
            {category.groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className="pdc-pkgs-switch-btn"
                aria-pressed={g.id === group.id}
                onClick={() => setGroups((x) => ({ ...x, [category.id]: g.id }))}
              >
                {g.name}
                {mixedVat && <span className="pdc-pkgs-switch-vat"> ({g.vat === "excl" ? tp.exclVat : tp.inclVat})</span>}
              </button>
            ))}
          </div>
          <p className="pdc-pkgs-intro">{group.intro}</p>
        </div>

        <div className={`pdc-pkg-grid${group.tiers.length === 2 ? " pdc-pkg-grid--pair" : ""}`}>
          {group.tiers.map((tier) => (
            <PackageCard key={tier.id} {...card} tier={tier} />
          ))}
        </div>
        {group.plan && <PackageCard {...card} tier={group.plan} months={group.plan.months} />}

        {group.note && <p className="pdc-pkgs-note">{group.note}</p>}
      </div>
    </section>
  );
}

function PackageCard({
  tp,
  locale,
  category,
  group,
  tier,
  months,
  picked,
  onPick,
}: {
  tp: Texts;
  locale: string;
  category: Category;
  group: Group;
  tier: Tier;
  /** A monthly plan: the price is per month, for at least this many months. */
  months?: number;
  picked: PickedPackage | null;
  onPick: (pkg: PickedPackage) => void;
}) {
  const money = (n: number) => euro(n, locale);
  const excl = group.vat === "excl";
  const vat = excl ? tp.exclVat : tp.inclVat;
  const priceUnit = months ? tp.perMonth : tier.units === 1 ? group.unit : null;
  // A count of photos comes with its price per photo; a text says it better without one.
  const count = typeof tier.photos === "number" ? tier.photos : null;
  const perUnit =
    group.unit && tier.units && tier.units > 1
      ? `${tp.perUnit(money(Math.round(tier.price / tier.units)), group.unit, tier.price % tier.units !== 0)}${excl ? ` ${vat}` : ""}`
      : null;
  const extras = [count !== null && tp.perPhoto(money(tier.price / count)), perUnit, group.extraPhoto && tp.extraPhoto(money(group.extraPhoto))]
    .filter(Boolean)
    .join(" · ");
  const pkg: PickedPackage = { category: category.id, group: group.id, tier: tier.id };
  const isPicked = picked?.category === pkg.category && picked.group === pkg.group && picked.tier === pkg.tier;
  const titleId = `pkg-${category.id}-${group.id}-${tier.id}`;

  return (
    <article
      className={`pdc-pkg${tier.best ? " pdc-pkg--best" : ""}${months ? " pdc-pkg--plan" : ""}`}
      aria-labelledby={titleId}
    >
      {tier.best && <span className="pdc-pkg-badge">{tp.best}</span>}
      <div>
        <h3 id={titleId} className="pdc-pkg-name">
          {tier.name}
        </h3>
        <p className="pdc-pkg-pitch">{tier.pitch}</p>

        <p className="pdc-pkg-price">
          {money(tier.price)}
          <span>
            {priceUnit && (
              <>
                {priceUnit}
                <br />
              </>
            )}
            {vat}
          </span>
        </p>
        {excl && <p className="pdc-pkg-vat">{tp.withVat(money(withVat(tier.price)))}</p>}
        {months && (
          <p className="pdc-pkg-vat">
            {tp.term(months, `${money(tier.price * months)} ${vat}`)}
            {excl && ` (${tp.withVat(money(withVat(tier.price * months)))})`}
          </p>
        )}
        {tier.best && group.upsell && <p className="pdc-pkg-upsell">{group.upsell}</p>}
        <p className="pdc-pkg-photos">
          <strong>
            {count === null ? tier.photos : tp.photos(count)}
            {count !== null && priceUnit && ` ${priceUnit}`}
          </strong>
          {extras && <span>{extras}</span>}
        </p>
      </div>

      <div className="pdc-pkg-detail">
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
          onClick={() => onPick(pkg)}
        >
          {isPicked ? tp.chosen : tp.choose(tier.name)}
        </button>
      </div>
    </article>
  );
}
