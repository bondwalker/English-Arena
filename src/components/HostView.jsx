import { useState, useEffect, useRef, useMemo } from "react";
import { SALogo, SAIcon, SABlob, SATimerRing, SAConfetti, SARoomChip, TeamIcon, InGameQR, PlayersFooter, StressDots, QRDisplay, WoodenTile, Waveform, MatchConnector, TeacherBtn } from "./ui.jsx";
import { Leaderboard } from "./Leaderboard.jsx";
import { QUESTION_BANK } from "../data/questions.js";
import { TEAMS, GAME_MODES, OPT_ICONS, OPT_COLORS, ordinal, stressBreakdown, reviewPrompt, reviewAnswer, correctedSentence, typesForMode, checkAnswer, getTimeLimit, getTeamScores, defaultRoom } from "../lib/utils.js";
import { db, ref, set, onValue } from "../lib/firebase.js";
import { read, write, readFont, writeFont } from "../lib/storage.js";

// ─── HostReveal — coral takeover ─────────────────────────────────────────────────
function HostReveal({ q, answers, players, onNext, nextLabel, onReplay, warmup, onSkipWarmup }) {
  const correct = Object.entries(answers).filter(([, a]) => checkAnswer(a?.v ?? a, q)).length;
  const pCount = Object.keys(players).length;
  const missed = Math.max(0, pCount - correct);
  const pill = pCount === 0 ? "The answer" : correct === 0 ? "Not this time" : correct === pCount ? "Everyone got it!" : "Answer revealed";
  const isStress = q.type === "stress_battle";
  const sN = Array.isArray(q.syllables) ? q.syllables.length : (q.syllables || 2);
  const sStressed = q.stressed || 1;
  const letter = q.type === "multiple_choice" && q.options ? OPT_ICONS[q.options.indexOf(q.answer)] : null;
  const ansText =
    q.type === "word_match" ? "Match all pairs correctly"
      : q.type === "hangman" ? q.word
        : q.type === "error_spotter" ? correctedSentence(q)
          : q.type === "story_builder" ? `Order: ${(q.correctOrder || []).filter(i => i < 3).map(i => i + 1).join(", ")}`
            : q.answer;
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--sun)", color: "var(--on-light)", zIndex: 60, display: "flex", flexDirection: "column", padding: "clamp(1.5rem,4vw,3.5rem)", overflow: "hidden" }}>
      {letter && <div style={{ position: "absolute", left: "-2vw", top: "50%", transform: "translateY(-50%)", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "50vh", color: "rgba(15,18,38,0.09)", lineHeight: 0.8, pointerEvents: "none", fontStyle: "italic" }}>{letter}</div>}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", maxWidth: 1100, margin: "0 auto", width: "100%", justifyContent: "center", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.4rem" }}>
          <span style={{ border: "1.5px solid rgba(15,18,38,0.5)", borderRadius: 999, padding: "0.5rem 1.3rem", fontWeight: 700, fontSize: "1rem", color: "var(--on-light)" }}>{pill}</span>
        </div>
        {isStress ? (
          <div className="sa-anim-pop" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.4rem" }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "clamp(2.4rem,6vw,4.5rem)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--on-light)", lineHeight: 1 }}>{q.word}</div>
            <StressDots syllables={sN} stressAt={sStressed} size="lg" color="var(--on-light)" dim="rgba(15,18,38,0.35)" glow={false} />
            {Array.isArray(q.syllables) && <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "clamp(2rem,4.5vw,3.4rem)", letterSpacing: "0.02em", color: "var(--on-light)" }}>{stressBreakdown(q.syllables, sStressed)}</div>}
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.1rem,2vw,1.6rem)", color: "var(--on-light)", opacity: 0.75 }}>stress on {ordinal(sStressed)} syllable</div>
          </div>
        ) : (
          <>
            <h1 className="sa-anim-pop" style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "clamp(2.2rem,5.5vw,4.5rem)", color: "var(--on-light)", lineHeight: 1.05, letterSpacing: "-0.01em" }}>"{ansText}"</h1>
            {q.explanation && <p style={{ color: "var(--on-light)", opacity: 0.8, fontSize: "clamp(1rem,1.9vw,1.5rem)", lineHeight: 1.5, marginTop: "1.4rem", maxWidth: 820, marginLeft: "auto", marginRight: "auto" }}>{q.explanation}</p>}
          </>
        )}
      </div>
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          {[{ k: "Correct", v: correct }, { k: "Missed", v: missed }].map(s => (
            <div key={s.k} style={{ background: "var(--cream)", borderRadius: 14, padding: "0.8rem 1.4rem", textAlign: "center", minWidth: 96 }}>
              <div style={{ color: "var(--sun)", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.1rem" }}>{s.k}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "2rem", color: "var(--ink)", lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {onReplay && <button className="btn btn-ghost btn-sm" onClick={onReplay} style={{ color: "var(--on-light)", borderColor: "rgba(15,18,38,0.4)" }}>Replay</button>}
          {warmup && onSkipWarmup && <button className="btn btn-ghost btn-sm" onClick={onSkipWarmup} style={{ color: "var(--on-light)", borderColor: "rgba(15,18,38,0.4)" }}>Skip Warm-Up</button>}
          {onNext && <button className="btn" onClick={onNext} style={{ background: "var(--cream)", color: "var(--ink)", borderColor: "var(--cream)", fontSize: "1.05rem", padding: "1rem 2rem", boxShadow: "5px 5px 0 rgba(15,18,38,0.25)" }}>{nextLabel} →</button>}
        </div>
      </div>
    </div>
  );
}

// ─── HostQuestion ──────────────────────────────────────────────────────────────
function HostQuestion({ q, timeLeft, answers, players, qIndex, total, mode, teams, teamScores, paused, onPause, onRepeat, onReveal, onSkip, onSkipWarmup, bigText, onToggleFont, code, topic, qrUrl }) {
  const ansCount = Object.keys(answers).length;
  const pCount = Object.keys(players).length;
  const shuffledRearrange = useMemo(() => q.type === "rearrange" ? (q.answer || "").replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean).sort(() => Math.random() - 0.5) : [], [q.question]);
  const typeColors = { multiple_choice: "var(--tomato)", true_false: "var(--leaf)", error_spotter: "var(--tomato)", hangman: "var(--cobalt)", rearrange: "var(--sun)", story_builder: "var(--plum)", fill_idiom: "var(--sun)", word_match: "var(--aqua)", odd_one_out: "var(--tomato)", stress_battle: "var(--cobalt)" };
  const tc = typeColors[q.type] || "var(--tomato)";
  const urgent = timeLeft <= 5 && !paused;
  const answeredNames = new Set(Object.keys(answers));

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {/* round */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.15rem" }}>Round <span style={{ color: "var(--tomato)" }}>{qIndex + 1}</span> <span style={{ color: "var(--muted)" }}>/ {total}</span></span>
      </div>
      {/* timer card */}
      <div style={{ background: urgent ? "var(--tomato)" : "var(--sun)", borderRadius: 20, padding: "1.6rem 1rem", textAlign: "center", position: "relative", overflow: "hidden" }} className={urgent ? "sa-anim-pulse" : ""}>
        <div style={{ position: "absolute", inset: "0.9rem", border: "3px solid rgba(15,18,38,0.15)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "3.4rem", color: "var(--on-light)", lineHeight: 1 }}>{paused ? "‖" : timeLeft}</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "rgba(15,18,38,0.6)", marginTop: "0.3rem" }}>{paused ? "PAUSED" : "SECONDS"}</div>
      </div>
      {/* locked in + join QR */}
      <div style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 16, padding: "0.9rem 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", letterSpacing: "0.12em", color: "var(--muted)" }}>LOCKED IN</span>
          <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.1rem", color: "var(--leaf)" }}>{ansCount}<span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>/{pCount}</span></span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: pCount ? "0.9rem" : 0 }}>
          {Object.keys(players).map(n => (
            <div key={n} style={{ opacity: answeredNames.has(n) ? 1 : 0.32, transition: "opacity 0.2s" }} className={answeredNames.has(n) ? "sa-anim-pop" : ""}>
              <SABlob name={n} size={26} color={mode === "teams" ? (teams.find(t => t.id === players[n]?.team)?.color) : undefined} />
            </div>
          ))}
        </div>
        {qrUrl && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "0.9rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 6, flexShrink: 0 }}><QRDisplay url={qrUrl} compact size={112} /></div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--muted)" }}>SCAN TO JOIN</div>
              {code && <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "0.05em" }}>{code}</div>}
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{pCount === 0 ? "waiting for players…" : "latecomers welcome"}</div>
            </div>
          </div>
        )}
      </div>
      {/* teacher panel */}
      <div style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 16, padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", letterSpacing: "0.15em", color: "var(--muted)" }}>TEACHER</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onPause && <TeacherBtn icon="pause" label={paused ? "Resume" : "Pause"} onClick={onPause} variant={paused ? "active" : "default"} />}
          {onRepeat && <TeacherBtn icon="repeat" label="Repeat" onClick={onRepeat} />}
        </div>
        {onReveal && <button className="btn btn-coral btn-full" style={{ padding: "0.8rem" }} onClick={onReveal}><SAIcon name="reveal" size={15} color="var(--on-dark)" /> Reveal answer</button>}
        {onSkip && <TeacherBtn icon="skip" label="Skip question" onClick={onSkip} variant="ghost" />}
        {onSkipWarmup && <TeacherBtn icon="skip" label="Skip Warm-Up" onClick={onSkipWarmup} variant="ghost" />}
        {onToggleFont && <TeacherBtn label={bigText ? "A− Text" : "A+ Text"} onClick={onToggleFont} />}
      </div>
    </div>
  );

  const main = (
    <div>
      <div className="flex justify-between items-center mb-2 wrap gap-1">
        <div className="flex gap-2 items-center">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px 5px 8px", background: tc, color: "var(--on-dark)", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
            <SAIcon name={q.type === "spot_sentence" ? "error_spotter" : q.type} size={14} color="var(--on-dark)" />
            <span>{({ error_spotter: "find the mistake", spot_sentence: "find the mistake" }[q.type]) || q.type.replace(/_/g, " ")}</span>
          </div>
          {topic && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>{topic}</span>}
          {q._warmup && <span className="badge" style={{ background: "rgba(255,206,71,0.15)", color: "var(--sun)", border: "1px solid rgba(255,206,71,0.3)" }}>WARM UP</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1.2rem" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < qIndex ? "var(--leaf)" : i === qIndex ? "var(--sun)" : "var(--line)", transition: "background 0.3s" }} />
        ))}
      </div>

      {mode === "teams" && (
        <div className="flex gap-1 wrap mb-2">
          {teams.map(t => <span key={t.id} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.8rem", background: t.color, color: "var(--on-dark)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}><TeamIcon icon={t.icon} color="var(--on-dark)" size={14} />{(teamScores[t.id] || 0).toLocaleString()}</span>)}
        </div>
      )}

      <h2 className="sa-anim-slide" style={{ fontSize: "clamp(1.6rem,3.2vw,2.8rem)", lineHeight: 1.15, marginBottom: "1.6rem", fontFamily: "'Fraunces',serif", fontWeight: 900, letterSpacing: "-0.01em" }}>{q.type === "hangman" ? q.hint : q.question}</h2>

      {q.type === "rearrange" && (
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shuffledRearrange.map((w, i) => (
              <WoodenTile key={i} word={w} size="lg" block />
            ))}
          </div>
        </div>
      )}
      {q.type === "multiple_choice" && q.options && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {q.options.map((o, i) => <OptionRow key={i} letter={OPT_ICONS[i]} text={o} color={OPT_COLORS[i % 4]} />)}
        </div>
      )}
      {q.type === "odd_one_out" && q.options && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", maxWidth: 820, margin: "0 auto" }}>
          {q.options.map((o, i) => (
            <div key={i} style={{ padding: "1.4rem 1rem", border: `2.5px solid ${OPT_COLORS[i % 4]}`, borderRadius: 18, background: "var(--paper)", boxShadow: `4px 4px 0 ${OPT_COLORS[i % 4]}33`, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem,2.8vw,2.2rem)", color: OPT_COLORS[i % 4], textAlign: "center" }}>{o}</div>
          ))}
        </div>
      )}
      {q.type === "spot_sentence" && q.options && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {q.options.map((o, i) => <OptionRow key={i} letter={OPT_ICONS[i]} text={o} color={OPT_COLORS[i % 4]} />)}
        </div>
      )}
      {q.type === "hangman" && q.word && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.6rem", maxWidth: 920, margin: "0 auto" }}>
          {String(q.word).toUpperCase().split("").map((c, i) => {
            const isLetter = /[A-Z]/.test(c);
            return (
              <div key={i} style={{ minWidth: isLetter ? "clamp(2.2rem,4vw,3.4rem)" : "1.1rem", height: "clamp(3rem,6vw,4.6rem)", display: "flex", alignItems: "flex-end", justifyContent: "center", borderBottom: isLetter ? "6px solid var(--cobalt)" : "none", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", color: "var(--ink)" }}>{isLetter ? "" : c}</div>
            );
          })}
        </div>
      )}
      {q.type === "true_false" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[{ v: "True", c: "var(--leaf)", icon: "✓" }, { v: "False", c: "var(--tomato)", icon: "✕" }].map(({ v, c, icon }) => (
            <div key={v} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem", padding: "1.6rem", border: `2.5px solid ${c}`, borderRadius: 18, background: "var(--paper)", boxShadow: `4px 4px 0 ${c}33` }}>
              <span style={{ fontSize: "2.4rem", fontWeight: 900, color: c, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: "clamp(1.7rem,3.2vw,2.6rem)", color: c }}>{v}</span>
            </div>
          ))}
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
                  <div key={i} style={{ background: "var(--paper)", border: `2.5px solid ${colors[i]}`, borderRadius: 12, padding: "12px 16px", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 20, color: colors[i], boxShadow: `3px 3px 0 ${colors[i]}55`, transform: `rotate(${i === 0 ? -1.5 : 1.5}deg)` }}>{p.word}</div>
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
        <div style={{ marginTop: "0.5rem", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontFamily: "'Fraunces',serif", fontSize: "clamp(2.4rem,6vw,3.8rem)", fontWeight: 900, fontStyle: "italic", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--sun)", marginBottom: "1.6rem" }}>{q.word}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {["A", "B"].map(label => {
              const n = Array.isArray(q.syllables) ? q.syllables.length : (q.syllables || 2);
              const s = q.stressed || 1;
              const wrongStress = s === n ? s - 1 : s + 1;
              const stressAt = label === q.answer ? s : wrongStress;
              return (
                <div key={label} style={{ padding: "1.3rem 1.8rem", borderRadius: 16, border: "2px solid var(--line)", background: "var(--paper)", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1rem", color: "var(--muted)", fontWeight: 700, opacity: 0.5, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.7rem" }}>
                    <StressDots syllables={n} stressAt={stressAt} size="lg" />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: "1.2rem" }}>stress on {ordinal(stressAt)} syllable</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {q.type === "fill_idiom" && q.options && (
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "1.25rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>
            {q.question.replace("___", "______")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 560, margin: "0 auto", textAlign: "left" }}>
            {q.options.map((o, i) => <OptionRow key={i} letter={OPT_ICONS[i]} text={o} color={OPT_COLORS[i % 4]} />)}
          </div>
        </div>
      )}

      {q.type === "error_spotter" && q.sentence && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ background: "var(--paper)", borderRadius: 14, padding: "22px 28px", position: "relative", overflow: "hidden", backgroundImage: `repeating-linear-gradient(180deg, transparent 0 28px, var(--line) 28px 29px)`, backgroundPosition: "0 16px", border: "1.5px solid var(--line)" }}>
            <div style={{ position: "absolute", left: 24, top: 0, bottom: 0, width: 1.5, background: "rgba(255,92,66,0.5)" }} />
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: "clamp(1.05rem,2.2vw,1.5rem)", lineHeight: 1.7, letterSpacing: "-0.005em", paddingLeft: 18, display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "baseline", position: "relative" }}>
              {/* Show the sentence plain during the question — never mark the error
                  word here, or the projector reveals the answer before students respond.
                  The error is shown at reveal (HostReveal). */}
              {q.sentence.split(" ").map((word, i) => (
                <span key={i} style={{ paddingBottom: 4, color: "var(--ink)" }}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div className="host-game-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: "1.6rem", alignItems: "start", marginTop: "0.5rem" }}>
      {main}
      {sidebar}
    </div>
  );
}

// full-width coloured answer row (projector)
function OptionRow({ letter, text, color, italic }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.55rem 1.1rem 0.55rem 0.55rem", border: `2.5px solid ${color}`, borderRadius: 16, background: "var(--paper)", boxShadow: `4px 4px 0 ${color}33` }}>
      <span style={{ width: 54, height: 54, borderRadius: 12, background: color, color: "var(--on-light)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.5rem", flexShrink: 0 }}>{letter}</span>
      <span style={{ fontSize: "clamp(1.05rem,1.8vw,1.5rem)", fontWeight: 600, lineHeight: 1.3, fontFamily: "'DM Sans',sans-serif", color: "var(--ink)" }}>{text}</span>
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
  const lastAnswersClearedRef = useRef(0);

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
        const answersStale = Object.keys(na).length > 0 && Date.now() - lastAnswersClearedRef.current < 2000;
        const naEff = answersStale ? roomRef.current.answers : na;
        if (JSON.stringify(roomRef.current.players) === JSON.stringify(np) &&
            JSON.stringify(roomRef.current.answers) === JSON.stringify(naEff)) return;
        const next = { ...roomRef.current, players: np, answers: naEff };
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
      // Block stale answers arriving right after a question transition (Firebase write race)
      if (Object.keys(na).length > 0 && Date.now() - lastAnswersClearedRef.current < 2000) return;
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
    if (gameType === "stress_battle") {
      setSelectedTopic("stress_battle");
      setQCount(15);
    }
  }, [gameType]);

  useEffect(() => {
    if (selectedTopic === "stress_battle") setQCount(15);
  }, [selectedTopic]);

  const loadQuestions = () => {
    if (!selectedTopic && gameType !== "stress_battle") { setError("Select a topic first!"); return; }
    const bank = selectedTopic ? QUESTION_BANK[selectedTopic].questions : [];
    // Stress Battle type always draws from the full dedicated word bank, regardless of topic
    let pool = gameType === "stress_battle"
      ? QUESTION_BANK.stress_battle.questions
      : (gameType === "mixed" || selectedTopic === "stress_battle") ? bank : bank.filter(q => typesForMode(gameType).includes(q.type));
    if (!pool.length) { setError("No questions of that type for this topic."); return; }
    const qs = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(qCount, pool.length));
    setError("");
    const topicLabel = selectedTopic ? (QUESTION_BANK[selectedTopic]?.label ?? "Stress Battle") : "⚡ Stress Battle";
    upd(prev => ({ ...prev, questions: qs, topic: topicLabel, gameType, phase: "lobby" }));
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
    lastAnswersClearedRef.current = Date.now();
    upd(prev => {
      let qs = prev.questions;
      let warmupCount = 0;
      if (prev.warmup && selectedTopic && QUESTION_BANK[selectedTopic]) {
        const bank = QUESTION_BANK[selectedTopic].questions;
        const fastPool = bank.filter(q => ["multiple_choice", "true_false"].includes(q.type));
        // Warm-up mirrors the chosen mode so it feels consistent (e.g. Hangman → Hangman),
        // but only when there are enough of that type to also leave a scored round.
        // "Mixed"/Stress Battle, and sparse modes (e.g. Word Order), keep the quick
        // multiple-choice / true-false ease-in so the scored round isn't starved.
        const isMixedish = gameType === "mixed" || selectedTopic === "stress_battle";
        const modePool = isMixedish ? [] : bank.filter(q => typesForMode(gameType).includes(q.type));
        const basePool = modePool.length >= 6 ? modePool : (fastPool.length >= 3 ? fastPool : bank);
        // Canonical, order-stable identity — many types share a fixed `question` string
        // (e.g. Word Order), and state may round-trip through Firebase, so key on content.
        const qKey = q => [q.type, q.question, q.word, q.hint, q.answer, q.errorWord, q.sentence,
          (q.words || []).join(" "), (q.options || []).join("|"),
          (q.sentences || []).join("|"), (q.correctOrder || []).join(","),
          (q.pairs || []).map(p => p.word).join("|")].join("¦");
        // Prefer warm-up questions that aren't already in the scored deck, so nothing repeats.
        const mainKeys = new Set(prev.questions.map(qKey));
        const spare = basePool.filter(q => !mainKeys.has(qKey(q)));
        const warmSource = spare.length >= 3 ? spare : basePool;
        const warmOriginals = [...warmSource].sort(() => Math.random() - 0.5).slice(0, 3);
        const warmKeys = new Set(warmOriginals.map(qKey));
        const warmupQs = warmOriginals.map(q => ({ ...q, _warmup: true }));
        const mainQs = prev.questions.filter(q => !warmKeys.has(qKey(q)));
        qs = [...warmupQs, ...mainQs];
        warmupCount = warmupQs.length;
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
    lastAnswersClearedRef.current = Date.now();
    upd(prev => ({ ...prev, phase: "question", timeLeft: getTimeLimit(prev.currentQ), answers: {}, paused: false, firstCorrect: null }));
  };

  const replayQuestion = () => {
    lastAnswersClearedRef.current = Date.now();
    upd(prev => ({ ...prev, phase: "question", timeLeft: getTimeLimit(prev.currentQ), answers: {}, paused: false, firstCorrect: null }));
  };

  const skipQuestion = () => {
    lastAnswersClearedRef.current = Date.now();
    upd(prev => ({ ...prev, phase: "reveal", timeLeft: 0, answers: {}, firstCorrect: null }));
  };

  const skipWarmup = () => {
    lastAnswersClearedRef.current = Date.now();
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
      lines.push(`Q${i + 1}. ${reviewPrompt(q)}`);
      lines.push(`Answer: ${reviewAnswer(q)}`);
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

  const wideProjector = ["lobby", "question", "reveal", "leaderboard", "end"].includes(room.phase);
  return (
    <div className="panel" style={wideProjector ? { maxWidth: 1200 } : undefined}>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 wrap gap-1">
        <SALogo size={24} />
        <div className="flex gap-1 wrap">
          {room.phase !== "lobby" && <button className="btn btn-sm btn-ghost" onClick={() => upd(p => ({ ...p, phase: "leaderboard" }))}>Scores</button>}
          <button className="btn btn-sm btn-ghost" onClick={reset}>New</button>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>Exit</button>
        </div>
      </div>

      {/* Lobby — two-column projector layout */}
      {room.phase === "lobby" && (() => {
        const DOTS = ["var(--tomato)", "var(--cobalt)", "var(--leaf)", "var(--plum)", "var(--sun)", "var(--aqua)"];
        const noSB = new Set(["verb_tenses", "present_perfect"]);
        const cleanLabel = (l) => l.replace(/^[^\w]+\s*/, "");
        const stressMode = gameType === "stress_battle";
        const topicEntries = Object.entries(QUESTION_BANK)
          .filter(([key]) => key !== "stress_battle")
          .sort((a, b) => cleanLabel(a[1].label).localeCompare(cleanLabel(b[1].label)));
        const pickTopic = (key) => { setSelectedTopic(key); if (gameType === "stress_battle") setGameType("mixed"); };
        const canStart = !!selectedTopic || stressMode;
        const startNow = () => { loadQuestions(); startGame(); };
        return (
          <div style={{ marginTop: "0.6rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.2rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", letterSpacing: "0.2em", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--tomato)" }} className="sa-anim-pulse" /> LOBBY
            </div>
            {fbStatus === "error" && (
              <div style={{ padding: "0.6rem 0.8rem", marginBottom: "0.75rem", borderRadius: 8, background: "rgba(255,92,66,0.12)", border: "1.5px solid var(--tomato)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--tomato)" }}>Firebase not reachable.</strong> Students won't be able to join. Set your Realtime Database <code style={{ fontFamily: "'JetBrains Mono',monospace" }}>.read</code>/<code style={{ fontFamily: "'JetBrains Mono',monospace" }}>.write</code> rules to <code style={{ fontFamily: "'JetBrains Mono',monospace" }}>true</code>.
              </div>
            )}
            {fbStatus === "none" && (
              <div style={{ padding: "0.6rem 0.8rem", marginBottom: "0.75rem", borderRadius: 8, background: "rgba(91,139,255,0.1)", border: "1.5px solid var(--cobalt)", fontSize: "0.8rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                Firebase not configured — multiplayer needs a Realtime Database. Solo mode works without it.
              </div>
            )}
            <div className="host-lobby-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: "1.6rem", alignItems: "start" }}>
              {/* LEFT — game mode + topic picker */}
              <div style={{ border: "1.5px solid var(--line)", borderRadius: 18, padding: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                  <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.8rem" }}>Pick a game</h2>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", letterSpacing: "0.1em", color: "var(--muted)" }}>{qCount} ROUNDS</span>
                </div>
                {/* Stress Battle — game mode */}
                <button onClick={() => setGameType(stressMode ? "mixed" : "stress_battle")}
                  style={{ display: "flex", alignItems: "center", gap: "0.8rem", width: "100%", padding: "0.9rem 1.1rem", borderRadius: 12, marginBottom: "0.9rem", border: `2px solid ${stressMode ? "var(--cobalt)" : "var(--line)"}`, background: stressMode ? "rgba(91,139,255,0.12)" : "var(--paper)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem" }}>⚡</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "1.1rem", color: stressMode ? "var(--cobalt)" : "var(--ink)" }}>Stress Battle</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Word-stress mode · dedicated 209-word bank</span>
                  </span>
                  {stressMode && <span style={{ color: "var(--cobalt)", fontWeight: 800 }}>✓</span>}
                </button>
                {stressMode ? (
                  <div style={{ padding: "1rem", borderRadius: 12, border: "1px solid rgba(91,139,255,0.3)", background: "rgba(91,139,255,0.07)", fontSize: "0.9rem", color: "var(--cobalt)" }}>
                    Stress Battle uses its own word bank — no topic needed. Tap it again to pick a topic instead.
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.66rem", letterSpacing: "0.14em", color: "var(--muted)", marginBottom: "0.5rem" }}>OR CHOOSE A TOPIC</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", maxHeight: 400, overflowY: "auto" }}>
                      {topicEntries.map(([key, { label }], i) => {
                        const dis = noSB.has(key);
                        const sel = selectedTopic === key;
                        return (
                          <button key={key} disabled={dis} onClick={() => !dis && pickTopic(key)}
                            style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.85rem 1rem", borderRadius: 12, border: `2px solid ${sel ? "var(--sun)" : "var(--line)"}`, background: sel ? "rgba(255,206,71,0.1)" : "var(--paper)", cursor: dis ? "not-allowed" : "pointer", textAlign: "left", opacity: dis ? 0.3 : 1, transition: "all 0.12s" }}>
                            <span style={{ width: 12, height: 12, borderRadius: "50%", background: DOTS[i % DOTS.length], flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1rem", color: sel ? "var(--sun)" : "var(--ink)" }}>{cleanLabel(label)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT — room panel + controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ background: "var(--sun)", borderRadius: 20, padding: "1.4rem", color: "var(--on-light)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.15em", opacity: 0.7, marginBottom: "0.6rem", textAlign: "left" }}>SCAN OR VISIT · ROOM CODE</div>
                  <QRDisplay url={qrUrl} compact size={300} light="#ffce47" />
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "3.4rem", letterSpacing: "0.08em", lineHeight: 1, marginTop: "0.6rem" }}>{room.code}</div>
                </div>

                <div style={{ background: "var(--paper)", border: "1.5px solid var(--line)", borderRadius: 14, padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700 }}>Players · {players.length}</span>
                    {players.map(([n, p]) => <SABlob key={n} name={n} size={26} color={room.mode === "teams" ? TEAMS.find(t => t.id === p.team)?.color : undefined} />)}
                    {players.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>waiting for students…</span>}
                  </div>
                </div>

                <div>
                  <span className="label">Question type</span>
                  <select className="select" value={stressMode ? "mixed" : gameType} onChange={e => setGameType(e.target.value)} disabled={stressMode}>
                    {GAME_MODES.filter(g => g.v !== "stress_battle").map(g => <option key={g.v} value={g.v}>{g.label} — {g.desc}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div style={{ flex: 1 }}>
                    <span className="label">Rounds</span>
                    <select className="select" value={qCount} onChange={e => setQCount(+e.target.value)}>
                      {[8, 10, 12, 15].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button className="btn" onClick={() => upd(p => ({ ...p, mode: "solo" }))} style={{ flex: 1, background: room.mode === "solo" ? "var(--paper)" : "transparent", border: `1.5px solid ${room.mode === "solo" ? "var(--ink)" : "var(--line)"}`, color: "var(--ink)" }}>👤 Solo</button>
                  <button className="btn" onClick={() => upd(p => ({ ...p, mode: "teams" }))} style={{ flex: 1, background: room.mode === "teams" ? "rgba(255,92,66,0.12)" : "transparent", border: `1.5px solid ${room.mode === "teams" ? "var(--tomato)" : "var(--line)"}`, color: room.mode === "teams" ? "var(--tomato)" : "var(--ink)" }}>👥 Teams</button>
                </div>

                {room.mode === "teams" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Teams:</span>
                    {[2, 3, 4].map(n => <button key={n} className={`btn btn-sm ${room.teamCount === n ? "btn-gold" : "btn-ghost"}`} onClick={() => upd(p => ({ ...p, teamCount: n }))} style={room.teamCount === n ? { color: "var(--on-light)", borderColor: "var(--on-light)" } : undefined}>{n}</button>)}
                    {players.length > 0 && !room.teamsLocked && <button className="btn btn-teal btn-sm" onClick={autoAssign}>Auto-assign</button>}
                  </div>
                )}

                <label style={{ fontSize: "0.85rem", color: "var(--ink-soft)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={room.warmup} onChange={e => upd(p => ({ ...p, warmup: e.target.checked }))} style={{ accentColor: "var(--sun)", cursor: "pointer" }} />
                  Warm-up round (3 quick questions)
                </label>

                {error && <p className="text-coral" style={{ fontSize: "0.85rem" }}>{error}</p>}
                <button className="btn btn-coral btn-full" disabled={!canStart} onClick={startNow} style={{ fontSize: "1.1rem", padding: "1.1rem", opacity: canStart ? 1 : 0.5 }}>
                  ▶ Start the game — {qCount} questions
                </button>
              </div>
            </div>
          </div>
        );
      })()}



      {/* Question phase */}
      {room.phase === "question" && room.currentQ && (
        <>
          <div style={{ zoom: bigText ? 1.3 : 1 }}>
            <HostQuestion q={room.currentQ} timeLeft={room.timeLeft} answers={room.answers || {}}
              players={room.players || {}} qIndex={room.qIndex} total={room.questions.length}
              mode={room.mode} teams={activeTeams} teamScores={teamScores} paused={room.paused}
              code={room.code} topic={room.topic} qrUrl={qrUrl}
              onPause={() => upd(p => ({ ...p, paused: !p.paused }))}
              onRepeat={() => upd(p => ({ ...p, timeLeft: getTimeLimit(p.currentQ) }))}
              onReveal={() => endEarly()}
              onSkip={skipQuestion}
              onSkipWarmup={room.currentQ?._warmup ? skipWarmup : undefined}
              bigText={bigText}
              onToggleFont={() => { const n = !bigText; setBigText(n); writeFont(n); }} />
          </div>
        </>
      )}

      {/* Reveal phase — coral takeover */}
      {room.phase === "reveal" && room.currentQ && (
        <HostReveal q={room.currentQ} answers={room.answers || {}} players={room.players || {}}
          onNext={advance}
          nextLabel={room.currentQ?._warmup ? "Next" : room.qIndex + 1 >= room.questions.length ? "Final results" : "See leaderboard"}
          onReplay={replayQuestion}
          warmup={!!room.currentQ?._warmup}
          onSkipWarmup={skipWarmup} />
      )}

      {/* Warm-up done — green full-bleed takeover */}
      {room.phase === "warmup_done" && (
        <div style={{ position: "fixed", inset: 0, background: "var(--leaf)", color: "var(--on-light)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(1.5rem,4vw,3.5rem)", gap: "1rem" }}>
          <div className="sa-anim-pop"><SAIcon name="sparkle" size={64} color="var(--on-light)" /></div>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 900, fontStyle: "italic", fontSize: "clamp(2.4rem,6vw,4.5rem)", lineHeight: 1, letterSpacing: "-0.01em" }}>Warm-up complete!</h1>
          <p style={{ fontSize: "clamp(1rem,1.8vw,1.4rem)", color: "var(--on-light)", opacity: 0.8, marginBottom: "1.4rem" }}>Everyone's warmed up — time for the real thing.</p>
          <button className="btn" onClick={goNextQuestion} style={{ background: "var(--ink)", color: "var(--on-light)", borderColor: "var(--ink)", fontSize: "1.15rem", padding: "1.1rem 2.6rem", boxShadow: "5px 5px 0 rgba(15,18,38,0.25)" }}>Start Main Game →</button>
        </div>
      )}

      {/* Leaderboard / End */}
      {(room.phase === "leaderboard" || room.phase === "end") && (
        <>
          <Leaderboard sorted={sorted} mode={room.mode} teams={activeTeams}
            teamScores={teamScores} isEnd={room.phase === "end"} room={room}
            onPlayAgain={room.phase === "end" ? reset : undefined}
            onShareRecap={room.phase === "end" ? () => setShowReview(v => !v) : undefined} />
          {room.phase === "leaderboard" && (
            <div className="text-center mt-3"><button className="btn btn-gold" style={{ color: "var(--on-light)", borderColor: "var(--on-light)" }} onClick={goNextQuestion}>Next Question →</button></div>
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
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.4 }}>Q{i + 1}. {reviewPrompt(q)}</div>
                        <div style={{ color: "var(--teal)", fontSize: "0.8rem", marginTop: "0.2rem" }}>✔ {reviewAnswer(q)}</div>
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
