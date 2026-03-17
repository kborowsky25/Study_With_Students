import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const BG = "#1b263b";
const CORAL = "#ff725e";
const BORDER = "rgba(255,255,255,0.08)";

// ── Scroll-reveal + parallax ──────────────────────────────────────────────────
function useScrollEffects() {
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

    const onScroll = () => {
      document.documentElement.style.setProperty("--sy", `${window.scrollY}px`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

// ── Grid background ───────────────────────────────────────────────────────────
function Grid({ mask, parallax, opacity = 0.028 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `
        linear-gradient(rgba(255,255,255,${opacity}) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,${opacity}) 1px, transparent 1px)
      `,
        backgroundSize: "56px 56px",
        backgroundPosition: parallax ? `0 calc(var(--sy, 0px) * -0.25)` : "0 0",
        WebkitMaskImage: mask || "none",
        maskImage: mask || "none",
      }}
    />
  );
}

// ── Hero canvas: animated dot + line traces ───────────────────────────────────
function HeroCanvas({ pillRef, onGlow }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const GRID = 56;
    const SPEED = 1.8;
    let traces = [];
    let dot = null;
    let rafId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    class Trace {
      constructor() {
        const isH = Math.random() > 0.5;
        this.sx = Math.round((Math.random() * canvas.width) / GRID) * GRID;
        this.sy = Math.round((Math.random() * canvas.height) / GRID) * GRID;
        this.x = this.sx;
        this.y = this.sy;
        this.maxLen = (2 + Math.random() * 4) * GRID;
        this.speed = 0.6 + Math.random() * 0.8;
        this.dx = isH ? (Math.random() > 0.5 ? 1 : -1) : 0;
        this.dy = isH ? 0 : Math.random() > 0.5 ? 1 : -1;
        this.len = 0;
        this.opacity = 0;
        this.fading = false;
        this.dead = false;
      }
      update() {
        if (!this.fading) {
          this.len += this.speed;
          this.x = this.sx + this.dx * this.len;
          this.y = this.sy + this.dy * this.len;
          this.opacity = Math.min(1, this.len / (GRID * 0.5)) * 0.3;
          if (this.len >= this.maxLen) this.fading = true;
        } else {
          this.opacity -= 0.008;
          if (this.opacity <= 0) this.dead = true;
        }
      }
      draw() {
        ctx.strokeStyle = `rgba(255,255,255,${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.sx, this.sy);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
    }

    // Navbar height — the dot runs along the bottom edge of the navbar
    const NAVBAR_Y = 64;
    let spawnFromLeft = true;

    class Dot {
      constructor(fromLeft) {
        this.trail = [];
        this.alive = true;
        this.fromLeft = fromLeft;
        this.x = fromLeft ? 0 : canvas.width;
        this.y = NAVBAR_Y;
      }
      getPillX() {
        if (!pillRef.current) return canvas.width / 2;
        const cr = canvas.getBoundingClientRect();
        const pr = pillRef.current.getBoundingClientRect();
        return pr.left - cr.left + pr.width / 2;
      }
      update() {
        if (!this.alive) return;
        const pillX = this.getPillX();

        if (this.fromLeft) {
          this.x += SPEED;
          if (this.x >= pillX) {
            this.alive = false;
            onGlow?.();
            setTimeout(() => { spawnFromLeft = !spawnFromLeft; dot = new Dot(spawnFromLeft); }, 1400);
            return;
          }
        } else {
          this.x -= SPEED;
          if (this.x <= pillX) {
            this.alive = false;
            onGlow?.();
            setTimeout(() => { spawnFromLeft = !spawnFromLeft; dot = new Dot(spawnFromLeft); }, 1400);
            return;
          }
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 28) this.trail.shift();
      }
      draw() {
        if (!this.alive && this.trail.length === 0) return;
        for (let i = 0; i < this.trail.length; i++) {
          const t = this.trail[i];
          const alpha = (i / this.trail.length) * 0.45;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,114,94,${alpha})`;
          ctx.fill();
        }
        if (this.alive) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = CORAL;
          ctx.shadowBlur = 10;
          ctx.shadowColor = CORAL;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    dot = new Dot(spawnFromLeft);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.04) traces.push(new Trace());
      traces.forEach((t) => {
        t.update();
        t.draw();
      });
      traces = traces.filter((t) => !t.dead);
      dot.update();
      dot.draw();
      rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [pillRef, onGlow]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
  );
}

