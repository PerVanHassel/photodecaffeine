import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { c, ease, GUTTER, radius, safeBottom, shadow, spring } from "../theme";
import { haptic } from "../haptics";
import { Press } from "./base";

/** Drag distance past which release dismisses instead of snapping back. */
const DISMISS_DISTANCE = 110;
/** A fast flick dismisses even from a short distance. */
const DISMISS_VELOCITY = 700;

/**
 * Bottom sheet.
 *
 * Portalled to <body> rather than rendered in place: the screen scaffold drives
 * a transform on its scroll container for pull-to-refresh, and a transformed
 * ancestor becomes the containing block for `position: fixed` descendants —
 * which would pin the sheet inside the scroller instead of over the app.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  /** Fraction of viewport height the sheet may grow to before it scrolls. */
  maxHeight = 0.88,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: number;
  dismissable?: boolean;
}) {
  // Escape closes on desktop; on the phone the drag handle and backdrop do it.
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (!dismissable) return;
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      haptic("tap");
      onClose();
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="m-portal" style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            onClick={dismissable ? onClose : undefined}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: c.scrim,
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring.gentle}
            drag={dismissable ? "y" : false}
            // Only `top` is constrained, leaving downward drag free — that
            // asymmetry is what makes the sheet feel hinged at the bottom.
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.02, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: `${maxHeight * 100}%`,
              display: "flex",
              flexDirection: "column",
              backgroundColor: c.surfaceSolid,
              backgroundImage: `linear-gradient(180deg, ${c.surface2}, transparent 180px)`,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderTop: `1px solid ${c.line2}`,
              boxShadow: shadow.lift,
              // Extends past the bottom edge so an over-drag on the spring
              // never reveals the page behind the sheet.
              paddingBottom: safeBottom(12),
            }}
          >
            {dismissable && (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  paddingTop: 10,
                  paddingBottom: 2,
                  cursor: "grab",
                  touchAction: "none",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 4,
                    borderRadius: radius.pill,
                    backgroundColor: c.line2,
                  }}
                />
              </div>
            )}

            {(title || subtitle) && (
              <div style={{ padding: `10px ${GUTTER}px 12px` }}>
                {title && (
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 750,
                      letterSpacing: "-0.02em",
                      color: c.fg,
                    }}
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p style={{ margin: "5px 0 0", fontSize: 13, color: c.fg3, lineHeight: 1.45 }}>
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            <div
              className="m-scroll m-selectable"
              style={{ padding: `0 ${GUTTER}px`, paddingBottom: footer ? 8 : 16 }}
            >
              {children}
            </div>

            {footer && (
              <div
                style={{
                  padding: `12px ${GUTTER}px 4px`,
                  borderTop: `1px solid ${c.line}`,
                  display: "flex",
                  gap: 10,
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Action sheet ──────────────────────────────────────────────────────────

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** iOS-style stacked action list. */
export function ActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="m-portal" style={{ position: "fixed", inset: 0, zIndex: 210 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, backgroundColor: c.scrim }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={spring.snappy}
            style={{
              position: "absolute",
              left: GUTTER - 6,
              right: GUTTER - 6,
              bottom: safeBottom(10),
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              className="m-glass"
              style={{
                borderRadius: radius.lg,
                overflow: "hidden",
                backgroundColor: c.surfaceSolid,
                boxShadow: shadow.lift,
              }}
            >
              {title && (
                <div
                  style={{
                    padding: "14px 16px",
                    fontSize: 12,
                    color: c.fg3,
                    textAlign: "center",
                    borderBottom: `1px solid ${c.line}`,
                  }}
                >
                  {title}
                </div>
              )}
              {actions.map((a, i) => (
                <Press
                  key={a.label}
                  disabled={a.disabled}
                  onClick={() => {
                    onClose();
                    a.onClick();
                  }}
                  scale={false}
                  feedback={a.destructive ? "warning" : "tap"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    width: "100%",
                    minHeight: 52,
                    padding: "0 16px",
                    fontSize: 16,
                    fontWeight: 500,
                    color: a.destructive ? c.danger : c.fg,
                    borderTop: i === 0 && !title ? "none" : `1px solid ${c.line}`,
                  }}
                >
                  {a.icon}
                  {a.label}
                </Press>
              ))}
            </div>

            <Press
              onClick={onClose}
              scale={false}
              style={{
                display: "grid",
                placeItems: "center",
                minHeight: 52,
                borderRadius: radius.lg,
                backgroundColor: c.surfaceSolid,
                border: `1px solid ${c.line}`,
                fontSize: 16,
                fontWeight: 700,
                color: c.fg,
                boxShadow: shadow.lift,
              }}
            >
              Annuleren
            </Press>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Confirm ───────────────────────────────────────────────────────────────

/**
 * Destructive-action confirmation. Separate from ActionSheet because a delete
 * needs the consequence spelled out, not just a red label.
 */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Verwijderen",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={body}
      footer={
        <>
          <Press
            onClick={onClose}
            scale={false}
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              minHeight: 48,
              borderRadius: radius.md,
              border: `1px solid ${c.line2}`,
              fontSize: 15,
              fontWeight: 600,
              color: c.fg2,
            }}
          >
            Annuleren
          </Press>
          <Press
            onClick={onConfirm}
            disabled={busy}
            feedback="warning"
            scale={false}
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              minHeight: 48,
              borderRadius: radius.md,
              backgroundColor: c.danger,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {busy ? "Bezig…" : confirmLabel}
          </Press>
        </>
      }
    >
      <div />
    </Sheet>
  );
}
