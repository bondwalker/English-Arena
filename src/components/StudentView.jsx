import { useState, useEffect, useRef } from "react";
import { SAIcon, SABlob, SAStreakMeter, SARollingNumber, SARoomChip } from "./ui.jsx";
import { StudentLeaderboard } from "./Leaderboard.jsx";
import { StudentAnswer } from "./StudentAnswer.jsx";
import { TEAMS, checkAnswer, getTimeLimit, getTeamScores } from "../lib/utils.js";
import { db, ref, set, listenRoom, fetchRoom } from "../lib/firebase.js";
import { read, write, readFont, writeFont } from "../lib/storage.js";
import { StressDots } from "./ui.jsx";

export default function StudentView({ onBack, initialCode = "" }) {
  const [step, setStep] = useState("join");
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [room, setRoom] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [bigText, setBigText] = useState(() => readFont());
  const [showReview, setShowReview] = useState(false);
  const [rearranged, setRearranged] = useState([]);
  const [usedIdx, setUsedIdx] = useState([]);
  const [typeVal, setTypeVal] = useState("");
  const [storyOrder, setStoryOrder] = useState([]);
  const [matchState, setMatchState] = useState({ sel: null, matched: {} });
  const [joining, setJoining] = useState(false);
  const lastQRef = useRef(-1);
  const lastPhaseRef = useRef("");

  const join = async () => {
    if (!name.trim()) { setError("Enter your nickname!"); return; }
    const trimCode = code.trim().toUpperCase();
    if (!trimCode) { setError("Enter the room code!"); return; }
    setJoining(true);
    setError("");
    try {
      let s = read();
      if (!s || s.code !== trimCode) s = await fetchRoom(trimCode);
      if (!s) { setError(db ? "Room not found — make sure your teacher has the game open." : "Room not found. Check the code."); return; }
      if (s.code !== trimCode) { setError("Wrong code — ask your teacher!"); return; }

      const playerData = { score: 0, streak: 0, team: (s.players || {})[name.trim()]?.team || null };

      if (db) {
        // Write ONLY to the player's own path — do NOT overwrite the teacher's full room state
        await set(ref(db, `rooms/${trimCode}/players/${name.trim()}`), playerData);
      } else {
        write({ ...s, players: { ...(s.players || {}), [name.trim()]: playerData } });
      }

      setRoom({ ...s, players: { ...(s.players || {}), [name.trim()]: playerData } });
      setStep("waiting");
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (step === "join" || !room?.code) return;
    const handleUpdate = (s) => {
      if (!s) return;
      if (s.phase === "question" && s.qIndex !== lastQRef.current) {
        lastQRef.current = s.qIndex;
        setMyAnswer(null); setShowResult(false);
        setRearranged([]); setUsedIdx([]); setTypeVal("");
        setStoryOrder([]); setMatchState({ sel: null, matched: {} });
      }
      if (s.phase === "reveal" && lastPhaseRef.current !== "reveal") {
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2800);
      }
      lastPhaseRef.current = s.phase;
      setRoom(s);
      if (["question", "reveal", "leaderboard", "end"].includes(s.phase)) setStep("playing");
      else if (s.phase === "lobby") setStep("waiting");
    };
    if (db) return listenRoom(room.code, handleUpdate);
    const id = setInterval(() => handleUpdate(read()), 600);
    return () => clearInterval(id);
  }, [step, room?.code]);

  const submitAnswer = (ans) => {
    if (myAnswer !== null) return;
    setMyAnswer(ans);
    const entry = { v: ans, ts: Date.now() };
    if (db && room?.code) {
      set(ref(db, `rooms/${room.code}/answers/${name}`), entry).catch(() => {});
      return;
    }
    const s = read();
    if (s) write({ ...s, answers: { ...(s.answers || {}), [name]: entry } });
  };

  if (step === "join") return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", maxWidth: 430, margin: "0 auto" }}>
      <button className="btn btn-sm btn-ghost mb-3" onClick={onBack} style={{ alignSelf: "flex-start", border: "none", opacity: 0.7 }}>← Back</button>
      <div className="sa-anim-pop" style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 26, padding: "28px 26px", boxShadow: "6px 8px 0 var(--sun)", width: "100%" }}>
        <div style={{ fontSize: "2.3rem", lineHeight: 1, marginBottom: "0.6rem" }}>✋</div>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2.6rem", lineHeight: 1, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>Jump in.</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: "1rem", lineHeight: 1.5, marginBottom: "1.6rem" }}>Four-letter code, then your name.</p>

        <span className="label">Room Code</span>
        <div style={{ position: "relative", marginTop: "0.4rem", marginBottom: "1.3rem" }}>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))} maxLength={4} autoFocus autoCapitalize="characters"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", cursor: "text", zIndex: 2, fontSize: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.6rem", pointerEvents: "none" }}>
            {[0, 1, 2, 3].map(i => {
              const filled = !!code[i];
              const active = code.length === i;
              return (
                <div key={i} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `2.5px solid ${filled || active ? "var(--tomato)" : "var(--line)"}`, background: "var(--cream)", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2rem", color: "var(--ink)" }}>{code[i] || ""}</div>
              );
            })}
          </div>
        </div>

        <span className="label">Your Name</span>
        <input className="input" placeholder="e.g. Maria, Carlos, Ana…" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} style={{ border: "2px solid var(--line)", marginTop: "0.4rem" }} />
        {error && <p style={{ color: "var(--tomato)", marginTop: "0.6rem", fontSize: "0.85rem" }}>{error}</p>}
        <button className="btn btn-coral btn-full mt-3" onClick={join} disabled={joining} style={{ fontSize: "1.05rem", padding: "1rem", marginTop: "1.3rem" }}>
          {joining ? "Joining…" : "Let's go →"}
        </button>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "1.4rem", textAlign: "center" }}>No app, no signup. Just your browser.</p>
    </div>
  );

  if (step === "waiting") {
    const myTeam = room?.players?.[name]?.team ? TEAMS.find(t => t.id === room.players[name].team) : null;
    const others = Math.max(0, Object.keys(room?.players || {}).length - 1);
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", gap: "1.1rem" }}>
        <div className="sa-anim-float"><SAIcon name="hourglass" size={54} color="var(--tomato)" /></div>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "2.2rem", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.01em", margin: 0 }}>You're in, {name}!</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: "1rem", lineHeight: 1.5, maxWidth: 300 }}>Waiting for your teacher to start the game.</p>
        {room?.code && (
          <div style={{ marginTop: "0.6rem", background: "var(--sun)", color: "var(--on-light)", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.5rem", padding: "0.8rem 2.2rem", borderRadius: 16, letterSpacing: "0.04em" }}>Room · {room.code}</div>
        )}
        {myTeam && (
          <div style={{ marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem", color: myTeam.color, fontWeight: 700, fontSize: "0.95rem" }}>
            <SAIcon name={myTeam.icon} size={18} color={myTeam.color} /> Team {myTeam.name}{others > 0 ? ` · ${others} other${others > 1 ? "s" : ""}` : ""}
          </div>
        )}
      </div>
    );
  }

  const q = room?.currentQ;
  const phase = room?.phase;
  const myData = room?.players?.[name] || {};
  const myScore = myData.score || 0;
  const myTeam = myData.team ? TEAMS.find(t => t.id === myData.team) : null;
  const wasCorrect = q && myAnswer !== null ? checkAnswer(myAnswer, q) : false;
  const teamScores = getTeamScores(room || {});
  const sorted = Object.entries(room?.players || {}).sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  const myPos = sorted.findIndex(([n]) => n === name);

  return (
    <div style={{ minHeight: "100vh", maxWidth: 460, margin: "0 auto", padding: "1.2rem" }}>
      {/* Header — hidden on leaderboard/end (those stand alone) */}
      {!["leaderboard", "end"].includes(phase) && (
      <div className="flex justify-between items-center mb-3" style={{ gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
          <SABlob name={name} size={38} color={myTeam?.color} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            {myTeam && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: myTeam.color, fontWeight: 700 }}><SAIcon name={myTeam.icon} size={13} color={myTeam.color} />{myTeam.name}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
          <button onClick={() => { const n = !bigText; setBigText(n); writeFont(n); }} style={{ background: "transparent", border: "1.5px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", fontSize: "0.78rem", fontWeight: 700, padding: "0.35rem 0.55rem", cursor: "pointer", lineHeight: 1 }} title="Toggle text size">{bigText ? "A−" : "A+"}</button>
          <div style={{ background: "var(--sun)", color: "var(--on-light)", borderRadius: 12, padding: "0.4rem 0.9rem", textAlign: "right", lineHeight: 1 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, marginBottom: "0.15rem" }}>Score</div>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.35rem" }}><SARollingNumber value={myScore} /></div>
          </div>
        </div>
      </div>
      )}

      {phase === "leaderboard" || phase === "end" ? (
        <StudentLeaderboard room={room} name={name} showReview={showReview} setShowReview={setShowReview} />
      ) : phase === "warmup_done" ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }} className="sa-anim-pop">
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(91,139,255,0.18)", border: "2px solid var(--cobalt)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <SAIcon name="hourglass" size={32} color="var(--cobalt)" />
          </div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "1.4rem", marginBottom: "0.4rem" }}>Get ready!</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Main game starting soon…</p>
          <div className="dots mt-3"><span /><span /><span /></div>
        </div>
      ) : phase === "question" && q ? (
        <div style={{ zoom: bigText ? 1.3 : 1 }}>
          {(() => {
            const total = getTimeLimit(q);
            const urgent = room.timeLeft <= 5 && !room.paused;
            const typeLabel = q.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const mult = (myData.streak || 0) >= 1 ? (myData.streak || 0) >= 2 ? 2 : 1 : 0;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 12, background: urgent ? "var(--tomato)" : "var(--sun)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.5rem", color: "var(--on-light)" }}>{room.paused ? "‖" : room.timeLeft}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "1rem", lineHeight: 1.1 }}>Question {room.qIndex + 1} of {room.questions.length}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{typeLabel}</div>
                </div>
                {mult > 1 && (
                  <div style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid var(--sun)", borderRadius: 999, padding: "0.35rem 0.7rem 0.35rem 0.5rem" }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--tomato)", display: "inline-block" }} />
                    <span style={{ color: "var(--sun)", fontWeight: 800, fontSize: "0.9rem" }}>×{mult}</span>
                  </div>
                )}
              </div>
            );
          })()}
          <StudentAnswer q={q} myAnswer={myAnswer} onAnswer={submitAnswer}
            rearranged={rearranged} setRearranged={setRearranged}
            usedIdx={usedIdx} setUsedIdx={setUsedIdx}
            typeVal={typeVal} setTypeVal={setTypeVal}
            storyOrder={storyOrder} setStoryOrder={setStoryOrder}
            matchState={matchState} setMatchState={setMatchState}
            room={room} />
        </div>
      ) : null}

      {/* Reveal — full coral takeover */}
      {phase === "reveal" && (() => {
        const answered = myAnswer !== null;
        const streak = myData.streak || 0;
        const headline = !answered ? "Time's up!" : wasCorrect ? "Correct!" : "Missed!";
        const sub = !answered ? "No answer this round." : wasCorrect ? `+${(streak >= 2 ? 1250 : 1000).toLocaleString()} points${streak >= 2 ? " · on a streak!" : ""}` : "Streak ended.";
        const ansText = q ? (
          q.type === "word_match" ? "Match all pairs correctly"
            : q.type === "error_spotter" ? `${q.errorWord} → ${q.answer}`
              : q.type === "story_builder" ? `Order: ${(q.correctOrder || []).filter(i => i < 3).join(", ")}`
                : q.type === "stress_battle" ? `${q.word} — ${q.answer}`
                  : q.answer
        ) : "";
        return (
          <div style={{ position: "fixed", inset: 0, background: "var(--tomato)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.4rem", overflowY: "auto", textAlign: "center", gap: "0.5rem" }}>
            <div className="sa-anim-float"><SAIcon name="hourglass" size={54} color="var(--ink)" /></div>
            <h1 className="sa-anim-pop" style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "3rem", color: "var(--ink)", lineHeight: 1, margin: "0.4rem 0 0.2rem" }}>{headline}</h1>
            <p style={{ color: "var(--ink)", opacity: 0.85, fontSize: "1.05rem", fontWeight: 600, marginBottom: "1.4rem" }}>{sub}</p>
            {q && (
              <div style={{ width: "100%", maxWidth: 340 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.18em", color: "rgba(15,18,38,0.6)", marginBottom: "0.6rem" }}>CORRECT ANSWER</div>
                <div style={{ background: "var(--cream)", borderRadius: 16, padding: "1.3rem 1.2rem", boxShadow: "0 0 0 3px rgba(253,243,221,0.35)" }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "1.5rem", color: "var(--tomato)", lineHeight: 1.25 }}>{ansText}</div>
                </div>
                {q.explanation && <p style={{ color: "var(--ink)", opacity: 0.8, fontSize: "0.85rem", lineHeight: 1.45, marginTop: "0.9rem" }}>{q.explanation}</p>}
              </div>
            )}
            <div style={{ marginTop: "1.6rem", background: "var(--cream)", borderRadius: 16, padding: "0.9rem 2rem", minWidth: 200, boxShadow: "0 0 0 3px rgba(253,243,221,0.35)" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--tomato)", textTransform: "uppercase", marginBottom: "0.15rem" }}>Your score</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2.4rem", color: "var(--tomato)", lineHeight: 1 }}>{myScore.toLocaleString()}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
