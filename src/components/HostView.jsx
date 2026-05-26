import { useState, useEffect, useRef, useMemo } from "react";
import { SALogo, SAIcon, SABlob, SATimerRing, SAConfetti, SARoomChip, TeamIcon, InGameQR, PlayersFooter, StressDots, QRDisplay, WoodenTile, Waveform, RedInkUnderline, MatchConnector, TeacherBtn } from "./ui.jsx";
import { Leaderboard } from "./Leaderboard.jsx";
import { QUESTION_BANK } from "../data/questions.js";
import { TEAMS, GAME_MODES, OPT_ICONS, checkAnswer, getTimeLimit, getTeamScores, defaultRoom } from "../lib/utils.js";
import { db, ref, set, onValue } from "../lib/firebase.js";
import { read, write, readFont, writeFont } from "../lib/storage.js";

// ─── HostReveal ────────────────────────────────────────────────────────────────
function HostReveal({ q, answers, players }) {
  const correct = Object.entries(answers).filter(([, a]) => checkAnswer(a?.v ?? a, q));
  const wrong = Object.entries(answers).filter(([, a]) => !checkAnswer(a?.v ?? a, q));
  const anyCorrect = correct.length > 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
        <SAIcon name="reveal" size={18} color="var(--sun)" />
        <span className="label" style={{ margin: 0 }}>{q.type === "odd_one_out" ? "The sentence with the error" : "Correct Answer"}</span>
      </div>
      <div className="card" style={{ borderColor: "var(--sun)", background: "rgba(255,206,71,0.07)", position: "relative", overflow: "hidden" }}>
        {anyCorrect && <SAConfetti active count={30} />}
        {q.type === "word_match" ? (
          <div>{q.pairs?.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem", fontSize: "0.9rem", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "var(--sun)" }}>{p.word}</span>
              <SAIcon name="arrow_right" size={14} color="var(--muted)" />
              <span style={{ color: "var(--ink-soft)" }}>{p.meaning}</span>
            </div>
          ))}</div>
        ) : q.type === "stress_battle" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.8rem", fontWeight: 900, letterSpacing: "0.08em", marginBottom: "1rem", fontStyle: "italic", color: "var(--sun)" }}>{q.word}</div>
            <div style={{ display: "flex", gap: "2.5rem", justifyContent: "center" }}>
              {["A", "B"].map(label => {
                const isCorrect = label === q.answer;
                const wrongStress = q.stressed === 1 ? 2 : q.stressed === 3 ? 2 : 1;
                const stressAt = isCorrect ? q.stressed : wrongStress;
                return (
                  <div key={label} style={{ textAlign: "center", padding: "0.8rem 1.4rem", borderRadius: 12, border: `2px solid ${isCorrect ? "var(--sun)" : "var(--line)"}`, background: isCorrect ? "rgba(255,206,71,0.1)" : "transparent" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.9rem", marginBottom: "0.5rem", color: isCorrect ? "var(--sun)" : "var(--muted)", letterSpacing: "0.1em" }}>{label}{isCorrect ? " ✓" : ""}</div>
                    <StressDots syllables={q.syllables} stressAt={stressAt} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : q.type === "story_builder" ? (
          <div>{(q.correctOrder || []).filter(i => i < 3).map((idx, pos) => (
            <div key={idx} style={{ fontSize: "0.88rem", marginBottom: "0.3rem", display: "flex", gap: "0.4rem" }}>
              <span style={{ color: "var(--sun)", fontWeight: 700, flexShrink: 0 }}>{pos + 1}.</span><span>{q.sentences[idx]}</span>
            </div>
          ))}</div>
        ) : q.type === "error_spotter" ? (
          <div>
            <div style={{ fontSize: "0.88rem", marginBottom: "0.4rem", lineHeight: 1.6 }}>{q.sentence?.split(" ").map((w, i) => {
              const clean = w.replace(/[.,!?;:]/g, "");
              const isErr = clean.toLowerCase() === q.errorWord?.toLowerCase();
              return <span key={i} style={{ marginRight: "0.35rem", color: isErr ? "var(--tomato)" : "var(--ink)", textDecoration: isErr ? "line-through" : "none", fontWeight: isErr ? 700 : 400 }}>{w}</span>;
            })}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--tomato)" }}>{q.errorWord}</span>
              <SAIcon name="arrow_right" size={16} color="var(--muted)" />
              <span style={{ color: "var(--sun)" }}>{q.answer}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--sun)" }}>{q.answer}</div>
        )}
        {q.explanation && <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "0.82rem" }}>{q.explanation}</p>}
      </div>
      <div className="flex gap-2 wrap mt-2">
        <div className="card" style={{ flex: 1, minWidth: 120, borderColor: "var(--leaf)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: "0.3rem" }}>
            <SAIcon name="sparkle" size={13} color="var(--leaf)" />
            <span className="label" style={{ margin: 0, color: "var(--leaf)" }}>Correct — {correct.length}</span>
          </div>
          {correct.map(([n]) => <div key={n} style={{ fontSize: "0.85rem", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: 5 }}><SABlob name={n} size={16} /> {n}</div>)}
          {!correct.length && <div style={{ opacity: 0.3, fontSize: "0.8rem" }}>Nobody yet</div>}
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, borderColor: "var(--tomato)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: "0.3rem" }}>
            <SAIcon name="target" size={13} color="var(--tomato)" />
            <span className="label" style={{ margin: 0, color: "var(--tomato)" }}>Incorrect — {wrong.length}</span>
          </div>
          {wrong.map(([n]) => <div key={n} style={{ fontSize: "0.85rem", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: 5 }}><SABlob name={n} size={16} /> {n}</div>)}
          {!wrong.length && <div style={{ opacity: 0.3, fontSize: "0.8rem" }}>Nobody</div>}
        </div>
      </div>
    </div>
  );
}

// ─── HostQuestion ──────────────────────────────────────────────────────────────
function HostQuestion({ q, timeLeft, answers, players, qIndex, total, mode, teams, teamScores, paused, onPause, onRepeat, onReveal, onSkip, onSkipWarmup, bigText, onToggleFont }) {
  const ansCount = Object.keys(answers).length;
  const pCount = Object.keys(players).length;
  const shuffledRearrange = useMemo(() => q.type === "rearrange" ? [...(q.words || [])].sort(() => Math.random() - 0.5) : [], [q.question]);
  const typeColors = { multiple_choice: "var(--tomato)", true_false: "var(--leaf)", error_spotter: "var(--tomato)", type_answer: "var(--cobalt)", rearrange: "var(--sun)", story_builder: "var(--plum)", fill_idiom: "var(--sun)", word_match: "var(--aqua)", odd_one_out: "var(--tomato)", stress_battle: "var(--cobalt)" };
  const tc = typeColors[q.type] || "var(--tomato)";

  return (
    <div className="mt-3">
      <div style={{ display: "flex", gap: 3, marginBottom: "0.75rem" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < qIndex ? "var(--leaf)" : i === qIndex ? "var(--sun)" : "var(--line)", transition: "background 0.3s" }} />
        ))}
      </div>

      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 6px", background: tc, color: "var(--on-dark)", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
            <SAIcon name={q.type} size={12} color="var(--on-dark)" />
            <span>{q.type.replace(/_/g, " ")}</span>
          </div>
          {q._warmup && <span className="badge" style={{ background: "rgba(255,206,71,0.15)", color: "var(--sun)", border: "1px solid rgba(255,206,71,0.3)" }}>WARM UP</span>}
        </div>
        <div className="flex gap-2 items-center">
          {paused && <span style={{ fontSize: "0.68rem", color: "var(--tomato)", fontWeight: 700, letterSpacing: "0.05em" }}>PAUSED</span>}
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: "var(--muted)" }}>Q{qIndex + 1}/{total}</span>
        </div>
      </div>

      {mode === "teams" && (
        <div className="flex gap-1 wrap mb-2">
          {teams.map(t => <span key={t.id} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.8rem", background: t.color, color: "var(--on-dark)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><TeamIcon icon={t.icon} color="var(--on-dark)" size={14} />{(teamScores[t.id] || 0).toLocaleString()}</span>)}
        </div>
      )}

      <div className="flex justify-center mb-3">
        <SATimerRing value={timeLeft} max={getTimeLimit(q)} size={110} />
      </div>

      <h2 className="sa-anim-slide" style={{ fontSize: "clamp(1.1rem,2.6vw,1.55rem)", lineHeight: 1.4, textAlign: "center", marginBottom: "1.2rem", maxWidth: 680, margin: "0 auto 1.2rem", fontFamily: "'Fraunces',serif" }}>{q.question}</h2>

      {q.type === "rearrange" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(180deg,#6b4a2a 0%,#4a3320 100%)", borderRadius: 14, padding: "18px 16px 22px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", boxShadow: "inset 0 4px 8px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.3)" }}>
            {shuffledRearrange.map((w, i) => (
              <WoodenTile key={i} word={w} size="lg" angle={(i % 2 === 0 ? -1.2 : 1.4)} valueNum={Math.max(1, Math.min(8, w.length - 1))} />
            ))}
          </div>
        </div>
      )}
      {q.type === "multiple_choice" && q.options && (
        <div className="opt-grid">{q.options.map((o, i) => <div key={i} className={`opt-btn opt-${i}`}><span className="opt-icon">{OPT_ICONS[i]}</span>{o}</div>)}</div>
      )}
      {q.type === "odd_one_out" && q.options && (
        <div className="opt-grid">{q.options.map((o, i) => <div key={i} className={`opt-btn opt-${i % 4}`} style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic", color: `var(--${["tomato", "cobalt", "leaf", "plum"][i % 4]})` }}>{o}</div>)}</div>
      )}
      {q.type === "true_false" && (
        <div className="flex gap-2 mt-2">
          <div className="opt-btn opt-2" style={{ justifyContent: "center", flex: 1, fontWeight: 700, fontFamily: "'Fraunces',serif", fontSize: "1.4rem" }}>✓ True</div>
          <div className="opt-btn opt-0" style={{ justifyContent: "center", flex: 1, fontWeight: 700, fontFamily: "'Fraunces',serif", fontSize: "1.4rem" }}>✕ False</div>
        </div>
      )}
      {q.type === "story_builder" && q.sentences && <div className="mt-2">{q.sentences.slice(0, 3).map((s, i) => <div key={i} className="story-card" style={{ cursor: "default" }}><span className="story-num">{i + 1}</span>{s}</div>)}</div>}
      {q.type === "word_match" && q.pairs && (() => {
        const colors = ["var(--tomato)", "var(--cobalt)"];
        const pairs2 = q.pairs.slice(0, 2);
        const rOrder = [1, 0];
        const rowY = (i) => 28 + i * 44;
        return (
          <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", minHeight: 200 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {pairs2.map((_, i) => {
                const rIdx = rOrder.indexOf(i);
                return <MatchConnector key={i} from={{ x: 36, y: rowY(i) }} to={{ x: 64, y: rowY(rIdx) }} color={colors[i]} dashed />;
              })}
            </svg>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, padding: "8px 6px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {pairs2.map((p, i) => (
                  <div key={i} style={{ background: "var(--paper)", border: `2.5px solid ${colors[i]}`, borderRadius: 12, padding: "12px 16px", fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20, color: colors[i], boxShadow: `3px 3px 0 ${colors[i]}55`, transform: `rotate(${i === 0 ? -1.5 : 1.5}deg)` }}>{p.word}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {rOrder.map((origIdx, displayIdx) => (
                  <div key={displayIdx} style={{ background: "var(--cream)", border: `2px dashed ${colors[origIdx]}`, borderRadius: 12, padding: "12px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "var(--ink-soft)", fontWeight: 500, transform: `rotate(${displayIdx === 0 ? 1 : -1}deg)` }}>{pairs2[origIdx].meaning}</div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      {q.type === "stress_battle" && (
        <div style={{ textAlign: "center", marginTop: "0.5rem", maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 24, padding: "22px 30px", background: "var(--paper)", borderRadius: 18, border: "2px solid var(--ink)", boxShadow: "4px 4px 0 var(--ink)" }}>
            {(Array.isArray(q.syllables) ? q.syllables : Array.from({length: q.syllables || 0}, (_, i) => `${i+1}`)).map((s, i) => {
              const isStressed = (i + 1) === q.stressed;
              return (
                <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className={isStressed ? "sa-anim-pulse" : ""}><Waveform color={isStressed ? "var(--tomato)" : "var(--muted)"} stress={isStressed ? 1 : 0.25} size={1.1} /></div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: isStressed ? 52 : 34, fontWeight: 900, letterSpacing: "-0.01em", textTransform: "uppercase", color: isStressed ? "var(--ink)" : "var(--muted)", fontStyle: isStressed ? "italic" : "normal", transition: "all 0.3s" }}>{s}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: isStressed ? "var(--tomato)" : "var(--muted)", letterSpacing: "0.15em", fontWeight: 700 }}>{isStressed ? "STRESS" : `· ${i + 1} ·`}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 999, color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: "0.04em" }}>
            <SAIcon name="play" size={12} color="var(--tomato)" /><span>{q.word}</span>
          </div>
        </div>
      )}
      {q.type === "fill_idiom" && q.options && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontStyle: "italic", color: "var(--ink-soft)", marginBottom: "1rem" }}>
            {q.question.replace("___", "______")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxWidth: 500, margin: "0 auto" }}>
            {q.options.map((o, i) => <div key={i} className={`opt-btn opt-${i}`} style={{ justifyContent: "center", fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.1rem" }}>{o}</div>)}
          </div>
        </div>
      )}

      {q.type === "error_spotter" && q.sentence && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ background: "var(--paper)", borderRadius: 14, padding: "22px 28px", position: "relative", overflow: "hidden", backgroundImage: `repeating-linear-gradient(180deg, transparent 0 28px, var(--line) 28px 29px)`, backgroundPosition: "0 16px", border: "1.5px solid var(--line)" }}>
            <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 1.5, background: "rgba(255,92,66,0.5)" }} />
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "clamp(1.1rem,2.4vw,1.6rem)", lineHeight: 1.65, letterSpacing: "-0.005em", paddingLeft: 18, display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "baseline", position: "relative" }}>
              {q.sentence.split(" ").map((word, i) => {
                const clean = word.replace(/[.,!?;:]/g, "");
                const isError = clean === q.errorWord;
                return (
                  <span key={i} style={{ position: "relative", paddingBottom: 4, color: isError ? "var(--tomato)" : "var(--ink)", fontStyle: isError ? "italic" : "normal" }}>
                    {word}
                    {isError && <RedInkUnderline />}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-3">
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.2rem" }}>Answered</div>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: "2.2rem", fontWeight: 900, color: "var(--leaf)", lineHeight: 1 }}>{ansCount}<span style={{ color: "var(--muted)", fontSize: "1.2rem" }}>/{pCount}</span></div>
        <div className="flex wrap justify-center gap-1 mt-1">
          {Object.keys(answers).map(n => (
            <div key={n} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px 2px 3px", background: "rgba(122,220,90,0.12)", border: "1.5px solid var(--leaf)", borderRadius: 999 }} className="sa-anim-pop">
              <SABlob name={n} size={18} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {(onPause || onRepeat || onReveal || onSkip) && (
        <div style={{ marginTop: "1rem", padding: "10px 12px", background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 12, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", width: "100%", textAlign: "center", marginBottom: 4 }}>Teacher controls</div>
          {onPause && <TeacherBtn icon="pause" label={paused ? "Resume" : "Pause"} onClick={onPause} variant={paused ? "active" : "default"} />}
          {onRepeat && <TeacherBtn icon="repeat" label="Repeat" onClick={onRepeat} />}
          {onReveal && <TeacherBtn icon="reveal" label="Reveal" onClick={onReveal} variant="primary" />}
          {onSkip && <TeacherBtn icon="skip" label="Skip" onClick={onSkip} variant="ghost" />}
          {onSkipWarmup && <TeacherBtn icon="skip" label="Skip Warm-Up" onClick={onSkipWarmup} variant="ghost" />}
          {onToggleFont && <TeacherBtn label={bigText ? "A−" : "A+"} onClick={onToggleFont} />}
        </div>
      )}
    </div>
  );
}

// ─── HostView ──────────────────────────────────────────────────────────────────
export default function HostView({ onBack }) {
  const [room, setRoomState] = useState(() => defaultRoom());
  const roomRef = useRef(room); // same initial value — shares the same room code

  const [selectedTopic, setSelectedTopic] = useState("");
  const [gameType, setGameType] = useState("mixed");
  const [qCount, setQCount] = useState(8);
  const [error, setError] = useState("");
  const [bigText, setBigText] = useState(() => readFont());
  const [showReview, setShowReview] = useState(false);
  const [fbStatus, setFbStatus] = useState(db ? "checking" : "none");
  const timerRef = useRef(null);

  // Sync room ref with state
  const setRoom = (newRoom) => {
    roomRef.current = newRoom;
    setRoomState(newRoom);
  };

  // Write to Firebase and localStorage — called imperatively, not via effect
  const syncState = (r) => {
    try { localStorage.setItem("englishgame_v2", JSON.stringify(r)); } catch {}
    if (db && r?.code) {
      set(ref(db, `rooms/${r.code}`), r)
        .then(() => setFbStatus("ok"))
        .catch(() => setFbStatus("error"));
    }
  };

  const upd = (fn) => {
    const prev = roomRef.current;
    const next = typeof fn === "function" ? fn(prev) : { ...prev, ...fn };
    setRoom(next);
    syncState(next);
  };

  // Write initial room to Firebase on mount so students can find it immediately via QR/code
  useEffect(() => { syncState(roomRef.current); }, []);

  // Listen ONLY to /players and /answers sub-paths — avoids overwriting teacher's game state
  useEffect(() => {
    const code = roomRef.current.code;
    if (!db) {
      const id = setInterval(() => {
        const s = read();
        if (!s || s.code !== code) return;
        const np = s.players || {}, na = s.answers || {};
        if (JSON.stringify(roomRef.current.players) === JSON.stringify(np) &&
            JSON.stringify(roomRef.current.answers) === JSON.stringify(na)) return;
        const next = { ...roomRef.current, players: np, answers: na };
        roomRef.current = next;
        setRoomState(next);
      }, 700);
      return () => clearInterval(id);
    }

    const unsubPlayers = onValue(ref(db, `rooms/${code}/players`), snap => {
      const np = snap.val() || {};
      if (JSON.stringify(roomRef.current.players) === JSON.stringify(np)) return;
      const next = { ...roomRef.current, players: np };
      roomRef.current = next;
      setRoomState(next);
    });

    const unsubAnswers = onValue(ref(db, `rooms/${code}/answers`), snap => {
      const na = snap.val() || {};
      if (JSON.stringify(roomRef.current.answers) === JSON.stringify(na)) return;
      const next = { ...roomRef.current, answers: na };
      roomRef.current = next;
      setRoomState(next);
    });

    return () => { unsubPlayers(); unsubAnswers(); };
  }, [room.code]);

  // Timer — reads from roomRef to avoid stale closure
  useEffect(() => {
    clearInterval(timerRef.current);
    if (room.phase !== "question") return;
    timerRef.current = setInterval(() => {
      const prev = roomRef.current;
      if (prev.phase !== "question") { clearInterval(timerRef.current); return; }
      if (prev.paused) return;
      const next = prev.timeLeft <= 1
        ? { ...prev, phase: "reveal", timeLeft: 0 }
        : { ...prev, timeLeft: prev.timeLeft - 1 };
      setRoom(next);
      syncState(next);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [room.phase, room.qIndex]);

  useEffect(() => {
    if (selectedTopic === "stress_battle") setQCount(15);
  }, [selectedTopic]);

  const loadQuestions = () => {
    if (!selectedTopic) { setError("Select a topic first!"); return; }
    const bank = QUESTION_BANK[selectedTopic].questions;
    let pool = (gameType === "mixed" || selectedTopic === "stress_battle") ? bank : bank.filter(q => q.type === gameType);
    if (!pool.length) { setError("No questions of that type for this topic."); return; }
    const qs = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(qCount, pool.length));
    setError("");
    upd(prev => ({ ...prev, questions: qs, topic: QUESTION_BANK[selectedTopic].label, gameType, phase: "lobby" }));
  };

  const autoAssign = () => {
    const names = Object.keys(roomRef.current.players || {});
    if (!names.length) return;
    upd(prev => {
      const updated = { ...prev, players: { ...prev.players }, teamsLocked: true };
      names.forEach((n, i) => { updated.players[n] = { ...updated.players[n], team: TEAMS[i % prev.teamCount].id }; });
      return updated;
    });
  };

  const startGame = () => {
    if (!roomRef.current.questions.length) return;
    window.scrollTo(0, 0);
    upd(prev => {
      let qs = prev.questions;
      let warmupCount = 0;
      if (prev.warmup && selectedTopic && QUESTION_BANK[selectedTopic]) {
        const pool = QUESTION_BANK[selectedTopic].questions;
        const fastPool = pool.filter(q => ["multiple_choice", "true_false"].includes(q.type));
        const warmupPool = fastPool.length >= 3 ? fastPool : pool;
        const warmupQs = [...warmupPool].sort(() => Math.random() - 0.5).slice(0, 3).map(q => ({ ...q, _warmup: true }));
        qs = [...warmupQs, ...prev.questions];
        warmupCount = 3;
      }
      const q = qs[0];
      if (!q) return prev;
      return { ...prev, phase: "question", qIndex: 0, currentQ: q, timeLeft: q._warmup ? 15 : getTimeLimit(q), answers: {}, questions: qs, warmupCount, paused: false };
    });
  };

  const advance = () => {
    upd(prev => {
      const q = prev.currentQ;
      const isWarmupQ = !!q?._warmup;
      const players = { ...(prev.players || {}) };
      const answered = prev.answers || {};
      let firstCorrect = null;
      if (!isWarmupQ) {
        Object.entries(answered).forEach(([name, ans]) => {
          if (!players[name]) players[name] = { score: 0, streak: 0 };
          const val = ans?.v ?? ans;
          const correct = checkAnswer(val, q);
          const bonus = correct && (players[name].streak || 0) >= 1 ? 250 : 0;
          players[name] = { ...players[name], score: (players[name].score || 0) + (correct ? 1000 + bonus : 0), streak: correct ? (players[name].streak || 0) + 1 : 0, correct, lastAnswer: val };
        });
        Object.keys(players).forEach(name => {
          if (!answered[name]) players[name] = { ...players[name], streak: 0, correct: false };
        });
        const correctEntries = Object.entries(answered).filter(([, a]) => checkAnswer(a?.v ?? a, q));
        if (correctEntries.length > 0) {
          firstCorrect = correctEntries.sort(([, a], [, b]) => (a?.ts || 0) - (b?.ts || 0))[0][0];
        }
      }
      const nextIdx = prev.qIndex + 1;
      if (nextIdx >= prev.questions.length) return { ...prev, players, phase: "end", answers: {}, firstCorrect: null };
      const nextQ = prev.questions[nextIdx];
      if (isWarmupQ) {
        if (nextIdx < prev.warmupCount) return { ...prev, players, phase: "question", timeLeft: 15, qIndex: nextIdx, currentQ: nextQ, answers: {}, paused: false, firstCorrect: null };
        return { ...prev, players, phase: "warmup_done", qIndex: nextIdx, currentQ: nextQ, answers: {}, firstCorrect: null };
      }
      return { ...prev, players, phase: "leaderboard", qIndex: nextIdx, currentQ: nextQ, answers: {}, firstCorrect };
    });
  };

  const goNextQuestion = () => {
    window.scrollTo(0, 0);
    upd(prev => ({ ...prev, phase: "question", timeLeft: getTimeLimit(prev.currentQ), paused: false, firstCorrect: null }));
  };

  const replayQuestion = () => {
    upd(prev => ({ ...prev, phase: "question", timeLeft: getTimeLimit(prev.currentQ), answers: {}, paused: false, firstCorrect: null }));
  };

  const skipQuestion = () => {
    upd(prev => ({ ...prev, phase: "reveal", timeLeft: 0, answers: {}, firstCorrect: null }));
  };

  const skipWarmup = () => {
    upd(prev => {
      const nextQ = prev.questions[prev.warmupCount];
      if (!nextQ) return prev;
      return { ...prev, phase: "warmup_done", qIndex: prev.warmupCount, currentQ: nextQ, answers: {}, firstCorrect: null };
    });
  };

  const endEarly = () => {
    clearInterval(timerRef.current);
    const prev = roomRef.current;
    if (prev.phase === "question") upd({ ...prev, phase: "reveal", timeLeft: 0 });
  };

  // Auto-advance when all players have answered
  const ansCount = Object.keys(room.answers || {}).length;
  const pCount = Object.keys(room.players || {}).length;
  useEffect(() => {
    if (room.phase !== "question" || pCount === 0 || ansCount < pCount || room.paused) return;
    const t = setTimeout(endEarly, 700);
    return () => clearTimeout(t);
  }, [ansCount, pCount, room.phase, room.paused]);

  const reset = () => {
    const r = defaultRoom();
    setRoom(r);
    syncState(r);
    setSelectedTopic("");
    setGameType("mixed");
  };

  const buildSummary = (questions, topic) => {
    const lines = [`=== English Arena · ${topic} ===\n`];
    questions.forEach((q, i) => {
      lines.push(`Q${i + 1}. ${q.question}${q.sentence ? " " + q.sentence : ""}`);
      const ans = q.type === "error_spotter" ? `${q.errorWord} → ${q.answer}` :
        q.type === "story_builder" ? `Order: ${(q.correctOrder || []).filter(x => x < 3).join(",")}` :
          q.type === "word_match" ? "Match all pairs correctly" : q.answer;
      lines.push(`Answer: ${ans}`);
      if (q.explanation) lines.push(`Note: ${q.explanation}`);
      lines.push("");
    });
    return lines.join("\n");
  };

  const players = Object.entries(room.players || {});
  const sorted = [...players].sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  const teamScores = getTeamScores(room);
  const activeTeams = TEAMS.slice(0, room.teamCount);
  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?join=${room.code}` : "";

  return (
    <div className="panel">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 wrap gap-1">
        <SALogo size={24} />
        <div className="flex gap-1 wrap">
          {room.phase !== "lobby" && <button className="btn btn-sm btn-ghost" onClick={() => upd(p => ({ ...p, phase: "leaderboard" }))}>Scores</button>}
          <button className="btn btn-sm btn-ghost" onClick={reset}>New</button>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>Exit</button>
        </div>
      </div>

      {/* Lobby: code + QR + players */}
      {room.phase === "lobby" && (
        <div style={{ marginTop: "1rem" }}>
          {fbStatus === "error" && (
            <div style={{ padding: "0.6rem 0.8rem", marginBottom: "0.75rem", borderRadius: 8, background: "rgba(255,92,66,0.12)", border: "1.5px solid var(--tomato)", fontSize: "0.8rem", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--tomato)" }}>Firebase not reachable.</strong> Students won't be able to join. Check your Firebase security rules — set <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem" }}>.read</code> and <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem" }}>.write</code> to <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem" }}>true</code>.
            </div>
          )}
          {fbStatus === "none" && (
            <div style={{ padding: "0.6rem 0.8rem", marginBottom: "0.75rem", borderRadius: 8, background: "rgba(91,139,255,0.1)", border: "1.5px solid var(--cobalt)", fontSize: "0.8rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Firebase not configured — multiplayer requires a Firebase Realtime Database. Solo mode works without it.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <SARoomChip code={room.code} playerCount={players.length} />
            <QRDisplay url={qrUrl} />
            <p style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>Students scan QR or visit the URL and enter room code <strong style={{ color: "var(--sun)" }}>{room.code}</strong></p>
          </div>
          {players.length > 0 && (
            <div className="card" style={{ textAlign: "left" }}>
              <span className="label">Players joined</span>
              <div className="flex wrap gap-1 mt-1">
                {players.map(([name, p]) => {
                  const team = room.mode === "teams" ? TEAMS.find(t => t.id === p.team) : null;
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 3px", background: team ? `${team.color}22` : "var(--paper)", border: `1.5px solid ${team ? team.color : "var(--line)"}`, borderRadius: 999 }} className="sa-anim-pop">
                      <SABlob name={name} size={22} color={team ? team.color : undefined} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-game fixed overlays */}
      {room.phase !== "lobby" && (
        <>
          <div style={{ position: "fixed", bottom: "1rem", left: "1rem", zIndex: 50 }}>
            <SARoomChip code={room.code} playerCount={players.length} />
          </div>
          {(room.phase === "question" || room.phase === "reveal") && <InGameQR url={qrUrl} />}
        </>
      )}

      {/* Lobby: ready to start */}
      {room.phase === "lobby" && room.questions.length > 0 && (
        <div className="mt-3">
          <div className="card card-gold mb-2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Ready</div>
                <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.05rem" }}>{room.questions.length} questions · <span style={{ color: "var(--sun)" }}>{room.topic}</span></div>
              </div>
              <SAIcon name="sparkle" size={22} color="var(--sun)" />
            </div>
            <label style={{ fontSize: "0.79rem", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.7rem" }}>
              <input type="checkbox" checked={room.warmup} onChange={e => upd(p => ({ ...p, warmup: e.target.checked }))} style={{ accentColor: "var(--sun)", cursor: "pointer" }} />
              Warm-up round (3 quick questions)
            </label>
            <button className="btn btn-green btn-full" style={{ fontSize: "1rem", color: "var(--on-light)", borderColor: "var(--on-light)" }} onClick={startGame}>Start Game →</button>
          </div>
          <span className="label">Game Mode</span>
          <div className="mode-toggle">
            <button className={`mode-btn ${room.mode === "solo" ? "active" : ""}`} onClick={() => upd(p => ({ ...p, mode: "solo" }))}>Solo — Individual</button>
            <button className={`mode-btn ${room.mode === "teams" ? "active" : ""}`} onClick={() => upd(p => ({ ...p, mode: "teams" }))}>Teams</button>
          </div>
          {room.mode === "teams" && (
            <div className="card card-gold mb-2">
              <span className="label">Team Setup</span>
              <div className="flex items-center gap-2 mt-1 mb-2 wrap">
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Teams:</span>
                {[2, 3, 4].map(n => (
                  <button key={n} className={`btn btn-sm ${room.teamCount === n ? "btn-gold" : "btn-ghost"}`} onClick={() => upd(p => ({ ...p, teamCount: n }))}>{n}</button>
                ))}
              </div>
              <div className="team-grid">
                {activeTeams.map(t => {
                  const members = players.filter(([, p]) => p.team === t.id).map(([n]) => n);
                  return (
                    <div key={t.id} className="team-card" style={{ borderColor: t.color, color: t.color }}>
                      <div style={{ fontSize: "1.4rem" }}>{t.emoji}</div>
                      <div className="team-card-name">{t.name}</div>
                      <div className="team-card-count">{members.length} member{members.length !== 1 ? "s" : ""}</div>
                      {members.length > 0 && <div className="team-members" style={{ color: "rgba(255,255,255,0.55)" }}>{members.join(", ")}</div>}
                    </div>
                  );
                })}
              </div>
              {players.length > 0 && !room.teamsLocked && <button className="btn btn-teal btn-sm mt-2" onClick={autoAssign}>⚡ Auto-assign players</button>}
              {room.teamsLocked && <p className="text-green mt-1" style={{ fontSize: "0.8rem" }}>✓ Teams assigned!</p>}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => upd(p => ({ ...p, questions: [], topic: "", phase: "lobby" }))}>← Change topic</button>
        </div>
      )}

      {/* Lobby: setup (no questions yet) */}
      {room.phase === "lobby" && room.questions.length === 0 && (
        <div className="mt-3">
          <span className="label">Game Mode</span>
          <div className="mode-toggle">
            <button className={`mode-btn ${room.mode === "solo" ? "active" : ""}`} onClick={() => upd(p => ({ ...p, mode: "solo" }))}>Solo — Individual</button>
            <button className={`mode-btn ${room.mode === "teams" ? "active" : ""}`} onClick={() => upd(p => ({ ...p, mode: "teams" }))}>Teams</button>
          </div>
          {room.mode === "teams" && (
            <div className="card card-gold mb-2">
              <span className="label">Team Setup</span>
              <div className="flex items-center gap-2 mt-1 mb-2 wrap">
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Teams:</span>
                {[2, 3, 4].map(n => (
                  <button key={n} className={`btn btn-sm ${room.teamCount === n ? "btn-gold" : "btn-ghost"}`} onClick={() => upd(p => ({ ...p, teamCount: n }))}>{n}</button>
                ))}
              </div>
              <div className="team-grid">
                {activeTeams.map(t => {
                  const members = players.filter(([, p]) => p.team === t.id).map(([n]) => n);
                  return (
                    <div key={t.id} className="team-card" style={{ borderColor: t.color, color: t.color }}>
                      <SAIcon name={t.icon || "star"} size={22} color={t.color} />
                      <div className="team-card-name">{t.name}</div>
                      <div className="team-card-count">{members.length} member{members.length !== 1 ? "s" : ""}</div>
                      {members.length > 0 && <div className="team-members" style={{ color: "var(--muted)" }}>{members.join(", ")}</div>}
                    </div>
                  );
                })}
              </div>
              {players.length > 0 && !room.teamsLocked && <button className="btn btn-teal btn-sm mt-2" onClick={autoAssign}>Auto-assign players</button>}
              {room.teamsLocked && <p className="text-green mt-1" style={{ fontSize: "0.8rem" }}>Teams assigned</p>}
            </div>
          )}
          <span className="label">Topic</span>
          {(() => {
            const noSB = new Set(["verb_tenses", "present_perfect"]);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: "0.4rem", marginBottom: "0.75rem", maxHeight: "260px", overflowY: "auto", padding: "0.5rem", border: "1px solid var(--line)", borderRadius: 10 }}>
                {Object.entries(QUESTION_BANK).map(([key, { label }]) => {
                  const dis = gameType === "stress_battle" && noSB.has(key);
                  const sel = selectedTopic === key;
                  return (
                    <button key={key} disabled={dis} onClick={() => !dis && setSelectedTopic(key)}
                      style={{ padding: "0.55rem 0.6rem", fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: sel ? 700 : 400, border: `1.5px solid ${sel ? "var(--sun)" : "var(--line)"}`, background: sel ? "rgba(255,206,71,0.12)" : "transparent", color: sel ? "var(--sun)" : dis ? "var(--muted)" : "var(--muted)", cursor: dis ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.12s", borderRadius: 8, opacity: dis ? 0.35 : 1 }}>{label}</button>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex gap-2 mb-2 wrap">
            <div style={{ flex: 2, minWidth: 180 }}>
              <span className="label">Game Type</span>
              <select className="select" value={gameType} onChange={e => setGameType(e.target.value)}>
                {GAME_MODES.map(g => <option key={g.v} value={g.v}>{g.label} — {g.desc}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <span className="label">Questions</span>
              <select className="select" value={qCount} onChange={e => setQCount(+e.target.value)}>
                {[8, 10, 12, 15].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-coral mb-1" style={{ fontSize: "0.85rem" }}>{error}</p>}
          <button className="btn btn-gold btn-full" onClick={loadQuestions} disabled={!selectedTopic} style={{ color: "var(--on-light)", borderColor: "var(--on-light)" }}>
            Load Questions →
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.4rem" }}>Students can join via the QR above while you set up</p>
        </div>
      )}

      {/* Question phase */}
      {room.phase === "question" && room.currentQ && (
        <>
          <div style={{ fontSize: bigText ? "1.2em" : "1em" }}>
            <HostQuestion q={room.currentQ} timeLeft={room.timeLeft} answers={room.answers || {}}
              players={room.players || {}} qIndex={room.qIndex} total={room.questions.length}
              mode={room.mode} teams={activeTeams} teamScores={teamScores} paused={room.paused}
              onPause={() => upd(p => ({ ...p, paused: !p.paused }))}
              onRepeat={() => upd(p => ({ ...p, timeLeft: getTimeLimit(p.currentQ) }))}
              onReveal={() => endEarly()}
              onSkip={skipQuestion}
              onSkipWarmup={room.currentQ?._warmup ? skipWarmup : undefined}
              bigText={bigText}
              onToggleFont={() => { const n = !bigText; setBigText(n); writeFont(n); }} />
          </div>
          <PlayersFooter players={players} mode={room.mode} />
        </>
      )}

      {/* Reveal phase */}
      {room.phase === "reveal" && room.currentQ && (
        <div className="mt-3">
          <HostReveal q={room.currentQ} answers={room.answers || {}} players={room.players || {}} />
          <div className="flex gap-2 mt-3 wrap">
            <button className="btn btn-gold" style={{ flex: 1, color: "var(--on-light)", borderColor: "var(--on-light)" }} onClick={advance}>
              {room.currentQ?._warmup ? "Next →" : room.qIndex + 1 >= room.questions.length ? "Final Results →" : "Show Scores →"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={replayQuestion} title="Show this question again">Replay</button>
            {room.currentQ?._warmup && <button className="btn btn-ghost btn-sm" onClick={skipWarmup} title="Skip the rest of the warm-up">Skip Warm-Up</button>}
          </div>
          <PlayersFooter players={players} mode={room.mode} />
        </div>
      )}

      {/* Warm-up done */}
      {room.phase === "warmup_done" && (
        <div className="card mt-4" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <SAIcon name="sparkle" size={40} color="var(--sun)" />
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: "0.6rem 0 0.4rem", fontStyle: "italic" }}>Warm-Up Complete!</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem" }}>Students are warmed up and ready.</p>
          <button className="btn btn-green btn-full" style={{ fontSize: "1rem", color: "var(--on-light)", borderColor: "var(--on-light)" }} onClick={goNextQuestion}>Start Main Game →</button>
        </div>
      )}

      {/* Leaderboard / End */}
      {(room.phase === "leaderboard" || room.phase === "end") && (
        <>
          <Leaderboard sorted={sorted} mode={room.mode} teams={activeTeams}
            teamScores={teamScores} isEnd={room.phase === "end"} room={room} />
          {room.phase === "leaderboard" && (
            <button className="btn btn-gold mt-3" onClick={goNextQuestion}>Next Question →</button>
          )}
          {room.phase === "end" && (
            <>
              <button className="btn btn-ghost btn-full mt-3" onClick={() => setShowReview(v => !v)}>
                📚 {showReview ? "Hide" : "Review"} Questions
              </button>
              {showReview && (() => {
                const mainQs = room.questions.filter(q => !q._warmup);
                return (
                  <div className="card mt-2" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigator.clipboard.writeText(buildSummary(mainQs, room.topic))}>
                      📋 Copy as text
                    </button>
                    {mainQs.map((q, i) => (
                      <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "0.7rem", marginBottom: "0.7rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.4 }}>Q{i + 1}. {q.question}{q.sentence ? " " + q.sentence : ""}</div>
                        <div style={{ color: "var(--teal)", fontSize: "0.8rem", marginTop: "0.2rem" }}>✔ {q.type === "error_spotter" ? `${q.errorWord} → ${q.answer}` : q.type === "story_builder" ? `Order: ${(q.correctOrder || []).filter(x => x < 3).join(",")}` : q.type === "word_match" ? "Match all pairs" : q.answer}</div>
                        {q.explanation && <div className="op50" style={{ fontSize: "0.76rem", marginTop: "0.15rem", lineHeight: 1.4 }}>{q.explanation}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}
