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

  const RANK_COLORS = ["var(--sun)","#c0c0c0","#cd7f32"];

  if (mode === "teams") {
    const usedTeams = TEAMS.filter(t => Object.values(room.players||{}).some(p => p.team === t.id));
    const tSorted = [...usedTeams].sort((a, b) => (teamScores[b.id]||0) - (teamScores[a.id]||0));
    const myTeam = room.players?.[name]?.team ? TEAMS.find(t => t.id === room.players[name].team) : null;
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:"1rem"}}>
          <SAIcon name={isEnd?"trophy":"medal"} size={28} color="var(--sun)" />
          <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:"1.3rem",color:"var(--sun)",marginTop:"0.3rem"}}>{isEnd?"Final Scores":"Scores"}</h2>
        </div>
        <div style={{fontSize:"0.68rem",color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.4rem"}}>Teams</div>
        {tSorted.map((t, i) => (
          <div key={t.id} className="lb-row" style={{borderLeftColor:t.color,animationDelay:`${i*0.08}s`,display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <span className="lb-rank" style={{color:RANK_COLORS[i]||"var(--muted)"}}>{i<3?["🥇","🥈","🥉"][i]:`#${i+1}`}</span>
            <span style={{fontSize:"1.1rem"}}>{t.emoji}</span>
            <span className="lb-name" style={{color:t.color,flex:1}}>{t.name}</span>
            <span className="lb-score" style={{fontFamily:"'Fraunces',serif",fontWeight:900,color:RANK_COLORS[i]||"var(--ink)"}}><SARollingNumber value={teamScores[t.id]||0} /></span>
          </div>
        ))}
        {myTeam && (
          <div style={{marginTop:"0.8rem",padding:"0.6rem 0.8rem",background:"var(--paper)",border:`1.5px solid ${myTeam.color}`,borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <SABlob name={name} size={28} color={myTeam.color} />
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:"0.85rem"}}>{name}</div>
                <div style={{fontSize:"0.68rem",color:myTeam.color}}>{myTeam.name}</div>
              </div>
              <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,color:"var(--sun)",fontSize:"1rem"}}>{(room.players?.[name]?.score||0).toLocaleString()} <span style={{fontSize:"0.65rem",opacity:0.5}}>pts</span></div>
            </div>
            <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.2rem"}}>#{myPos+1} overall</div>
          </div>
        )}
        {reviewSection}
      </div>
    );
  }

  return (
    <div>
      <div style={{textAlign:"center",marginBottom:"1rem"}}>
        <SAIcon name={isEnd?"trophy":"medal"} size={28} color="var(--sun)" />
        <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:"1.3rem",color:"var(--sun)",marginTop:"0.3rem"}}>{isEnd?"Final Scores":"Scores"}</h2>
      </div>
      {sorted.map(([n, p], i) => (
        <div key={n} className="lb-row" style={{
          borderLeftColor: n===name ? "var(--sun)" : RANK_COLORS[i]||"var(--line)",
          background: n===name ? "rgba(255,206,71,0.07)" : "transparent",
          animationDelay: `${i*0.06}s`,
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span className="lb-rank" style={{color:RANK_COLORS[i]||"var(--muted)",minWidth:24}}>{i<3?["🥇","🥈","🥉"][i]:`#${i+1}`}</span>
          <SABlob name={n} size={26} color={RANK_COLORS[i]} />
          <span className="lb-name" style={{flex:1,fontWeight:n===name?700:400}}>
            {n}{n===name && <span style={{color:"var(--sun)",fontSize:"0.72rem",marginLeft:"0.3rem",fontFamily:"'JetBrains Mono',monospace"}}>← you</span>}
          </span>
          {n===room?.firstCorrect && <span title="First correct!" style={{fontSize:"0.8rem",color:"var(--cobalt)"}}>⚡</span>}
          {(p.streak||0)>1 && <SAStreakMeter count={p.streak} size="sm" />}
          <span className="lb-score" style={{fontFamily:"'Fraunces',serif",fontWeight:900,color:RANK_COLORS[i]||"var(--ink)"}}><SARollingNumber value={p.score||0} /></span>
        </div>
      ))}
      {myPos >= 0 && <p style={{textAlign:"center",color:"var(--muted)",marginTop:"0.5rem",fontSize:"0.75rem",fontFamily:"'JetBrains Mono',monospace"}}>#{myPos+1} of {sorted.length} players</p>}
      {reviewSection}
    </div>
  );
}
