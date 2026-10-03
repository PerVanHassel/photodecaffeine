import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { policies } from "../../lib/policies";

/** The line under every inquiry form that says what happens with the data. */
export function FormPrivacyNote() {
  const { privacyNote } = useLanguage().t.forms;
  return (
    <p className="pdc-form-privacy">
      {privacyNote}{" "}
      <Link to={policies.privacy.path}>{policies.privacy.title.toLowerCase()}</Link>.
    </p>
  );
}