// ── Mini product previews ─────────────────────────────────────────────────────
function PreviewTutor() {
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`,
          borderRadius: "10px",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: `${CORAL}22`, display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "800", fontSize: "11px",
            color: CORAL, flexShrink: 0,
          }}
        >
          AV
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "700", fontSize: "12px" }}>Alex V.</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", marginTop: "1px" }}>
            Oxford · Maths · £18/hr
          </div>
          <div style={{ display: "flex", gap: "2px", marginTop: "3px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} width="8" height="8" viewBox="0 0 10 10">
                <polygon points="5,1 6.2,3.8 9,4.2 7,6.2 7.6,9 5,7.5 2.4,9 3,6.2 1,4.2 3.8,3.8" fill={CORAL} />
              </svg>
            ))}
          </div>
        </div>
        <div style={{ background: CORAL, color: "white", fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "6px" }}>
          Book
        </div>
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}`,
          borderRadius: "10px", padding: "10px 12px", marginTop: "5px",
          display: "flex", alignItems: "center", gap: "10px", opacity: 0.5,
        }}
      >
        <div
          style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: "rgba(255,114,94,0.12)", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "800", fontSize: "11px",
            color: "rgba(255,255,255,0.5)", flexShrink: 0,
          }}
        >
          SK
        </div>
        <div>
          <div style={{ fontWeight: "700", fontSize: "12px" }}>Sara K.</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)" }}>Imperial · Physics · £22/hr</div>
        </div>
      </div>
    </div>
  );
}

