import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { ChevronLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { c, GUTTER, radius, safeTop, spring, TAB_BAR_H, text } from "../theme";
import { haptic } from "../haptics";
import { Press } from "./base";

/** Scroll distance over which the large title hands off to the compact one. */
const HANDOFF = 46;
/** Pull distance that arms a refresh. */
const PULL_THRESHOLD = 72;
/** Pull is damped past this so the sheet can't be dragged to the floor. */
const PULL_MAX = 130;

interface ScreenProps {
  title: string;
  eyebrow?: ReactNode;
  /** Renders a back chevron. `true` goes back in history; a string navigates. */
  back?: boolean | string;
  /** Buttons for the top-right of the compact header. */
  trailing?: ReactNode;
  /** Enables pull to refresh. */
  onRefresh?: () => Promise<unknown> | void;
  refreshing?: boolean;
  children: ReactNode;
  /** Content rendered under the large title, above the scroll body. */
  hero?: ReactNode;
  /** Set when the screen is a modal/detail page with no tab bar underneath. */
  fullBleedBottom?: boolean;
  contentStyle?: CSSProperties;
}

/**
 * The scaffold every screen sits in: collapsing large title, glass header,
 * pull to refresh, safe-area padding.
 *
 * The large-title handoff is the single detail that does most of the work in
 * making this read as an app rather than a page — the title starts as content
 * in the scroll flow and becomes chrome as you scroll, exactly the way UIKit's
 * large-title navigation bar behaves.
 */
export function Screen({
  title,
  eyebrow,
  back,
  trailing,
  onRefresh,
  refreshing = false,
  children,
  hero,
  fullBleedBottom = false,
  contentStyle,
}: ScreenProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollY = useMotionValue(0);
  const pull = useMotionValue(0);
  // Spring on the release so the content settles rather than snapping back.
  const pullSpring = useSpring(pull, { stiffness: 400, damping: 40, mass: 0.8 });

  const compactOpacity = useTransform(scrollY, [HANDOFF * 0.45, HANDOFF], [0, 1]);
  const largeOpacity = useTransform(scrollY, [0, HANDOFF * 0.9], [1, 0]);
  const largeY = useTransform(scrollY, [0, HANDOFF], [0, -10]);
  // The header only grows its hairline + fill once content is actually behind it.
  const headerLine = useTransform(scrollY, [0, 12], [0, 1]);
  const headerFill = useTransform(scrollY, [0, 20], [0, 0.86]);

  const [busy, setBusy] = useState(false);
  const armedRef = useRef(false);

  const fire = useCallback(async () => {
    if (!onRefresh || busy) return;
    setBusy(true);
    haptic("impact");
    try {
      await onRefresh();
    } finally {
      setBusy(false);
      pull.set(0);
    }
  }, [onRefresh, busy, pull]);

  // Pull to refresh.
  //
  // Wired with native listeners rather than React's onTouch* props because
  // React registers touchmove passively, and this gesture has to call
  // preventDefault to stop iOS rubber-banding the scroller out from under the
  // transform we're driving.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onRefresh) return;

    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0 || busy) return;
      startY = e.touches[0].clientY;
      tracking = true;
      armedRef.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;

      // An upward drag means the user wants to scroll after all — hand the
      // gesture back to the browser instead of swallowing it.
      if (dy <= 0) {
        tracking = false;
        pull.set(0);
        return;
      }

      e.preventDefault();
      // Square-root damping: the first pixels track the finger 1:1, then the
      // sheet gets progressively heavier. Linear tracking feels frictionless
      // in the bad way — nothing tells you where the threshold is.
      const damped = Math.min(PULL_MAX, Math.sqrt(dy) * 8.5);
      pull.set(damped);

      if (damped >= PULL_THRESHOLD && !armedRef.current) {
        armedRef.current = true;
        haptic("select");
      } else if (damped < PULL_THRESHOLD && armedRef.current) {
        armedRef.current = false;
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (armedRef.current) fire();
      else pull.set(0);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, busy, pull, fire]);

  const spinning = busy || refreshing;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Compact header */}
      <motion.header
        style={{
          position: "relative",
          zIndex: 20,
          flexShrink: 0,
          paddingTop: safeTop(6),
          paddingLeft: GUTTER - 6,
          paddingRight: GUTTER - 6,
          paddingBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 46,
          backgroundColor: c.bg,
          // Header blur is tied to scroll so a screen at rest has no visible
          // chrome at all — the title just floats on the backdrop.
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: c.bg,
            opacity: headerFill,
            pointerEvents: "none",
          }}
        />
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            backgroundColor: c.line,
            opacity: headerLine,
            pointerEvents: "none",
          }}
        />

        {back && (
          <Press
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            aria-label="Terug"
            style={{
              position: "relative",
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              color: c.fg,
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </Press>
        )}

        <motion.div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            opacity: compactOpacity,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            textAlign: back ? "left" : "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingLeft: back ? 0 : 44,
            paddingRight: back ? 0 : 44,
          }}
        >
          {title}
        </motion.div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexShrink: 0,
          }}
        >
          {trailing}
        </div>
      </motion.header>

      {/* Pull-to-refresh indicator, revealed from under the header */}
      {onRefresh && (
        <PullIndicator pull={pullSpring} spinning={spinning} />
      )}

      {/* Scroll body */}
      <motion.div
        ref={scrollRef}
        className="m-scroll"
        style={{ y: pullSpring }}
        onScroll={(e) => scrollY.set((e.target as HTMLDivElement).scrollTop)}
      >
        <div
          style={{
            paddingLeft: GUTTER,
            paddingRight: GUTTER,
            paddingBottom: fullBleedBottom ? 32 : TAB_BAR_H + 40,
            ...contentStyle,
          }}
        >
          <motion.div style={{ opacity: largeOpacity, y: largeY, paddingTop: 2, paddingBottom: 18 }}>
            {eyebrow && <div style={{ ...text.eyebrow, marginBottom: 8 }}>{eyebrow}</div>}
            <h1 style={{ ...text.title, margin: 0, color: c.fg }}>{title}</h1>
          </motion.div>

          {hero}
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The copper arc that appears behind the header while pulling. It fills as a
 * function of pull distance and starts spinning once a refresh is in flight,
 * so the same element carries the gesture straight into the loading state.
 */
