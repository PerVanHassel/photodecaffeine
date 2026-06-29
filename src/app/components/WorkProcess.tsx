import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";

export function WorkProcess() {
  const { t } = useLanguage();
  const isMobile = useMobile();
  const steps = t.workProcess.steps.map((s, i) => ({
    ...s,
    icon: ["📍", "🎬", "🎞️"][i],
  }));

  return (
    <section
      id="work"
      style={{
        backgroundColor: "#0a0501",
        padding: isMobile ? "80px 0" : "120px 0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: isMobile ? "0 20px" : "0 40px",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "56px",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <span
              style={{
                color: "rgba(255,251,224,0.3)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "16px",
              }}
            >
              {t.workProcess.label}
            </span>
            <h2
              style={{
                color: "#fffbe0",
                fontSize: "clamp(32px, 4vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {t.workProcess.titleLine1}
              <br />
              <span style={{ color: "rgba(255,251,224,0.35)" }}>
                {t.workProcess.titleLine2}
              </span>
            </h2>
          </div>
          <p
            style={{
              color: "rgba(255,251,224,0.4)",
              fontSize: "14px",
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: "320px",
              margin: 0,
            }}
          >
            {t.workProcess.subtitle}
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "rgba(255,251,224,0.08)",
            marginBottom: "0",
          }}
        />

        {/* Steps grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0",
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.number}
              style={{
                borderRight:
                  (!isMobile && index < steps.length - 1)
                    ? "1px solid rgba(255,251,224,0.08)"
                    : "none",
                borderBottom: "1px solid rgba(255,251,224,0.08)",
                padding: isMobile ? "36px 20px" : "52px 40px",
                position: "relative",
                transition: "background-color 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(255,251,224,0.02)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
            >
              {/* Number watermark */}
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "32px",
                  color: "rgba(255,251,224,0.04)",
                  fontSize: "80px",
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div
                style={{
                  fontSize: "28px",
                  marginBottom: "24px",
                  display: "block",
                }}
              >
                {step.icon}
              </div>

              {/* Step number label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    color: "#c8905a",
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                  }}
                >
                  Step {step.number}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundColor: "rgba(200,144,90,0.2)",
                    maxWidth: "40px",
                  }}
                />
              </div>

              {/* Title */}
              <h3
                style={{
                  color: "#fffbe0",
                  fontSize: "28px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  margin: 0,
                  marginBottom: "6px",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  color: "rgba(255,251,224,0.35)",
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  margin: 0,
                  marginBottom: "24px",
                }}
              >
                {step.subtitle}
              </p>

              {/* Description */}
              <p
                style={{
                  color: "rgba(255,251,224,0.5)",
                  fontSize: "14px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  margin: 0,
                  marginBottom: "32px",
                }}
              >
                {step.description}
              </p>

              {/* Detail tags */}
              <div
                style={{
                  borderTop: "1px solid rgba(255,251,224,0.08)",
                  paddingTop: "20px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,251,224,0.25)",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  {step.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}