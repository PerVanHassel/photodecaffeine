import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * The demos that live inside this site.
 *
 * A web project in the admin points at one of these by its slug, and the
 * project's own on/off switch decides whether /demo/<slug> shows anything.
 * Adding a demo means adding a folder and one line here — the admin picks it
 * up on its own.
 */
export interface DemoEntry {
  slug: string;
  /** What the admin calls it in the dropdown. */
  name: string;
  /** One line, so it is clear which client a demo belongs to. */
  description: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const DEMOS: DemoEntry[] = [
  {
    slug: "thymen-stolk",
    name: "Thymen Stolk — fotograaf",
    description: "Voorpagina-stijl homepage voor een fotojournalist uit Dordrecht.",
    Component: lazy(() =>
      import("./thymen-stolk/ThymenStolkDemo").then((m) => ({ default: m.ThymenStolkDemo }))
    ),
  },
  {
    slug: "thymen-stolk-b",
    name: "Thymen Stolk — fotograaf (B)",
    description: "Tweede richting: donker en afgerond, met de weekoverzichten bovenaan.",
    Component: lazy(() =>
      import("./thymen-stolk-b/ThymenStolkBDemo").then((m) => ({ default: m.ThymenStolkBDemo }))
    ),
  },
];

export function findDemo(slug: string | undefined): DemoEntry | undefined {
  return DEMOS.find((d) => d.slug === slug);
}
