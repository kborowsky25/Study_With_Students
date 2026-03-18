import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useTheme } from "../context/ThemeContext";

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sws-vis");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function gridStyle(dark) {
  const rgb = dark ? "255,255,255" : "27,38,59";
  return {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    backgroundImage: `
      linear-gradient(rgba(${rgb},0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(${rgb},0.025) 1px, transparent 1px)
    `,
    backgroundSize: "60px 60px",
  };
}

const CORAL = "#ff725e";

function Wave({ flip, dark }) {
  const waveFill = dark ? "rgba(255,255,255,0.018)" : "rgba(27,38,59,0.04)";
  return (
    <div
      aria-hidden="true"
      style={{
        lineHeight: 0,
        overflow: "hidden",
        transform: flip ? "scaleY(-1)" : "none",
      }}
    >
      <svg
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "56px", display: "block" }}
      >
        <path
          d="M0,28 C360,56 1080,0 1440,28 L1440,56 L0,56 Z"
          fill={waveFill}
        />
        <path
          d="M0,28 C360,56 1080,0 1440,28"
          fill="none"
          stroke={`${CORAL}16`}
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function AgencyFeeBreakdown() {
  const { dark } = useTheme();
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.10)";
  const SURFACE = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const TEXT_DIM = dark ? "rgba(255,255,255,0.35)" : "rgba(27,38,59,0.38)";
  const TEXT_30 = dark ? "rgba(255,255,255,0.30)" : "rgba(27,38,59,0.32)";
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: "20px",
        padding: "24px",
        maxWidth: "320px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: TEXT_DIM,
          marginBottom: "16px",
        }}
      >
        Where your £30/hr goes
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "Tutor earns",
            pct: "50%",
            val: "£15",
            color: dark ? "rgba(255,255,255,0.45)" : "rgba(27,38,59,0.50)",
            bg: dark ? "rgba(255,255,255,0.02)" : "rgba(27,38,59,0.02)",
            border: BORDER,
          },
          {
            label: "Agency fee",
            pct: "50%",
            val: "£15",
            color: "#ef4444",
            bg: "rgba(239,68,68,0.08)",
            border: "rgba(239,68,68,0.20)",
          },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: r.bg,
              border: `1px solid ${r.border}`,
              borderRadius: "9px",
            }}
          >
            <div>
              <span
                style={{ fontSize: "13px", fontWeight: 700, color: r.color }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: TEXT_30,
                  marginLeft: "8px",
                }}
              >
                {r.pct}
              </span>
            </div>
            <span style={{ fontSize: "16px", fontWeight: 900, color: r.color }}>
              {r.val}
            </span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "16px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: CORAL,
            marginBottom: "8px",
          }}
        >
          On StudyWithStudents
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: `${CORAL}08`,
            border: `1px solid ${CORAL}25`,
            borderRadius: "9px",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: CORAL }}>
              Tutor earns
            </span>
            <span
              style={{
                fontSize: "11px",
                color: TEXT_30,
                marginLeft: "8px",
              }}
            >
              100%
            </span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: 900, color: CORAL }}>
            £30 ✓
          </span>
        </div>
      </div>
    </div>
  );
}

