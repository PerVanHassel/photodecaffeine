import type { HeroStyle, MediaLayout, TemplateId } from "../../../lib/articlePage";

// Small drawings of a layout, so a choice shows what it does. All in a
// 64 × 40 box; `currentColor` is the photo, the lighter bars are text.

const P = "currentColor";
const T = "var(--line-strong)";

function Box({ children, h = 40 }: { children: React.ReactNode; h?: number }) {
  return <svg viewBox={`0 0 64 ${h}`} aria-hidden="true" focusable="false">{children}</svg>;
}

const r = (x: number, y: number, w: number, h: number, fill = P, rx = 1.5) => <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />;

export function LayoutSketch({ layout }: { layout: MediaLayout }) {
  switch (layout) {
    case "full": return <Box>{r(0, 6, 64, 28, P, 0)}</Box>;
    case "wide": return <Box>{r(6, 6, 52, 28)}</Box>;
    case "inset": return <Box>{r(16, 6, 32, 28)}</Box>;
    case "duo": return <Box>{r(6, 5, 25, 30)}{r(33, 5, 25, 30)}</Box>;
    case "offset": return <Box>{r(6, 4, 30, 22)}{r(41, 14, 17, 22)}</Box>;
    case "trio": return <Box>{r(6, 7, 16, 26)}{r(24, 7, 16, 26)}{r(42, 7, 16, 26)}</Box>;
    case "mosaic": return <Box>{r(6, 5, 33, 30)}{r(41, 5, 17, 14)}{r(41, 21, 17, 14)}</Box>;
    case "slices": return <Box>{r(6, 5, 24, 30)}{r(32, 5, 8, 30)}{r(42, 5, 7, 30)}{r(51, 5, 7, 30)}</Box>;
    case "marquee": return <Box>{r(-6, 9, 18, 22)}{r(14, 9, 14, 22)}{r(30, 9, 20, 22)}{r(52, 9, 18, 22)}</Box>;
  }
}

export function HeroSketch({ hero }: { hero: HeroStyle }) {
  switch (hero) {
    case "cinema": return <Box>{r(0, 0, 64, 40, P, 0)}{r(18, 18, 28, 4, "#fff")}{r(22, 25, 20, 3, "rgba(255,255,255,0.6)")}</Box>;
    case "offset": return <Box>{r(6, 6, 44, 6, T)}{r(6, 14, 30, 6, T)}{r(28, 17, 30, 20)}{r(6, 26, 16, 2.5, T)}</Box>;
    case "split": return <Box>{r(6, 12, 22, 5, T)}{r(6, 19, 16, 5, T)}{r(6, 27, 18, 2.5, T)}{r(34, 4, 24, 32)}</Box>;
    case "plain": return <Box>{r(6, 10, 46, 7, T)}{r(6, 19, 32, 7, T)}{r(20, 30, 26, 2.5, T)}</Box>;
  }
}

/** A template as a tall page: header, then its first few moments. */
export function TemplateSketch({ id }: { id: TemplateId }) {
  const text = (y: number) => <>{r(18, y, 30, 2, T)}{r(18, y + 4, 26, 2, T)}</>;
  switch (id) {
    case "verhaal": return <Box h={72}>{r(0, 0, 64, 20, P, 0)}{text(25)}{r(0, 34, 64, 14, P, 0)}{text(53)}{r(6, 62, 25, 10)}{r(33, 62, 25, 10)}</Box>;
    case "fotoserie": return <Box h={72}>{r(6, 4, 38, 5, T)}{r(30, 11, 28, 14)}{r(6, 30, 52, 14)}{r(6, 48, 28, 12)}{r(38, 54, 20, 14)}</Box>;
    case "case": return <Box h={72}>{r(6, 6, 22, 4, T)}{r(6, 12, 16, 4, T)}{r(34, 3, 24, 22)}{r(6, 30, 52, 0.8, T)}{r(6, 33, 10, 2, T)}{r(20, 33, 10, 2, T)}{r(34, 33, 10, 2, T)}{r(6, 40, 28, 18)}{r(40, 44, 18, 2, T)}{r(40, 48, 14, 2, T)}{r(6, 62, 33, 10)}{r(41, 62, 17, 10)}</Box>;
    case "film": return <Box h={72}>{r(6, 4, 40, 6, T)}{r(6, 14, 52, 26, "#17130f")}<path d="M29 22l8 5-8 5z" fill="#fff" />{text(45)}{r(6, 56, 25, 14)}{r(33, 56, 25, 14)}</Box>;
    case "leeg": return <Box h={72}>{r(6, 8, 44, 6, T)}{r(6, 16, 30, 6, T)}{text(32)}{text(42)}{text(52)}</Box>;
  }
}
