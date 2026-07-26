export default function Home({ onHost, onJoin, onSolo }) {
  return (
    <div className="hero" style={{ justifyContent: "center", alignItems: "stretch", padding: "clamp(1.5rem,5vw,4rem)" }}>
      {/* decorative blobs */}
      <div style={{ position: "absolute", top: -150, right: -110, width: 440, height: 440, borderRadius: "46% 46% 50% 50%", background: "var(--sun)", opacity: 0.22, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 210, right: 190, width: 130, height: 130, borderRadius: "50%", background: "var(--tomato)", opacity: 0.95, pointerEvents: "none" }} className="sa-anim-pulse" />
      <div style={{ position: "absolute", bottom: -160, left: -120, width: 460, height: 460, borderRadius: "50%", background: "var(--aqua)", opacity: 0.14, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "min(100vh,880px)" }}>
        {/* hero content */}
        <div className="sa-anim-slide" style={{ textAlign: "left", maxWidth: 900 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.5rem 1.1rem", border: "1.5px solid rgba(91,139,255,0.55)", borderRadius: 999, color: "var(--cobalt)", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.6rem" }}>
            <span style={{ fontSize: "0.7rem" }}>◆</span> Live classroom games
          </span>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(2.8rem,9vw,6.5rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 0.92, color: "var(--ink)" }}>
            English <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>Arena<span style={{ color: "var(--sun)" }}>.</span></span>
          </h1>
          <div style={{ display: "flex", gap: "1rem", marginTop: "2.6rem", flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={onHost} style={{ fontSize: "1.05rem", background: "var(--ink)", color: "var(--on-light)", borderColor: "var(--ink)", padding: "1.05rem 2.4rem" }}>
              Host a game →
            </button>
            <button className="btn btn-ghost" onClick={onJoin} style={{ fontSize: "1.05rem", background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)", padding: "1.05rem 2.2rem" }}>
              I have a code
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onSolo} style={{ color: "var(--sun)", fontWeight: 700, fontSize: "0.9rem", border: "none", padding: "0.3rem 0.4rem" }}>
              or practise solo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
