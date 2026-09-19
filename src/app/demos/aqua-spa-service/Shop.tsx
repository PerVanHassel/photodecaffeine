import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Field, IMG, SubmitButton, TEL, TEL_LABEL, mailto, settle, useValidation } from "./shared";

/*
 * LET OP: demodata. De merken en productsoorten komen van de onderdelenpagina
 * van aquaspaservice.be, maar de productnamen, omschrijvingen en prijzen zijn
 * voorbeelden. Vervang PRODUCTS door het echte assortiment voor livegang.
 * price: euro, of null = prijs op aanvraag.
 */
interface Category {
  id: string;
  label: string;
  icon: string;
}

interface Product {
  id: string;
  cat: string;
  brand: string;
  name: string;
  desc: string;
  price: number | null;
}

const CATEGORIES: Category[] = [
  { id: "besturing", label: "Besturingen", icon: "ph-cpu" },
  { id: "verwarming", label: "Verwarming", icon: "ph-thermometer-hot" },
  { id: "pompen", label: "Pompen", icon: "ph-fan" },
  { id: "jets", label: "Jets en pvc", icon: "ph-waves" },
  { id: "onderhoud", label: "Filters en onderhoud", icon: "ph-flask" },
  { id: "covers", label: "Covers en accessoires", icon: "ph-square-half" },
  { id: "sauna", label: "Sauna en hammam", icon: "ph-fire" },
  { id: "merk", label: "Merkspecifiek", icon: "ph-package" },
];

