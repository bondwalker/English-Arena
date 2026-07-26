import { SALogo } from "./ui.jsx";

export default function Home({ onHost, onJoin, onSolo }) {
  return (
    <div className="hero" style={{ justifyContent: "center", alignItems: "stretch", padding: "clamp(1.5rem,5vw,4rem)" }}>
      {/* decorative blobs */}
      <div style={{ position: "absolute", top: -150, right: -110, width: 440, height: 440, borderRadius: "46% 46% 50% 50%", background: "var(--sun)", opacity: 0.22, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 210, right: 190, width: 130, height: 130, borderRadius: "50%", background: "var(--tomato)", opacity: 0.95, pointerEvents: "none" }} className="sa-anim-pulse" />
      <div style={{ position: "absolute", bottom: -160, left: -120, width: 460, height: 460, borderRadius: "50%", background: "var(--aqua)", opacity: 0.14, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "min(100vh,880px)" }}>
        {/* top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div className="sa-anim-pop"><SALogo size={30} /></div>
          <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 500, marginTop: 6 }}>Adult ESL · live classroom</span>
        </div>

        {/* hero content */}
        <div className="sa-anim-slide" style={{ textAlign: "left", maxWidth: 900, marginTop: "2.5rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.5rem 1.1rem", border: "1.5px solid rgba(91,139,255,0.55)", borderRadius: 999, color: "var(--cobalt)", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.6rem" }}>
            <span style={{ fontSize: "0.7rem" }}>◆</span> Live classroom games
          </span>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(2.8rem,9vw,6.5rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.92, color: "var(--ink)" }}>
            Grammar,<br />but make it<br />
            <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>a game<span style={{ color: "var(--sun)" }}>.</span></span>
          </h1>
          <p style={{ marginTop: "1.6rem", fontSize: "clamp(1rem,1.6vw,1.35rem)", color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 620 }}>
            Ten question types, thirty topic packs, up to thirty players.<br />
            Grab a projector, share the code, and go.
          </p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "2.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={onHost} style={{ fontSize: "1.05rem", background: "var(--ink)", color: "var(--on-light)", borderColor: "var(--ink)", padding: "1.05rem 2.4rem" }}>
              Host a game →
            </button>
            <button className="btn btn-ghost" onClick={onJoin} style={{ fontSize: "1.05rem", background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)", padding: "1.05rem 2.2rem" }}>
              I have a code
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onSolo} style={{ opacity: 0.5, fontSize: "0.82rem", border: "none", padding: "0.3rem 0.4rem" }}>
              or practise solo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
