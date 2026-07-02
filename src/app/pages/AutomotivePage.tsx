import { useNavigate } from "react-router";
import { useLanguage } from "../context/LanguageContext";

export function AutomotivePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0e0802",
        color: "#fffbe0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Hero */}
      <div
        style={{
          position: "relative",
          height: "70vh",
          minHeight: "500px",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80"
          alt="Automotive photography"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.45)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 40px 64px",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "rgba(255,251,224,0.5)",
              marginBottom: "16px",
            }}
          >
            Services
          </p>
          <h1
            style={{
              fontSize: "clamp(40px, 6vw, 80px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Automotive
          </h1>
        </div>
      </div>

      {/* Intro */}
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
          <div>
            <h2
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 300,
                letterSpacing: "-0.01em",
                marginBottom: "24px",
                lineHeight: 1.2,
              }}
            >
              Capturing machines in motion
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,251,224,0.6)",
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
                fontSize: "15px",
                color: "rgba(255,251,224,0.6)",
                lineHeight: 1.8,
              }}
            >
              From classic cars to modern performance machines, our approach is
              always cinematic and detail-driven. We work closely with owners,
              dealers, and brands to create content that truly represents the vehicle.
            </p>
          </div>

          {/* What we offer */}
          <div>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(255,251,224,0.35)",
                marginBottom: "32px",
              }}
            >
              What we offer
            </p>
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
                  padding: "18px 0",
                  borderBottom: "1px solid rgba(255,251,224,0.07)",
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,251,224,0.4)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,251,224,0.75)",
                    letterSpacing: "0.05em",
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
          gap: "2px",
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
                filter: "brightness(0.85)",
                transition: "transform 0.6s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLImageElement).style.transform =
                  "scale(1.03)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLImageElement).style.transform =
                  "scale(1)")
              }
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          borderTop: "1px solid rgba(255,251,224,0.08)",
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,251,224,0.35)",
            marginBottom: "20px",
          }}
        >
          Ready to shoot?
        </p>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 300,
            letterSpacing: "-0.01em",
            marginBottom: "40px",
          }}
        >
          Let's capture your machine
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
            padding: "14px 32px",
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