const PRODUCTS: Product[] = [
  { id: "bal-ctrl", cat: "besturing", brand: "Balboa", name: "Balboa besturingsunit", desc: "Vervangende besturing voor spa's met Balboa-elektronica.", price: 689 },
  { id: "bal-panel", cat: "besturing", brand: "Balboa", name: "Balboa bedieningspaneel", desc: "Toppaneel voor Balboa-besturingen.", price: 219 },
  { id: "gck-ctrl", cat: "besturing", brand: "Gecko", name: "Gecko besturingsunit", desc: "Vervangende besturing voor spa's met Gecko-elektronica.", price: 649 },
  { id: "gck-heat", cat: "verwarming", brand: "Gecko", name: "Gecko verwarmingselement", desc: "Verwarmingselement voor Gecko-besturingen.", price: 169 },
  { id: "bal-heat", cat: "verwarming", brand: "Balboa", name: "Balboa verwarmingselement", desc: "Verwarmingselement voor Balboa-besturingen.", price: 159 },
  { id: "lx-heat", cat: "verwarming", brand: "LX", name: "LX verwarmingselement", desc: "Verwarmingselement voor spa's met LX-componenten.", price: 139 },
  { id: "laing-circ", cat: "pompen", brand: "Laing", name: "Laing circulatiepomp", desc: "Circulatiepomp voor filtratie en verwarming.", price: 239 },
  { id: "af-pump", cat: "pompen", brand: "Aqua-Flo", name: "Aqua-Flo massagepomp", desc: "Massagepomp by Gecko, in verschillende vermogens.", price: 429 },
  { id: "ww-pump", cat: "pompen", brand: "Waterway", name: "Waterway massagepomp", desc: "Massagepomp, in verschillende vermogens.", price: 459 },
  { id: "lx-pump", cat: "pompen", brand: "LX", name: "LX massagepomp", desc: "Massagepomp, in verschillende vermogens.", price: 389 },
  { id: "espa-pump", cat: "pompen", brand: "Espa", name: "Espa pomp", desc: "Pomp voor spa's met Espa-uitrusting.", price: 419 },
  { id: "sam-pump", cat: "pompen", brand: "Sam", name: "Sam pomp", desc: "Pomp voor spa's met Sam-uitrusting.", price: 399 },
  { id: "ww-jet", cat: "jets", brand: "Waterway", name: "Waterway jet", desc: "Vervangingsjet, in meerdere diameters.", price: 24.5 },
  { id: "pen-jet", cat: "jets", brand: "Pentair", name: "Pentair jet", desc: "Vervangingsjet, in meerdere diameters.", price: 27.9 },
  { id: "ww-pvc", cat: "jets", brand: "Waterway", name: "Waterway pvc-koppelstuk", desc: "Koppelstukken en fittingen voor het leidingwerk.", price: 8.95 },
  { id: "filter", cat: "onderhoud", brand: "Diverse merken", name: "Filterpatroon", desc: "Vervangfilter. Maat en type afstemmen op uw spa.", price: 39.95 },
  { id: "water", cat: "onderhoud", brand: "Diverse merken", name: "Onderhoudsproducten voor spawater", desc: "Producten voor helder en verzorgd spawater.", price: 29.95 },
  { id: "cover", cat: "covers", brand: "Op maat", name: "Spacover op maat", desc: "Voor elke spa en zwemspa, op uw afmetingen.", price: null },
  { id: "coverlift", cat: "covers", brand: "Diverse merken", name: "Coverlift", desc: "Om de cover makkelijk van het bad te nemen.", price: 249 },
  { id: "trap", cat: "covers", brand: "Diverse merken", name: "Spatrap", desc: "Trapje voor een veilige in- en uitstap.", price: 179 },
  { id: "leuning", cat: "covers", brand: "Diverse merken", name: "Leuning", desc: "Extra houvast bij het in- en uitstappen.", price: 129 },
  { id: "harvia", cat: "sauna", brand: "Harvia", name: "Harvia onderdelen", desc: "Onderdelen voor Harvia-sauna's en hammams.", price: null },
  { id: "tylo", cat: "sauna", brand: "Tylo", name: "Tylo onderdelen", desc: "Onderdelen voor Tylo-sauna's en hammams.", price: null },
  { id: "effegibi", cat: "sauna", brand: "Effegibi", name: "Effegibi onderdelen", desc: "Onderdelen voor Effegibi-hammams.", price: null },
  { id: "jacuzzi", cat: "merk", brand: "Jacuzzi", name: "Jacuzzi onderdelen", desc: "Servicepunt voor Jacuzzi® Italië. Onderdelen voor spa's, sauna's en hammams.", price: null },
  { id: "d1", cat: "merk", brand: "Dimension One", name: "Dimension One onderdelen", desc: "Specifieke onderdelen voor Dimension One-spa's.", price: null },
];

const BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const CAT_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const BRANDS = Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort((a, b) => {
  const ad = /^(Diverse|Op maat)/.test(a);
  const bd = /^(Diverse|Op maat)/.test(b);
  if (ad !== bd) return ad ? 1 : -1;
  return a.localeCompare(b, "nl");
});

const eur = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const CART_KEY = "ass-cart";

type Cart = Record<string, number>;
type Sort = "aanbevolen" | "prijs-op" | "prijs-af" | "naam";
type DrawerView = "cart" | "checkout" | "done";

function loadCart(): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "{}") as Record<string, unknown>;
    const clean: Cart = {};
    Object.keys(raw).forEach((id) => {
      const n = parseInt(String(raw[id]), 10);
      if (BY_ID[id] && n > 0) clean[id] = Math.min(n, 99);
    });
    return clean;
  } catch {
    return {};
  }
}

