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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", maxWidth: 400, margin: "0 auto" }}>
      <button className="btn btn-sm btn-ghost mb-3" onClick={onBack} style={{ alignSelf: "flex-start" }}>← Back</button>
      <div className="sa-anim-pop" style={{ background: "var(--paper)", border: "2px solid var(--ink)", borderRadius: 22, padding: 24, boxShadow: "5px 5px 0 var(--sun)", width: "100%" }}>
        <SAIcon name="hand_wave" size={36} color="var(--tomato)" />
        <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "2rem", lineHeight: 1.05, margin: "10px 0 6px", letterSpacing: "-0.02em", fontStyle: "italic" }}>Jump in.</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.2rem" }}>Enter the 4-letter code from your teacher.</p>
        <span className="label">Room Code</span>
        <input className="input input-xl mb-2" placeholder="XXXX" maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ fontFamily: "'Fraunces',serif", letterSpacing: "0.2em", border: "2.5px solid var(--line)" }} />
        <span className="label">Your Name</span>
        <input className="input" placeholder="e.g. Maria, Carlos, Ana…" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} style={{ border: "2px solid var(--line)" }} />
        {error && <p style={{ color: "var(--tomato)", marginTop: "0.5rem", fontSize: "0.85rem" }}>{error}</p>}
        <button className="btn btn-gold btn-full mt-3" onClick={join} disabled={joining} style={{ color: "var(--on-light)", borderColor: "var(--on-light)" }}>
          {joining ? "Joining…" : "Let's go →"}
        </button>
      </div>
    </div>
  );

  if (step === "waiting") {
    const myTeam = room?.players?.[name]?.team ? TEAMS.find(t => t.id === room.players[name].team) : null;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", gap: "1rem" }}>
        <SABlob name={name} size={72} color={myTeam?.color} />
        <div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.5rem", fontWeight: 900, fontStyle: "italic" }}>{name}</div>
          {myTeam && <div style={{ fontSize: "0.9rem", color: myTeam.color, marginTop: "0.25rem" }}>{myTeam.name}</div>}
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Waiting for the teacher to start…</div>
        <div className="dots"><span /><span /><span /></div>
        {room?.code && <SARoomChip code={room.code} playerCount={Object.keys(room.players || {}).length} />}
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
      {/* Result flash */}
      {showResult && phase === "reveal" && myAnswer !== null && (
        <div className="result-overlay">
          <div className="result-box sa-anim-pop">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.6rem" }}>
              {wasCorrect
                ? <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(122,220,90,0.18)", border: "2px solid var(--leaf)", display: "flex", alignItems: "center", justifyContent: "center" }}><SAIcon name="bolt" size={28} color="var(--leaf)" /></div>
                : <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,92,66,0.18)", border: "2px solid var(--tomato)", display: "flex", alignItems: "center", justifyContent: "center" }}><SAIcon name="skip" size={28} color="var(--tomato)" /></div>
              }
            </div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", fontWeight: 900, fontStyle: "italic", color: wasCorrect ? "var(--leaf)" : "var(--tomato)" }}>
              {wasCorrect ? ((myData.streak || 0) >= 2 ? "Correct! +1250" : "Correct! +1000") : "Not quite…"}
            </div>
            {wasCorrect && (myData.streak || 0) >= 2 && (
              <div style={{ marginTop: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                <SAStreakMeter count={myData.streak || 0} size="sm" />
              </div>
            )}
            {!wasCorrect && q && <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.65, lineHeight: 1.5 }}>
              {q.type === "stress_battle" ? `Correct: ${q.answer}`
                : q.type === "error_spotter" ? <span>Error: <strong style={{ color: "var(--coral)" }}>{q.errorWord}</strong> → <strong style={{ color: "var(--ink)" }}>{q.answer}</strong></span>
                  : <span>Answer: <strong style={{ color: "var(--sun)" }}>{q.type === "story_builder" ? q.correctOrder?.filter(i => i < 3).join(",") : q.answer}</strong></span>}
            </div>}
            {q?.explanation && <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", opacity: 0.4, fontStyle: "italic", lineHeight: 1.4 }}>{q.explanation}</div>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SABlob name={name} size={32} color={myTeam?.color} />
          <div>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.1 }}>{name}</div>
            {myTeam && <div style={{ fontSize: "0.65rem", color: myTeam.color, fontWeight: 600, letterSpacing: "0.02em" }}>{myTeam.name}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => { const n = !bigText; setBigText(n); writeFont(n); }} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, color: "var(--muted)", fontSize: "0.7rem", padding: "0.18rem 0.45rem", cursor: "pointer", lineHeight: 1 }} title="Toggle text size">{bigText ? "A−" : "A+"}</button>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--sun)", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.1rem", lineHeight: 1 }}><SARollingNumber value={myScore} /></div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>pts</div>
            {myTeam && <div style={{ fontSize: "0.65rem", color: myTeam.color, marginTop: "0.1rem" }}>Team: {(teamScores[myTeam.id] || 0).toLocaleString()}</div>}
          </div>
        </div>
      </div>

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
        <div style={{ fontSize: bigText ? "1.2em" : "1em" }}>
          {(() => {
            const total = getTimeLimit(q);
            const pct = Math.max(0, (room.timeLeft / total) * 100);
            const urgent = room.timeLeft <= 5 && !room.paused;
            return (
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: "0.9rem", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: urgent ? "var(--coral)" : "var(--teal)", width: `${pct}%`, transition: "width 1s linear" }} />
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
      ) : phase === "reveal" ? (
        <div className="text-center mt-4">
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: myAnswer !== null ? (wasCorrect ? "rgba(122,220,90,0.15)" : "rgba(255,92,66,0.15)") : "rgba(253,243,221,0.08)", border: `2px solid ${myAnswer !== null ? (wasCorrect ? "var(--leaf)" : "var(--tomato)") : "var(--line)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.7rem" }}>
            {myAnswer !== null
              ? <SAIcon name={wasCorrect ? "bolt" : "skip"} size={24} color={wasCorrect ? "var(--leaf)" : "var(--tomato)"} />
              : <SAIcon name="hourglass" size={24} color="var(--muted)" />
            }
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{myAnswer !== null ? "Waiting for next question…" : "Time's up!"}</p>
          {q && <div className="card mt-3" style={{ textAlign: "left" }}>
            <span className="label">Correct Answer</span>
            {q.type === "word_match" ? (
              q.pairs?.slice(0, 2).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginTop: "0.28rem", fontSize: "0.88rem" }}>
                  <strong style={{ color: "var(--sun)" }}>{p.word}</strong>
                  <span style={{ color: "var(--muted)" }}>→</span><span>{p.meaning}</span>
                </div>
              ))
            ) : q.type === "stress_battle" ? (
              <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "1.4rem", color: "var(--sun)", marginBottom: "0.8rem" }}>{q.word}</div>
                <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
                  {["A", "B"].map(label => {
                    const isCorrect = label === q.answer;
                    const wrongStress = q.stressed === 1 ? 2 : q.stressed === 3 ? 2 : 1;
                    const stressAt = isCorrect ? q.stressed : wrongStress;
                    return (
                      <div key={label} style={{ textAlign: "center", padding: "0.6rem 1rem", border: `2px solid ${isCorrect ? "var(--sun)" : "var(--line)"}`, borderRadius: 8, background: isCorrect ? "rgba(255,206,71,0.12)" : "transparent" }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", color: isCorrect ? "var(--sun)" : "var(--muted)", marginBottom: "0.4rem" }}>{label}{isCorrect ? " ✓" : ""}</div>
                        <StressDots syllables={q.syllables} stressAt={stressAt} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : q.type === "story_builder" ? (
              <div>{(q.correctOrder || []).filter(i => i < 3).map((idx, pos) => (
                <div key={idx} style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                  <span style={{ color: "var(--sun)", fontWeight: 700, marginRight: "0.35rem" }}>{pos + 1}.</span>{q.sentences[idx]}
                </div>
              ))}</div>
            ) : (
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--sun)" }}>{q.answer}</div>
            )}
          </div>}
        </div>
      ) : null}
    </div>
  );
}
