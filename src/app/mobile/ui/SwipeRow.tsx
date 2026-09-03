import { motion, useAnimationControls, type PanInfo } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { c, radius, spring } from "../theme";
import { haptic } from "../haptics";

const ACTION_W = 74;
/** Drag past this fraction of the tray and release opens it. */
const OPEN_RATIO = 0.42;

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: string;
  /** Dragging well past the tray triggers this action directly. */
  full?: boolean;
}

/**
 * Swipe-left-to-reveal row actions.
 *
 * The `full` flag reproduces the Mail-style "keep pulling and it just happens"
 * shortcut, which is what makes a destructive action feel fast rather than
 * fiddly — but only where the action is reversible or confirmed downstream, so
 * an over-enthusiastic swipe can't quietly destroy something.
 */
export function SwipeRow({
  children,
  actions,
  disabled = false,
}: {
  children: ReactNode;
  actions: SwipeAction[];
  disabled?: boolean;
}) {
  const controls = useAnimationControls();
  const [open, setOpen] = useState(false);
  const armedRef = useRef(false);

  const trayWidth = actions.length * ACTION_W;
  const fullAction = actions.find((a) => a.full);
  const fullThreshold = trayWidth + 76;

  function close() {
    setOpen(false);
    armedRef.current = false;
    controls.start({ x: 0, transition: spring.snappy });
  }

  function handleDrag(_: unknown, info: PanInfo) {
    if (!fullAction) return;
    const past = -info.offset.x >= fullThreshold;
    if (past && !armedRef.current) {
      armedRef.current = true;
      haptic("impact");
    } else if (!past && armedRef.current) {
      armedRef.current = false;
    }
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const dragged = -info.offset.x;

    if (fullAction && dragged >= fullThreshold) {
      // Slide the row clean off before firing, so the action lands on a row
      // that has already visually left rather than one snapping back.
      controls.start({ x: -window.innerWidth, transition: { duration: 0.18 } });
      fullAction.onClick();
      return;
    }

    const shouldOpen = dragged > trayWidth * OPEN_RATIO || info.velocity.x < -420;
    if (shouldOpen) {
      setOpen(true);
      haptic("select");
      controls.start({ x: -trayWidth, transition: spring.snappy });
    } else {
      close();
    }
  }

  return (
    <div style={{ position: "relative", borderRadius: radius.lg, overflow: "hidden" }}>
      {/* Action tray, revealed as the row slides off it */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {actions.map((a) => (
          <motion.button
            key={a.label}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              close();
              a.onClick();
            }}
            style={{
              width: ACTION_W,
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              backgroundColor: a.tone ?? c.danger,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {a.icon}
            {a.label}
          </motion.button>
        ))}
      </div>

      <motion.div
        drag={disabled ? false : "x"}
        // Right edge is pinned at 0 so the row can never be dragged open the
        // wrong way and reveal an empty tray.
        dragConstraints={{ left: -fullThreshold - 40, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        dragDirectionLock
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        onClickCapture={(e) => {
          // A tap while the tray is open closes it instead of activating
          // whatever is under the finger.
          if (open) {
            e.stopPropagation();
            e.preventDefault();
            close();
          }
        }}
        style={{ position: "relative", backgroundColor: c.bg, borderRadius: radius.lg }}
      >
        {children}
      </motion.div>
    </div>
  );
}
