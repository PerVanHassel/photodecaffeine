/** A long document cut into short pieces, read one at a time in the admin. */
export type ReaderBlock =
  | { t: "p" | "li" | "note" | "meta"; text: string }
  | { t: "table"; rows: string[][] };

export type ReaderSection = {
  id: string;
  part: string;
  title: string;
  blocks: ReaderBlock[];
  /** Different from the previous version, so "alleen wijzigingen" can find it. */
  changed?: boolean;
};

export type ReaderPart = {
  id: string;
  title: string;
  number?: number;
  meta: string[];
  internal?: boolean;
};

export type ReaderDocument = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  author: string;
  version: string;
  parts: ReaderPart[];
  sections: ReaderSection[];
};

export type DocNote = {
  id: string;
  sectionId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

/** Notes are shared by every admin; what you have read is your own. */
export type DocState = {
  notes: DocNote[];
  read: { done: string[]; at: string | null };
};
