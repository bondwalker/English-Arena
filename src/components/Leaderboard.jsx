import { SAIcon, SABlob, SAStreakMeter, SARollingNumber, Confetti } from "./ui.jsx";
import { TEAMS, getTeamScores } from "../lib/utils.js";
import { TeamIcon } from "./ui.jsx";

// ─── Leaderboard (host view) ──────────────────────────────────────────────────
export function Leaderboard({ sorted, mode, teams, teamScores, isEnd, room, onPlayAgain, onShareRecap }) {
  const RANK = ["var(--sun)", "#c9cdd6", "#d98a4a"];

  // ── End: winner podium (screen 11) ──
  if (isEnd) {
    const top3 = sorted.slice(0, 3);
    const winner = top3[0]?.[0] || "";
    const order = [1, 0, 2]; // display #2, #1, #3
    const heights = { 0: 200, 1: 130, 2: 110 };
    return (
      <div style={{ position: "relative", paddingTop: "0.5rem" }}>
        <Confetti />
        <div style={{ position: "absolute", top: -60, right: -40, width: 300, height: 300, borderRadius: "50%", background: "var(--sun)", opacity: 0.16, pointerEvents: "none" }} />
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid rgba(255,206,71,0.5)", borderRadius: 999, padding: "0.45rem 1.2rem", color: "var(--sun)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "1.2rem" }}>✦ Game complete</span>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "clamp(2.2rem,5vw,4rem)", letterSpacing: "-0.01em", lineHeight: 1.05 }}>And the winner is <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>{winner}<span style={{ color: "var(--sun)" }}>.</span></span></h1>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "1.2rem", maxWidth: 800, margin: "0 auto" }}>
          {order.map(idx => {
            const entry = top3[idx];
            if (!entry) return <div key={idx} style={{ flex: 1 }} />;
            const [name, p] = entry;
            const team = mode === "teams" ? teams.find(t => t.id === p.team) : null;
            return (
              <div key={idx} style={{ flex: idx === 0 ? 1.25 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <SAIcon name={idx === 0 ? "trophy" : "medal"} size={idx === 0 ? 40 : 30} color={RANK[idx]} />
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: idx === 0 ? "1.5rem" : "1.2rem" }}>{name}</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: idx === 0 ? "1.6rem" : "1.3rem", color: idx === 0 ? "var(--sun)" : RANK[idx] }}>{(p.score || 0).toLocaleString()}</div>
                <div style={{ width: "100%", height: heights[idx], borderRadius: "14px 14px 0 0", background: idx === 0 ? "var(--sun)" : team ? team.color : RANK[idx], display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 3px rgba(253,243,221,0.25)", animation: "podiumDrop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) both", animationDelay: `${(2 - idx) * 0.15}s` }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "3rem", color: "var(--on-light)" }}>#{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", marginTop: "1.6rem" }}>
          {onPlayAgain && <button className="btn" onClick={onPlayAgain} style={{ background: "var(--ink)", color: "var(--on-light)", borderColor: "var(--ink)", boxShadow: "4px 4px 0 var(--sun)" }}>Play again →</button>}
          {onShareRecap && <button className="btn btn-ghost" onClick={onShareRecap} style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}>Share recap</button>}
        </div>
      </div>
    );
  }

  // ── Mid-game: "Who's ahead?" (screen 9) ──
  const roundNow = Math.max(1, (room?.qIndex || 0) - (room?.warmupCount || 0) + 1);
  const totalRounds = (room?.questions?.length || 0) - (room?.warmupCount || 0);
  const toGo = Math.max(0, totalRounds - roundNow);
  const tSorted = mode === "teams" ? [...teams].sort((a, b) => (teamScores[b.id] || 0) - (teamScores[a.id] || 0)) : [];
  return (
    <div style={{ paddingTop: "0.3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid rgba(255,206,71,0.5)", borderRadius: 999, padding: "0.4rem 1.1rem", color: "var(--sun)", fontWeight: 700, fontSize: "0.9rem" }}>✦ Leaderboard — after round {roundNow}</span>
        {toGo > 0 && <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{toGo} round{toGo > 1 ? "s" : ""} to go</span>}
      </div>
      <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "clamp(2rem,4.5vw,3.4rem)", letterSpacing: "-0.01em", marginBottom: "1.4rem" }}>Who's ahead?</h1>

      {mode === "teams" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, tSorted.length)},1fr)`, gap: "1rem", marginBottom: "1.4rem" }}>
          {tSorted.slice(0, 3).map((t, i) => (
            <div key={t.id} style={{ border: `2.5px solid ${t.color}`, borderRadius: 18, padding: "1.1rem 1.3rem", background: "var(--paper)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                <TeamIcon icon={t.icon} color={t.color} size={26} />
                <div><div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "1.15rem", color: t.color }}>{t.name}</div><div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>#{i + 1}</div></div>
              </div>
              <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2.2rem" }}>{(teamScores[t.id] || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {sorted.map(([name, p], i) => {
          const team = mode === "teams" ? teams.find(t => t.id === p.team) : null;
          const first = i === 0;
          const mult = (p.streak || 0) >= 2 ? 2 : (p.streak || 0) >= 1 ? 1 : 0;
          return (
            <div key={name} className="sa-anim-slide" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.7rem 1.2rem", borderRadius: 14, background: first ? "var(--sun)" : "var(--paper)", border: first ? "none" : "1.5px solid var(--line)", animationDelay: `${i * 0.05}s` }}>
              <span style={{ width: 40, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                {i < 3 ? <SAIcon name={first ? "trophy" : "medal"} size={first ? 26 : 22} color={first ? "var(--on-light)" : RANK[i]} /> : <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: "var(--muted)" }}>#{i + 1}</span>}
              </span>
              <SABlob name={name} size={30} color={team?.color} />
              <span style={{ flex: 1, fontFamily: "'Fraunces',serif", fontWeight: first ? 800 : 600, fontSize: "1.2rem", color: first ? "var(--on-light)" : "var(--ink)" }}>{name}</span>
              {mult > 1 && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1.5px solid ${first ? "rgba(15,18,38,0.4)" : "var(--sun)"}`, borderRadius: 999, padding: "0.25rem 0.6rem 0.25rem 0.45rem" }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--tomato)" }} /><span style={{ color: first ? "var(--on-light)" : "var(--sun)", fontWeight: 800, fontSize: "0.85rem" }}>×{mult}</span></span>}
              <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.4rem", color: first ? "var(--on-light)" : "var(--ink)" }}>{(p.score || 0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── StudentLeaderboard ───────────────────────────────────────────────────────
