import { useNavigate } from "react-router";

export function AutomotivePage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080401",
        color: "#fffbe0",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "72px",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#0d0703",
          borderBottom: "1px solid rgba(255,251,224,0.06)",
          padding: "80px 40px 64px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,251,224,0.35)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: 0,
              marginBottom: "40px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ← Services
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "32px",
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
                Services
              </span>
              <h1
                style={{
                  color: "#fffbe0",
                  fontSize: "clamp(48px, 7vw, 88px)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Auto
                <br />
                <span style={{ color: "rgba(255,251,224,0.3)" }}>motive</span>
                <br />
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "#c8905a",
                    fontSize: "0.78em",
                  }}
                >
                  Photography & Film
                </em>
              </h1>
            </div>
            <p
              style={{
                color: "rgba(255,251,224,0.35)",
                fontSize: "14px",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: "340px",
                textAlign: "right",
              }}
            >
              Cinematic imagery that captures the power, precision and personality of every machine.
            </p>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div
        style={{
          position: "relative",
          height: "55vh",
          minHeight: "360px",
          overflow: "hidden",
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80"
          alt="Automotive photography"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.5) contrast(1.05) saturate(0.7)",
          }}
        />
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "80px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "start",
          }}
          className="grid-cols-1 md:grid-cols-2"
        >
          {/* Left — intro text */}
          <div>
            <h2
              style={{
                color: "#fffbe0",
                fontSize: "clamp(28px, 3.5vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.0,
                textTransform: "uppercase",
                marginBottom: "28px",
                margin: "0 0 28px 0",
              }}
            >
              Machines in{" "}
              <span style={{ color: "rgba(255,251,224,0.3)" }}>motion</span>
            </h2>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 300,
                color: "rgba(255,251,224,0.55)",
                lineHeight: 1.8,
                marginBottom: "20px",
              }}
            >
              We create cinematic automotive imagery that goes beyond the car.
              Whether it's a static studio shoot, a dynamic outdoor session, or
              a full video production — we capture the personality, power, and
              precision that makes each vehicle unique.
            </p>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 300,
                color: "rgba(255,251,224,0.55)",
                lineHeight: 1.8,
              }}
            >
              From classic cars to modern performance machines, our approach is
              always cinematic and detail-driven. We work closely with owners,
              dealers, and brands to create content that truly represents the vehicle.
            </p>
          </div>

          {/* Right — what we offer */}
          <div>
            <span
              style={{
                color: "rgba(255,251,224,0.3)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "32px",
              }}
            >
              What we offer
            </span>
            {[
              "Static & detail photography",
              "Dynamic / rolling shots",
              "Cinematic video production",
              "Dealership content",
              "Private owner shoots",
              "Social media packages",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(255,251,224,0.06)",
                }}
              >
                <span
                  style={{
                    color: "#c8905a",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.25em",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  —
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,251,224,0.65)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery strip */}
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "3px",
        }}
        className="grid-cols-1 md:grid-cols-3"
      >
        {[
          "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=800&q=80",
        ].map((src, i) => (
          <div
            key={i}
            style={{ aspectRatio: "4/3", overflow: "hidden" }}
          >
            <img
              src={src}
              alt={`Automotive ${i + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "contrast(1.05) saturate(0.6) brightness(0.8)",
                transition: "transform 0.6s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")
              }
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          borderTop: "1px solid rgba(255,251,224,0.06)",
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "rgba(255,251,224,0.3)",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "20px",
          }}
        >
          Ready to shoot?
        </span>
        <h2
          style={{
            color: "#fffbe0",
            fontSize: "clamp(28px, 4vw, 56px)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 0.92,
            textTransform: "uppercase",
            margin: "0 0 40px",
          }}
        >
          Let's capture your{" "}
          <span style={{ color: "rgba(255,251,224,0.3)" }}>machine</span>
        </h2>
        <button
          onClick={() => {
            navigate("/");
            setTimeout(() => {
              const el = document.getElementById("contact");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }}
          style={{
            background: "none",
            border: "1px solid rgba(255,251,224,0.3)",
            color: "#fffbe0",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "13px 32px",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fffbe0";
            e.currentTarget.style.color = "#1a0c04";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#fffbe0";
          }}
        >
          Book a shoot
        </button>
      </div>
    </div>
  );
}
