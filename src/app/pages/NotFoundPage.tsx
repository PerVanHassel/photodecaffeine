import { useNavigate } from "react-router";
import { Home, ArrowLeft, Camera } from "lucide-react";
import { useMobile } from "../hooks/useMobile";

export function NotFoundPage() {
  const navigate = useNavigate();
  const isMobile = useMobile();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#060301",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorative elements */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          background: "radial-gradient(circle at 30% 50%, rgba(200,144,90,0.3) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.02,
          background: "radial-gradient(circle at 70% 60%, rgba(255,251,224,0.2) 0%, transparent 40%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: "600px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Icon */}
        <div
          style={{
            marginBottom: isMobile ? "32px" : "48px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: isMobile ? "80px" : "120px",
              height: isMobile ? "80px" : "120px",
              borderRadius: "50%",
              backgroundColor: "rgba(200,144,90,0.08)",
              border: "1px solid rgba(200,144,90,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <Camera size={isMobile ? 36 : 48} color="#c8905a" strokeWidth={1.5} />
          </div>
        </div>

        {/* 404 Number */}
        <div
          style={{
            fontSize: isMobile ? "120px" : "180px",
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            marginBottom: "24px",
            background: "linear-gradient(135deg, #fffbe0 0%, rgba(200,144,90,0.8) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </div>

        {/* Title */}
        <h1
          style={{
            color: "#fffbe0",
            fontSize: isMobile ? "28px" : "42px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
            lineHeight: 1.2,
          }}
        >
          Frame Not Found
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(255,251,224,0.4)",
            fontSize: isMobile ? "14px" : "16px",
            fontWeight: 300,
            lineHeight: 1.7,
            margin: "0 0 48px 0",
            maxWidth: "450px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          De pagina die je zoekt is niet ontwikkeld, verschoven, of bestaat niet in onze compositie.
        </p>

        {/* Decorative line */}
        <div
          style={{
            width: "60px",
            height: "2px",
            backgroundColor: "#c8905a",
            margin: "0 auto 48px auto",
          }}
        />

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255,251,224,0.15)",
              color: "rgba(255,251,224,0.6)",
              padding: isMobile ? "14px 24px" : "16px 32px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,251,224,0.3)";
              e.currentTarget.style.color = "#fffbe0";
              e.currentTarget.style.backgroundColor = "rgba(255,251,224,0.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,251,224,0.15)";
              e.currentTarget.style.color = "rgba(255,251,224,0.6)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ArrowLeft size={16} />
            Ga Terug
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              backgroundColor: "#c8905a",
              border: "none",
              color: "#060301",
              padding: isMobile ? "14px 24px" : "16px 32px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#fffbe0";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#c8905a";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Home size={16} />
            Naar Home
          </button>
        </div>

        {/* Extra links */}
        <div
          style={{
            marginTop: "48px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(255,251,224,0.05)",
          }}
        >
          <p
            style={{
              color: "rgba(255,251,224,0.25)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Of navigeer naar
          </p>
          <div
            style={{
              display: "flex",
              gap: "24px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Portfolio", path: "/portfolio" },
              { label: "Over Ons", path: "/about" },
              { label: "Client Portal", path: "/portal/login" },
            ].map((link) => (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.path);
                }}
                style={{
                  color: "rgba(255,251,224,0.3)",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c8905a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,251,224,0.3)")}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
