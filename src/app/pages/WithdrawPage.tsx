import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router";
import { PublicInput, PublicTextarea } from "../components/form/PublicField";
import { useLanguage } from "../context/LanguageContext";
import { localPolicies } from "../lib/policies";
import { api } from "../studio/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The online withdrawal function the law asks for: a consumer who agreed online
 * can undo it here in two steps, and gets the date and time by mail straight
 * away. Open to everyone, without a login, as the law wants it easy to find.
 * ?offerte=, ?id= and ?t= come along from the quote page.
 */
export function WithdrawPage() {
  const { t, language } = useLanguage();
  const tw = t.withdraw;
  const policies = localPolicies(language);
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
      name: form.name.trim() ? undefined : tw.errorName,
      email: EMAIL.test(form.email.trim()) ? undefined : tw.errorEmail,
      reference: form.reference.trim() ? undefined : tw.errorReference,
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
          quoteId: params.get("id") || undefined, token: params.get("t") || undefined, lang: language,
        },
      });
      setAt(res.at);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      // The server answers in Dutch; in English the page says it itself.
      setErrors({ form: language === "nl" && err instanceof Error ? err.message : tw.sendError });
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="pdc-legal">
      <Helmet>
        <title>{tw.metaTitle}</title>
        <meta name="description" content={tw.metaDescription} />
        <link rel="canonical" href="https://www.photodecaffeine.com/herroepen" />
      </Helmet>
      <div className="pdc-legal-inner pdc-withdraw">
        <h1 className="pdc-legal-title">{tw.title}</h1>
        {step === "done" ? (
          <div role="status">
            <p className="pdc-withdraw-lead">{tw.doneTitle}</p>
            <p>
              {tw.done(
                new Date(at).toLocaleString(t.locale, { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                form.email.trim(),
              )}
            </p>
          </div>
        ) : step === "confirm" ? (
          <>
            <p className="pdc-withdraw-lead">{tw.checkTitle}</p>
            <dl className="pdc-withdraw-check">
              <dt>{tw.checkName}</dt><dd>{form.name}</dd>
              <dt>{tw.checkEmail}</dt><dd>{form.email}</dd>
              <dt>{tw.checkReference}</dt><dd>{form.reference}</dd>
              {form.message.trim() && <><dt>{tw.checkMessage}</dt><dd>{form.message}</dd></>}
            </dl>
            {errors.form && <p className="pdc-form-error" role="alert">{errors.form}</p>}
            <div className="pdc-withdraw-actions">
              <button type="button" className="pdc-withdraw-btn" onClick={confirm} disabled={sending} aria-busy={sending || undefined}>
                {sending ? tw.sending : tw.confirm}
              </button>
              <button type="button" className="pdc-legal-print" onClick={() => setStep("fill")} disabled={sending}>{tw.back}</button>
            </div>
          </>
        ) : (
          <>
            <p>
              {tw.introBefore} <Link to={policies.cancel.path}>{tw.introLink}</Link>{tw.introAfter}
            </p>
            <form onSubmit={next} noValidate data-track="Herroepen">
              <PublicInput label={tw.nameLabel} name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set("name")} error={errors.name} />
              <PublicInput label={tw.emailLabel} name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} error={errors.email}
                hint={tw.emailHint} />
              <PublicInput label={tw.referenceLabel} name="reference" autoComplete="off" maxLength={120} value={form.reference} onChange={set("reference")} error={errors.reference}
                hint={tw.referenceHint} />
              <PublicTextarea label={tw.messageLabel} name="message" rows={3} maxLength={2000} value={form.message} onChange={set("message")} />
              <button type="submit" className="pdc-withdraw-btn">{tw.submit}</button>
            </form>
          </>
        )}
      </div>
    </article>
  );
}
