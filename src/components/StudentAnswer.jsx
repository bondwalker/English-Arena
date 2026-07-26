import { useState, useEffect } from "react";
import { SAIcon, StressDots, WoodenTile, Waveform, RedInkUnderline, MatchConnector } from "./ui.jsx";
import { readFont, writeFont } from "../lib/storage.js";
import { OPT_COLORS, ordinal } from "../lib/utils.js";

const OPT_LETTERS = ["A", "B", "C", "D"];

export function StudentAnswer({ q, myAnswer, onAnswer, rearranged, setRearranged, usedIdx, setUsedIdx, typeVal, setTypeVal, storyOrder, setStoryOrder, matchState, setMatchState, room }) {
  const answered = myAnswer !== null;
  const [bigText, setBigText] = useState(() => readFont());
  const toggleFont = () => { const n = !bigText; setBigText(n); writeFont(n); };

  const pairsKey = q.type === "word_match" ? (q.pairs || []).slice(0, 2).map(p => p.word).join("|") : "";
  const [shuffledMeanings, setShuffledMeanings] = useState([]);
  useEffect(() => {
    if (q.type === "word_match" && q.pairs) setShuffledMeanings([...q.pairs.slice(0, 2)].sort(() => Math.random() - 0.5));
  }, [pairsKey]);

  const [shuffledWords, setShuffledWords] = useState([]);
  useEffect(() => {
    if (q.type === "rearrange" && q.words) setShuffledWords([...q.words].sort(() => Math.random() - 0.5));
  }, [q.words?.join("|")]);

  const [twoOptions, setTwoOptions] = useState([]);
  useEffect(() => {
    if (q.type === "odd_one_out" && q.options) {
      const wrong = q.answer;
      const right = q.options.find(o => o !== wrong);
      setTwoOptions([wrong, right].sort(() => Math.random() - 0.5));
    }
  }, [q.question]);

  const submitTyped = () => { if (typeVal.trim()) onAnswer(typeVal.trim()); };
  const submitRearranged = () => { if (rearranged.length) onAnswer(rearranged.join(" ")); };
  const submitStory = () => { if (storyOrder.length === 3) onAnswer(storyOrder.join(",")); };

  const handleMatch = (type, val) => {
    if (answered) return;
    if (type === "word") {
      setMatchState(prev => ({ ...prev, sel: prev.sel === val ? null : val }));
    } else {
      const { sel, matched } = matchState;
      if (!sel) return;
      const isCorrect = q.pairs?.find(p => p.word === sel)?.meaning === val;
      const nm = { ...matched, [sel]: { meaning: val, correct: isCorrect } };
      setMatchState({ sel: null, matched: nm });
      if (Object.keys(nm).length === 2) {
        onAnswer(Object.values(nm).every(m => m.correct) ? "match_all_correct" : "match_wrong");
      }
    }
  };

  return (
    <div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 800, fontSize: "1.35rem", lineHeight: 1.35, marginBottom: "1.1rem", color: "var(--ink)" }}>{q.question}</h2>

      {q.type === "multiple_choice" && q.options && (
        <div className="opt-grid">
          {q.options.map((opt, i) => (
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i}`}
              style={{ opacity: answered && myAnswer !== opt ? 0.28 : 1, outline: answered && myAnswer === opt ? `3px solid ${OPT_COLORS[i]}` : "none", transition: "opacity 0.18s", animation: answered && myAnswer === opt ? "lockIn 0.38s ease" : "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={() => onAnswer(opt)}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: OPT_COLORS[i], color: "var(--on-light)", fontSize: "1rem", fontFamily: "'Fraunces',serif", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{OPT_LETTERS[i]}</span>
              <span style={{ textAlign: "left", fontSize: "1rem", fontWeight: 600 }}>{opt}</span>
            </button>
          ))}
        </div>
      )}

      {q.type === "odd_one_out" && twoOptions.length === 2 && (
        <div className="opt-grid">
          {twoOptions.map((opt, i) => (
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i}`}
              style={{ opacity: answered && myAnswer !== opt ? 0.28 : 1, outline: answered && myAnswer === opt ? `3px solid ${OPT_COLORS[i]}` : "none", transition: "opacity 0.18s", animation: answered && myAnswer === opt ? "lockIn 0.38s ease" : "none", fontSize: "0.9rem", fontWeight: 600 }}
              onClick={() => onAnswer(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === "true_false" && (
        <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
          {[{ v: "True", c: "var(--leaf)", icon: "bolt" }, { v: "False", c: "var(--tomato)", icon: "skip" }].map(({ v, c, icon }) => (
            <button key={v} disabled={answered}
              style={{ flex: 1, padding: "1.4rem 1rem", border: `2px solid ${myAnswer === v ? c : "var(--line)"}`, background: myAnswer === v ? `${c}22` : "var(--paper)", color: myAnswer === v ? c : "var(--ink-soft)", borderRadius: 12, cursor: answered ? "default" : "pointer", opacity: answered && myAnswer !== v ? 0.28 : 1, transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "'Fraunces',serif", fontWeight: 900, fontSize: "1.2rem", fontStyle: "italic" }}
              onClick={() => onAnswer(v)}>
              <SAIcon name={icon} size={26} color={myAnswer === v ? c : "var(--muted)"} />
              {v}
            </button>
          ))}
        </div>
      )}

      {q.type === "error_spotter" && q.sentence && (
        <div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.6rem", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>Tap the word with the error:</p>
          <div style={{ background: "var(--paper)", borderRadius: 12, padding: "14px 12px 18px 14px", position: "relative", overflow: "hidden", backgroundImage: `repeating-linear-gradient(180deg, transparent 0 22px, var(--line) 22px 23px)`, backgroundPosition: "0 10px", border: "1.5px solid var(--line)" }}>
            <div style={{ position: "absolute", left: 14, top: 0, bottom: 0, width: 1.5, background: "rgba(255,92,66,0.5)" }} />
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1.1rem", lineHeight: 1.8, paddingLeft: 10, display: "flex", flexWrap: "wrap", gap: "4px 8px", alignItems: "baseline" }}>
              {q.sentence.split(" ").map((word, i) => {
                const clean = word.replace(/[.,!?;:]/g, "");
                const sel = myAnswer === clean;
                return (
                  <span key={i} className="sa-pressable" onClick={() => !answered && onAnswer(clean)}
                    style={{ position: "relative", cursor: answered ? "default" : "pointer", paddingBottom: 4, color: sel ? "var(--tomato)" : "var(--ink)", fontStyle: sel ? "italic" : "normal", fontWeight: sel ? 700 : 600 }}>
                    {word}
                    {sel && <RedInkUnderline />}
                  </span>
                );
              })}
            </div>
          </div>
          {myAnswer && <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--tomato)" }}>Selected: <strong>{myAnswer}</strong></p>}
        </div>
      )}

      {q.type === "fill_idiom" && (
        <div>
          {q.hint && <p style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic", marginBottom: "0.5rem", borderLeft: "2px solid var(--cobalt)", paddingLeft: "0.5rem" }}>{q.hint}</p>}
          <div className="opt-grid">
            {(q.options || []).map((opt, i) => (
              <button key={i} disabled={answered}
                className={`opt-btn opt-${i}`}
                style={{ opacity: answered && myAnswer !== opt ? 0.28 : 1, outline: answered && myAnswer === opt ? `3px solid ${OPT_COLORS[i]}` : "none", animation: answered && myAnswer === opt ? "lockIn 0.38s ease" : "none", transition: "opacity 0.18s", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={() => onAnswer(opt)}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: OPT_COLORS[i], color: "var(--on-light)", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{OPT_LETTERS[i]}</span>
                <span style={{ textAlign: "left", fontSize: "0.88rem" }}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {q.type === "type_answer" && (
        <div>
          <input className="input" placeholder="Type your answer…" value={typeVal} disabled={answered}
            style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.1rem", letterSpacing: "0.05em" }}
            onChange={e => setTypeVal(e.target.value)} onKeyDown={e => e.key === "Enter" && !answered && submitTyped()} />
          <button className="btn btn-teal btn-full mt-2" disabled={answered || !typeVal.trim()} onClick={submitTyped}>
            {answered ? "Submitted" : "Submit →"}
          </button>
        </div>
      )}

      {q.type === "rearrange" && (
        <div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>YOUR SENTENCE</div>
          <div style={{ background: "linear-gradient(180deg,#6b4a2a 0%,#4a3320 100%)", borderRadius: 10, padding: "10px 10px 14px", minHeight: 54, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", boxShadow: "inset 0 3px 6px rgba(0,0,0,0.3),0 2px 0 rgba(0,0,0,0.15)" }}>
            {rearranged.length === 0 && <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace" }}>Tap words below…</span>}
            {rearranged.map((w, i) => (
              <WoodenTile key={i} word={w} size="sm" angle={(i % 2 === 0 ? -1 : 1)} placed valueNum={Math.max(1, Math.min(8, w.length - 1))}
                onClick={() => { if (answered) return; setRearranged(p => p.filter((_, pi) => pi !== i)); setUsedIdx(p => p.filter((_, pi) => pi !== i)); }} />
            ))}
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.05em", marginTop: "0.7rem", marginBottom: "0.3rem" }}>WORD BANK</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(shuffledWords.length ? shuffledWords : q.words || []).map((w, i) => (
              <WoodenTile key={i} word={w} size="sm" angle={((i % 3) - 1) * 1.5}
                onClick={() => { if (answered || usedIdx.includes(i)) return; setRearranged(p => [...p, w]); setUsedIdx(p => [...p, i]); }}
                {...(usedIdx.includes(i) ? { placed: true } : {})} />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" disabled={answered} onClick={() => { setRearranged([]); setUsedIdx([]); }}>Clear</button>
            <button className="btn btn-teal" disabled={answered || !rearranged.length} onClick={submitRearranged}>
              {answered ? "Submitted" : "Submit →"}
            </button>
          </div>
        </div>
      )}

      {q.type === "story_builder" && q.sentences && (
        <div>
          {storyOrder.length > 0 && (
            <>
              <div style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>YOUR ORDER (tap to remove)</div>
              <div style={{ marginBottom: "0.6rem" }}>
                {storyOrder.map((idx, pos) => (
                  <div key={pos} className="story-card placed" onClick={() => { if (!answered) setStoryOrder(p => p.filter((_, pi) => pi !== pos)); }}>
                    <span className="story-num" style={{ background: "var(--cobalt)", color: "var(--on-light)" }}>{pos + 1}</span>{q.sentences[idx]}
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>TAP IN ORDER</div>
          {q.sentences.slice(0, 3).map((s, i) => (
            <div key={i} className={`story-card ${storyOrder.includes(i) ? "placed" : ""}`}
              onClick={() => {
                if (answered) return;
                if (storyOrder.includes(i)) { setStoryOrder(p => p.filter(x => x !== i)); return; }
                setStoryOrder(p => [...p, i]);
              }}>
              <span className="story-num">{storyOrder.includes(i) ? storyOrder.indexOf(i) + 1 : "·"}</span>{s}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" disabled={answered} onClick={() => setStoryOrder([])}>Clear</button>
            <button className="btn btn-teal" disabled={answered || storyOrder.length !== 3} onClick={submitStory}>
              {answered ? "Submitted" : "Submit Order →"}
            </button>
          </div>
        </div>
      )}

      {q.type === "word_match" && q.pairs && (
        <div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em", marginBottom: "0.6rem" }}>Tap a word, then its meaning.</p>
          <div style={{ position: "relative", minHeight: 160 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
              {Object.entries(matchState.matched).map(([w, m]) => {
                const pairs2 = q.pairs.slice(0, 2);
                const li = pairs2.findIndex(p => p.word === w);
                const ri = shuffledMeanings.findIndex(p => p.meaning === m.meaning);
                if (li < 0 || ri < 0) return null;
                const fromY = 24 + li * 52;
                const toY = 24 + ri * 52;
                return <MatchConnector key={w} from={{ x: 34, y: fromY }} to={{ x: 66, y: toY }} color={m.correct ? "var(--leaf)" : "var(--tomato)"} />;
              })}
            </svg>
            <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem", fontFamily: "'JetBrains Mono',monospace" }}>Words</div>
                {q.pairs.slice(0, 2).map((p, i) => {
                  const m = matchState.matched[p.word];
                  const sel = matchState.sel === p.word;
                  return (
                    <div key={i} className={`match-word ${sel ? "selected" : ""} ${m ? (m.correct ? "matched-correct" : "matched-wrong") : ""}`}
                      style={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: 700, cursor: m || answered ? "default" : "pointer", marginBottom: "0.4rem" }}
                      onClick={() => !m && !answered && handleMatch("word", p.word)}>
                      {p.word}
                    </div>
                  );
                })}
              </div>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem", fontFamily: "'JetBrains Mono',monospace" }}>Meanings</div>
                {shuffledMeanings.map((p, i) => {
                  const isMatched = Object.values(matchState.matched).some(m => m.meaning === p.meaning);
                  const entry = Object.entries(matchState.matched).find(([, m]) => m.meaning === p.meaning);
                  return (
                    <div key={p.meaning} className={`match-word ${isMatched ? (entry?.[1]?.correct ? "matched-correct" : "matched-wrong") : ""}`}
                      style={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", cursor: isMatched || answered ? "default" : "pointer", marginBottom: "0.4rem", textAlign: "center" }}
                      onClick={() => !isMatched && !answered && handleMatch("meaning", p.meaning)}>
                      {p.meaning}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {q.type === "stress_battle" && (
        <div>
          <div style={{ textAlign: "center", fontFamily: "'Fraunces',serif", fontSize: "clamp(2.2rem,10vw,3.5rem)", fontWeight: 900, fontStyle: "italic", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--sun)", marginBottom: "0.5rem" }}>{q.word}</div>
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: "1.4rem" }}>Which stress pattern is correct?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {["A", "B"].map(label => {
              const n = Array.isArray(q.syllables) ? q.syllables.length : (q.syllables || 2);
              const s = q.stressed || 1;
              const wrongStress = s === n ? s - 1 : s + 1;
              const stressAt = label === q.answer ? s : wrongStress;
              const sel = myAnswer === label;
              return (
                <button key={label} disabled={answered}
                  style={{ width: "100%", padding: "1.3rem 1.2rem", border: `2px solid ${sel ? "var(--sun)" : "var(--line)"}`, background: sel ? "rgba(255,206,71,0.12)" : "var(--paper)", borderRadius: 16, cursor: answered ? "default" : "pointer", opacity: answered && !sel ? 0.28 : 1, transition: "all 0.15s", display: "flex", alignItems: "center", gap: "1.2rem" }}
                  onClick={() => onAnswer(label)}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", fontWeight: 700, color: sel ? "var(--sun)" : "var(--muted)", opacity: 0.6, flexShrink: 0 }}>{label}</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                    <StressDots syllables={n} stressAt={stressAt} size="lg" />
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: sel ? "var(--sun)" : "var(--ink-soft)" }}>stress on {ordinal(stressAt)} syllable</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {answered && <p style={{ textAlign: "center", color: "var(--muted)", marginTop: "1rem", fontSize: "0.82rem", fontFamily: "'JetBrains Mono',monospace" }}>Submitted — waiting for others…</p>}
    </div>
  );
}
