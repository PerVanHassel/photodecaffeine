import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ComponentType } from "react";
import { get, put } from "../api";
import { useAction } from "../queries";
import type { Business } from "../types";
import { Card, TextAreaField, TextField } from "../ui";

/**
 * Pages from the old admin that are not rebuilt yet (portfolio, reviews,
 * team, …). They keep working inside the new shell, in their light theme.
 */
export function legacy(Page: ComponentType) {
  return function LegacyPage() {
    return <div className="s-legacy"><Page /></div>;
  };
}

/** The studio's details on invoices, stored with the site settings. */
export function BusinessSettings() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => get<{ settings: Record<string, any> }>("/admin/settings").then((r) => r.settings) });
  const [f, setF] = useState<Business>({ name: "", address: "", kvk: "", vatNumber: "", iban: "", email: "" });
  useEffect(() => {
    const b = settings.data?.business;
    if (b) setF({ name: b.name || "", address: b.address || "", kvk: b.kvk || "", vatNumber: b.vatNumber || "", iban: b.iban || "", email: b.email || "" });
  }, [settings.data]);
  const dirty = JSON.stringify(f) !== JSON.stringify({ name: "", address: "", kvk: "", vatNumber: "", iban: "", email: "", ...(settings.data?.business || {}) });
  const save = useAction({
    fn: () => put("/admin/settings", { business: f }),
    invalidate: () => [["settings"]],
    success: "Bedrijfsgegevens opgeslagen",
  });
  return (
    <div className="s-view narrow" style={{ marginBottom: 24 }}>
      <Card
        title="Bedrijfsgegevens op facturen"
        action={dirty && <button className="s-btn primary sm" type="button" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Opslaan…" : "Opslaan"}</button>}
      >
        <div className="s-form-grid">
          <TextField label="Bedrijfsnaam" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="PhotoDeCaffeine Productions" />
          <TextField label="E-mail voor facturen" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <TextAreaField className="full" label="Adres" rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <TextField label="KvK-nummer" value={f.kvk} onChange={(e) => setF({ ...f, kvk: e.target.value })} />
          <TextField label="Btw-nummer" value={f.vatNumber} onChange={(e) => setF({ ...f, vatNumber: e.target.value })} />
          <TextField className="full" label="IBAN" value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value.toUpperCase() })} />
        </div>
      </Card>
    </div>
  );
}
