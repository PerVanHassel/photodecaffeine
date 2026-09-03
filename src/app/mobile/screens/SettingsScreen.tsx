import { motion } from "motion/react";
import { ImagePlus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useApi, useQuery } from "../useApi";
import { BUCKETS, type SiteSettings } from "../api";
import { c, radius, spring } from "../theme";
import { Card, Divider, SectionLabel, Stack } from "../ui/base";
import { Button, Field, FilePicker, Input, Switch } from "../ui/form";
import { ErrorState, SkeletonList, useToast } from "../ui/feedback";
import { HeaderAction, Screen } from "../ui/Screen";

const SECTION_LABELS: { key: keyof SiteSettings["sections"]; label: string; hint: string }[] = [
  { key: "workProcess", label: "Werkwijze", hint: "Het stappenplan op de homepage" },
  { key: "portfolio", label: "Portfolio", hint: "Uitgelicht werk op de homepage" },
  { key: "about", label: "Over ons", hint: "Introductieblok" },
  { key: "services", label: "Diensten", hint: "Overzicht van wat je aanbiedt" },
  { key: "socialProof", label: "Social proof", hint: "Reviews en logo's" },
  { key: "customCTA", label: "Custom CTA", hint: "Oproep onderaan de pagina" },
];

const IMAGE_FIELDS: { key: keyof SiteSettings; label: string; hint: string }[] = [
  { key: "heroImageUrl", label: "Hero — desktop", hint: "Breed beeld bovenaan de homepage" },
  { key: "heroImageMobileUrl", label: "Hero — mobiel", hint: "Staand beeld voor telefoons" },
  { key: "frameImageUrl", label: "Frame", hint: "Beeld in het introblok" },
];

export function SettingsScreen() {
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.settings(), [api]);

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Seed the editable copy once the fetch lands. Everything on this screen is
  // an explicit save, not a live write — site settings change what visitors
  // see, so a stray toggle should not go live on its own.
  useEffect(() => {
    if (query.data && !form) setForm(query.data);
  }, [query.data, form]);

  const dirty = !!form && !!query.data && JSON.stringify(form) !== JSON.stringify(query.data);

  function patch(updates: Partial<SiteSettings>) {
    setForm((f) => (f ? { ...f, ...updates } : f));
  }

  async function uploadImage(key: keyof SiteSettings, files: File[]) {
    setUploading(key);
    try {
      const url = await api.upload(files[0], BUCKETS.images);
      patch({ [key]: url } as Partial<SiteSettings>);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload mislukt", "error");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await api.saveSettings(form);
      query.set(saved);
      setForm(saved);
      toast("Opgeslagen — live op de site", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Opslaan mislukt", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Site-instellingen"
      eyebrow="photodecaffeine.com"
      back="/app/more"
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={
        dirty ? (
          <HeaderAction label="Opslaan" icon={<Save size={19} />} tone={c.copper} onClick={save} />
        ) : undefined
      }
    >
      {query.loading || !form ? (
        <SkeletonList rows={4} height={80} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          <section>
            <SectionLabel>Studio</SectionLabel>
            <Card style={{ padding: 16 }}>
              <Stack gap={14}>
                <Field label="Studionaam">
                  <Input
                    value={form.studioName ?? ""}
                    onChange={(e) => patch({ studioName: e.target.value })}
                  />
                </Field>
                <Field label="Contact-e-mail" hint="Waar contactformulieren naartoe gaan">
                  <Input
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={form.contactEmail ?? ""}
                    onChange={(e) => patch({ contactEmail: e.target.value })}
                  />
                </Field>
              </Stack>
            </Card>
          </section>

          <section>
            <SectionLabel>Beelden</SectionLabel>
            <Stack gap={12}>
              {IMAGE_FIELDS.map((field, i) => {
                const url = form[field.key] as string;
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.smooth, delay: i * 0.04 }}
                  >
                    <Field label={field.label} hint={field.hint}>
                      <FilePicker
                        onFiles={(files) => uploadImage(field.key, files)}
                        accept="image/*"
                        busy={uploading === field.key}
                      >
                        <div
                          style={{
                            height: 130,
                            borderRadius: radius.md,
                            border: `1px dashed ${url ? c.line : c.line2}`,
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                            backgroundColor: c.surface,
                            color: c.fg3,
                          }}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ImagePlus size={17} color={c.copper} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                {uploading === field.key ? "Uploaden…" : "Beeld kiezen"}
                              </span>
                            </span>
                          )}
                        </div>
                      </FilePicker>
                    </Field>
                  </motion.div>
                );
              })}
            </Stack>
          </section>

          <section>
            <SectionLabel>Secties op de homepage</SectionLabel>
            <Card style={{ padding: "4px 14px" }}>
              {SECTION_LABELS.map((section, i) => (
                <div key={section.key}>
                  {i > 0 && <Divider />}
                  <Switch
                    checked={!!form.sections?.[section.key]}
                    onChange={(v) =>
                      patch({ sections: { ...form.sections, [section.key]: v } })
                    }
                    label={section.label}
                    description={section.hint}
                  />
                </div>
              ))}
            </Card>
          </section>

          <Button full size="lg" busy={saving} disabled={!dirty} onClick={save}>
            {dirty ? "Wijzigingen opslaan" : "Alles opgeslagen"}
          </Button>
        </Stack>
      )}
    </Screen>
  );
}
