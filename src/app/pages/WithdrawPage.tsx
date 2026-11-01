import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router";
import { PublicInput, PublicTextarea } from "../components/form/PublicField";
import { policies } from "../lib/policies";
import { api } from "../studio/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The online withdrawal function the law asks for: a consumer who agreed online
 * can undo it here in two steps, and gets the date and time by mail straight
 * away. Open to everyone, without a login, as the law wants it easy to find.
 * ?offerte=, ?id= and ?t= come along from the quote page.
 */
export function WithdrawPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", reference: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "reference" | "form", string>>>({});
  const [step, setStep] = useState<"fill" | "confirm" | "done">("fill");
  const [sending, setSending] = useState(false);
  const [at, setAt] = useState("");

  // After hydration: the prerendered page has no query string.
  useEffect(() => {
    const reference = params.get("offerte");
    if (reference) setForm((f) => ({ ...f, reference }));
  }, [params]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function next(e: FormEvent) {
    e.preventDefault();
    const found = {
      name: form.name.trim() ? undefined : "Vul je naam in.",
      email: EMAIL.test(form.email.trim()) ? undefined : "Vul een geldig e-mailadres in.",
      reference: form.reference.trim() ? undefined : "Zeg om welke offerte of boeking het gaat.",
    };
    setErrors(found);
    if (!found.name && !found.email && !found.reference) setStep("confirm");
  }

  async function confirm() {
    setSending(true);
    setErrors({});
    try {
      const res = await api<{ at: string }>("/withdrawal", {
        method: "POST",
        anonymous: true,
        body: {
          name: form.name.trim(), email: form.email.trim(), reference: form.reference.trim(), message: form.message.trim(),
          quoteId: params.get("id") || undefined, token: params.get("t") || undefined,
        },
      });
      setAt(res.at);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : `Dat lukte niet. Mail naar contact@photodecaffeine.com.` });
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="pdc-legal">
      <Helmet>
        <title>Overeenkomst herroepen | PhotoDeCaffeine</title>
        <meta name="description" content="Ging je als particulier online akkoord en wil je toch niet? Binnen de bedenktijd herroep je de overeenkomst hier." />
        <link rel="canonical" href="https://www.photodecaffeine.com/herroepen" />
      </Helmet>
      <div className="pdc-legal-inner pdc-withdraw">
        <h1 className="pdc-legal-title">Overeenkomst herroepen</h1>
        {step === "done" ? (
          <div role="status">
            <p className="pdc-withdraw-lead">We hebben je herroeping ontvangen.</p>
            <p>
              Ontvangen op {new Date(at).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
              Je krijgt een bevestiging op {form.email.trim()}. Waar je recht op hebt, betalen we uiterlijk 14 dagen na vandaag terug.
            </p>
          </div>
        ) : step === "confirm" ? (
          <>
            <p className="pdc-withdraw-lead">Kloppen deze gegevens?</p>
            <dl className="pdc-withdraw-check">
              <dt>Naam</dt><dd>{form.name}</dd>
              <dt>E-mail</dt><dd>{form.email}</dd>
              <dt>Offerte of boeking</dt><dd>{form.reference}</dd>
              {form.message.trim() && <><dt>Bericht</dt><dd>{form.message}</dd></>}
            </dl>
            {errors.form && <p className="pdc-form-error" role="alert">{errors.form}</p>}
            <div className="pdc-withdraw-actions">
              <button type="button" className="pdc-withdraw-btn" onClick={confirm} disabled={sending} aria-busy={sending || undefined}>
                {sending ? "Versturen…" : "Herroeping bevestigen"}
              </button>
              <button type="button" className="pdc-legal-print" onClick={() => setStep("fill")} disabled={sending}>Terug</button>
            </div>
          </>
        ) : (
          <>
            <p>
              Ging je als particulier online of buiten onze werkplek akkoord met een opdracht? Dan heb je normaal 14 dagen
              bedenktijd. Je hoeft geen reden te geven. Hoe het precies werkt, staat in <Link to={policies.cancel.path}>Annuleren en terugbetaling</Link>.
            </p>
            <form onSubmit={next} noValidate data-track="Herroepen">
              <PublicInput label="Je naam" name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set("name")} error={errors.name} />
              <PublicInput label="Je e-mailadres" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} error={errors.email}
                hint="Hier sturen we de bevestiging naartoe." />
              <PublicInput label="Offerte of boeking" name="reference" autoComplete="off" maxLength={120} value={form.reference} onChange={set("reference")} error={errors.reference}
                hint="Bijvoorbeeld OF-2026-004, of omschrijf de opdracht." />
              <PublicTextarea label="Bericht (mag leeg)" name="message" rows={3} maxLength={2000} value={form.message} onChange={set("message")} />
              <button type="submit" className="pdc-withdraw-btn">Overeenkomst herroepen</button>
            </form>
          </>
        )}
      </div>
    </article>
  );
}
