import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../context/LanguageContext";
import { Home, ArrowLeft, Camera } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tn = t.notFound;

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
      <Helmet>
        <title>{`${tn.title} | PhotoDeCaffeine`}</title>
        <meta name="robots" content="noindex" />
        <meta name="theme-color" content="#060301" />
      </Helmet>
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
          className="pdc-404-icon"
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              borderRadius: "50%",
              backgroundColor: "rgba(200,144,90,0.08)",
              border: "1px solid rgba(200,144,90,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pdc-icon-pulse 2s ease-in-out infinite",
            }}
          >
            <Camera size={48} color="#c8905a" strokeWidth={1.5} />
          </div>
        </div>

        {/* 404 Number */}
        <div
          aria-hidden="true"
          className="pdc-404-number"
          style={{
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
          className="pdc-404-title"
          style={{
            color: "#fffbe0",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 16px 0",
            lineHeight: 1.2,
          }}
        >
          {tn.title}
        </h1>

        {/* Subtitle */}
        <p
          className="pdc-404-text"
          style={{
            color: "rgba(255,251,224,0.55)",
            fontWeight: 300,
            lineHeight: 1.7,
            margin: "0 0 48px 0",
            maxWidth: "450px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {tn.body}
        </p>

        {/* Decorative line */}
        <div
          aria-hidden="true"
          style={{
            width: "60px",
            height: "2px",
            backgroundColor: "#c8905a",
            margin: "0 auto 48px auto",
          }}
        />

        {/* Buttons */}
        <div
          className="pdc-404-actions"
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="pdc-404-btn pdc-404-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {tn.back}
          </button>

          <Link to="/" className="pdc-404-btn pdc-404-home">
            <Home size={16} aria-hidden="true" />
            {tn.home}
          </Link>
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
              color: "rgba(255,251,224,0.55)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            {tn.orVisit}
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
              { label: tn.portfolio, path: "/portfolio" },
              { label: tn.about, path: "/about" },
              { label: tn.clientPortal, path: "/portal/login" },
            ].map((link) => (
              <Link key={link.path} to={link.path} className="pdc-404-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
