import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "../ThemeContext";
import { dateFull, radius } from "../theme";
import { Press } from "./base";
import { Sheet } from "./Sheet";

/**
 * Date picker over an ISO `YYYY-MM-DD` string.
 *
 * ISO is what the server stores and what every comparison in the app sorts on,
 * so the value stays in that form and only the display is localised. On iOS the
 * inline spinner is wrapped in a sheet with an explicit confirm — the bare
 * inline picker has no notion of "done", and people scroll past it.
 */
export function DateField({
  value,
  onChange,
  placeholder = "Kies een datum",
  mode = "date",
}: {
  /** `YYYY-MM-DD`, or `HH:mm` when mode is "time". */
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mode?: "date" | "time";
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  const asDate = parseValue(value, mode);
  const [draft, setDraft] = useState<Date>(asDate ?? new Date());

  function commit(next: Date) {
    onChange(mode === "time" ? formatTime(next) : formatDate(next));
  }

  function openPicker() {
    setDraft(asDate ?? new Date());
    setOpen(true);
  }

  const label = value
    ? mode === "time"
      ? value
      : dateFull(value)
    : placeholder;

  return (
    <>
      <Press
        onPress={openPicker}
        scale={false}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          backgroundColor: c.surface2,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
        }}
      >
        <Text style={{ flex: 1, fontSize: 16, color: value ? c.fg : c.fg4 }}>{label}</Text>
        <Feather name={mode === "time" ? "clock" : "calendar"} size={16} color={c.fg3} />
      </Press>

      {/* Android's picker is a system dialog that reports its own result, so it
          renders bare; iOS gets the sheet with a confirm button. */}
      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={draft}
          mode={mode}
          onChange={(event, selected) => {
            setOpen(false);
            if (event.type === "set" && selected) commit(selected);
          }}
        />
      )}

      {Platform.OS === "ios" && (
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title={mode === "time" ? "Tijd" : "Datum"}
          footer={
            <>
              <Press
                onPress={() => setOpen(false)}
                scale={false}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.md,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: c.line2,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.fg2 }}>Annuleren</Text>
              </Press>
              <Press
                onPress={() => {
                  commit(draft);
                  setOpen(false);
                }}
                scale={false}
                style={{
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.md,
                  backgroundColor: c.copper,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a0c04" }}>Kiezen</Text>
              </Press>
            </>
          }
        >
          <View style={{ alignItems: "center", paddingBottom: 8 }}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              themeVariant={c.bg === "#070301" ? "dark" : "light"}
              locale="nl-NL"
              onChange={(_, selected) => selected && setDraft(selected)}
            />
          </View>
        </Sheet>
      )}
    </>
  );
}

function parseValue(value: string, mode: "date" | "time"): Date | null {
  if (!value) return null;
  if (mode === "time") {
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h)) return null;
    const d = new Date();
    d.setHours(h, m || 0, 0, 0);
    return d;
  }
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local date parts, not toISOString — that shifts across the UTC boundary. */
function formatDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
