import { motion } from "motion/react";
import { c } from "./theme";

/**
 * Cold-start splash.
 *
 * iOS only shows a native launch image for a PWA if you ship an exactly-sized
 * `apple-touch-startup-image` for every device in the lineup — a dozen-plus
 * assets that go stale with each new screen size. Animating the same aperture
 * mark in the app instead covers every device, and covers the browser-tab case
 * that never gets a launch image at all.
 */
export function Splash({ label = "Admin" }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 500,
        display: "grid",
        placeItems: "center",
        backgroundColor: c.bg,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <Aperture />
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.5 }}
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: c.fg4,
            paddingLeft: "0.42em",
          }}
        >
          {label}
        </motion.div>
      </div>
    </motion.div>
  );
}

/** The app icon's aperture, drawn as six blades that iris open on launch. */
function Aperture({ size = 76 }: { size?: number }) {
  const blades = Array.from({ length: 6 });

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      initial={{ rotate: -32, scale: 0.86, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
    >
      <defs>
        <linearGradient id="pdc-splash-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--m-copper-hi)" />
          <stop offset="55%" stopColor="var(--m-copper)" />
          <stop offset="100%" stopColor="var(--m-copper-lo)" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="url(#pdc-splash-ring)"
        strokeWidth="5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ rotate: -90, transformOrigin: "50% 50%" }}
      />

      {blades.map((_, i) => (
        <motion.line
          key={i}
          x1="50"
          y1="50"
          x2="50"
          y2="12"
          stroke="var(--m-copper)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 0.55 }}
          transition={{ delay: 0.2 + i * 0.045, duration: 0.5, ease: "easeOut" }}
          style={{ rotate: i * 60, transformOrigin: "50% 50%" }}
        />
      ))}

      <motion.path
        d="M50 26 L70.8 38 L70.8 62 L50 74 L29.2 62 L29.2 38 Z"
        fill="var(--m-bg-3)"
        stroke="var(--m-copper)"
        strokeWidth="1.5"
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.26, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "50% 50%" }}
      />
    </motion.svg>
  );
}