function PullIndicator({
  pull,
  spinning,
}: {
  pull: ReturnType<typeof useSpring>;
  spinning: boolean;
}) {
  const opacity = useTransform(pull, [0, 18, PULL_THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(pull, [0, PULL_THRESHOLD], [0.6, 1]);
  const rotate = useTransform(pull, [0, PULL_MAX], [0, 220]);
  const progress = useTransform(pull, [0, PULL_THRESHOLD], [0, 1]);
  const dash = useTransform(progress, (p) => `${Math.min(1, p) * 62} 62`);

  return (
    <motion.div
      style={{
        position: "absolute",
        top: safeTop(52),
        left: 0,
        right: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        zIndex: 10,
        opacity: spinning ? 1 : opacity,
        scale: spinning ? 1 : scale,
      }}
    >
      <motion.svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        style={{ rotate: spinning ? undefined : rotate }}
        animate={spinning ? { rotate: 360 } : undefined}
        transition={spinning ? { repeat: Infinity, duration: 0.8, ease: "linear" } : undefined}
      >
        <circle cx="13" cy="13" r="10" fill="none" stroke={c.line2} strokeWidth="2" />
        <motion.circle
          cx="13"
          cy="13"
          r="10"
          fill="none"
          stroke={c.copper}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={spinning ? "16 62" : dash}
          transform="rotate(-90 13 13)"
        />
      </motion.svg>
    </motion.div>
  );
}

/** Header action button — sized to the 44px touch minimum. */
export function HeaderAction({
  icon,
  onClick,
  label,
  tone,
  badge,
}: {
  icon: ReactNode;
  onClick: () => void;
  label: string;
  tone?: string;
  badge?: number;
}) {
  return (
    <Press
      onClick={onClick}
      aria-label={label}
      style={{
        position: "relative",
        width: 44,
        height: 44,
        display: "grid",
        placeItems: "center",
        color: tone ?? c.fg2,
      }}
    >
      {icon}
      <AnimatePresence>
        {!!badge && badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: radius.pill,
              backgroundColor: c.copper,
              color: c.bg,
              fontSize: 9,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </motion.span>
        )}
      </AnimatePresence>
    </Press>
  );
}
