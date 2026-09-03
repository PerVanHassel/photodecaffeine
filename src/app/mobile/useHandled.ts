import { useCallback, useEffect, useState } from "react";

/**
 * "Afgehandeld" flags for inquiries.
 *
 * Kept in localStorage under the same key the desktop admin panel uses, so
 * marking a lead handled in one place is reflected in the other on the same
 * device. It is per-device by design in both — the server has no such field,
 * and inventing one here would put the app and the panel out of sync.
 */
const KEY = "pdc_handled_inquiries";

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Notifies other hook instances in this tab; `storage` only fires cross-tab. */
const EVENT = "pdc-handled-change";

export function useHandled() {
  const [handled, setHandled] = useState<Set<string>>(read);

  useEffect(() => {
    const sync = () => setHandled(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const next = read();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    localStorage.setItem(KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const markHandled = useCallback((id: string) => {
    const next = read();
    next.add(id);
    localStorage.setItem(KEY, JSON.stringify([...next]));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { handled, toggle, markHandled };
}
