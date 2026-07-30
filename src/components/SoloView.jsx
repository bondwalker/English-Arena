import { useState, useEffect } from "react";
import { SAIcon, SAStreakMeter, SAConfetti } from "./ui.jsx";
import { StudentAnswer } from "./StudentAnswer.jsx";
import { QUESTION_BANK } from "../data/questions.js";
import { checkAnswer, reviewPrompt, reviewAnswer } from "../lib/utils.js";
import { readFaves, writeFaves } from "../lib/storage.js";

export default function SoloView({ onBack }) {
  const [phase, setPhase]           = useState("setup");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [gameType, setGameType]     = useState("mixed");
  const [qCount, setQCount]         = useState(10);
  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [myAnswer, setMyAnswer]     = useState(null);
  const [results, setResults]       = useState([]);
  const [streak, setStreak]         = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [faves, setFaves]           = useState(() => readFaves());
  const [topicFilter, setTopicFilter] = useState("all");

  const [rearranged, setRearranged]   = useState([]);
  const [usedIdx, setUsedIdx]         = useState([]);
  const [typeVal, setTypeVal]         = useState("");
  const [storyOrder, setStoryOrder]   = useState([]);
  const [matchState, setMatchState]   = useState({ sel:null, matched:{} });

  const q = questions[qIndex] || null;

  useEffect(() => {
    if (phase !== "question" || !q) return;
    setMyAnswer(null);
    setRearranged([]); setUsedIdx([]); setTypeVal(""); setStoryOrder([]); setMatchState({sel:null,matched:{}});
  }, [qIndex, phase]);

  const handleAnswer = (ans) => {
    if (myAnswer !== null) return;
    setMyAnswer(ans);
    setPhase("reveal");
  };

  const handleNext = () => {
    const correct = checkAnswer(myAnswer, q);
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setBestStreak(prev => Math.max(prev, newStreak));
    setResults(prev => [...prev, { correct, q }]);
    if (qIndex + 1 >= questions.length) {
      setPhase("done");
    } else {
      setQIndex(i => i + 1);
      setPhase("question");
    }
  };

  const loadQuestions = () => {
    if (!selectedTopic) return;
    const bank = QUESTION_BANK[selectedTopic].questions;
    // Stress Battle type always draws from the full dedicated word bank, regardless of topic
    const pool = gameType === "stress_battle"
      ? QUESTION_BANK.stress_battle.questions
      : gameType === "mixed" ? bank : bank.filter(q => q.type === gameType);
    if (!pool.length) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, Math.min(qCount, shuffled.length)));
    setQIndex(0);
    setResults([]);
    setStreak(0);
    setBestStreak(0);
    setPhase(QUESTION_BANK[selectedTopic].intro ? "intro" : "question");
  };

  const retryMissed = () => {
    const missed = results.filter(r => !r.correct).map(r => r.q);
    if (!missed.length) return;
    const shuffled = [...missed].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setQIndex(0);
    setResults([]);
    setStreak(0);
    setBestStreak(0);
    setPhase("question");
  };

  const toggleFave = (key) => {
    const next = faves.includes(key) ? faves.filter(k => k !== key) : [...faves, key];
    setFaves(next);
    writeFaves(next);
  };

  const restart = () => { setPhase("setup"); setQuestions([]); setQIndex(0); setResults([]); setStreak(0); setBestStreak(0); };

  const noStressBattle = new Set(["verb_tenses","present_perfect"]);
  const cleanLabel = (l) => l.replace(/^[^\w]+\s*/, "");
  const DOTS = ["var(--tomato)", "var(--cobalt)", "var(--leaf)", "var(--plum)", "var(--sun)", "var(--aqua)"];

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.2rem"}}>
        <button className="btn btn-ghost btn-sm mb-3" onClick={onBack}>← Back</button>
        <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:"clamp(1.7rem,7vw,2.2rem)",lineHeight:1.1,marginBottom:"0.5rem",color:"var(--sun)"}}>Practise on your own — no teacher needed!</h2>
        <p style={{color:"var(--ink-soft)",fontSize:"1rem",marginBottom:"1.3rem"}}>Pick a topic, question type and number of questions.</p>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem"}}>
          <div style={{fontSize:"0.8rem",color:"var(--ink-soft)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>Topic</div>
          <div className="flex gap-1">
            <button className={`btn btn-sm ${topicFilter==="all"?"btn-teal":"btn-ghost"}`} style={{fontSize:"0.72rem",padding:"0.18rem 0.55rem"}} onClick={() => setTopicFilter("all")}>All</button>
            <button className={`btn btn-sm ${topicFilter==="saved"?"btn-gold":"btn-ghost"}`} style={{fontSize:"0.72rem",padding:"0.18rem 0.55rem"}} onClick={() => setTopicFilter("saved")}>★ Saved{faves.length>0?` (${faves.length})`:""}</button>
          </div>
        </div>
        {topicFilter==="saved" && faves.length===0 && (
          <p style={{fontSize:"0.78rem",color:"var(--muted)",marginBottom:"0.6rem"}}>No saved topics yet — tap ★ on any topic to save it.</p>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.4rem",marginBottom:"0.9rem",maxHeight:"260px",overflowY:"auto",padding:"0.5rem",border:"1px solid var(--line)",borderRadius:8}}>
          {Object.entries(QUESTION_BANK).filter(([k]) => topicFilter==="all" || faves.includes(k)).sort((a,b) => cleanLabel(a[1].label).localeCompare(cleanLabel(b[1].label))).map(([key,{label}],i) => {
            const disabled = gameType==="stress_battle" && noStressBattle.has(key);
            const sel = selectedTopic === key;
            return (
              <div key={key} style={{position:"relative",display:"flex"}}>
                <button
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedTopic(key)}
                  style={{flex:1,display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.55rem 0.6rem",paddingRight:"1.6rem",fontSize:"0.82rem",fontWeight:sel?700:600,border:`2px solid ${sel?"var(--sun)":"var(--line)"}`,background:sel?"rgba(255,206,71,0.12)":"var(--paper)",color:sel?"var(--sun)":disabled?"var(--muted)":"var(--ink)",cursor:disabled?"not-allowed":"pointer",textAlign:"left",transition:"all 0.12s",opacity:disabled?0.35:1,borderRadius:10}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:DOTS[i%DOTS.length],flexShrink:0}} />
                  {cleanLabel(label)}</button>
                <button onClick={(e) => { e.stopPropagation(); toggleFave(key); }} title={faves.includes(key)?"Remove from saved":"Save topic"} style={{position:"absolute",right:"0.3rem",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:faves.includes(key)?"var(--sun)":"var(--muted)",padding:"0.1rem",lineHeight:1}}>{faves.includes(key)?"★":"☆"}</button>
              </div>
            );
          })}
        </div>

        <div style={{fontSize:"0.8rem",color:"var(--ink-soft)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,marginBottom:"0.4rem"}}>Question type</div>
        <div className="flex wrap gap-1 mb-3">
          {[["mixed","Mixed"],["multiple_choice","Multiple Choice"],["true_false","True / False"],["error_spotter","Error Spotter"],["rearrange","Word Order"],["story_builder","Story Builder"],["word_match","Word Match"],["odd_one_out","Odd One Out"],["type_answer","Type Answer"],["stress_battle","Stress Battle"]].map(([v,l]) => (
            <button key={v} className={`btn btn-sm ${gameType===v?"btn-teal":"btn-ghost"}`} onClick={() => setGameType(v)}>{l}</button>
          ))}
        </div>

        <div style={{fontSize:"0.8rem",color:"var(--ink-soft)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,marginBottom:"0.4rem"}}>Number of questions</div>
        <div className="flex gap-1 mb-1">
          {[5,8,10,12,15].map(n => (
            <button key={n} className={`btn btn-sm ${qCount===n?"btn-gold":"btn-ghost"}`} onClick={() => setQCount(n)}>{n}</button>
          ))}
        </div>
        {selectedTopic && (() => {
          const bank = QUESTION_BANK[selectedTopic].questions;
          const available = gameType === "stress_battle"
            ? QUESTION_BANK.stress_battle.questions.length
            : gameType === "mixed" ? bank.length : bank.filter(q => q.type === gameType).length;
          const actual = Math.min(qCount, available);
          return available < qCount
            ? <p style={{fontSize:"0.78rem",color:"var(--sun)",marginBottom:"1rem",marginTop:"0.3rem"}}>Only {available} question{available!==1?"s":""} available — you'll get {actual}.</p>
            : <p style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:"1rem",marginTop:"0.3rem"}}>{actual} questions ready</p>;
        })()}
        {!selectedTopic && <div style={{marginBottom:"1rem"}}/>}
        <button className="btn btn-teal btn-full" disabled={!selectedTopic||(gameType==="stress_battle"&&noStressBattle.has(selectedTopic))} onClick={loadQuestions}>Start Practising →</button>
      </div>
    );
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    const intro = QUESTION_BANK[selectedTopic]?.intro;
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.5rem"}}>
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => setPhase("setup")}>← Back</button>
        <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:"1.3rem",marginBottom:"0.2rem"}}>Before you start.</h2>
        <p style={{color:"var(--muted)",fontSize:"0.82rem",marginBottom:"1rem"}}>A quick grammar reminder for this topic.</p>
        {intro?.sections?.map((s, i) => (
          <div key={i} className="card mb-3">
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.74rem",color:"var(--sun)",marginBottom:"0.45rem",letterSpacing:"0.06em",textTransform:"uppercase"}}>{s.heading}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.87rem",color:"var(--aqua)",padding:"0.35rem 0.6rem",background:"rgba(66,218,195,0.08)",borderRadius:4,marginBottom:"0.6rem"}}>{s.form}</div>
            <div style={{marginBottom:"0.5rem"}}>
              {s.examples.map((ex, j) => (
                <p key={j} style={{fontSize:"0.85rem",marginBottom:"0.15rem",opacity:0.82,fontStyle:"italic"}}>"{ex}"</p>
              ))}
            </div>
            <p style={{fontSize:"0.79rem",opacity:0.55,lineHeight:1.55,marginTop:"0.3rem"}}>{s.use}</p>
          </div>
        ))}
        {intro?.tip && (
          <div className="card mb-4" style={{border:"1.5px solid rgba(255,206,71,0.35)",background:"rgba(255,206,71,0.06)"}}>
            <span style={{fontSize:"0.74rem",fontWeight:700,color:"var(--sun)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em"}}>KEY DIFFERENCE</span>
            <p style={{fontSize:"0.83rem",marginTop:"0.3rem",lineHeight:1.55,color:"var(--ink-soft)"}}>{intro.tip}</p>
          </div>
        )}
        <button className="btn btn-teal btn-full" onClick={() => setPhase("question")}>Start Practising →</button>
      </div>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (phase === "done") {
    const total   = results.length;
    const correct = results.filter(r => r.correct).length;
    const pct     = Math.round((correct / total) * 100);
    const gradeLabel = pct>=90?"Outstanding!":pct>=70?"Well done!":pct>=50?"Keep practising!":"Review and try again!";
    const gradeColor = pct>=70?"var(--leaf)":pct>=50?"var(--sun)":"var(--tomato)";
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.5rem"}}>
        <div className="card sa-anim-pop" style={{textAlign:"center",marginBottom:"1.2rem",border:"1.5px solid var(--line)",boxShadow:`4px 4px 0 ${gradeColor}`}}>
          <SAIcon name="trophy" size={32} color={gradeColor} />
          <div style={{fontFamily:"'Fraunces',serif",fontSize:"3rem",fontWeight:900,fontStyle:"italic",color:gradeColor,lineHeight:1,margin:"0.3rem 0"}}>{pct}%</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontStyle:"italic",fontSize:"1.1rem",marginBottom:"0.2rem",color:"var(--ink)"}}>{gradeLabel}</div>
          <div style={{color:"var(--muted)",fontSize:"0.85rem"}}>{correct} / {total} correct · {QUESTION_BANK[selectedTopic]?.label}</div>
          {bestStreak >= 2 && (
            <div style={{marginTop:"0.6rem",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <SAStreakMeter count={bestStreak} size="sm" />
              <span style={{fontSize:"0.8rem",color:"var(--sun)"}}>Best streak</span>
            </div>
          )}
        </div>

        <div style={{marginBottom:"1.2rem"}}>
          {results.map((r, i) => (
            <div key={i} style={{display:"flex",gap:"0.6rem",alignItems:"flex-start",padding:"0.5rem 0",borderBottom:"1px solid var(--line)"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:r.correct?"rgba(122,220,90,0.2)":"rgba(255,92,66,0.2)",border:`1.5px solid ${r.correct?"var(--leaf)":"var(--tomato)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"0.1rem"}}>
                <SAIcon name={r.correct?"bolt":"skip"} size={10} color={r.correct?"var(--leaf)":"var(--tomato)"} />
              </div>
              <div>
                <div style={{fontSize:"0.83rem",color:"var(--ink-soft)",lineHeight:1.4}}>{reviewPrompt(r.q)}</div>
                {!r.correct && <div style={{fontSize:"0.78rem",color:"var(--sun)",marginTop:"0.2rem"}}>
                  {reviewAnswer(r.q)}
                </div>}
              </div>
            </div>
          ))}
        </div>

        {results.some(r => !r.correct) && (
          <button className="btn btn-full mb-2" style={{background:"rgba(255,92,66,0.1)",border:"1.5px solid var(--tomato)",color:"var(--tomato)"}} onClick={retryMissed}>
            Retry missed ({results.filter(r => !r.correct).length})
          </button>
        )}
        <div className="flex gap-2">
          <button className="btn btn-teal" style={{flex:1}} onClick={loadQuestions}>Try Again</button>
          <button className="btn btn-ghost" style={{flex:1}} onClick={restart}>New Topic</button>
        </div>
        <button className="btn btn-ghost btn-full mt-2" onClick={onBack}>← Home</button>
      </div>
    );
  }

  // ── QUESTION / REVEAL ──────────────────────────────────────────────────────
  if (!q) return null;
  const isCorrect = phase === "reveal" && checkAnswer(myAnswer, q);
  const pendingStreak = isCorrect ? streak + 1 : 0;
  const fakeRoom = { qIndex, questions, phase: phase === "question" ? "question" : "reveal" };

  return (
    <div style={{minHeight:"100vh",maxWidth:460,margin:"0 auto",padding:"1.2rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem"}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{padding:"0.3rem 0.7rem",fontSize:"0.75rem"}}>✕</button>
        <div style={{flex:1,height:5,background:"var(--line)",borderRadius:3}}>
          <div style={{height:"100%",borderRadius:3,background:"var(--aqua)",width:`${(qIndex/questions.length)*100}%`,transition:"width 0.4s"}}/>
        </div>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.72rem",color:"var(--muted)"}}>{qIndex+1}/{questions.length}</span>
      </div>

      {phase === "reveal" && (
        <div style={{position:"relative",overflow:"hidden"}}>
          <SAConfetti active={isCorrect} count={35} />
          <div className="sa-anim-pop" style={{padding:"0.8rem 1rem",marginBottom:"0.9rem",borderRadius:10,background:isCorrect?"rgba(122,220,90,0.1)":"rgba(255,92,66,0.1)",border:`1.5px solid ${isCorrect?"var(--leaf)":"var(--tomato)"}`,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.3rem"}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:isCorrect?"rgba(122,220,90,0.2)":"rgba(255,92,66,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <SAIcon name={isCorrect?"bolt":"skip"} size={20} color={isCorrect?"var(--leaf)":"var(--tomato)"} />
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontStyle:"italic",fontSize:"1.1rem",color:isCorrect?"var(--leaf)":"var(--tomato)"}}>{isCorrect?"Correct!":"Not quite."}</div>
            {pendingStreak >= 2 && <SAStreakMeter count={pendingStreak} size="sm" />}
            {!isCorrect && q.type==="error_spotter" && <div style={{fontSize:"0.82rem",color:"var(--muted)"}}>Error: <strong style={{color:"var(--tomato)"}}>{q.errorWord}</strong> → <strong style={{color:"var(--sun)"}}>{q.answer}</strong></div>}
            {!isCorrect && q.type==="stress_battle" && <div style={{fontSize:"0.82rem",color:"var(--muted)"}}>Pattern <strong style={{color:"var(--sun)"}}>{q.answer}</strong> — stressed on syllable {q.stressed}</div>}
            {!isCorrect && !["error_spotter","word_match","story_builder","stress_battle"].includes(q.type) && <div style={{fontSize:"0.82rem",color:"var(--muted)"}}>Answer: <strong style={{color:"var(--sun)"}}>{q.answer}</strong></div>}
            {!isCorrect && q.type==="story_builder" && <div style={{fontSize:"0.82rem",color:"var(--muted)"}}>Order: <strong style={{color:"var(--sun)"}}>{(q.correctOrder||[]).filter(i=>i<3).join(",")}</strong></div>}
            {q.explanation && <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.1rem",lineHeight:1.4,textAlign:"center"}}>{q.explanation}</div>}
          </div>
        </div>
      )}

      <StudentAnswer q={q} myAnswer={myAnswer} onAnswer={handleAnswer}
        rearranged={rearranged} setRearranged={setRearranged}
        usedIdx={usedIdx} setUsedIdx={setUsedIdx}
        typeVal={typeVal} setTypeVal={setTypeVal}
        storyOrder={storyOrder} setStoryOrder={setStoryOrder}
        matchState={matchState} setMatchState={setMatchState}
        room={fakeRoom} />

      {phase === "reveal" && (
        <button className="btn btn-teal btn-full mt-3" onClick={handleNext}>
          {qIndex + 1 >= questions.length ? "See Results →" : "Next →"}
        </button>
      )}
    </div>
  );
}