function matches(p: Product, q: string, cat: string, brands: string[]) {
  if (cat !== "all" && p.cat !== cat) return false;
  if (brands.length && !brands.includes(p.brand)) return false;
  if (q) {
    const hay = `${p.name} ${p.brand} ${p.desc} ${CAT_BY_ID[p.cat].label}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }
  return true;
}

const CHECKOUT_RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { required: true, email: true },
  adres: { required: true },
  plaats: { required: true },
};

const REQUEST_RULES = {
  naam: { required: true },
  telefoon: { required: true },
  email: { email: true },
  toestel: { required: true },
  onderdeel: { required: true },
};

interface ShopProps {
  cart: Cart;
  setCart: (next: Cart | ((c: Cart) => Cart)) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

/** Winkelmand-state leeft in de demo-schil, zodat de knop in de navigatie meetelt. */
export function useCart() {
  const [cart, setCartState] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCartState(loadCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Opslaan mag mislukken; de mand werkt dan alleen voor deze sessie.
    }
  }, [cart, loaded]);

  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  return { cart, setCart: setCartState, count };
}

export function Shop({ cart, setCart, cartOpen, setCartOpen }: ShopProps) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [brands, setBrands] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("aanbevolen");
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters op brede schermen altijd open.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)");
    const sync = () => wide.matches && setFiltersOpen(true);
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);

  const inBase = useMemo(() => PRODUCTS.filter((p) => matches(p, q, "all", brands)), [q, brands]);

  const list = useMemo(() => {
    const out = PRODUCTS.filter((p) => matches(p, q, cat, brands));
    if (sort === "prijs-op" || sort === "prijs-af") {
      const dir = sort === "prijs-op" ? 1 : -1;
      out.sort((a, b) => {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return (a.price - b.price) * dir;
      });
    } else if (sort === "naam") {
      out.sort((a, b) => a.name.localeCompare(b.name, "nl"));
    }
    return out;
  }, [q, cat, brands, sort]);

  const filtered = q !== "" || cat !== "all" || brands.length > 0;
  const clear = () => {
    setQ("");
    setCat("all");
    setBrands([]);
  };
  const toggleBrand = (b: string) =>
    setBrands((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]));

  const timers = useRef<Record<string, number>>({});
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: Math.min((c[id] || 0) + 1, 99) }));
    setLive(`${BY_ID[id].name} toegevoegd aan uw winkelmand.`);
    setAdded((s) => ({ ...s, [id]: true }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => setAdded((s) => ({ ...s, [id]: false })), 1400);
  };

  return (
    <>
      <section className="shophead">
        <div className="wrap shophead__grid">
          <div>
            <h1>Onderdelen voor uw spa en sauna</h1>
            <p className="shophead__lead">
              Besturingen, pompen, verwarming, jets, filters en covers. Voor alle merken, geleverd door de technieker die
              ze ook plaatst.
            </p>
            <form
              className="search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                document.getElementById("catalogus")?.scrollIntoView();
              }}
            >
              <label htmlFor="q">Zoek een onderdeel</label>
              <i className="ph ph-magnifying-glass" aria-hidden="true" />
              <input
                id="q"
                type="search"
                autoComplete="off"
                placeholder="Bijvoorbeeld: Balboa, circulatiepomp, filter"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </form>
          </div>
          <div className="shophead__media">
            <img
              src={`${IMG}/bruisend-683.jpg`}
              width={683}
              height={1024}
              decoding="async"
              alt="Close-up van bruisend water in een jacuzzi met bedieningsknoppen op de rand."
            />
          </div>
        </div>
      </section>

      <section className="promise" aria-label="Zo werkt bestellen">
        <div className="wrap">
          <ul>
            <li>
              <i className="ph ph-wrench" aria-hidden="true" />
              Onderdelen voor alle merken
            </li>
            <li>
              <i className="ph ph-phone-call" aria-hidden="true" />
              <span>
                Twijfel over het type? Bel <a href={TEL}>{TEL_LABEL}</a>
              </span>
            </li>
            <li>
              <i className="ph ph-check-circle" aria-hidden="true" />
              Wij bevestigen prijs en beschikbaarheid voor u betaalt
            </li>
          </ul>
        </div>
      </section>

      <section className="catalog" id="catalogus">
        <div className="wrap catalog__grid">
          <details
            className="filters"
            open={filtersOpen}
            onToggle={(e) => setFiltersOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>
              <span>Filters</span>
              <i className="ph ph-sliders-horizontal" aria-hidden="true" />
            </summary>
            <div className="filters__body">
              <div className="fgroup">
                <h2>Categorie</h2>
                <ul className="catlist">
                  <li>
                    <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
                      Alle onderdelen <span className="n">{inBase.length}</span>
                    </button>
                  </li>
                  {CATEGORIES.map((c) => (
                    <li key={c.id}>
                      <button type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                        {c.label} <span className="n">{inBase.filter((p) => p.cat === c.id).length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="fgroup">
                <h2>Merk</h2>
                <div className="brandchips">
                  {BRANDS.map((b) => (
                    <button key={b} type="button" aria-pressed={brands.includes(b)} onClick={() => toggleBrand(b)}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              {filtered && (
                <button className="fclear" type="button" onClick={clear}>
                  <i className="ph ph-x-circle" aria-hidden="true" />
                  Filters wissen
                </button>
              )}
            </div>
          </details>

          <div>
            <div className="toolbar">
              <p className="toolbar__count" aria-live="polite">
                <strong>{list.length}</strong> {list.length === 1 ? "onderdeel" : "onderdelen"}
              </p>
              <label className="sort" htmlFor="sort">
                Sorteren
                <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="aanbevolen">Aanbevolen</option>
                  <option value="prijs-op">Prijs oplopend</option>
                  <option value="prijs-af">Prijs aflopend</option>
                  <option value="naam">Naam A-Z</option>
                </select>
              </label>
            </div>

            <p className="demo-note">
              <i className="ph ph-info" aria-hidden="true" />
              Demo: dit zijn voorbeeldproducten van merken die wij leveren, met voorbeeldprijzen. Het echte assortiment en
              de echte prijzen volgen.
            </p>

            <div className="products">
              {list.length === 0 ? (
                <div className="empty" role="status">
                  <i className="ph ph-magnifying-glass" aria-hidden="true" />
                  <h3>Geen onderdelen gevonden</h3>
                  <p>
                    Probeer een andere zoekterm of filter. Staat uw onderdeel er niet bij, stuur ons dan het merk en type
                    van uw toestel.
                  </p>
                  <div className="actions">
                    <button className="btn btn--ghost btn--sm" type="button" onClick={clear}>
                      Filters wissen
                    </button>
                    <a className="btn btn--primary btn--sm" href="#aanvraag">
                      Vraag een onderdeel aan
                    </a>
                  </div>
                </div>
              ) : (
                list.map((p) => (
                  <article className="product" key={p.id}>
                    <div className="tile" aria-hidden="true">
                      <i className={`ph ${CAT_BY_ID[p.cat].icon}`} />
                    </div>
                    <div className="product__body">
                      <span className="product__brand">{p.brand}</span>
                      <h3>{p.name}</h3>
                      <p>{p.desc}</p>
                      <div className="product__foot">
                        {p.price === null ? (
                          <span className="price price--ask">Prijs op aanvraag</span>
                        ) : (
                          <span className="price">{eur.format(p.price)}</span>
                        )}
                        <button
                          className="btn btn--primary addbtn"
                          type="button"
                          data-added={added[p.id] ? "true" : undefined}
                          aria-label={`${p.name} toevoegen aan winkelmand`}
                          onClick={() => add(p.id)}
                        >
                          <i className={`ph ${added[p.id] ? "ph-check" : "ph-plus"}`} aria-hidden="true" />
                          <span>{added[p.id] ? "Toegevoegd" : "Toevoegen"}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <PartRequest />

      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} setOpen={setCartOpen} />
      <p className="skip-cart" role="status" aria-live="polite">
        {live}
      </p>
    </>
  );
}

function PartRequest() {
  const v = useValidation(REQUEST_RULES);
  const [busy, setBusy] = useState(false);
  const [href, setHref] = useState<string | null>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validate(form)) return;
    setBusy(true);
    await settle();
    const d = new FormData(form);
    const foto = (form.elements.namedItem("foto") as HTMLInputElement | null)?.files?.[0];
    setHref(
      mailto(`Onderdeel gezocht: ${d.get("toestel")}`, [
        `Naam: ${d.get("naam")}`,
        `Telefoon: ${d.get("telefoon")}`,
        `E-mail: ${d.get("email") || "niet opgegeven"}`,
        `Merk en type: ${d.get("toestel")}`,
        "",
        "Gezocht onderdeel:",
        String(d.get("onderdeel") ?? ""),
        "",
        foto ? `Foto: ${foto.name} (voeg deze toe als bijlage)` : "Geen foto",
      ])
    );
    setBusy(false);
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <section className="section" id="aanvraag" style={{ paddingTop: "clamp(24px,4vw,48px)" }}>
      <div className="wrap request">
        <div className="request__intro" data-reveal>
          <h2>Onderdeel niet gevonden?</h2>
          <p>
            Wij leveren onderdelen voor veel meer merken dan hier staan. Stuur ons wat u zoekt, dan zoeken wij het juiste
            onderdeel voor u op.
          </p>
          <ol>
            <li>
              <i className="ph ph-camera" aria-hidden="true" />
              <span>
                <strong>Neem een foto</strong> van het typeplaatje of van het onderdeel zelf.
              </span>
            </li>
            <li>
              <i className="ph ph-chat-teardrop-text" aria-hidden="true" />
              <span>
                <strong>Beschrijf wat u zoekt</strong>, en wat er misgaat als het om een defect gaat.
              </span>
            </li>
            <li>
              <i className="ph ph-check-circle" aria-hidden="true" />
              <span>
                <strong>Wij laten u weten</strong> of wij het onderdeel hebben en wat het kost.
              </span>
            </li>
          </ol>
        </div>

        <div className="panel" data-reveal>
          {href === null ? (
            <form noValidate onSubmit={submit}>
              <div className="row2">
                <Field v={v} id="rq-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
                <Field v={v} id="rq-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
              </div>
              <div className="row2">
                <Field v={v} id="rq-email" name="email" label="E-mail" type="email" autoComplete="email" error="Dit e-mailadres lijkt niet te kloppen." />
                <Field v={v} id="rq-toestel" name="toestel" label="Merk en type van uw toestel" required error='Vul het merk en type in, of schrijf "onbekend".' />
              </div>
              <Field
                v={v}
                id="rq-onderdeel"
                name="onderdeel"
                label="Welk onderdeel zoekt u?"
                required
                textarea
                hint="Bijvoorbeeld: circulatiepomp, verwarmingselement, jet van 5 cm, filter."
                error="Beschrijf kort welk onderdeel u zoekt."
              />
              <Field
                v={v}
                id="rq-foto"
                name="foto"
                label="Foto van typeplaatje of onderdeel"
                type="file"
                accept="image/*"
                hint="Niet verplicht, maar het helpt ons het juiste onderdeel te vinden."
              />
              <div className="formfoot">
                <SubmitButton busy={busy} icon="ph-paper-plane-tilt">
                  Vraag een onderdeel aan
                </SubmitButton>
              </div>
            </form>
          ) : (
            <div className="done" data-show="true" role="status" aria-live="polite">
              <i className="ph ph-check-circle mark-ok" aria-hidden="true" />
              <h3 ref={doneTitle} tabIndex={-1}>
                Uw aanvraag staat klaar
              </h3>
              <p>
                Dit is een demo zonder server, dus er is nog niets verstuurd. Open de aanvraag in uw e-mailprogramma en voeg
                de foto toe als bijlage, of bel ons meteen.
              </p>
              <div className="actions">
                <a className="btn btn--primary" href={href}>
                  <i className="ph ph-envelope-simple" aria-hidden="true" />
                  Open in e-mailprogramma
                </a>
                <a className="btn btn--ghost" href={TEL}>
                  <i className="ph ph-phone" aria-hidden="true" />
                  Bel {TEL_LABEL}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CartDrawer({
  cart,
  setCart,
  open,
  setOpen,
}: {
  cart: Cart;
  setCart: ShopProps["setCart"];
  open: boolean;
  setOpen: (o: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<DrawerView>("cart");
  const [busy, setBusy] = useState(false);
  const [href, setHref] = useState("");
  const v = useValidation(CHECKOUT_RULES);
  const doneTitle = useRef<HTMLHeadingElement>(null);
  const firstField = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setView((cur) => (cur === "done" ? "cart" : cur));
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const ids = Object.keys(cart);
  const subtotal = ids.reduce((s, id) => (BY_ID[id].price === null ? s : s + (BY_ID[id].price as number) * cart[id]), 0);
  const hasAsk = ids.some((id) => BY_ID[id].price === null);

  const setQty = (id: string, n: number) =>
    setCart((c) => {
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = Math.min(n, 99);
      return next;
    });

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!v.validate(form)) return;
    setBusy(true);
    await settle();
    const d = new FormData(form);
    const lines = ["Bestelaanvraag via de webshop", ""];
    ids.forEach((id) => {
      const p = BY_ID[id];
      lines.push(
        `${cart[id]} x ${p.name} (${p.brand})${p.price === null ? " - prijs op aanvraag" : ` - ${eur.format(p.price * cart[id])}`}`
      );
    });
    lines.push(
      "",
      `Subtotaal (voorbeeldprijzen): ${eur.format(subtotal)}`,
      "",
      `Naam: ${d.get("naam")}`,
      `Telefoon: ${d.get("telefoon")}`,
      `E-mail: ${d.get("email")}`,
      `Adres: ${d.get("adres")}, ${d.get("plaats")}`,
      `Merk en type spa: ${d.get("toestel") || "niet opgegeven"}`,
      `Opmerking: ${d.get("opmerking") || "geen"}`
    );
    setHref(mailto(`Bestelaanvraag van ${d.get("naam")}`, lines));
    setCart({});
    setBusy(false);
    v.reset();
    setView("done");
    window.setTimeout(() => doneTitle.current?.focus(), 0);
  };

  return (
    <dialog className="drawer" ref={ref} aria-labelledby="cart-title" onClose={() => setOpen(false)} onClick={onBackdrop}>
      <div className="drawer__head">
        <h2 id="cart-title">
          <i className="ph ph-shopping-cart-simple" aria-hidden="true" />
          Winkelmand
        </h2>
        <button className="iconbtn" type="button" aria-label="Winkelmand sluiten" onClick={() => setOpen(false)}>
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      </div>

      {view === "cart" && (
        <div className="drawer__view">
          <div className="drawer__body">
            {ids.length === 0 ? (
              <div className="empty">
                <i className="ph ph-shopping-cart-simple" aria-hidden="true" />
                <h3>Uw winkelmand is leeg</h3>
                <p>Voeg onderdelen toe uit de catalogus. Twijfelt u welk type u nodig heeft, bel ons dan eerst.</p>
                <div className="actions">
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setOpen(false)}>
                    Verder winkelen
                  </button>
                </div>
              </div>
            ) : (
              <ul className="lines">
                {ids.map((id) => {
                  const p = BY_ID[id];
                  const n = cart[id];
                  return (
                    <li key={id}>
                      <div className="tile" aria-hidden="true">
                        <i className={`ph ${CAT_BY_ID[p.cat].icon}`} />
                      </div>
                      <div>
                        <h3>{p.name}</h3>
                        <span className="meta">{p.brand}</span>
                      </div>
                      <span className="lineprice">{p.price === null ? "Op aanvraag" : eur.format(p.price * n)}</span>
                      <div className="row">
                        <div className="stepper" role="group" aria-label={`Aantal ${p.name}`}>
                          <button type="button" aria-label="Eén minder" onClick={() => setQty(id, n - 1)}>
                            <i className="ph ph-minus" aria-hidden="true" />
                          </button>
                          <output aria-live="polite">{n}</output>
                          <button type="button" aria-label="Eén meer" onClick={() => setQty(id, n + 1)}>
                            <i className="ph ph-plus" aria-hidden="true" />
                          </button>
                        </div>
                        <button className="linkbtn" type="button" onClick={() => setQty(id, 0)}>
                          <i className="ph ph-trash" aria-hidden="true" />
                          Verwijderen
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {ids.length > 0 && (
            <div className="drawer__foot">
              <div className="totals">
                <span>Subtotaal</span>
                <strong>{eur.format(subtotal)}</strong>
              </div>
              <p className="totals__note">
                {hasAsk
                  ? "Voorbeeldprijzen. Artikelen op aanvraag zijn niet meegeteld. Wij bevestigen prijs en beschikbaarheid voor u betaalt."
                  : "Voorbeeldprijzen. Wij bevestigen prijs en beschikbaarheid voor u betaalt."}
              </p>
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => {
                  setView("checkout");
                  window.setTimeout(() => firstField.current?.querySelector("input")?.focus(), 0);
                }}
              >
                Bestelling aanvragen
              </button>
            </div>
          )}
        </div>
      )}

      {view === "checkout" && (
        <div className="drawer__view">
          <div className="drawer__body">
            <button className="backbtn" type="button" onClick={() => setView("cart")}>
              <i className="ph ph-arrow-left" aria-hidden="true" />
              Terug naar winkelmand
            </button>
            <p className="summary">
              U betaalt nu nog niets. Wij kijken uw aanvraag na en <strong>bevestigen prijs, beschikbaarheid en levering</strong>{" "}
              per telefoon of e-mail.
            </p>
            <form noValidate onSubmit={submit}>
              <div ref={firstField}>
                <Field v={v} id="co-naam" name="naam" label="Naam" required autoComplete="name" error="Vul uw naam in." />
              </div>
              <Field v={v} id="co-tel" name="telefoon" label="Telefoon" required type="tel" inputMode="tel" autoComplete="tel" error="Vul een telefoonnummer in waarop wij u bereiken." />
              <Field v={v} id="co-email" name="email" label="E-mail" required type="email" autoComplete="email" error="Vul een geldig e-mailadres in." />
              <Field v={v} id="co-adres" name="adres" label="Straat en nummer" required autoComplete="street-address" error="Vul uw straat en huisnummer in." />
              <Field v={v} id="co-plaats" name="plaats" label="Postcode en gemeente" required autoComplete="postal-code" error="Vul uw postcode en gemeente in." />
              <Field v={v} id="co-toestel" name="toestel" label="Merk en type van uw spa" hint="Zo kunnen wij nakijken of de onderdelen op uw toestel passen." />
              <Field v={v} id="co-opm" name="opmerking" label="Opmerking" textarea minHeight={90} />
              <SubmitButton busy={busy} icon="ph-paper-plane-tilt" full>
                Verstuur bestelaanvraag
              </SubmitButton>
            </form>
          </div>
        </div>
      )}

      {view === "done" && (
        <div className="drawer__view">
          <div className="drawer__body">
            <div className="done" data-show="true" role="status" aria-live="polite">
              <i className="ph ph-check-circle mark-ok" aria-hidden="true" />
              <h3 ref={doneTitle} tabIndex={-1}>
                Uw bestelaanvraag staat klaar
              </h3>
              <p>
                Dit is een demo zonder server, dus er is nog niets verstuurd of besteld. Open de aanvraag in uw
                e-mailprogramma, of bel ons meteen.
              </p>
              <div className="actions">
                <a className="btn btn--primary" href={href}>
                  <i className="ph ph-envelope-simple" aria-hidden="true" />
                  Open in e-mailprogramma
                </a>
                <button className="btn btn--ghost" type="button" onClick={() => setOpen(false)}>
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