export function StudentLeaderboard({ room, name, showReview, setShowReview }) {
  const sorted = Object.entries(room?.players||{}).sort((a,b) => (b[1].score||0) - (a[1].score||0));
  const myPos = sorted.findIndex(([n]) => n === name);
  const teamScores = getTeamScores(room || {});
  const mode = room?.mode;
  const isEnd = room?.phase === "end";

  const buildSummary = (questions, topic) => {
    const lines = [`=== English Arena · ${topic} ===\n`];
    questions.forEach((q, i) => {
      lines.push(`Q${i+1}. ${q.question}${q.sentence ? " " + q.sentence : ""}`);
      const ans = q.type==="error_spotter" ? `${q.errorWord} → ${q.answer}` :
                  q.type==="story_builder" ? `Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}` :
                  q.type==="word_match" ? "Match all pairs correctly" : q.answer;
      lines.push(`Answer: ${ans}`);
      if (q.explanation) lines.push(`Note: ${q.explanation}`);
      lines.push("");
    });
    return lines.join("\n");
  };

  const reviewSection = isEnd && setShowReview ? (
    <>
      <button className="btn btn-ghost btn-full mt-3" onClick={() => setShowReview(v => !v)}>
        {showReview ? "Hide" : "Review"} Questions
      </button>
      {showReview && (() => {
        const mainQs = (room.questions||[]).filter(q => !q._warmup);
        return (
          <div className="card mt-2" style={{maxHeight:"55vh",overflowY:"auto"}}>
            <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigator.clipboard.writeText(buildSummary(mainQs, room.topic||""))}>
              Copy as text
            </button>
            {mainQs.map((q, i) => (
              <div key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.07)",paddingBottom:"0.7rem",marginBottom:"0.7rem"}}>
                <div style={{fontWeight:700,fontSize:"0.83rem",lineHeight:1.4}}>Q{i+1}. {q.question}{q.sentence?" "+q.sentence:""}</div>
                <div style={{color:"var(--teal)",fontSize:"0.78rem",marginTop:"0.2rem"}}>✔ {q.type==="error_spotter"?`${q.errorWord} → ${q.answer}`:q.type==="story_builder"?`Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}`:q.type==="word_match"?"Match all pairs":q.answer}</div>
                {q.explanation && <div className="op50" style={{fontSize:"0.74rem",marginTop:"0.15rem",lineHeight:1.4}}>{q.explanation}</div>}
              </div>
            ))}
          </div>
        );
      })()}
    </>
  ) : null;

  const RANK_COLORS = ["var(--sun)", "#c9cdd6", "#d98a4a"];
  const total = sorted.length;
  const roundNow = Math.max(1, (room?.qIndex || 0) - (room?.warmupCount || 0) + 1);
  const myScore = room?.players?.[name]?.score || 0;

  // ── End: student winner screen (screen 12) ──
  if (isEnd) {
    const won = myPos === 0;
    const top3 = myPos < 3;
    return (
      <div style={{ textAlign: "center", paddingTop: "1.5rem" }}>
        <div className="sa-anim-pop" style={{ marginBottom: "0.4rem" }}><SAIcon name="trophy" size={54} color="var(--sun)" /></div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: "0.4rem" }}>FINAL RESULT</div>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2.6rem", lineHeight: 1, marginBottom: "0.9rem" }}>You <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>{won ? "won!" : top3 ? "placed!" : "played!"}</span></h1>
        <span style={{ display: "inline-block", border: "1.5px solid var(--line)", borderRadius: 999, padding: "0.45rem 1.2rem", marginBottom: "2rem" }}><span style={{ color: "var(--sun)", fontWeight: 800 }}>#{myPos + 1}</span> <span style={{ color: "var(--muted)" }}>of {total}</span></span>
        <div style={{ background: "var(--sun)", color: "var(--on-light)", borderRadius: 20, padding: "1.4rem", margin: "0 auto 2rem", maxWidth: 320 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.3rem" }}>Final score</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "3.4rem", lineHeight: 1 }}>{myScore.toLocaleString()}</div>
        </div>
        <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem", lineHeight: 1.5, maxWidth: 320, margin: "0 auto 1.6rem" }}>{won ? `Top of the class, ${name}. Want to defend your crown?` : `Nice game, ${name}. Ready for a rematch?`}</p>
        <button className="btn btn-coral btn-full" style={{ fontSize: "1.05rem", padding: "1rem", maxWidth: 360, margin: "0 auto" }} onClick={() => window.location.assign(window.location.pathname)}>Play again</button>
        {reviewSection}
      </div>
    );
  }

  // ── Mid-game: student leaderboard (screen 10) ──
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: "0.2rem" }}>AFTER ROUND {roundNow}</div>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.9rem", lineHeight: 1 }}>{myPos >= 0 ? <>You're <span style={{ color: "var(--tomato)", fontStyle: "italic" }}>#{myPos + 1}</span></> : "Scores"}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sorted.map(([n, p], i) => {
          const isMe = n === name;
          return (
            <div key={n} className="sa-anim-slide" style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.7rem 1rem", borderRadius: 12, background: isMe ? "var(--sun)" : "var(--paper)", border: isMe ? "none" : "1.5px solid var(--line)", animationDelay: `${i * 0.05}s` }}>
              <span style={{ width: 30, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                {i < 3 ? <SAIcon name={i === 0 ? "trophy" : "medal"} size={i === 0 ? 22 : 18} color={isMe ? "var(--on-light)" : RANK_COLORS[i]} /> : <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.85rem", color: isMe ? "var(--on-light)" : "var(--muted)" }}>#{i + 1}</span>}
              </span>
              <span style={{ flex: 1, fontFamily: "'Fraunces',serif", fontWeight: isMe ? 800 : 600, fontSize: "1.05rem", color: isMe ? "var(--on-light)" : "var(--ink)" }}>{n}{isMe && <span style={{ color: "var(--tomato)", fontWeight: 800, marginLeft: "0.4rem", fontSize: "0.8rem" }}>· YOU</span>}</span>
              <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.15rem", color: isMe ? "var(--on-light)" : "var(--ink)" }}>{(p.score || 0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      {reviewSection}
    </div>
  );
}
