import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Info, RotateCw, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { c, GUTTER, radius, safeTop, shadow, spring } from "../theme";
import { haptic } from "../haptics";
import { Press } from "./base";
import { Button } from "./form";

// ── Skeletons ─────────────────────────────────────────────────────────────

export function Skeleton({
  w = "100%",
  h = 14,
  r = 8,
  style,
}: {
  w?: number | string;
  h?: number;
  r?: number;
  style?: React.CSSProperties;
}) {
  return <div className="m-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/**
 * Placeholder rows that mirror the real list's geometry.
 *
 * Matching the actual row height matters more than it looks: if the skeleton is
 * a different size, the list visibly jumps when data lands, which reads as a
 * bug even though nothing went wrong.
 */
export function SkeletonList({ rows = 5, height = 68 }: { rows?: number; height?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height,
            padding: "0 16px",
            borderRadius: radius.lg,
            backgroundColor: c.surface,
            border: `1px solid ${c.line}`,
            // Later rows fade out — the eye reads it as depth rather than as
            // five identical grey bars.
            opacity: 1 - i * 0.13,
          }}
        >
          <Skeleton w={38} h={38} r={999} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Skeleton w="52%" h={11} />
            <Skeleton w="34%" h={9} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty & error ─────────────────────────────────────────────────────────

export function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: 12,
      }}
    >
      {icon && (
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: radius.pill,
            display: "grid",
            placeItems: "center",
            backgroundColor: c.copperWash,
            border: `1px solid ${c.line}`,
            color: c.copper,
            marginBottom: 4,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 700, color: c.fg, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      {body && (
        <div style={{ fontSize: 13, color: c.fg3, lineHeight: 1.55, maxWidth: 280 }}>{body}</div>
      )}
      {action && (
        <div style={{ marginTop: 8 }}>
          <Button size="sm" variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Empty
      icon={<AlertTriangle size={24} />}
      title="Kon niet laden"
      body={message}
      action={onRetry ? { label: "Opnieuw proberen", onClick: onRetry } : undefined}
    />
  );
}

// ── Toasts ────────────────────────────────────────────────────────────────

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<{
  toast: (message: string, tone?: ToastTone, action?: Toast["action"]) => void;
} | null>(null);

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <Check size={15} strokeWidth={3} />,
  error: <X size={15} strokeWidth={3} />,
  info: <Info size={15} strokeWidth={2.6} />,
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: c.ok,
  error: c.danger,
  info: c.copper,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success", action?: Toast["action"]) => {
      const id = nextId.current++;
      haptic(tone === "error" ? "error" : tone === "success" ? "success" : "tap");
      // Only ever two on screen; a stack taller than that covers the content
      // the toast is reporting on.
      setToasts((list) => [...list.slice(-1), { id, message, tone, action }]);
      window.setTimeout(() => dismiss(id), action ? 5200 : 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className="m-portal"
            style={{
              position: "fixed",
              top: safeTop(8),
              left: GUTTER,
              right: GUTTER,
              zIndex: 300,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.96 }}
                  transition={spring.snappy}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.6, bottom: 0 }}
                  onDragEnd={(_, info) => info.offset.y < -28 && dismiss(t.id)}
                  className="m-glass"
                  style={{
                    pointerEvents: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "12px 14px",
                    borderRadius: radius.md,
                    backgroundColor: c.surfaceSolid,
                    boxShadow: shadow.lift,
                    borderColor: c.line2,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: TONE_COLOR[t.tone],
                      color: c.bg,
                    }}
                  >
                    {TONE_ICON[t.tone]}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: c.fg,
                      lineHeight: 1.35,
                    }}
                  >
                    {t.message}
                  </span>
                  {t.action && (
                    <Press
                      onClick={() => {
                        dismiss(t.id);
                        t.action!.onClick();
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: c.copper,
                        padding: "6px 2px",
                        flexShrink: 0,
                      }}
                    >
                      {t.action.label}
                    </Press>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast moet binnen ToastProvider gebruikt worden");
  return ctx.toast;
}

// ── Inline refresh hint ───────────────────────────────────────────────────

export function RefreshHint({ onClick }: { onClick: () => void }) {
  return (
    <Press
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        fontWeight: 600,
        color: c.fg3,
        padding: "8px 0",
      }}
    >
      <RotateCw size={12} />
      Vernieuwen
    </Press>
  );
}