function PreviewUCAS() {
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "5px" }}>
      {[
        { label: "Personal Statement", status: "Draft", color: CORAL },
        { label: "UCAS Form Walkthrough", status: "Scheduled", color: "rgba(255,255,255,0.60)" },
        { label: "University Shortlist", status: "Done", color: "rgba(255,255,255,0.45)" },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`,
            borderRadius: "9px", padding: "8px 11px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "600" }}>{item.label}</div>
          <span style={{ fontSize: "9px", fontWeight: "800", background: "rgba(255,255,255,0.07)", color: item.color, padding: "2px 7px", borderRadius: "5px" }}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreviewRooms() {
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "5px" }}>
      {[
        { sub: "A-Level Maths", tutor: "Alex V.", count: 7, live: true },
        { sub: "Organic Chem", tutor: "Sara K.", count: 12, live: true },
        { sub: "Linear Algebra", tutor: "Tom R.", count: 4, live: false },
      ].map((r) => (
        <div
          key={r.sub}
          style={{
            background: r.live ? `${CORAL}06` : "rgba(255,255,255,0.025)",
            border: `1px solid ${r.live ? CORAL + "20" : BORDER}`,
            borderRadius: "9px", padding: "8px 11px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700" }}>{r.sub}</div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.38)", marginTop: "1px" }}>
              {r.tutor} · {r.count} students
            </div>
          </div>
          {r.live ? (
            <span style={{ fontSize: "9px", fontWeight: "800", background: "rgba(239,68,68,0.20)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px" }}>LIVE</span>
          ) : (
            <span style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.35)" }}>Soon</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewForum() {
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "5px" }}>
      {[
        { q: "Best way to tackle integration by parts?", replies: 14, hot: true },
        { q: "Anyone struggling with statistics?", replies: 7, hot: false },
      ].map((t) => (
        <div
          key={t.q}
          style={{
            background: t.hot ? `${CORAL}06` : "rgba(255,255,255,0.025)",
            border: `1px solid ${t.hot ? CORAL + "20" : BORDER}`,
            borderRadius: "9px", padding: "9px 11px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "600", lineHeight: 1.4 }}>{t.q}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
            {t.hot && (
              <span style={{ fontSize: "9px", background: `${CORAL}20`, color: CORAL, padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>🔥 Hot</span>
            )}
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{t.replies} replies</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewCalendar() {
  const today = new Date().getDate();
  const booked = [today, today + 2, today + 5].filter((d) => d <= 31);
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "8px" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "8px", color: "rgba(255,255,255,0.28)", paddingBottom: "2px" }}>{d}</div>
        ))}
        {Array.from({ length: 21 }, (_, i) => {
          const d = i + (today - 6);
          const isToday = d === today;
          const isBooked = booked.includes(d);
          return (
            <div
              key={i}
              style={{
                textAlign: "center", fontSize: "9px", padding: "3px 2px", borderRadius: "4px",
                background: isToday ? CORAL : isBooked ? `${CORAL}20` : "transparent",
                color: isToday ? "white" : isBooked ? CORAL : "rgba(255,255,255,0.40)",
                fontWeight: isToday || isBooked ? "700" : "400",
              }}
            >
              {d > 0 && d <= 31 ? d : ""}
            </div>
          );
        })}
      </div>
      <div style={{ background: `${CORAL}10`, borderRadius: "7px", padding: "7px 9px", display: "flex", alignItems: "center", gap: "7px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "12px", color: CORAL }}>event</span>
        <div>
          <div style={{ fontSize: "10px", fontWeight: "700" }}>Maths with Alex</div>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.40)" }}>Today · 4:00 PM</div>
        </div>
      </div>
    </div>
  );
}

function PreviewMessages() {
  const msgs = [
    { from: "them", text: "Hi! I need help with calculus 📚" },
    { from: "me", text: "Of course! What topics?" },
    { from: "them", text: "Integration by parts mainly" },
  ];
  return (
    <div style={{ marginTop: "16px", borderTop: `1px solid ${BORDER}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
          <div
            style={{
              background: m.from === "me" ? CORAL : "rgba(255,255,255,0.07)",
              color: m.from === "me" ? "white" : "rgba(255,255,255,0.78)",
              padding: "6px 10px", borderRadius: 8, fontSize: 11, maxWidth: "80%", lineHeight: 1.4,
            }}
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Feature card with hover-reveal ────────────────────────────────────────────
function FeatureCard({ icon, title, desc, preview, delay, badge, from }) {
  const isExplorer = badge === "EXPLORER";
  const borderColor = isExplorer ? `${CORAL}45` : "rgba(255,255,255,0.22)";
  const hoverBorder = isExplorer ? `${CORAL}70` : "rgba(255,255,255,0.42)";

  return (
    <div
      data-reveal
      data-d={delay}
      data-from={from}
      className="flip-card"
      style={{ perspective: "1000px", minHeight: "190px", cursor: "pointer" }}
    >
      <style>{`
        .flip-card:hover .flip-inner { transform: rotateY(180deg); }
        .flip-inner {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
        }
        .flip-front, .flip-back {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 14px;
          overflow: hidden;
        }
        .flip-back { transform: rotateY(180deg); }
      `}</style>
      <div className="flip-inner" style={{ height: "190px" }}>
        {/* Front */}
        <div className="flip-front" style={{
          background: isExplorer ? `linear-gradient(135deg, ${CORAL}08, ${CORAL}03)` : "rgba(255,255,255,0.03)",
          border: `1px solid ${borderColor}`,
          padding: "18px",
          display: "flex", flexDirection: "column",
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = hoverBorder}
          onMouseLeave={e => e.currentTarget.style.borderColor = borderColor}
        >
          {badge && (
            <div style={{
              alignSelf: "flex-start", marginBottom: "14px",
              background: isExplorer ? `${CORAL}22` : "rgba(255,255,255,0.08)",
              color: isExplorer ? CORAL : "rgba(255,255,255,0.55)",
              fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.06em",
            }}>
              {badge}
            </div>
          )}
          <span className="material-symbols-outlined" style={{ fontSize: "24px", color: CORAL, marginBottom: "12px" }}>{icon}</span>
          <h3 style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 8px", letterSpacing: "-0.01em" }}>{title}</h3>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.48)", margin: "0 0 auto", lineHeight: 1.6 }}>{desc}</p>
          <p style={{ fontSize: "10px", color: `${CORAL}65`, marginTop: "12px", fontWeight: 600 }}>Hover to preview →</p>
        </div>
        {/* Back — full preview */}
        <div className="flip-back" style={{
          background: isExplorer ? `linear-gradient(135deg, ${CORAL}12, ${CORAL}05)` : "rgba(255,255,255,0.05)",
          border: `1px solid ${isExplorer ? CORAL + "50" : "rgba(255,255,255,0.28)"}`,
          padding: "18px",
          overflow: "auto",
        }}>
          {preview || (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "28px", color: CORAL }}>{icon}</span>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>{title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pricing feature row ───────────────────────────────────────────────────────
function PricingFeatureRow({ icon, label, desc }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "12px", padding: "9px 13px",
        borderRadius: "9px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "15px", color: CORAL, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: "700" }}>{label}</div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Pricing section ───────────────────────────────────────────────────────────
const FREE_FEATURES = [
  { icon: "school", label: "1-to-1 Tutoring", desc: "Book & message verified tutors" },
  { icon: "menu_book", label: "UCAS Guidance", desc: "Personal statement & application help" },
  { icon: "calendar_month", label: "Session Calendar", desc: "Track all upcoming sessions" },
  { icon: "chat", label: "Direct Messages", desc: "Chat with any tutor before booking" },
];

const PRO_FEATURES = [
  { icon: "groups", label: "Live Study Rooms", desc: "Drop into open peer study sessions" },
  { icon: "forum", label: "Community Forum", desc: "Ask questions, get help from peers" },
  { icon: "cast_for_education", label: "Live Classrooms", desc: "Group lessons at a fraction of 1-to-1" },
  { icon: "description", label: "Study Notes", desc: "Share & discover student notes" },
];

function StripeBadge() {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
        borderRadius: "8px", padding: "5px 10px",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 30 30" fill="none">
        <rect width="30" height="30" rx="6" fill="rgba(255,255,255,0.15)" />
        <path d="M14.3 12.5c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.4V8.4C19.6 7.5 17.8 7 16 7c-4 0-6.6 2-6.6 5.3 0 5.2 7.2 4.4 7.2 6.6 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.7-1.7v4.5c1.9.8 3.9 1.2 5.7 1.2 4.1 0 6.9-2 6.9-5.4-.1-5.6-7.2-4.6-7.2-6.2z" fill="white" />
      </svg>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.01em" }}>Stripe</span>
    </div>
  );
}

function UnicefBadge() {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "rgba(1,102,172,0.12)", border: "1px solid rgba(1,102,172,0.30)",
        borderRadius: "8px", padding: "5px 10px",
      }}
    >
      <span style={{ fontSize: "13px" }}>🌍</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(1,152,218,0.90)", letterSpacing: "-0.01em" }}>UNICEF</span>
    </div>
  );
}

function PricingSection() {
  return (
    <section style={{ padding: "100px 24px", borderTop: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes upgradePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 ${CORAL}40; }
          50% { transform: scale(1.12); box-shadow: 0 0 0 8px ${CORAL}00; }
        }
      `}</style>
      <Grid mask="radial-gradient(ellipse 80% 80% at 50% 100%, black 0%, transparent 70%)" opacity={0.022} />
      <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <p data-reveal style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: CORAL, marginBottom: "14px" }}>
          Pricing
        </p>
        <h2 data-reveal data-d="1" style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: "800", textAlign: "center", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          Everything free. Explorer Plan for £2/mo.
        </h2>
        <p data-reveal data-d="2" style={{ textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: "15px", margin: "0 auto 16px", lineHeight: 1.6, maxWidth: "480px" }}>
          Tutoring, UCAS guidance, and booking are always free. The community extras are £2/month.
        </p>

        <div data-reveal data-d="2" style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "52px", flexWrap: "wrap" }}>
          <StripeBadge />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "5px 10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px", color: CORAL }}>lock</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Bank-level encryption</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "5px 10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px", color: CORAL }}>percent</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>0% to platform</span>
          </div>
        </div>

        {/* 1fr auto 1fr grid with upgrade arrow */}
        <div data-reveal data-d="3" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0", alignItems: "center" }}>
          {/* Free card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: "18px", padding: "28px", marginRight: "16px" }}>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Free</div>
              <div style={{ fontSize: "34px", fontWeight: "900", letterSpacing: "-0.04em", marginBottom: "3px" }}>£0</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>No card required — ever</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "20px" }}>
              {FREE_FEATURES.map((f) => <PricingFeatureRow key={f.label} {...f} />)}
            </div>
            <Link
              to="/signup"
              style={{ display: "block", textAlign: "center", padding: "11px", borderRadius: "10px", background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: "13px", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              Get started free
            </Link>
          </div>

          {/* Upgrade arrow */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "0 4px", flexShrink: 0 }}>
            <div
              style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: CORAL, display: "flex", alignItems: "center", justifyContent: "center",
                animation: "upgradePulse 2.2s ease-in-out infinite",
                boxShadow: `0 4px 18px ${CORAL}45`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "white" }}>arrow_forward</span>
            </div>
            <span style={{ fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Upgrade</span>
          </div>

          {/* Explorer card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${CORAL}10, ${CORAL}04)`,
              border: `1.5px solid ${CORAL}35`, borderRadius: "18px", padding: "28px",
              position: "relative", overflow: "visible", marginLeft: "16px",
            }}
          >
            <div style={{ position: "absolute", top: "-12px", left: "24px", background: CORAL, color: "white", fontSize: "10px", fontWeight: "800", letterSpacing: "0.06em", padding: "3px 12px", borderRadius: "20px", textTransform: "uppercase" }}>
              Explorer Plan
            </div>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: CORAL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Explorer</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "3px" }}>
                <div style={{ fontSize: "34px", fontWeight: "900", letterSpacing: "-0.04em" }}>£2</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>/month</div>
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>Everything in Free, plus:</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "20px" }}>
              {PRO_FEATURES.map((f) => <PricingFeatureRow key={f.label} {...f} />)}
            </div>
            <Link
              to="/signup"
              style={{ display: "block", textAlign: "center", padding: "11px", borderRadius: "10px", background: CORAL, color: "white", fontWeight: "700", fontSize: "13px", textDecoration: "none", transition: "opacity 0.15s", boxShadow: `0 4px 18px ${CORAL}35` }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start Explorer
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/// ── Why £2 section — two-column: bio left, solar system right ───────────────────
function WhyTwoPounds() {
  return (
    <section style={{ padding: "100px 24px", borderTop: `1px solid ${BORDER}` }}>
      <style>{`
        @keyframes orbitA {
          from { transform: rotate(0deg)   translateX(88px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(88px) rotate(-360deg); }
        }
        @keyframes orbitB {
          from { transform: rotate(90deg)  translateX(134px) rotate(-90deg); }
          to   { transform: rotate(450deg) translateX(134px) rotate(-450deg); }
        }
        @keyframes orbitC {
          from { transform: rotate(220deg) translateX(170px) rotate(-220deg); }
          to   { transform: rotate(580deg) translateX(170px) rotate(-580deg); }
        }
        @keyframes solarPulse {
          0%,100% { box-shadow: 0 0 0 0 ${CORAL}40, 0 0 40px ${CORAL}18; }
          50%      { box-shadow: 0 0 0 16px ${CORAL}00, 0 0 60px ${CORAL}30; }
        }
        @keyframes ringPulse {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.70; }
        }
        .planet-dot { border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      `}</style>
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>

        {/* Left — bio */}
        <div>
          <p data-reveal style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: CORAL, marginBottom: "14px" }}>
            The honest answer
          </p>
          <h2 data-reveal data-d="1" style={{ fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: "900", margin: "0 0 20px", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Why do we charge £2?
          </h2>
          <p data-reveal data-d="2" style={{ color: "rgba(255,255,255,0.52)", fontSize: "15px", lineHeight: 1.75, margin: "0 0 16px" }}>
            The £2/month Explorer Plan keeps the platform running — servers, development, maintenance — without ads or selling your data.
          </p>
          <p data-reveal data-d="3" style={{ color: "rgba(255,255,255,0.52)", fontSize: "15px", lineHeight: 1.75, margin: "0 0 28px" }}>
            Half of every subscription goes directly to UNICEF's education programmes. You learn. Kids worldwide get access to learning too.
          </p>
          <div data-reveal data-d="3" style={{
            display: "inline-flex", alignItems: "center", gap: "12px",
            background: "rgba(1,102,172,0.10)", border: "1px solid rgba(1,152,218,0.28)",
            borderRadius: "14px", padding: "12px 18px",
          }}>
            <span style={{ fontSize: "24px" }}>🌍</span>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#0198da", marginBottom: "2px" }}>UNICEF Partner</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)" }}>Learning for every child</div>
            </div>
          </div>
        </div>

        {/* Right — solar system */}
        <div data-reveal data-d="2" style={{ position: "relative", height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* Glowing orbit rings */}
          {[180, 270, 344].map((size, i) => (
            <div key={size} aria-hidden style={{
              position: "absolute", width: `${size}px`, height: `${size}px`,
              borderRadius: "50%",
              border: `1px solid ${i === 0 ? `${CORAL}30` : `rgba(255,255,255,${i === 1 ? "0.08" : "0.05"})`}`,
              animation: `ringPulse ${3.5 + i * 0.8}s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }} />
          ))}

          {/* Center star — coral £2 */}
          <div style={{
            position: "absolute", width: "72px", height: "72px", borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${CORAL}cc, ${CORAL}88)`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 4,
            animation: "solarPulse 3s ease-in-out infinite",
            boxShadow: `0 0 0 0 ${CORAL}40, 0 0 40px ${CORAL}22`,
          }}>
            <span style={{ fontSize: "22px", fontWeight: "900", color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>£2</span>
            <span style={{ fontSize: "7px", fontWeight: "800", color: "rgba(255,255,255,0.75)", letterSpacing: "0.08em", marginTop: "1px" }}>/MO</span>
          </div>

          {/* Planet A — 0% commission (inner ring, fast) */}
          <div style={{ position: "absolute", width: 0, height: 0, animation: "orbitA 9s linear infinite", zIndex: 3 }}>
            <div className="planet-dot" style={{ width: "18px", height: "18px", background: CORAL, transform: "translate(-50%, -50%)", boxShadow: `0 0 12px ${CORAL}80` }}>
              <span className="material-symbols-outlined" style={{ fontSize: "10px", color: "white" }}>percent</span>
            </div>
            <div style={{
              position: "absolute", top: "-36px", left: "50%", transform: "translateX(-50%)",
              background: `${CORAL}18`, border: `1px solid ${CORAL}40`, borderRadius: "8px",
              padding: "4px 8px", whiteSpace: "nowrap", fontSize: "10px", fontWeight: "700", color: CORAL,
            }}>0% commission</div>
          </div>

          {/* Planet B — UNICEF (mid ring, medium) */}
          <div style={{ position: "absolute", width: 0, height: 0, animation: "orbitB 15s linear infinite", zIndex: 3 }}>
            <div className="planet-dot" style={{ width: "22px", height: "22px", background: "rgba(1,102,172,0.70)", border: "1.5px solid rgba(1,152,218,0.70)", transform: "translate(-50%, -50%)", boxShadow: "0 0 14px rgba(1,152,218,0.50)", fontSize: "12px" }}>
              🌍
            </div>
            <div style={{
              position: "absolute", top: "-36px", left: "50%", transform: "translateX(-50%)",
              background: "rgba(1,102,172,0.18)", border: "1px solid rgba(1,152,218,0.35)", borderRadius: "8px",
              padding: "4px 8px", whiteSpace: "nowrap", fontSize: "10px", fontWeight: "700", color: "rgba(1,200,255,0.90)",
            }}>UNICEF funds</div>
          </div>

          {/* Planet C — Community (outer ring, slow) */}
          <div style={{ position: "absolute", width: 0, height: 0, animation: "orbitC 22s linear infinite", zIndex: 3 }}>
            <div className="planet-dot" style={{ width: "16px", height: "16px", background: "rgba(96,165,250,0.70)", border: "1px solid rgba(96,165,250,0.80)", transform: "translate(-50%, -50%)", boxShadow: "0 0 10px rgba(96,165,250,0.50)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "9px", color: "white" }}>groups</span>
            </div>
            <div style={{
              position: "absolute", top: "-36px", left: "50%", transform: "translateX(-50%)",
              background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.28)", borderRadius: "8px",
              padding: "4px 8px", whiteSpace: "nowrap", fontSize: "10px", fontWeight: "700", color: "rgba(147,197,253,0.90)",
            }}>Community</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── UK Universities — scrollable logo tiles ───────────────────────────────────
const UK_UNIS = [
  { name: "Oxford",       abbr: "OX",   color: "#002147" },
  { name: "Cambridge",    abbr: "CAM",  color: "#a3c1ad" },
  { name: "Imperial",     abbr: "IC",   color: "#003e74" },
  { name: "UCL",          abbr: "UCL",  color: "#500778" },
  { name: "LSE",          abbr: "LSE",  color: "#d1054b" },
  { name: "King's",       abbr: "KCL",  color: "#9d2235" },
  { name: "Edinburgh",    abbr: "ED",   color: "#041e42" },
  { name: "Manchester",   abbr: "MCR",  color: "#660099" },
  { name: "Bristol",      abbr: "UOB",  color: "#be1622" },
  { name: "Durham",       abbr: "DU",   color: "#7f2f8e" },
  { name: "Warwick",      abbr: "WAR",  color: "#4b0082" },
  { name: "Bath",         abbr: "BATH", color: "#005a8e" },
  { name: "St Andrews",   abbr: "STA",  color: "#003977" },
  { name: "Exeter",       abbr: "EXE",  color: "#003c3c" },
  { name: "Sheffield",    abbr: "SHF",  color: "#0a1a2e" },
  { name: "Birmingham",   abbr: "UOB",  color: "#003c69" },
  { name: "Nottingham",   abbr: "UON",  color: "#004f71" },
  { name: "Glasgow",      abbr: "GLA",  color: "#003865" },
  { name: "Leeds",        abbr: "LDS",  color: "#003087" },
  { name: "Southampton",  abbr: "SOT",  color: "#005c8a" },
];

function UniLogoGrid() {
  return (
    <div style={{
      overflowX: "auto", WebkitOverflowScrolling: "touch",
      padding: "0 24px 8px",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
      <style>{`.uni-scroll::-webkit-scrollbar{display:none}`}</style>
      <div className="uni-scroll" style={{
        display: "flex", gap: "12px", width: "max-content", padding: "4px 0",
      }}>
        {UK_UNIS.map((uni) => (
          <div key={uni.abbr + uni.name} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
            flexShrink: 0,
          }}>
            {/* Logo tile */}
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              background: `linear-gradient(135deg, ${uni.color}dd, ${uni.color}88)`,
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 16px ${uni.color}40`,
            }}>
              <span style={{
                fontSize: uni.abbr.length > 3 ? "10px" : "14px",
                fontWeight: "900", color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.04em", fontFamily: "serif",
              }}>
                {uni.abbr}
              </span>
            </div>
            <span style={{ fontSize: "10px", fontWeight: "600", color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
              {uni.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  useScrollEffects();
  const pillRef = useRef(null);
  const [pillGlowing, setPillGlowing] = useState(false);

  const onGlow = useCallback(() => {
    setPillGlowing(true);
    setTimeout(() => setPillGlowing(false), 1000);
  }, []);

  return (
    <div style={{ background: BG, minHeight: "100vh", color: "white", fontFamily: "inherit" }}>
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        [data-reveal][data-from="left"]  { transform: translate(-28px, 0); }
        [data-reveal][data-from="right"] { transform: translate(28px, 0); }
        [data-reveal].sws-vis { opacity: 1; transform: translate(0, 0) !important; }
        [data-reveal][data-d="1"] { transition-delay: 0.10s; }
        [data-reveal][data-d="2"] { transition-delay: 0.20s; }
        [data-reveal][data-d="3"] { transition-delay: 0.30s; }
        [data-reveal][data-d="4"] { transition-delay: 0.40s; }
      `}</style>
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden", padding: "80px 24px 64px",
        }}
      >
        <Grid parallax mask="radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)" />
        <HeroCanvas pillRef={pillRef} onGlow={onGlow} />
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: "40%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px", height: "600px", borderRadius: "50%",
            background: `radial-gradient(circle, ${CORAL}07 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 3, textAlign: "center", maxWidth: "720px" }}>
          {/* Pill badge — dot travels here */}
          <div
            ref={pillRef}
            data-reveal
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: pillGlowing ? `${CORAL}20` : `${CORAL}12`,
              border: `1px solid ${pillGlowing ? CORAL + "80" : CORAL + "28"}`,
              borderRadius: "20px", padding: "5px 14px", marginBottom: "24px",
              boxShadow: pillGlowing ? `0 0 20px ${CORAL}55, 0 0 40px ${CORAL}25` : "none",
              transition: "box-shadow 0.4s ease, border-color 0.4s ease, background 0.4s ease",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: CORAL, display: "inline-block" }} />
            <span style={{ fontSize: "12px", fontWeight: "700", color: CORAL, letterSpacing: "0.06em" }}>
              Peer tutoring · 0% commission
            </span>
          </div>
          <h1
            data-reveal
            data-d="1"
            style={{ fontSize: "clamp(42px, 6.5vw, 76px)", fontWeight: "800", lineHeight: 1.05, margin: "0 0 22px", letterSpacing: "-0.025em" }}
          >
            Study with students.
            <br />
            <span style={{ color: CORAL }}>Not agencies.</span>
          </h1>
          <p
            data-reveal
            data-d="2"
            style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "rgba(255,255,255,0.52)", maxWidth: "520px", margin: "0 auto 16px", lineHeight: 1.65 }}
          >
            Stop paying extra fees for nothing. Start tutoring with university students that know what they are talking about.
          </p>
          <p data-reveal data-d="2" style={{ fontSize: "14px", color: "rgba(255,255,255,0.30)", margin: "0 auto 40px" }}>
            Free to join. Tutoring costs nothing to start.
          </p>
          <div data-reveal data-d="3" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/signup"
              style={{ background: CORAL, color: "white", padding: "14px 30px", borderRadius: "10px", fontWeight: "700", fontSize: "15px", textDecoration: "none", transition: "opacity 0.15s", boxShadow: `0 4px 20px ${CORAL}35` }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get started free
            </Link>
            <Link
              to="/find-tutors"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.8)", padding: "14px 30px", borderRadius: "10px", fontWeight: "600", fontSize: "15px", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              Browse tutors
            </Link>
          </div>
        </div>
      </section>

      {/* ── STRIPE STRIP — 2-col ─────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "0 24px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", padding: "48px 0", alignItems: "center" }}>

          {/* Left — Stripe branding */}
          <div data-reveal>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "rgba(99,91,255,0.12)", border: "1px solid rgba(99,91,255,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
                  <path d="M14.3 12.5c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.4V8.4C19.6 7.5 17.8 7 16 7c-4 0-6.6 2-6.6 5.3 0 5.2 7.2 4.4 7.2 6.6 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.7-1.7v4.5c1.9.8 3.9 1.2 5.7 1.2 4.1 0 6.9-2 6.9-5.4-.1-5.6-7.2-4.6-7.2-6.2z" fill="white" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.025em", marginBottom: "2px" }}>Stripe</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.38)" }}>Payment infrastructure</div>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.52)", lineHeight: 1.75, margin: "0 0 16px" }}>
              All payments are powered by Stripe — the same infrastructure trusted by Amazon, Shopify, and millions of businesses worldwide.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,91,255,0.08)", border: "1px solid rgba(99,91,255,0.20)", borderRadius: "8px", padding: "5px 12px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "13px", color: "#a5b4fc" }}>verified</span>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#a5b4fc" }}>PCI-DSS Level 1 Certified</span>
            </div>
          </div>

          {/* Right — How it works */}
          <div data-reveal data-d="1" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { icon: "send_money", label: "100% direct to tutor", sub: "Platform takes zero — every pound you pay goes to your tutor" },
              { icon: "lock", label: "Bank-level encryption", sub: "End-to-end encrypted via Stripe's secure checkout" },
              { icon: "bolt", label: "Instant, automatic payouts", sub: "Tutors receive funds directly to their Stripe account" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: "10px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: CORAL, marginTop: "1px", flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "3px" }}>{item.label}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── UNIVERSITIES ────────────────────────────────────────────────────── */}
      <section style={{ padding: "56px 0", borderBottom: `1px solid ${BORDER}` }}>
        <p
          data-reveal
          style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "28px", padding: "0 24px" }}
        >
          Tutors from the UK's top universities
        </p>
        <UniLogoGrid />
      </section>

      {/* ── WHAT WE OFFER ───────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", position: "relative", overflow: "hidden" }}>
        <Grid mask="radial-gradient(ellipse 90% 60% at 50% 50%, black 0%, transparent 70%)" opacity={0.02} />
        <div style={{ maxWidth: "1080px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <p data-reveal style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: CORAL, marginBottom: "10px" }}>
            What we offer
          </p>
          <h2 data-reveal data-d="1" style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: "800", textAlign: "center", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Everything a student needs
          </h2>
          <p data-reveal data-d="2" style={{ textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: "14px", margin: "0 0 36px" }}>
            Hover any card to see it in action.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            <FeatureCard from="left" delay="1" icon="school" title="1-to-1 Tutoring" badge="FREE"
              desc="Book private sessions with verified university students. No middlemen, no markups."
              preview={<PreviewTutor />}
            />
            <FeatureCard delay="2" icon="menu_book" title="UCAS Guidance" badge="FREE"
              desc="Personal statement help from students who've been through it themselves."
              preview={<PreviewUCAS />}
            />
            <FeatureCard from="right" delay="3" icon="calendar_month" title="Session Calendar" badge="FREE"
              desc="Book, track, and manage all your sessions in one place. Never miss a lesson."
              preview={<PreviewCalendar />}
            />
            <FeatureCard from="left" delay="1" icon="chat" title="Direct Messages" badge="FREE"
              desc="Message any tutor before booking. Agree a rate, discuss goals, no surprises."
              preview={<PreviewMessages />}
            />
            <FeatureCard delay="2" icon="groups" title="Live Study Rooms" badge="EXPLORER"
              desc="Drop into open study sessions with peers in your subject. Real-time peer learning."
              preview={<PreviewRooms />}
            />
            <FeatureCard from="right" delay="3" icon="forum" title="Community Forum" badge="EXPLORER"
              desc="Ask questions, share insights, and get help from people studying the same subjects."
              preview={<PreviewForum />}
            />
            <FeatureCard from="left" delay="1" icon="cast_for_education" title="Live Classrooms" badge="EXPLORER"
              desc="Join group sessions on a topic — fraction of the cost of 1-to-1, taught live."
              preview={null}
            />
            <FeatureCard delay="2" icon="auto_stories" title="Study Notes" badge="EXPLORER"
              desc="Browse and share student notes, past papers, and revision guides by subject."
              preview={null}
            />
            <FeatureCard from="right" delay="3" icon="emoji_events" title="XP & Badges" badge="EXPLORER"
              desc="Earn XP for every session, note, and review. Level up and unlock tutor badges."
              preview={null}
            />
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── WHY £2 ──────────────────────────────────────────────────────────── */}
      <WhyTwoPounds />

      {/* ── FOUNDER ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p data-reveal style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: CORAL, marginBottom: "48px" }}>
            Who built this
          </p>
          <div data-reveal data-d="1" style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  width: "120px", height: "120px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${CORAL}40, ${CORAL}15)`,
                  border: `2px solid ${CORAL}35`, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "52px", color: CORAL, opacity: 0.7 }}>person</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em", margin: "0 0 6px" }}>Kiki Boro</h3>
              <p style={{ fontSize: "13px", color: CORAL, fontWeight: "700", margin: "0 0 14px" }}>Founder, Study With Students</p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.52)", lineHeight: 1.75, margin: "0 0 18px" }}>
                "I built Study With Students because I wanted a place where students could genuinely help each other — without agencies taking a cut. University students are brilliant teachers. They deserve to be paid properly, and learners deserve fair prices."
              </p>
              <Link
                to="/about"
                style={{ fontSize: "13px", fontWeight: "700", color: CORAL, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Read our story
                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 100px", borderTop: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
        <Grid mask="radial-gradient(ellipse 60% 80% at 50% 50%, black 0%, transparent 80%)" opacity={0.022} />
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 data-reveal style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: "800", margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Ready to find your tutor?
          </h2>
          <p data-reveal data-d="1" style={{ color: "rgba(255,255,255,0.42)", fontSize: "16px", margin: "0 0 36px", lineHeight: 1.6 }}>
            Join students from top UK universities. Free to join — no card required.
          </p>
          <div data-reveal data-d="2" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/signup"
              style={{ display: "inline-block", background: CORAL, color: "white", padding: "14px 32px", borderRadius: "10px", fontWeight: "700", fontSize: "15px", textDecoration: "none", transition: "opacity 0.15s", boxShadow: `0 4px 20px ${CORAL}35` }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Create your free account
            </Link>
            <Link
              to="/how-it-works"
              style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)", padding: "14px 32px", borderRadius: "10px", fontWeight: "600", fontSize: "15px", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
