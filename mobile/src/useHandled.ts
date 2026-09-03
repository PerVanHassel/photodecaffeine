import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * "Afgehandeld" flags for inquiries.
 *
 * The server has no such field — the website stores this in localStorage under
 * the same key, so it is per-device there too. Inventing a server field here
 * would put the app and the panel out of sync in a way neither could explain,
 * so this deliberately matches: a flag that lives on the device you triage from.
 */
const KEY = "pdc_handled_inquiries";

/** In-memory mirror so reads are synchronous during render. */
let cache: Set<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...cache]));
  } catch {
    // Losing a triage flag is not worth interrupting anyone for.
  }
}

export function useHandled() {
  const [, bump] = useState(0);

  useEffect(() => {
    const rerender = () => bump((n) => n + 1);
    listeners.add(rerender);

    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
          notify();
        })
        .catch(() => {
          cache = new Set();
        });
    }

    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    if (cache.has(id)) cache.delete(id);
    else cache.add(id);
    notify();
    persist();
  }, []);

  const markHandled = useCallback((id: string) => {
    if (cache.has(id)) return;
    cache.add(id);
    notify();
    persist();
  }, []);

  return { handled: cache, toggle, markHandled };
}
