import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createApi, type Api } from "./api";

/** The API bound to the current session. Identity is stable per token. */
export function useApi(): Api {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  return useMemo(() => createApi(token), [token]);
}

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  /** A refresh over data that's already on screen — never blanks the list. */
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Optimistic local updates, so a mutation doesn't need a full round-trip. */
  set: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Minimal fetch-on-mount hook.
 *
 * Deliberately not a cache: admin data is small, personal, and changes under
 * you (an inquiry arrives, a colleague files a declaration), so every screen
 * entry re-reads rather than showing something that was true a while ago. Pull
 * to refresh is wired to the same `refresh` for an explicit re-read.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first request resolving after a fast refresh and
  // overwriting the newer data, and against setState on an unmounted screen.
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (isRefresh: boolean) => {
    const runId = ++runIdRef.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await fnRef.current();
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      if (mountedRef.current && runId === runIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refresh = useCallback(() => run(true), [run]);

  const set = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setData((prev) => (typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return { data, loading, refreshing, error, refresh, set };
}
