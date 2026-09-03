import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApi, useQuery } from "@/useApi";
import { BUCKETS, type SiteSettings } from "@/api";
import { pickImages } from "@/pickers";
import { Card, Divider, SectionLabel, Stack } from "@/ui/base";
import { Button, Field, Input, PickTarget, Switch } from "@/ui/form";
import { ErrorState, SkeletonList, useToast } from "@/ui/feedback";
import { HeaderAction, Screen } from "@/ui/Screen";

const SECTION_TOGGLES: { key: keyof SiteSettings["sections"]; label: string; hint: string }[] = [
  { key: "workProcess", label: "Werkwijze", hint: "Het stappenplan op de homepage" },
  { key: "portfolio", label: "Portfolio", hint: "Uitgelicht werk op de homepage" },
  { key: "about", label: "Over ons", hint: "Introductieblok" },
  { key: "services", label: "Diensten", hint: "Overzicht van wat je aanbiedt" },
  { key: "socialProof", label: "Social proof", hint: "Reviews en logo's" },
  { key: "customCTA", label: "Custom CTA", hint: "Oproep onderaan de pagina" },
];

const IMAGE_FIELDS: { key: "heroImageUrl" | "heroImageMobileUrl" | "frameImageUrl"; label: string; hint: string }[] = [
  { key: "heroImageUrl", label: "Hero — desktop", hint: "Breed beeld bovenaan de homepage" },
  { key: "heroImageMobileUrl", label: "Hero — mobiel", hint: "Staand beeld voor telefoons" },
  { key: "frameImageUrl", label: "Frame", hint: "Beeld in het introblok" },
];

export default function SettingsScreen() {
  const api = useApi();
  const toast = useToast();
  const query = useQuery(() => api.settings(), [api]);

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Seed the editable copy once the fetch lands. Everything here is an explicit
  // save, never a live write — these settings change what visitors see, so a
  // stray toggle must not go live on its own.
  useEffect(() => {
    if (query.data && !form) setForm(query.data);
  }, [query.data, form]);

  const dirty = !!form && !!query.data && JSON.stringify(form) !== JSON.stringify(query.data);

  function patch(updates: Partial<SiteSettings>) {
    setForm((f) => (f ? { ...f, ...updates } : f));
  }

  async function uploadImage(key: (typeof IMAGE_FIELDS)[number]["key"]) {
    let assets;
    try {
      assets = await pickImages(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Kon fotobibliotheek niet openen", "error");
      return;
    }
    if (!assets?.length) return;

    setUploading(key);
    try {
      const url = await api.upload(assets[0], BUCKETS.images);
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
      back
      fullBleedBottom
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      trailing={dirty ? <HeaderAction label="Opslaan" icon="save" onPress={save} /> : undefined}
    >
      {query.loading || !form ? (
        <SkeletonList rows={4} height={80} />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refresh} />
      ) : (
        <Stack gap={26}>
          <View>
            <SectionLabel>Studio</SectionLabel>
            <Card style={{ padding: 16 }}>
              <Stack gap={14}>
                <Field label="Studionaam">
                  <Input
                    value={form.studioName ?? ""}
                    onChangeText={(v) => patch({ studioName: v })}
                  />
                </Field>
                <Field label="Contact-e-mail" hint="Waar contactformulieren naartoe gaan">
                  <Input
                    value={form.contactEmail ?? ""}
                    onChangeText={(v) => patch({ contactEmail: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Field>
              </Stack>
            </Card>
          </View>

          <View>
            <SectionLabel>Beelden</SectionLabel>
            <Stack gap={12}>
              {IMAGE_FIELDS.map((field, i) => {
                const url = form[field.key];
                return (
                  <Animated.View
                    key={field.key}
                    entering={FadeInDown.delay(i * 40).springify().damping(20)}
                  >
                    <Field label={field.label} hint={field.hint}>
                      <PickTarget
                        onPress={() => uploadImage(field.key)}
                        busy={uploading === field.key}
                        label="Beeld kiezen"
                        height={130}
                        active={!!url}
                      >
                        {url ? (
                          <Image
                            source={{ uri: url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        ) : undefined}
                      </PickTarget>
                    </Field>
                  </Animated.View>
                );
              })}
            </Stack>
          </View>

          <View>
            <SectionLabel>Secties op de homepage</SectionLabel>
            <Card style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
              {SECTION_TOGGLES.map((section, i) => (
                <View key={section.key}>
                  {i > 0 && <Divider />}
                  <Switch
                    checked={!!form.sections?.[section.key]}
                    onChange={(v) => patch({ sections: { ...form.sections, [section.key]: v } })}
                    label={section.label}
                    description={section.hint}
                  />
                </View>
              ))}
            </Card>
          </View>

          <Button full size="lg" busy={saving} disabled={!dirty} onPress={save}>
            {dirty ? "Wijzigingen opslaan" : "Alles opgeslagen"}
          </Button>
        </Stack>
      )}
    </Screen>
  );
}
