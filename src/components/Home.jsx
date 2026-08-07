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
          <div style={{ display: "grid", gap: "1rem", marginTop: "2.6rem", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", maxWidth: 760 }}>
            {[
              { label: "Host a game", desc: "Start a live classroom game", cls: "opt-0", color: "var(--tomato)", icon: "🎮", onClick: onHost },
              { label: "I have a code", desc: "Join your teacher's game", cls: "opt-1", color: "var(--cobalt)", icon: "🔑", onClick: onJoin },
              { label: "Practise solo", desc: "Play on your own — no code", cls: "opt-2", color: "var(--leaf)", icon: "✏️", onClick: onSolo },
            ].map((c) => (
              <button key={c.label} onClick={c.onClick} className={`opt-btn ${c.cls}`}
                style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.9rem", minHeight: 168, padding: "1.4rem 1.4rem 1.5rem" }}>
                <span style={{ width: 52, height: 52, borderRadius: 14, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.55rem", flexShrink: 0, boxShadow: `4px 4px 0 ${c.color}33` }}>{c.icon}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.4rem", color: "var(--ink)", lineHeight: 1.05 }}>{c.label} <span style={{ color: c.color }}>→</span></span>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.92rem", color: "var(--ink-soft)", fontWeight: 500, lineHeight: 1.3 }}>{c.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
