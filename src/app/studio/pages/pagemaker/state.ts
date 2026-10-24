import { useCallback, useRef, useState } from "react";
import {
  newBlock, newId, pageOf,
  type ArticlePage, type Block, type BlockType,
} from "../../../lib/articlePage";
import type { Article } from "./data";

/** What the page maker edits: the article's own fields and its page. */
export type Draft = Pick<Article, "title" | "category" | "description" | "coverUrl" | "coverType" | "galleryUrls" | "published" | "featured" | "seoTitle" | "seoDescription"> & {
  /** Null: the site lays the page out by itself. */
  page: ArticlePage | null;
};

export const draftOf = (a: Article): Draft => ({
  title: a.title,
  category: a.category,
  description: a.description,
  coverUrl: a.coverUrl,
  coverType: a.coverType,
  galleryUrls: a.galleryUrls || [],
  published: a.published,
  seoTitle: a.seoTitle || "",
  seoDescription: a.seoDescription || "",
  featured: a.featured,
  page: a.page && Array.isArray(a.page.blocks) ? a.page : null,
});

/** The page as shown: the saved one, or the automatic one. */
export const shownPage = (d: Draft): ArticlePage => d.page ?? pageOf({ ...d, page: null });

// ---------------------------------------------------------------------------
// Undo and redo
// ---------------------------------------------------------------------------

type History<T> = { past: T[]; present: T | null; future: T[] };

/**
 * State with undo. Changes with the same `key` close together (typing in one
 * field) count as one step.
 */
export function useHistory<T>() {
  const [h, setH] = useState<History<T>>({ past: [], present: null, future: [] });
  const last = useRef<{ key?: string; at: number }>({ at: 0 });

  const reset = useCallback((value: T) => {
    last.current = { at: 0 };
    setH({ past: [], present: value, future: [] });
  }, []);

  const commit = useCallback((next: (prev: T) => T, key?: string) => {
    const now = Date.now();
    const merge = !!key && last.current.key === key && now - last.current.at < 1200;
    last.current = { key, at: now };
    setH((s) => {
      if (s.present === null) return s;
      const value = next(s.present);
      if (value === s.present) return s;
      return merge ? { ...s, present: value, future: [] } : { past: [...s.past, s.present].slice(-100), present: value, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { at: 0 };
    setH((s) => (s.past.length && s.present !== null ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    last.current = { at: 0 };
    setH((s) => (s.future.length && s.present !== null ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  }, []);

  return { value: h.present, commit, reset, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

// ---------------------------------------------------------------------------
// Changes to the page
// ---------------------------------------------------------------------------

export type Commit = (next: (d: Draft) => Draft, key?: string) => void;

/** Changes the page; the first change to an automatic page fixes it as it is. */
export const withPage = (fn: (p: ArticlePage) => ArticlePage) => (d: Draft): Draft => ({ ...d, page: fn(shownPage(d)) });

export const updateBlock = (id: string, fn: (b: Block) => Block) =>
  withPage((p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? fn(b) : b)) }));

export const insertBlock = (index: number, type: BlockType, block: Block = newBlock(type)) =>
  withPage((p) => ({ ...p, blocks: [...p.blocks.slice(0, index), block, ...p.blocks.slice(index)] }));

export const removeBlock = (id: string) => withPage((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) }));

export const moveBlock = (id: string, step: -1 | 1) =>
  withPage((p) => {
    const i = p.blocks.findIndex((b) => b.id === id);
    const j = i + step;
    if (i < 0 || j < 0 || j >= p.blocks.length) return p;
    const blocks = [...p.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    return { ...p, blocks };
  });

export const moveBlockTo = (id: string, to: number) =>
  withPage((p) => {
    const from = p.blocks.findIndex((b) => b.id === id);
    if (from < 0 || from === to) return p;
    const blocks = [...p.blocks];
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
    return { ...p, blocks };
  });

export const duplicateBlock = (id: string, copyId = newId()) =>
  withPage((p) => {
    const i = p.blocks.findIndex((b) => b.id === id);
    if (i < 0) return p;
    const copy = { ...structuredClone(p.blocks[i]), id: copyId };
    return { ...p, blocks: [...p.blocks.slice(0, i + 1), copy, ...p.blocks.slice(i + 1)] };
  });

/** Adds uploaded or picked files to the article's photos, once each. */
export const addPhotos = (urls: string[]) => (d: Draft): Draft => ({
  ...d,
  galleryUrls: [...d.galleryUrls, ...urls.filter((u) => !d.galleryUrls.includes(u))],
});
