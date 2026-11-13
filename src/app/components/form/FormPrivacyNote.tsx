import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { localPolicies } from "../../lib/policies";

/** The line under every inquiry form that says what happens with the data. */
export function FormPrivacyNote() {
  const { t, language } = useLanguage();
  const privacy = localPolicies(language).privacy;
  return (
    <p className="pdc-form-privacy">
      {t.forms.privacyNote}{" "}
      <Link to={privacy.path}>{privacy.title.toLowerCase()}</Link>.
    </p>
  );
}
