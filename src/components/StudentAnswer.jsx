import { useState, useEffect } from "react";
import { SAIcon, StressDots } from "./ui.jsx";

const OPT_COLORS = ["var(--tomato)", "var(--cobalt)", "var(--leaf)", "var(--plum)"];
const OPT_LETTERS = ["A", "B", "C", "D"];

export function StudentAnswer({ q, myAnswer, onAnswer, rearranged, setRearranged, usedIdx, setUsedIdx, typeVal, setTypeVal, storyOrder, setStoryOrder, matchState, setMatchState, room }) {
  const answered = myAnswer !== null;

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.7rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--paper)", border: "1.5px solid var(--tomato)", borderRadius: 8 }}>
          <SAIcon name={q.type} size={13} color="var(--tomato)" />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", letterSpacing: "0.08em", color: "var(--tomato)", textTransform: "uppercase" }}>{q.type.replace(/_/g, " ")}</span>
        </div>
        {room && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: "var(--muted)" }}>Q{(room.qIndex || 0) + 1}/{room.questions?.length || 0}</span>}
      </div>

      <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.45, marginBottom: "1rem", color: "var(--ink)" }}>{q.question}</h2>

      {q.type === "multiple_choice" && q.options && (
        <div className="opt-grid">
          {q.options.map((opt, i) => (
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i}`}
              style={{ opacity: answered && myAnswer !== opt ? 0.28 : 1, outline: answered && myAnswer === opt ? `3px solid ${OPT_COLORS[i]}` : "none", transition: "opacity 0.18s", animation: answered && myAnswer === opt ? "lockIn 0.38s ease" : "none", display: "flex", alignItems: "center", gap: "0.5rem" }}
              onClick={() => onAnswer(opt)}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: OPT_COLORS[i], color: "var(--on-light)", fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{OPT_LETTERS[i]}</span>
              <span style={{ textAlign: "left", fontSize: "0.88rem" }}>{opt}</span>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", lineHeight: 1.8 }}>
            {q.sentence.split(" ").map((word, i) => {
              const clean = word.replace(/[.,!?;:]/g, "");
              const sel = myAnswer === clean;
              return (
                <button key={i} disabled={answered}
                  style={{ padding: "0.42rem 0.8rem", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", border: `2px solid ${sel ? "var(--tomato)" : "var(--line)"}`, background: sel ? "rgba(255,92,66,0.15)" : "transparent", color: sel ? "var(--tomato)" : "var(--ink)", borderRadius: 8, cursor: answered ? "default" : "pointer", transition: "all 0.12s", fontWeight: sel ? 700 : 400 }}
                  onClick={() => onAnswer(clean)}>
                  {word}
                </button>
              );
            })}
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
          <div className="tiles" style={{ borderColor: "var(--cobalt)", minHeight: 52, background: "rgba(91,139,255,0.06)" }}>
            {rearranged.length === 0 && <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Tap words below…</span>}
            {rearranged.map((w, i) => (
              <span key={i} className="tile placed" onClick={() => {
                if (answered) return;
                setRearranged(p => p.filter((_, pi) => pi !== i));
                setUsedIdx(p => p.filter((_, pi) => pi !== i));
              }}>{w}</span>
            ))}
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.05em", marginTop: "0.7rem", marginBottom: "0.3rem" }}>WORD BANK</div>
          <div className="tiles">
            {(shuffledWords.length ? shuffledWords : q.words || []).map((w, i) => (
              <span key={i} className={`tile ${usedIdx.includes(i) ? "used" : ""}`}
                onClick={() => { if (answered || usedIdx.includes(i)) return; setRearranged(p => [...p, w]); setUsedIdx(p => [...p, i]); }}>
                {w}
              </span>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
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
      )}

      {q.type === "stress_battle" && (
        <div>
          <div style={{ textAlign: "center", fontFamily: "'Fraunces',serif", fontSize: "clamp(2.2rem,10vw,3.5rem)", fontWeight: 900, fontStyle: "italic", letterSpacing: "0.04em", color: "var(--sun)", marginBottom: "0.5rem" }}>{q.word}</div>
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>Which stress pattern is correct?</div>
          <div style={{ display: "flex", gap: "0.8rem" }}>
            {["A", "B"].map(label => {
              const wrongStress = q.stressed === 1 ? 2 : q.stressed === 3 ? 2 : 1;
              const stressAt = label === q.answer ? q.stressed : wrongStress;
              const sel = myAnswer === label;
              return (
                <button key={label} disabled={answered}
                  style={{ flex: 1, padding: "1.4rem 0.8rem", border: `2px solid ${sel ? "var(--sun)" : "var(--line)"}`, background: sel ? "rgba(255,206,71,0.12)" : "var(--paper)", borderRadius: 12, cursor: answered ? "default" : "pointer", opacity: answered && !sel ? 0.28 : 1, transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.9rem" }}
                  onClick={() => onAnswer(label)}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.4rem", fontWeight: 700, color: sel ? "var(--sun)" : "var(--muted)" }}>{label}</span>
                  <StressDots syllables={q.syllables} stressAt={stressAt} size="lg" />
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
