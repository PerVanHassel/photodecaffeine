// A group of options a visitor ticks on or off, shown as chips. Each chip is a
// real checkbox, so keyboards and screen readers get it for free; the look
// lives in src/styles/site.css (.pdc-choice*).
export function ChoiceChips({
  legend,
  hint,
  options,
  label = (option) => option,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  /** The values that are sent. */
  options: string[];
  /** How a value reads on screen, when that differs from the value (another language). */
  label?: (option: string) => string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  // Kept in the order of the options, whatever order they were ticked in.
  const toggle = (option: string) =>
    onChange(options.filter((o) => (o === option ? !value.includes(o) : value.includes(o))));

  return (
    <fieldset className="pdc-choices">
      <legend className="pdc-field-label">{legend}</legend>
      {hint && <p className="pdc-field-hint pdc-choices-hint">{hint}</p>}
      <div className="pdc-choices-list">
        {options.map((option) => (
          <label key={option} className="pdc-choice">
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} />
            <span>{label(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
