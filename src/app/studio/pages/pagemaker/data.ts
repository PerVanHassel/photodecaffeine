import { useQuery } from "@tanstack/react-query";
import type { ArticlePage } from "../../../lib/articlePage";
import { get } from "../../api";

// Portfolio articles and the automotive gallery live in the kv store; the
// automotive gallery is one special article that the public page looks up by
// its title.
export type Article = {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  coverType: "image" | "video";
  description: string;
  galleryUrls: string[];
  published: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  /** The page maker's layout. Missing: the site lays the page out from the text and photos. */
  page?: ArticlePage | null;
  /** Title and description for Google; empty: made from the article. */
  seoTitle?: string;
  seoDescription?: string;
};

export const AUTOMOTIVE_TITLE = "__automotive_gallery__";
export const AUTOMOTIVE_CATEGORY = "_automotive-gallery";
export const portfolioKey = ["portfolio"] as const;

export function useArticles() {
  return useQuery({
    queryKey: portfolioKey,
    queryFn: ({ signal }) => get<{ articles: Article[] }>("/admin/portfolio", signal).then((r) => r.articles || []),
  });
}

/** Portfolio work as the admin lists it: without the automotive gallery. */
export const isWork = (a: Article) => a.title !== AUTOMOTIVE_TITLE && !a.category.startsWith("_");
