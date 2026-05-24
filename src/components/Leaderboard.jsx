import { SAIcon, SABlob, SAStreakMeter, SARollingNumber, Confetti } from "./ui.jsx";
import { TEAMS, getTeamScores } from "../lib/utils.js";
import { TeamIcon } from "./ui.jsx";

// ─── Leaderboard (host view) ──────────────────────────────────────────────────
export function Leaderboard({ sorted, mode, teams, teamScores, isEnd, room }) {
  const title = isEnd ? "Final Results" : "Leaderboard";
  const rowDelay = (i) => isEnd ? [`1.8s`,`1.0s`,`0.2s`][i] ?? `2.4s` : `${i * 0.07}s`;
  const podiumColors = ["var(--sun)","var(--muted)","var(--tomato)"];
  const podiumStyle = (i) => isEnd && i < 3 ? {
    animation: `podiumDrop 0.55s cubic-bezier(0.175,0.885,0.32,1.275) forwards`,
    animationDelay: rowDelay(i),
    borderLeftWidth: i === 0 ? 5 : 3,
    borderLeftColor: podiumColors[i] || "var(--line)",
    background: i === 0 ? "rgba(255,206,71,0.07)" : "var(--paper)",
    marginBottom: i === 0 ? "0.5rem" : undefined,
  } : {};

  const LBRow = ({ name, p, i, team, firstC }) => (
    <div key={name} className="lb-row" style={{borderLeftColor:team?team.color:(podiumColors[i]||"var(--line)"),animationDelay:rowDelay(i),...podiumStyle(i)}}>
      <span className="lb-rank" style={{fontFamily:"'Fraunces',serif",fontSize:i<3?"1rem":"0.85rem",opacity:i<3?1:0.5}}>
        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
      </span>
      <SABlob name={name} size={28} color={team?.color} />
      <span className="lb-name" style={{fontFamily:"'DM Sans',sans-serif"}}>
        {name}
        {firstC && <span title="First correct!" style={{marginLeft:5,fontSize:"0.8rem",color:"var(--sun)"}}>⚡</span>}
      </span>
      {(p.streak||0)>1 && <SAStreakMeter count={p.streak} />}
      <span className="lb-score" style={{fontFamily:"'Fraunces',serif",fontWeight:900}}><SARollingNumber value={p.score||0} /></span>
    </div>
  );

  if (mode === "teams") {
    const tSorted = [...teams].sort((a, b) => (teamScores[b.id]||0) - (teamScores[a.id]||0));
    return (
      <div className="mt-3">
        {isEnd && <Confetti />}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:"1rem"}}>
          <SAIcon name={isEnd?"trophy":"medal"} size={26} color="var(--sun)" />
          <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:"1.4rem",fontStyle:"italic",color:"var(--sun)"}}>{title}</h2>
        </div>
        <span className="label">Team standings</span>
        {tSorted.map((t, i) => (
          <div key={t.id} className="lb-row" style={{borderLeftColor:t.color,animationDelay:rowDelay(i),...(i<3?podiumStyle(i):{})}}>
            <span className="lb-rank">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
            <TeamIcon icon={t.icon} color={t.color} size={20} />
            <span className="lb-name" style={{color:t.color,fontWeight:700}}>{t.name}</span>
            <span className="lb-score" style={{fontFamily:"'Fraunces',serif",fontWeight:900}}><SARollingNumber value={teamScores[t.id]||0} /></span>
          </div>
        ))}
        <span className="label mt-3">Individual scores</span>
        {sorted.map(([name, p], i) => {
          const team = teams.find(t => t.id === p.team);
          return <LBRow key={name} name={name} p={p} i={i} team={team} firstC={room?.firstCorrect===name} />;
        })}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {isEnd && <Confetti />}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:"1rem"}}>
        <SAIcon name={isEnd?"trophy":"medal"} size={26} color="var(--sun)" />
        <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:"1.4rem",fontStyle:"italic",color:"var(--sun)"}}>{title}</h2>
      </div>
      {sorted.map(([name, p], i) => (
        <LBRow key={name} name={name} p={p} i={i} firstC={room?.firstCorrect===name} />
      ))}
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
