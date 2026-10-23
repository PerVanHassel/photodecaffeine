import type { ReaderBlock, ReaderDocument, ReaderSection } from "./types";
import { websitebeleid } from "./websitebeleid";

export const DOCUMENTS: ReaderDocument[] = [websitebeleid];

const plain = (s: string) => s.replace(/\*\*/g, "");

/** All words of a piece, for reading time and reading aloud. */
export function sectionText(section: ReaderSection): string {
  const block = (b: ReaderBlock) => (b.t === "table" ? b.rows.map((r) => r.join(", ")).join(". ") : plain(b.text));
  return [section.title, ...section.blocks.map(block)].join(". ");
}

/** Minutes at a calm pace (180 words a minute), at least one. */
export function minutes(section: ReaderSection): number {
  return Math.max(1, Math.round(sectionText(section).split(/\s+/).length / 180));
}