function FunTutoringMock() {
  const { dark } = useTheme();
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.10)";
  const SURFACE = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const SURFACE2 = dark ? "rgba(255,255,255,0.025)" : "rgba(27,38,59,0.03)";
  const TRACK_BG = dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.08)";
  const TEXT_XP  = dark ? "rgba(255,255,255,0.28)" : "rgba(27,38,59,0.30)";
  const TEXT_STAT = dark ? "white" : "#1b263b";
  const TEXT_L    = dark ? "rgba(255,255,255,0.30)" : "rgba(27,38,59,0.32)";
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: "20px",
        padding: "24px",
        maxWidth: "320px",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700 }}>Your XP</span>
          <span style={{ fontSize: "11px", color: CORAL, fontWeight: 800 }}>
            Level 3
          </span>
        </div>
        <div
          style={{
            height: "6px",
            background: TRACK_BG,
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "72%",
              background: `linear-gradient(to right, ${CORAL}, #ff9f8e)`,
              borderRadius: "20px",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "5px",
            fontSize: "10px",
            color: TEXT_XP,
          }}
        >
          <span>360 XP</span>
          <span>500 XP</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        {[
          { icon: "workspace_premium", label: "Rising Star", color: CORAL },
          { icon: "star", label: "Explorer", color: "#fbbf24" },
          { icon: "groups", label: "Community", color: "#60a5fa" },
        ].map((b) => (
          <div
            key={b.label}
            style={{
              flex: 1,
              textAlign: "center",
              background: `${b.color}10`,
              border: `1px solid ${b.color}25`,
              borderRadius: "10px",
              padding: "10px 4px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "18px",
                color: b.color,
                display: "block",
                marginBottom: "4px",
              }}
            >
              {b.icon}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: b.color }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          background: SURFACE2,
          border: `1px solid ${BORDER}`,
          borderRadius: "10px",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "14px", color: CORAL }}
          >
            dashboard
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700 }}>Dashboard</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
          }}
        >
          {[
            { n: "12", l: "sessions" },
            { n: "3", l: "tutors" },
            { n: "340", l: "XP", coral: true },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "16px",
                  color: s.coral ? CORAL : TEXT_STAT,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: "9px", color: TEXT_L }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const VALUES = [
  {
    icon: "percent",
    title: "0% commission",
    desc: "Tutors keep every penny they earn",
  },
  {
    icon: "verified",
    title: "UK universities only",
    desc: "Every tutor verified via .ac.uk email",
  },
  {
    icon: "volunteer_activism",
    title: "Supporting UNICEF",
    desc: "Explorer revenue funds global education",
  },
  {
    icon: "lock_open",
    title: "Core tutoring is free",
    desc: "Finding & booking tutors costs nothing",
  },
  {
    icon: "groups",
    title: "Community-first",
    desc: "Study rooms, forums, & peer learning",
  },
  {
    icon: "emoji_events",
    title: "XP & reputation",
    desc: "Earn recognition for every contribution",
  },
];

const FOUNDING_TUTORS = [
  {
    initials: "KB",
    name: "Kiki B.",
    uni: "UCL",
    color: CORAL,
    role: "Founder",
  },
  {
    initials: "AL",
    name: "Amara L.",
    uni: "King's",
    color: "#60a5fa",
    role: null,
  },
  {
    initials: "TM",
    name: "Tom M.",
    uni: "Edinburgh",
    color: "#34d399",
    role: null,
  },
  {
    initials: "SP",
    name: "Shreya P.",
    uni: "Imperial",
    color: "#a78bfa",
    role: null,
  },
];

export default function AboutUs() {
  useReveal();
  const { dark } = useTheme();
  const BG      = dark ? "#1b263b" : "#f4f6fb";
  const SURFACE = dark ? "rgba(255,255,255,0.02)" : "#ffffff";
  const SURFACE2= dark ? "rgba(255,255,255,0.03)" : "rgba(27,38,59,0.03)";
  const TEXT     = dark ? "white"   : "#1b263b";
  const TEXT_MUT = dark ? "rgba(255,255,255,0.50)" : "rgba(27,38,59,0.52)";
  const TEXT_DIM = dark ? "rgba(255,255,255,0.42)" : "rgba(27,38,59,0.42)";
  const TEXT_DIM2= dark ? "rgba(255,255,255,0.38)" : "rgba(27,38,59,0.38)";
  const TEXT_DIM3= dark ? "rgba(255,255,255,0.35)" : "rgba(27,38,59,0.38)";
  const TEXT_45  = dark ? "rgba(255,255,255,0.45)" : "rgba(27,38,59,0.48)";
  const BORDER   = dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.10)";
  const GRID_STYLE = gridStyle(dark);

  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: TEXT,
        fontFamily: "inherit",
      }}
    >
      <style>{`
        [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1)}
        [data-reveal].sws-vis{opacity:1;transform:translateY(0)}
        [data-reveal][data-d="1"]{transition-delay:.10s}[data-reveal][data-d="2"]{transition-delay:.20s}
        [data-reveal][data-d="3"]{transition-delay:.30s}[data-reveal][data-d="4"]{transition-delay:.40s}
      `}</style>
      <Navbar />

      {/* ── HERO — diagonal split ─────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "420px",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <style>{`
          @keyframes diagLineGrow {
            from { stroke-dashoffset: 1600; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>
        <div aria-hidden style={GRID_STYLE} />
        {/* Diagonal divider line */}
        <svg
          aria-hidden
          viewBox="0 0 1440 420"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <line
            x1="0"
            y1="380"
            x2="1440"
            y2="60"
            stroke={`${CORAL}20`}
            strokeWidth="1"
            strokeDasharray="1600"
            strokeDashoffset="1600"
            style={{ animation: "diagLineGrow 1.4s ease 0.3s forwards" }}
          />
        </svg>
        {/* Ambient glows */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "50vw",
            height: "80%",
            background: `radial-gradient(ellipse, ${CORAL}07 0%, transparent 65%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "-5%",
            width: "50vw",
            height: "80%",
            background: `radial-gradient(ellipse, rgba(96,165,250,0.06) 0%, transparent 65%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Top-left: first statement */}
        <div
          style={{ position: "relative", zIndex: 2, padding: "80px 8% 0 8%" }}
        >
          <p
            data-reveal
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: CORAL,
              marginBottom: "20px",
            }}
          >
            Our story
          </p>
          <h1
            data-reveal
            data-d="1"
            style={{
              fontSize: "clamp(32px, 5vw, 62px)",
              fontWeight: 900,
              margin: 0,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: "640px",
              color: TEXT,
            }}
          >
            We think tutors deserve more...
          </h1>
        </div>

        {/* Bottom-right: second statement */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "32px 8% 80px 8%",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ textAlign: "right", maxWidth: "560px" }}>
            <h2
              data-reveal
              data-d="2"
              style={{
                fontSize: "clamp(22px, 3.8vw, 46px)",
                fontWeight: 800,
                margin: "0 0 18px",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                color: CORAL,
                opacity: 0.85,
              }}
            >
              And that students deserve more!
            </h2>
            <p
              data-reveal
              data-d="3"
              style={{
                fontSize: "15px",
                color: TEXT_DIM,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Built by a student tired of watching agencies take 50% — when the
              best tutors were already in the next lecture hall.
            </p>
          </div>
        </div>
      </section>

      {/* ── TWO STORIES — side-by-side problem + vision ───────────────────── */}
      <section
        style={{
          padding: "96px 24px",
          position: "relative",
          overflow: "hidden",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div
          aria-hidden
          style={{
            ...GRID_STYLE,
            WebkitMaskImage:
              "radial-gradient(ellipse 100% 100% at 50% 50%, black 0%, transparent 70%)",
            maskImage:
              "radial-gradient(ellipse 100% 100% at 50% 50%, black 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Story 1 — The problem */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "72px",
              alignItems: "center",
              marginBottom: "96px",
            }}
          >
            <div>
              <p
                data-reveal
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: CORAL,
                  marginBottom: "14px",
                }}
              >
                The problem
              </p>
              <h2
                data-reveal
                data-d="1"
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 900,
                  margin: "0 0 20px",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              >
                Agencies take 50%.
                <br />
                Tutors get screwed.
              </h2>
              <p
                data-reveal
                data-d="2"
                style={{
                  color: TEXT_MUT,
                  fontSize: "15px",
                  lineHeight: 1.75,
                  margin: "0 0 20px",
                }}
              >
                A £30/hr session at an agency pays the tutor £15. The student
                pays double what the tutor earns. Nobody wins but the platform.
              </p>
              <p
                data-reveal
                data-d="3"
                style={{
                  color: TEXT_MUT,
                  fontSize: "15px",
                  lineHeight: 1.75,
                  margin: "0 0 22px",
                }}
              >
                We cut that out entirely. Students pay 100% to their tutor. We
                take nothing.
              </p>
              <div
                data-reveal
                data-d="3"
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                {["0% commission", "Direct payment", "Tutor sets the rate"].map(
                  (pill) => (
                    <span
                      key={pill}
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        background: `${CORAL}12`,
                        color: CORAL,
                        border: `1px solid ${CORAL}28`,
                        padding: "4px 12px",
                        borderRadius: "20px",
                      }}
                    >
                      {pill}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div
              data-reveal
              data-d="2"
              data-from="right"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <AgencyFeeBreakdown />
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: `linear-gradient(to right, transparent, ${BORDER}, transparent)`,
              marginBottom: "96px",
            }}
          />

          {/* Story 2 — The vision */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "72px",
              alignItems: "center",
            }}
          >
            <div
              data-reveal
              data-d="1"
              data-from="left"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <FunTutoringMock />
            </div>
            <div>
              <p
                data-reveal
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: CORAL,
                  marginBottom: "14px",
                }}
              >
                The vision
              </p>
              <h2
                data-reveal
                data-d="1"
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 900,
                  margin: "0 0 20px",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              >
                Learning should feel like levelling up.
              </h2>
              <p
                data-reveal
                data-d="2"
                style={{
                  color: TEXT_MUT,
                  fontSize: "15px",
                  lineHeight: 1.75,
                  margin: "0 0 20px",
                }}
              >
                An XP system where students level up, tutors earn badges, and
                everyone can see their progress. Not just a booking tool.
              </p>
              <div
                data-reveal
                data-d="2"
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                {[
                  "XP & levels",
                  "Tutor badges",
                  "Live study rooms",
                  "Community forum",
                ].map((pill) => (
                  <span
                    key={pill}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      background: `${CORAL}12`,
                      color: CORAL,
                      border: `1px solid ${CORAL}28`,
                      padding: "4px 12px",
                      borderRadius: "20px",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE SOLUTION ──────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "96px 24px",
          position: "relative",
          overflow: "hidden",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div
          aria-hidden
          style={{
            ...GRID_STYLE,
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        />
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            data-reveal
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: CORAL,
              marginBottom: "14px",
            }}
          >
            The solution
          </p>
          <h2
            data-reveal
            data-d="1"
            style={{
              fontSize: "clamp(26px, 4vw, 42px)",
              fontWeight: 900,
              textAlign: "center",
              margin: "0 0 16px",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            Tutoring stays between
            <br />
            student and tutor.
          </h2>
          <p
            data-reveal
            data-d="2"
            style={{
              textAlign: "center",
              color: TEXT_MUT,
              fontSize: "16px",
              margin: "0 auto 56px",
              lineHeight: 1.7,
              maxWidth: "520px",
            }}
          >
            We take just £2/month from students who want community features.
            Half funds the platform — half goes to UNICEF. That's it.
          </p>

          {/* Money flow — two clearly separate flows */}
          <div data-reveal data-d="2" style={{ marginBottom: "56px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Flow 1: Tutoring payment */}
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                When a student books a session:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center" }}>
                <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "20px 18px", textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: dark ? "rgba(255,255,255,0.65)" : "rgba(27,38,59,0.55)" }}>person</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "3px" }}>Student</div>
                  <div style={{ fontSize: "11px", color: TEXT_DIM2 }}>Pays tutor's rate</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: `${CORAL}70` }}>arrow_forward</span>
                  <div style={{ fontSize: "10px", color: CORAL, fontWeight: 700, marginTop: "4px" }}>100%</div>
                </div>
                <div style={{ background: `${CORAL}08`, border: `1px solid ${CORAL}25`, borderRadius: "14px", padding: "20px 18px", textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${CORAL}15`, border: `1px solid ${CORAL}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: CORAL }}>school</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "3px", color: CORAL }}>Tutor</div>
                  <div style={{ fontSize: "11px", color: TEXT_DIM2 }}>Receives every penny</div>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: BORDER }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: dark ? "rgba(255,255,255,0.22)" : "rgba(27,38,59,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>separately</span>
              <div style={{ flex: 1, height: "1px", background: BORDER }} />
            </div>

            {/* Flow 2: Explorer Plan subscription */}
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: TEXT_DIM3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                If a student subscribes to Explorer Plan:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center" }}>
                <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: "14px", padding: "20px 18px", textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: dark ? "rgba(255,255,255,0.08)" : "rgba(27,38,59,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: dark ? "rgba(255,255,255,0.65)" : "rgba(27,38,59,0.55)" }}>person</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "13px", marginBottom: "3px" }}>Student</div>
                  <div style={{ fontSize: "11px", color: TEXT_DIM2 }}>Optional subscription</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: dark ? "rgba(255,255,255,0.30)" : "rgba(27,38,59,0.32)" }}>arrow_forward</span>
                  <div style={{ fontSize: "10px", color: TEXT_MUT, fontWeight: 700, marginTop: "4px" }}>£2/mo</div>
                </div>
                <div style={{ background: "rgba(1,102,172,0.06)", border: "1px solid rgba(1,152,218,0.18)", borderRadius: "14px", padding: "16px 14px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: TEXT_DIM3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", textAlign: "center" }}>Explorer Plan split</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: dark ? "rgba(255,255,255,0.04)" : "rgba(27,38,59,0.04)", borderRadius: "7px", border: `1px solid ${BORDER}` }}>
                      <span style={{ fontSize: "12px", fontWeight: 700 }}>Platform</span>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: dark ? "rgba(255,255,255,0.60)" : "rgba(27,38,59,0.58)" }}>£1</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "rgba(1,102,172,0.10)", borderRadius: "7px", border: "1px solid rgba(1,152,218,0.25)" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700 }}>🌍 UNICEF</span>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: "rgba(1,200,255,0.85)" }}>£1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Three pillars */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
            }}
          >
            {[
              {
                icon: "percent",
                color: CORAL,
                title: "0% commission",
                desc: "Tutoring is always direct — students pay tutors, platform takes nothing from sessions.",
              },
              {
                icon: "verified",
                color: "#60a5fa",
                title: "UK universities only",
                desc: "Every tutor verified via .ac.uk email. You always see where a tutor studies.",
              },
              {
                icon: "volunteer_activism",
                color: "rgba(1,200,255,0.90)",
                title: "UNICEF funded",
                desc: "£1 from every Explorer subscription goes directly to global education programmes.",
              },
            ].map((p, i) => (
              <div
                key={p.title}
                data-reveal
                data-d={String(i + 1)}
                style={{
                  padding: "24px 22px",
                  background: `${p.color}06`,
                  border: `1px solid ${p.color}20`,
                  borderRadius: "14px",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${p.color}40`;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${p.color}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${p.color}20`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "22px",
                    color: p.color,
                    display: "block",
                    marginBottom: "12px",
                  }}
                >
                  {p.icon}
                </span>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    margin: "0 0 7px",
                    color: TEXT,
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: TEXT_45,
                    margin: 0,
                    lineHeight: 1.65,
                  }}
                >
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UNICEF ────────────────────────────────────────────────────────── */}
      <section
        style={{ padding: "0 24px 80px", borderTop: `1px solid ${BORDER}` }}
      >
        <div
          style={{ maxWidth: "820px", margin: "0 auto", paddingTop: "80px" }}
        >
          <p
            data-reveal
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(1,200,255,0.85)",
              marginBottom: "14px",
              textAlign: "center",
            }}
          >
            Charity partner
          </p>
          <h2
            data-reveal
            data-d="1"
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 900,
              margin: "0 0 18px",
              letterSpacing: "-0.025em",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Half our revenue goes to
            <br />
            <span style={{ color: "rgba(1,200,255,0.90)" }}>UNICEF</span>.
          </h2>
          <p
            data-reveal
            data-d="2"
            style={{
              textAlign: "center",
              color: TEXT_MUT,
              fontSize: "15px",
              margin: "0 auto 44px",
              lineHeight: 1.7,
              maxWidth: "480px",
            }}
          >
            £1 of every Explorer subscription funds UNICEF's global education
            programmes. Over 190 countries. Education for every child — not just
            the privileged.
          </p>

          <div
            data-reveal
            data-d="2"
            style={{
              background: "rgba(1,102,172,0.08)",
              border: "1.5px solid rgba(1,152,218,0.22)",
              borderRadius: "20px",
              padding: "36px 40px",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "40px",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "14px",
                    background: "rgba(1,102,172,0.20)",
                    border: "1px solid rgba(1,152,218,0.30)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    flexShrink: 0,
                  }}
                >
                  🌍
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      marginBottom: "2px",
                    }}
                  >
                    UNICEF Education Programme
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "rgba(1,200,255,0.75)",
                      fontWeight: 700,
                    }}
                  >
                    Charity partner
                  </div>
                </div>
              </div>
              <p
                style={{
                  color: TEXT_MUT,
                  fontSize: "13px",
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                UNICEF works in over 190 countries to give every child access to
                quality education. Learning tools, teacher training, safe school
                environments — all funded by governments, businesses, and people
                like you.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                flexShrink: 0,
                minWidth: "110px",
              }}
            >
              {[
                { n: "190+", l: "Countries", c: "rgba(1,200,255,0.85)" },
                { n: "1B+", l: "Children", c: "rgba(1,200,255,0.85)" },
                { n: "£1", l: "Per subscriber / mo", c: CORAL },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    textAlign: "center",
                    padding: "14px",
                    background: "rgba(1,102,172,0.12)",
                    borderRadius: "12px",
                    border: "1px solid rgba(1,152,218,0.18)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: s.c,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: TEXT_DIM2,
                      marginTop: "4px",
                      lineHeight: 1.3,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MEET THE FOUNDER ──────────────────────────────────────────────── */}
      <section
        style={{ padding: "0 24px 96px", borderTop: `1px solid ${BORDER}` }}
      >
        <div
          style={{ maxWidth: "820px", margin: "0 auto", paddingTop: "80px" }}
        >
          <p
            data-reveal
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: CORAL,
              marginBottom: "14px",
              textAlign: "center",
            }}
          >
            The person behind it
          </p>
          <h2
            data-reveal
            data-d="1"
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 900,
              margin: "0 0 48px",
              letterSpacing: "-0.025em",
              textAlign: "center",
            }}
          >
            Meet the founder
          </h2>

          <div
            data-reveal
            data-d="2"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "48px",
              alignItems: "start",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: "24px",
              padding: "44px",
            }}
          >
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${CORAL}40, ${CORAL}18)`,
                  border: `2.5px solid ${CORAL}45`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: 900,
                  color: CORAL,
                  letterSpacing: "-0.02em",
                  boxShadow: `0 0 40px ${CORAL}18`,
                }}
              >
                KB
              </div>
              <div style={{ marginTop: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 800 }}>
                  Kiki Boro
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: CORAL,
                    fontWeight: 700,
                    marginTop: "3px",
                  }}
                >
                  Founder & CEO
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: TEXT_DIM3,
                    marginTop: "2px",
                  }}
                >
                  UCL · 2024
                </div>
              </div>
            </div>

            {/* Quote + detail */}
            <div>
              <blockquote
                style={{
                  margin: "0 0 20px",
                  padding: "0 0 0 20px",
                  borderLeft: `3px solid ${CORAL}40`,
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    color: dark ? "rgba(255,255,255,0.80)" : "rgba(27,38,59,0.80)",
                    lineHeight: 1.75,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  "I built Study With Students because I wanted a place where
                  students could genuinely help each other — without agencies
                  taking a cut. University students are brilliant teachers. They
                  deserve to be paid properly, and learners deserve fair
                  prices."
                </p>
              </blockquote>
              <p
                style={{
                  fontSize: "14px",
                  color: TEXT_MUT,
                  lineHeight: 1.75,
                  margin: "0 0 24px",
                }}
              >
                I was a student at UCL watching tutoring agencies charge
                families £50/hr while paying tutors £20. The tutor did the work.
                The agency did nothing but take the call. That felt wrong — so I
                built the alternative.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  "UCL student",
                  "Built in 2024",
                  "Zero VC funding",
                  "Student-first",
                ].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      background: `${CORAL}10`,
                      color: CORAL,
                      border: `1px solid ${CORAL}28`,
                      padding: "4px 12px",
                      borderRadius: "20px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 96px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            ...GRID_STYLE,
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          }}
        />
        <div
          data-reveal
          style={{
            maxWidth: "820px",
            margin: "0 auto",
            padding: "52px",
            background: `${CORAL}07`,
            border: `1px solid ${CORAL}18`,
            borderRadius: "20px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h3
            style={{
              fontSize: "24px",
              fontWeight: 800,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            Join us
          </h3>
          <p
            style={{
              color: TEXT_45,
              fontSize: "14px",
              margin: "0 0 28px",
            }}
          >
            Whether you're here to learn or to teach.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/signup"
              style={{
                background: CORAL,
                color: "white",
                padding: "12px 26px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: `0 4px 16px ${CORAL}30`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Create your account
            </Link>
            <Link
              to="/become-tutor"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(27,38,59,0.05)",
                border: `1px solid ${BORDER}`,
                color: dark ? "rgba(255,255,255,0.70)" : "rgba(27,38,59,0.70)",
                padding: "12px 26px",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.09)" : "rgba(27,38,59,0.09)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(27,38,59,0.05)")
              }
            >
              Become a tutor
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
