import { useSearchParams, type NavigateOptions } from "react-router";

/**
 * A filter or tab kept in the address (?filter=paid), so a reload, the Back
 * button and a shared link all show the same view. The default value is left
 * out of the address.
 */
export function useUrlState<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key) as T | null;
  const value = raw !== null && (!allowed || allowed.includes(raw)) ? raw : fallback;
  const set = (next: T) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === fallback) out.delete(key);
        else out.set(key, next);
        return out;
      },
      { replace: true, preventScrollReset: true },
    );
  return [value, set];
}

type Patch = Record<string, string | null>;

function applyPatch(base: URLSearchParams, patch: Patch) {
  const out = new URLSearchParams(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) out.delete(key);
    else out.set(key, value);
  }
  return out;
}

/**
 * Sets or clears a few search params and keeps the rest, so opening a drawer
 * (?open=…) doesn't throw away a filter that is also in the address. `null`
 * removes a key; `href` gives the same change as a link target.
 */
export function useSearchPatch() {
  const [params, setParams] = useSearchParams();
  return {
    params,
    patch: (changes: Patch, options?: NavigateOptions) => setParams((prev) => applyPatch(prev, changes), options),
    href: (changes: Patch) => `?${applyPatch(params, changes)}`,
  };
}
