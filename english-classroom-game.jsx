import { useState, useEffect, useRef } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = "englishgame_v2";
const read = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; } };
const write = (v) => localStorage.setItem(STORE_KEY, JSON.stringify(v));

// ─── Teams ────────────────────────────────────────────────────────────────────
const TEAMS = [
  { id: "red",    name: "Red Wolves",    color: "#e83a3a", emoji: "🐺" },
  { id: "blue",   name: "Blue Sharks",   color: "#4db8e8", emoji: "🦈" },
  { id: "green",  name: "Green Tigers",  color: "#3ab87a", emoji: "🐯" },
  { id: "purple", name: "Purple Eagles", color: "#a855f7", emoji: "🦅" },
];

const defaultRoom = () => ({
  code: Math.random().toString(36).slice(2,6).toUpperCase(),
  phase: "lobby",
  mode: "solo",
  players: {},
  currentQ: null,
  qIndex: 0,
  questions: [],
  timeLeft: 25,
  answers: {},
  topic: "",
  gameType: "mixed",
  teamCount: 2,
  teamsLocked: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkAnswer(given, q) {
  if (given === null || given === undefined) return false;
  const n = s => String(s).toLowerCase().trim().replace(/[.,!?'"]/g,"");
  if (q.type === "word_match") return given === "match_all_correct";
  return n(given) === n(q.answer);
}

function getTeamScores(room) {
  const scores = {};
  TEAMS.forEach(t => { scores[t.id] = 0; });
  Object.values(room.players || {}).forEach(p => {
    if (p.team && scores[p.team] !== undefined) scores[p.team] += (p.score || 0);
  });
  return scores;
}

// ─── AI Generator ─────────────────────────────────────────────────────────────
async function generateQuestions(topic, gameType, count) {
  const typeMap = {
    mixed:           "a creative mix of: multiple_choice, true_false, error_spotter, type_answer, rearrange, fill_idiom, odd_one_out, story_builder",
    multiple_choice: "only multiple_choice",
    true_false:      "only true_false",
    error_spotter:   "only error_spotter",
    rearrange:       "only rearrange",
    story_builder:   "only story_builder",
    fill_idiom:      "only fill_idiom",
    type_answer:     "only type_answer",
    word_match:      "only word_match",
    odd_one_out:     "only odd_one_out",
  };

  const prompt = `Create ${count} English practice questions about: "${topic}".
Type: ${typeMap[gameType] || typeMap.mixed}.

Return ONLY a valid JSON array. Follow these exact schemas:

multiple_choice: {"type":"multiple_choice","question":"...","options":["A","B","C","D"],"answer":"B","explanation":"..."}
true_false: {"type":"true_false","question":"'I have went' is correct.","answer":"False","explanation":"..."}
error_spotter: {"type":"error_spotter","question":"Find the mistake:","sentence":"She don't like coffee.","errorWord":"don't","answer":"doesn't","explanation":"..."}
type_answer: {"type":"type_answer","question":"Complete: She ___ (go) every day.","answer":"goes","explanation":"..."}
rearrange: {"type":"rearrange","question":"Rearrange into a correct sentence:","words":["always","She","eats","breakfast"],"answer":"She always eats breakfast","explanation":"..."}
story_builder: {"type":"story_builder","question":"Order these sentences into a story:","sentences":["Finally he smiled.","Tom woke up late.","He rushed to work.","His alarm didn't go off."],"correctOrder":[1,3,2,0],"answer":"1,3,2,0","explanation":"..."}
fill_idiom: {"type":"fill_idiom","question":"Complete: It's raining ___ and ___.","answer":"cats and dogs","hint":"heavy rain","explanation":"..."}
word_match: {"type":"word_match","question":"Match words with meanings:","pairs":[{"word":"bold","meaning":"brave"},{"word":"frugal","meaning":"careful with money"},{"word":"vague","meaning":"not clear"},{"word":"keen","meaning":"very interested"}],"answer":"match_all","explanation":"..."}
odd_one_out: {"type":"odd_one_out","question":"Which has a grammar mistake?","options":["She has worked here for years.","They went to the cinema.","He have finished homework.","We are going tomorrow."],"answer":"He have finished homework.","explanation":"..."}

Rules: story_builder correctOrder and answer are 0-based indices. word_match always has exactly 4 pairs. Make questions for intermediate learners.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "[]";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#0d0d0d;--paper:#f5f0e8;--cream:#ede8dc;--gold:#e8b84b;--coral:#e85d3a;--teal:#2a9d8f;--violet:#a855f7;--sky:#4db8e8;--green:#3ab87a;--red:#e83a3a}
  body{background:var(--ink);color:#f5f0e8;font-family:'DM Sans',sans-serif}
  h1,h2,h3{font-family:'Unbounded',sans-serif;font-weight:700}

  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden}
  .hero::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent,transparent 40px,rgba(232,184,75,0.04) 40px,rgba(232,184,75,0.041) 41px)}
  .hero-title{font-family:'Unbounded',sans-serif;font-size:clamp(2.8rem,9vw,6.5rem);font-weight:900;letter-spacing:-0.03em;text-align:center;line-height:0.95;position:relative}
  .hero-title span{color:var(--gold)}
  .hero-sub{margin-top:1.2rem;font-size:1rem;opacity:0.5;text-align:center;max-width:400px;line-height:1.7}
  .hero-btns{display:flex;gap:1rem;margin-top:2.5rem;flex-wrap:wrap;justify-content:center}

  .btn{font-family:'Unbounded',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:0.9rem 1.8rem;border:2px solid currentColor;cursor:pointer;transition:all 0.15s;background:transparent;color:inherit}
  .btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:4px 4px 0 currentColor}
  .btn:active:not(:disabled){transform:translate(0,0);box-shadow:none}
  .btn:disabled{opacity:0.35;cursor:not-allowed}
  .btn-gold{background:var(--gold);color:var(--ink);border-color:var(--gold)}
  .btn-teal{background:var(--teal);color:#fff;border-color:var(--teal)}
  .btn-coral{background:var(--coral);color:#fff;border-color:var(--coral)}
  .btn-green{background:var(--green);color:#fff;border-color:var(--green)}
  .btn-ghost{border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.65)}
  .btn-ghost:hover:not(:disabled){border-color:rgba(255,255,255,0.7);color:#fff;box-shadow:4px 4px 0 rgba(255,255,255,0.15)}
  .btn-sm{padding:0.45rem 0.9rem;font-size:0.6rem}
  .btn-full{width:100%}

  .panel{min-height:100vh;padding:1.5rem;max-width:860px;margin:0 auto}
  .card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:1.1rem;margin-bottom:0.65rem}
  .card-gold{border-color:var(--gold);background:rgba(232,184,75,0.07)}

  .label{font-family:'Unbounded',sans-serif;font-size:0.57rem;letter-spacing:0.14em;text-transform:uppercase;opacity:0.4;margin-bottom:0.3rem;display:block}
  .badge{display:inline-block;padding:0.18rem 0.65rem;font-family:'Unbounded',sans-serif;font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;background:var(--gold);color:var(--ink)}

  .input{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:1rem;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;outline:none;transition:border-color 0.15s}
  .input:focus{border-color:var(--gold)}
  .input::placeholder{opacity:0.3}
  .input-xl{font-size:2rem;text-align:center;font-family:'Unbounded',sans-serif;letter-spacing:0.25em}
  .select{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:0.9rem;border:1px solid rgba(255,255,255,0.18);background:#161616;color:#fff;outline:none;cursor:pointer}

  .code-badge{font-family:'Unbounded',sans-serif;font-size:clamp(2.5rem,8vw,4.5rem);font-weight:900;letter-spacing:0.2em;color:var(--gold);text-align:center;padding:1rem 1.5rem;border:3px solid var(--gold);display:inline-block}

  .mode-toggle{display:flex;border:1px solid rgba(255,255,255,0.18);overflow:hidden;margin-bottom:1rem}
  .mode-btn{flex:1;padding:0.7rem;font-family:'Unbounded',sans-serif;font-size:0.62rem;letter-spacing:0.07em;text-transform:uppercase;border:none;cursor:pointer;transition:all 0.15s;background:transparent;color:rgba(255,255,255,0.35)}
  .mode-btn.active{background:var(--gold);color:var(--ink)}

  .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.6rem;margin:0.6rem 0}
  .team-card{padding:0.9rem;border:2px solid;text-align:center}
  .team-card-name{font-family:'Unbounded',sans-serif;font-size:0.65rem;font-weight:700;margin-top:0.35rem}
  .team-card-count{font-size:0.75rem;opacity:0.55;margin-top:0.15rem}
  .team-members{font-size:0.72rem;margin-top:0.4rem;opacity:0.6;line-height:1.7}

  .opt-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.55rem;margin-top:0.9rem}
  .opt-btn{padding:0.9rem 0.8rem;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:600;border:2px solid transparent;cursor:pointer;transition:all 0.13s;text-align:left;display:flex;align-items:flex-start;gap:0.55rem;min-height:66px;line-height:1.4;color:var(--ink)}
  .opt-btn:hover:not(:disabled){transform:translate(-2px,-2px)}
  .opt-btn:disabled{cursor:not-allowed}
  .opt-0{background:#fde8e8;border-color:#e83a3a}
  .opt-1{background:#e8f4fd;border-color:#4db8e8}
  .opt-2{background:#edfde8;border-color:#3ab87a}
  .opt-3{background:#f3e8fd;border-color:#a855f7}
  .opt-selected{box-shadow:inset 0 0 0 3px rgba(0,0,0,0.25)}

  .tiles{display:flex;flex-wrap:wrap;gap:0.4rem;padding:0.65rem;border:2px dashed rgba(255,255,255,0.18);min-height:50px}
  .tile{padding:0.38rem 0.85rem;background:var(--gold);color:var(--ink);font-family:'Unbounded',sans-serif;font-size:0.68rem;font-weight:700;cursor:pointer;transition:all 0.11s;user-select:none}
  .tile:hover{transform:translateY(-2px)}
  .tile.used{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.22);cursor:default;transform:none}
  .tile.placed{background:var(--teal);color:#fff}

  .story-card{padding:0.8rem 1rem;border:1px solid rgba(255,255,255,0.14);margin-bottom:0.4rem;cursor:pointer;transition:all 0.13s;display:flex;align-items:flex-start;gap:0.65rem;font-size:0.88rem;line-height:1.5}
  .story-card:hover:not(.placed){border-color:var(--gold);background:rgba(232,184,75,0.07)}
  .story-card.placed{border-color:var(--teal);background:rgba(42,157,143,0.1)}
  .story-num{font-family:'Unbounded',sans-serif;font-size:0.65rem;font-weight:700;color:var(--teal);width:1.4rem;flex-shrink:0;margin-top:0.1rem}

  .match-word{padding:0.55rem 0.9rem;border:1px solid rgba(255,255,255,0.18);font-size:0.88rem;font-weight:500;cursor:pointer;transition:all 0.13s;text-align:center;margin-bottom:0.4rem}
  .match-word:hover{border-color:var(--gold)}
  .match-word.selected{border-color:var(--gold);background:rgba(232,184,75,0.12)}
  .match-word.matched-correct{border-color:var(--green);background:rgba(58,184,122,0.12);cursor:default}
  .match-word.matched-wrong{border-color:var(--red);background:rgba(232,58,58,0.12);cursor:default}

  .timer-num{font-family:'Unbounded',sans-serif;font-size:3rem;font-weight:900;color:var(--gold);line-height:1}
  .timer-num.urgent{color:var(--coral);animation:pulse 0.5s ease infinite alternate}
  @keyframes pulse{from{transform:scale(1)}to{transform:scale(1.1)}}

  .lb-row{display:flex;align-items:center;gap:0.8rem;padding:0.75rem 0.9rem;margin-bottom:0.35rem;border-left:4px solid transparent;animation:slideIn 0.35s ease forwards;opacity:0}
  @keyframes slideIn{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
  .lb-rank{font-family:'Unbounded',sans-serif;font-size:1.1rem;font-weight:900;width:1.9rem;opacity:0.45}
  .lb-name{flex:1;font-weight:600;font-size:0.95rem}
  .lb-score{font-family:'Unbounded',sans-serif;font-size:1rem;font-weight:700;color:var(--gold)}

  .prog{height:3px;background:rgba(255,255,255,0.07);margin-bottom:1.2rem}
  .prog-fill{height:100%;background:var(--gold);transition:width 0.5s}

  .result-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);z-index:200;animation:fadeIn 0.2s}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .result-box{text-align:center;padding:2.5rem}
  .result-emoji{font-size:5rem;display:block;animation:boing 0.45s cubic-bezier(0.175,0.885,0.32,1.275)}
  @keyframes boing{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}

  .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.55rem;padding:1.1rem;background:#fff;border:3px solid var(--gold);max-width:210px;margin:0.9rem auto 0}
  .qr-wrap img{width:155px;height:155px;display:block}
  .qr-label{font-family:'Unbounded',sans-serif;font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);text-align:center}
  .qr-url{font-size:0.57rem;color:var(--ink);opacity:0.38;text-align:center;word-break:break-all;max-width:175px}

  .chip{display:inline-flex;align-items:center;gap:0.3rem;padding:0.28rem 0.65rem;font-family:'Unbounded',sans-serif;font-size:0.56rem;font-weight:700;margin:0.18rem;animation:popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)}
  @keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}

  .dots span{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold);margin:0 3px;animation:dotP 1.2s ease-in-out infinite}
  .dots span:nth-child(2){animation-delay:0.2s}.dots span:nth-child(3){animation-delay:0.4s}
  @keyframes dotP{0%,80%,100%{transform:scale(0.6);opacity:0.35}40%{transform:scale(1);opacity:1}}

  .flex{display:flex}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.wrap{flex-wrap:wrap}
  .gap-1{gap:0.5rem}.gap-2{gap:1rem}
  .mt-1{margin-top:0.5rem}.mt-2{margin-top:1rem}.mt-3{margin-top:1.5rem}.mt-4{margin-top:2rem}
  .mb-1{margin-bottom:0.5rem}.mb-2{margin-bottom:1rem}
  .text-center{text-align:center}.text-gold{color:var(--gold)}.text-teal{color:var(--teal)}.text-green{color:var(--green)}.text-coral{color:var(--coral)}
  .op50{opacity:0.5}.op30{opacity:0.3}.w100{width:100%}

  @media(max-width:500px){
    .opt-grid{grid-template-columns:1fr}
    .opt-btn{min-height:52px}
    .hero-btns{flex-direction:column;align-items:stretch}
  }
`;

const MEDAL = ["🥇","🥈","🥉"];
const OPT_ICONS = ["🔴","🔵","🟢","🟣"];
const GAME_MODES = [
  {v:"mixed",         label:"🎲 Mixed",            desc:"All types"},
  {v:"multiple_choice",label:"📋 Multiple Choice", desc:"4 options"},
  {v:"true_false",    label:"✅ True / False",      desc:"Grammar judge"},
  {v:"error_spotter", label:"🔍 Error Spotter",     desc:"Find the mistake"},
  {v:"type_answer",   label:"✏️ Type Answer",       desc:"Short text response"},
  {v:"rearrange",     label:"🔀 Word Order",        desc:"Build sentences"},
  {v:"story_builder", label:"📖 Story Builder",     desc:"Arrange a story"},
  {v:"fill_idiom",    label:"🎭 Idioms",            desc:"Complete expressions"},
  {v:"word_match",    label:"🃏 Word Match",        desc:"Vocab matching"},
  {v:"odd_one_out",   label:"🎯 Odd One Out",       desc:"Spot the wrong one"},
];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  return (
    <>
      <style>{css}</style>
      {view==="home"    && <Home    onHost={()=>setView("host")} onJoin={()=>setView("student")} />}
      {view==="host"    && <HostView    onBack={()=>setView("home")} />}
      {view==="student" && <StudentView onBack={()=>setView("home")} />}
    </>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onHost, onJoin }) {
  return (
    <div className="hero">
      <h1 className="hero-title">ENGLISH<br/><span>ARENA</span></h1>
      <p className="hero-sub">AI-powered live games for your English classroom. No app needed.</p>
      <div className="hero-btns">
        <button className="btn btn-gold" onClick={onHost}>🎓 I'm the Teacher</button>
        <button className="btn btn-ghost" onClick={onJoin}>📱 I'm a Student</button>
      </div>
      <p className="op30 text-center mt-4" style={{fontSize:"0.72rem",maxWidth:440,lineHeight:1.8}}>
        Multiple Choice · True/False · Error Spotter · Word Order · Story Builder · Idioms · Word Match · Odd One Out
        <br/>Solo mode · Teams mode · Live leaderboard · AI question generation
      </p>
    </div>
  );
}

// ─── HOST VIEW ────────────────────────────────────────────────────────────────
function HostView({ onBack }) {
  const [room, setRoom] = useState(() => read() || defaultRoom());
  const [topic, setTopic] = useState("");
  const [gameType, setGameType] = useState("mixed");
  const [qCount, setQCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const upd = (fn) => setRoom(prev => {
    const next = typeof fn === "function" ? fn(prev) : { ...prev, ...fn };
    write(next); return next;
  });

  // Sync players & answers from storage (students write there)
  useEffect(() => {
    const id = setInterval(() => {
      const s = read();
      if (s?.code === room.code) setRoom(prev => ({ ...prev, players: s.players, answers: s.answers }));
    }, 700);
    return () => clearInterval(id);
  }, [room.code]);

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (room.phase !== "question") return;
    timerRef.current = setInterval(() => {
      upd(prev => {
        if (prev.phase !== "question") { clearInterval(timerRef.current); return prev; }
        if (prev.timeLeft <= 1) { clearInterval(timerRef.current); return { ...prev, phase:"reveal", timeLeft:0 }; }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [room.phase, room.qIndex]);

  const generate = async () => {
    if (!topic.trim()) { setError("Enter a topic first!"); return; }
    setLoading(true); setError("");
    try {
      const qs = await generateQuestions(topic, gameType, qCount);
      upd(prev => ({ ...prev, questions:qs, topic, gameType, phase:"lobby" }));
    } catch(e) { setError("Generation failed — try again."); }
    setLoading(false);
  };

  const autoAssign = () => {
    const names = Object.keys(room.players);
    if (!names.length) return;
    upd(prev => {
      const updated = { ...prev, players: { ...prev.players }, teamsLocked:true };
      names.forEach((n,i) => { updated.players[n] = { ...updated.players[n], team: TEAMS[i % prev.teamCount].id }; });
      return updated;
    });
  };

  const startGame = () => {
    if (!room.questions.length) return;
    upd(prev => ({ ...prev, phase:"question", qIndex:0, currentQ:prev.questions[0], timeLeft:25, answers:{} }));
  };

  const advance = () => {
    upd(prev => {
      const q = prev.currentQ;
      const players = { ...prev.players };
      Object.entries(prev.answers).forEach(([name, ans]) => {
        if (!players[name]) players[name] = { score:0, streak:0 };
        const correct = checkAnswer(ans, q);
        const bonus = correct && (players[name].streak||0) >= 1 ? 250 : 0;
        players[name] = {
          ...players[name],
          score: (players[name].score||0) + (correct ? 1000+bonus : 0),
          streak: correct ? (players[name].streak||0)+1 : 0,
          correct, lastAnswer: ans,
        };
      });
      const nextIdx = prev.qIndex + 1;
      if (nextIdx >= prev.questions.length) return { ...prev, players, phase:"end", answers:{} };
      // Go to intermediate leaderboard; pre-load next question so goNextQuestion just flips phase
      return { ...prev, players, phase:"leaderboard", qIndex:nextIdx, currentQ:prev.questions[nextIdx], answers:{} };
    });
  };

  const goNextQuestion = () => {
    upd(prev => ({ ...prev, phase:"question", timeLeft:25 }));
  };

  const reset = () => { const r = defaultRoom(); write(r); setRoom(r); setTopic(""); setGameType("mixed"); };

  const players = Object.entries(room.players);
  const sorted = [...players].sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  const teamScores = getTeamScores(room);
  const activeTeams = TEAMS.slice(0, room.teamCount);

  return (
    <div className="panel">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 wrap gap-1">
        <h1 style={{fontSize:"0.95rem"}}>🎓 TEACHER DASHBOARD</h1>
        <div className="flex gap-1 wrap">
          {room.phase!=="lobby" && <button className="btn btn-sm btn-ghost" onClick={()=>upd(p=>({...p,phase:"leaderboard"}))}>📊 Scores</button>}
          <button className="btn btn-sm btn-ghost" onClick={reset}>🔄 New</button>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Exit</button>
        </div>
      </div>

      {/* Code + QR */}
      <div className="text-center mt-2">
        <span className="label">Room Code</span>
        <div className="code-badge">{room.code}</div>
        <p className="op50 mt-1" style={{fontSize:"0.8rem"}}>{players.length} player{players.length!==1?"s":""} in lobby</p>
        <QRDisplay url={typeof window!=="undefined"?window.location.href:"https://claude.ai"} />
        <p className="op30 mt-1" style={{fontSize:"0.68rem"}}>Students scan → tap "I'm a Student" → enter <strong style={{color:"var(--gold)"}}>{room.code}</strong></p>
      </div>

      {/* Players */}
      {players.length > 0 && (
        <div className="card mt-2">
          <span className="label">Players joined</span>
          <div className="flex wrap gap-1 mt-1">
            {players.map(([name, p]) => {
              const team = room.mode==="teams" ? TEAMS.find(t=>t.id===p.team) : null;
              return (
                <span key={name} className="chip" style={{background:team?team.color:(p.score>0?"var(--gold)":"rgba(255,255,255,0.1)"),color:team?"#fff":"var(--ink)"}}>
                  {team && team.emoji} {name}{p.score>0?` · ${p.score}`:""}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOBBY SETUP ── */}
      {room.phase === "lobby" && (
        <div className="mt-3">
          {/* Mode */}
          <span className="label">Game Mode</span>
          <div className="mode-toggle">
            <button className={`mode-btn ${room.mode==="solo"?"active":""}`} onClick={()=>upd(p=>({...p,mode:"solo"}))}>👤 Solo — Individual</button>
            <button className={`mode-btn ${room.mode==="teams"?"active":""}`} onClick={()=>upd(p=>({...p,mode:"teams"}))}>👥 Teams</button>
          </div>

          {/* Teams config */}
          {room.mode==="teams" && (
            <div className="card card-gold mb-2">
              <span className="label">Team Setup</span>
              <div className="flex items-center gap-2 mt-1 mb-2 wrap">
                <span style={{fontSize:"0.85rem",opacity:0.7}}>Teams:</span>
                {[2,3,4].map(n=>(
                  <button key={n} className={`btn btn-sm ${room.teamCount===n?"btn-gold":"btn-ghost"}`} onClick={()=>upd(p=>({...p,teamCount:n}))}>{n}</button>
                ))}
              </div>
              <div className="team-grid">
                {activeTeams.map(t => {
                  const members = players.filter(([,p])=>p.team===t.id).map(([n])=>n);
                  return (
                    <div key={t.id} className="team-card" style={{borderColor:t.color,color:t.color}}>
                      <div style={{fontSize:"1.4rem"}}>{t.emoji}</div>
                      <div className="team-card-name">{t.name}</div>
                      <div className="team-card-count">{members.length} member{members.length!==1?"s":""}</div>
                      {members.length>0&&<div className="team-members" style={{color:"rgba(255,255,255,0.55)"}}>{members.join(", ")}</div>}
                    </div>
                  );
                })}
              </div>
              {players.length>0 && !room.teamsLocked && <button className="btn btn-teal btn-sm mt-2" onClick={autoAssign}>⚡ Auto-assign players</button>}
              {room.teamsLocked && <p className="text-green mt-1" style={{fontSize:"0.8rem"}}>✓ Teams assigned!</p>}
            </div>
          )}

          {/* Topic */}
          <span className="label">Topic</span>
          <input className="input mb-2" placeholder="e.g. Present Perfect, Phrasal Verbs, Idioms about emotions…"
            value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generate()} />

          <div className="flex gap-2 mb-2 wrap">
            <div style={{flex:2,minWidth:180}}>
              <span className="label">Game Type</span>
              <select className="select" value={gameType} onChange={e=>setGameType(e.target.value)}>
                {GAME_MODES.map(g=><option key={g.v} value={g.v}>{g.label} — {g.desc}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:110}}>
              <span className="label">Questions</span>
              <select className="select" value={qCount} onChange={e=>setQCount(+e.target.value)}>
                {[3,5,6,8,10].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-coral mb-1" style={{fontSize:"0.85rem"}}>{error}</p>}
          <div className="flex gap-2 wrap">
            <button className="btn btn-gold" onClick={generate} disabled={loading}>
              {loading?<><span className="dots"><span/><span/><span/></span> Generating…</>:"✨ Generate Questions"}
            </button>
            {room.questions.length>0 && <button className="btn btn-green" onClick={startGame}>▶ Start — {room.questions.length} Qs</button>}
          </div>

          {room.questions.length>0 && (
            <div className="mt-3">
              <span className="label">Preview</span>
              {room.questions.map((q,i)=>(
                <div key={i} className="card mt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="badge">{q.type.replace(/_/g," ")}</span>
                    <span className="op30" style={{fontSize:"0.72rem"}}>Q{i+1}</span>
                  </div>
                  <p style={{fontSize:"0.88rem"}}>{q.question}</p>
                  {q.type==="rearrange"&&<p className="op30 mt-1" style={{fontSize:"0.76rem"}}>{q.words?.join(" · ")}</p>}
                  {q.type==="story_builder"&&<p className="op30 mt-1" style={{fontSize:"0.76rem"}}>{q.sentences?.length} sentences</p>}
                  {q.type==="word_match"&&<p className="op30 mt-1" style={{fontSize:"0.76rem"}}>{q.pairs?.map(p=>p.word).join(" · ")}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUESTION PHASE ── */}
      {room.phase==="question" && room.currentQ && (
        <HostQuestion q={room.currentQ} timeLeft={room.timeLeft} answers={room.answers}
          players={room.players} qIndex={room.qIndex} total={room.questions.length}
          mode={room.mode} teams={activeTeams} teamScores={teamScores} />
      )}

      {/* ── REVEAL ── */}
      {room.phase==="reveal" && room.currentQ && (
        <div className="mt-3">
          <HostReveal q={room.currentQ} answers={room.answers} players={room.players} />
          <button className="btn btn-gold mt-3" onClick={advance}>
            {room.qIndex+1>=room.questions.length?"🏆 Final Results":"📊 Show Scores →"}
          </button>
        </div>
      )}

      {/* ── LEADERBOARD / END ── */}
      {(room.phase==="leaderboard"||room.phase==="end") && (
        <>
          <Leaderboard sorted={sorted} mode={room.mode} teams={activeTeams}
            teamScores={teamScores} isEnd={room.phase==="end"} />
          {room.phase==="leaderboard" && (
            <button className="btn btn-gold mt-3" onClick={goNextQuestion}>
              Next Question →
            </button>
          )}
        </>
      )}
    </div>
  );
}

function HostQuestion({ q, timeLeft, answers, players, qIndex, total, mode, teams, teamScores }) {
  const ansCount = Object.keys(answers).length;
  const pCount = Object.keys(players).length;
  return (
    <div className="mt-3">
      <div className="prog"><div className="prog-fill" style={{width:`${((qIndex+1)/total)*100}%`}}/></div>
      <div className="flex justify-between items-center mb-2">
        <span className="badge">{q.type.replace(/_/g," ")}</span>
        <span className="op50" style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.68rem"}}>Q{qIndex+1}/{total}</span>
      </div>
      {mode==="teams" && (
        <div className="flex gap-1 wrap mb-2">
          {teams.map(t=><span key={t.id} style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.62rem",padding:"0.28rem 0.7rem",background:t.color,color:"#fff"}}>{t.emoji} {(teamScores[t.id]||0).toLocaleString()}</span>)}
        </div>
      )}
      <div className="text-center mb-2">
        <div className={`timer-num ${timeLeft<=5?"urgent":""}`}>{timeLeft}</div>
      </div>
      <h2 style={{fontSize:"clamp(1.05rem,2.4vw,1.5rem)",lineHeight:1.4,textAlign:"center",marginBottom:"1rem"}}>{q.question}</h2>
      {q.type==="rearrange"&&<div className="tiles" style={{justifyContent:"center"}}>{q.words?.map((w,i)=><span key={i} className="tile">{w}</span>)}</div>}
      {(q.type==="multiple_choice"||q.type==="odd_one_out")&&q.options&&(
        <div className="opt-grid">{q.options.map((o,i)=><div key={i} className={`opt-btn opt-${i}`}><span className="opt-icon">{OPT_ICONS[i]}</span>{o}</div>)}</div>
      )}
      {q.type==="true_false"&&<div className="flex gap-2 mt-2"><div className="opt-btn opt-2" style={{justifyContent:"center",flex:1}}>✅ True</div><div className="opt-btn opt-0" style={{justifyContent:"center",flex:1}}>❌ False</div></div>}
      {q.type==="story_builder"&&q.sentences&&<div className="mt-2">{q.sentences.map((s,i)=><div key={i} className="story-card" style={{cursor:"default"}}><span className="story-num">{i+1}</span>{s}</div>)}</div>}
      {q.type==="word_match"&&q.pairs&&(
        <div className="flex gap-2 mt-2">
          <div style={{flex:1}}><span className="label">Words</span>{q.pairs.map((p,i)=><div key={i} className="match-word" style={{cursor:"default"}}>{p.word}</div>)}</div>
          <div style={{flex:1}}><span className="label">Meanings</span>{q.pairs.map((p,i)=><div key={i} className="match-word" style={{cursor:"default"}}>{p.meaning}</div>)}</div>
        </div>
      )}
      <div className="text-center mt-3">
        <span className="label">Answers received</span>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"2rem",color:"var(--gold)"}}>{ansCount}<span className="op50" style={{fontSize:"1.1rem"}}>/{pCount}</span></div>
        <div className="flex wrap justify-center gap-1 mt-1">
          {Object.keys(answers).map(n=><span key={n} className="chip" style={{background:"var(--teal)",color:"#fff"}}>✓ {n}</span>)}
        </div>
      </div>
    </div>
  );
}

function HostReveal({ q, answers, players }) {
  const correct = Object.entries(answers).filter(([,a])=>checkAnswer(a,q));
  const wrong = Object.entries(answers).filter(([,a])=>!checkAnswer(a,q));
  return (
    <div>
      <span className="label">Correct Answer</span>
      <div className="card card-gold">
        <div style={{fontSize:"1.1rem",fontWeight:700}}>{q.answer}</div>
        {q.explanation&&<p className="op50 mt-1" style={{fontSize:"0.82rem"}}>{q.explanation}</p>}
      </div>
      <div className="flex gap-2 wrap mt-2">
        <div className="card" style={{flex:1,minWidth:120,borderColor:"var(--green)"}}>
          <span className="label text-green">Correct ✓ — {correct.length}</span>
          {correct.map(([n])=><div key={n} style={{fontSize:"0.85rem",marginTop:"0.28rem"}}>🟢 {n}</div>)}
          {!correct.length&&<div className="op30" style={{fontSize:"0.8rem"}}>Nobody</div>}
        </div>
        <div className="card" style={{flex:1,minWidth:120,borderColor:"var(--coral)"}}>
          <span className="label text-coral">Incorrect ✗ — {wrong.length}</span>
          {wrong.map(([n])=><div key={n} style={{fontSize:"0.85rem",marginTop:"0.28rem"}}>🔴 {n}</div>)}
          {!wrong.length&&<div className="op30" style={{fontSize:"0.8rem"}}>Nobody</div>}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ sorted, mode, teams, teamScores, isEnd }) {
  const title = isEnd ? "🏆 FINAL RESULTS" : "📊 LEADERBOARD";
  if (mode === "teams") {
    const tSorted = [...teams].sort((a,b)=>(teamScores[b.id]||0)-(teamScores[a.id]||0));
    return (
      <div className="mt-3">
        <h2 className="text-center text-gold mb-3" style={{fontSize:"1.35rem"}}>{title}</h2>
        <span className="label">Team standings</span>
        {tSorted.map((t,i)=>(
          <div key={t.id} className="lb-row" style={{borderLeftColor:t.color,animationDelay:`${i*0.08}s`}}>
            <span className="lb-rank">{MEDAL[i]||`#${i+1}`}</span>
            <span style={{fontSize:"1.3rem"}}>{t.emoji}</span>
            <span className="lb-name" style={{color:t.color,fontWeight:700}}>{t.name}</span>
            <span className="lb-score">{(teamScores[t.id]||0).toLocaleString()}</span>
          </div>
        ))}
        <span className="label mt-3">Individual scores</span>
        {sorted.map(([name,p],i)=>{
          const team = teams.find(t=>t.id===p.team);
          return (
            <div key={name} className="lb-row" style={{borderLeftColor:team?.color||"rgba(255,255,255,0.08)",animationDelay:`${i*0.05}s`}}>
              <span className="lb-rank" style={{fontSize:"0.85rem"}}>{MEDAL[i]||`#${i+1}`}</span>
              {team&&<span style={{fontSize:"0.9rem"}}>{team.emoji}</span>}
              <span className="lb-name">{name}</span>
              {(p.streak||0)>1&&<span style={{fontSize:"0.85rem"}}>🔥×{p.streak}</span>}
              <span className="lb-score">{(p.score||0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="mt-3">
      <h2 className="text-center text-gold mb-3" style={{fontSize:"1.35rem"}}>{title}</h2>
      {sorted.map(([name,p],i)=>(
        <div key={name} className="lb-row" style={{
          borderLeftColor:i===0?"var(--gold)":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.08)",
          animationDelay:`${i*0.07}s`
        }}>
          <span className="lb-rank">{MEDAL[i]||`#${i+1}`}</span>
          <span className="lb-name">{name}</span>
          {(p.streak||0)>1&&<span style={{fontSize:"0.85rem"}}>🔥×{p.streak}</span>}
          <span className="lb-score">{(p.score||0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── STUDENT VIEW ─────────────────────────────────────────────────────────────
function StudentView({ onBack }) {
  const [step, setStep] = useState("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [room, setRoom] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  // answer-type state
  const [rearranged, setRearranged] = useState([]);
  const [usedIdx, setUsedIdx] = useState([]);
  const [typeVal, setTypeVal] = useState("");
  const [storyOrder, setStoryOrder] = useState([]);
  const [matchState, setMatchState] = useState({ sel:null, matched:{} });
  const lastQRef = useRef(-1);
  const lastPhaseRef = useRef("");

  const join = () => {
    const s = read();
    if (!s) { setError("Room not found. Check the code."); return; }
    if (s.code !== code.trim().toUpperCase()) { setError("Wrong code — ask your teacher!"); return; }
    if (!name.trim()) { setError("Enter your nickname!"); return; }
    const updated = { ...s, players: { ...s.players, [name]: { score:0, streak:0, team:s.players[name]?.team||null } } };
    write(updated);
    setRoom(updated);
    setStep("waiting");
  };

  useEffect(() => {
    if (step==="join") return;
    const id = setInterval(() => {
      const s = read();
      if (!s) return;
      if (s.phase==="question" && s.qIndex!==lastQRef.current) {
        lastQRef.current = s.qIndex;
        setMyAnswer(null); setShowResult(false);
        setRearranged([]); setUsedIdx([]); setTypeVal("");
        setStoryOrder([]); setMatchState({sel:null,matched:{}});
      }
      if (s.phase==="reveal" && lastPhaseRef.current!=="reveal") {
        setShowResult(true);
        setTimeout(()=>setShowResult(false), 2800);
      }
      lastPhaseRef.current = s.phase;
      setRoom(s);
      if (["question","reveal","leaderboard","end"].includes(s.phase)) setStep("playing");
      else if (s.phase==="lobby") setStep("waiting");
    }, 600);
    return () => clearInterval(id);
  }, [step]);

  const submitAnswer = (ans) => {
    if (myAnswer !== null) return;
    setMyAnswer(ans);
    const s = read();
    if (!s) return;
    write({ ...s, answers: { ...s.answers, [name]: ans } });
  };

  if (step==="join") return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1.5rem",maxWidth:400,margin:"0 auto"}}>
      <button className="btn btn-sm btn-ghost mb-3" onClick={onBack} style={{alignSelf:"flex-start"}}>← Back</button>
      <h1 style={{fontSize:"1.5rem",marginBottom:"0.35rem"}}>Join Game</h1>
      <p className="op50 mb-3" style={{fontSize:"0.88rem"}}>Ask your teacher for the 4-letter room code</p>
      <span className="label w100">Room Code</span>
      <input className="input input-xl mb-2" placeholder="XXXX" maxLength={4} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
      <span className="label w100">Your Name</span>
      <input className="input" placeholder="e.g. Maria, Carlos, Ana…" value={name}
        onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&join()} />
      {error&&<p className="text-coral mt-1" style={{fontSize:"0.85rem"}}>{error}</p>}
      <button className="btn btn-gold btn-full mt-3" onClick={join}>Join →</button>
    </div>
  );

  if (step==="waiting") {
    const myTeam = room?.players?.[name]?.team ? TEAMS.find(t=>t.id===room.players[name].team) : null;
    return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"2rem"}}>
        <div style={{fontSize:"3rem",marginBottom:"1rem"}}>⏳</div>
        <h2>Waiting for teacher…</h2>
        <p className="op50 mt-1">You're in the lobby — game starts soon.</p>
        <div className="mt-2" style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1.2rem",color:"var(--gold)"}}>{name}</div>
        {myTeam&&<div className="mt-1" style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.95rem",color:myTeam.color}}>{myTeam.emoji} {myTeam.name}</div>}
        <div className="dots mt-3"><span/><span/><span/></div>
      </div>
    );
  }

  const q = room?.currentQ;
  const phase = room?.phase;
  const myData = room?.players?.[name] || {};
  const myScore = myData.score || 0;
  const myTeam = myData.team ? TEAMS.find(t=>t.id===myData.team) : null;
  const wasCorrect = q && myAnswer !== null ? checkAnswer(myAnswer, q) : false;
  const teamScores = getTeamScores(room||{});

  return (
    <div style={{minHeight:"100vh",maxWidth:460,margin:"0 auto",padding:"1.2rem"}}>
      {/* Result flash */}
      {showResult && phase==="reveal" && myAnswer!==null && (
        <div className="result-overlay">
          <div className="result-box">
            <span className="result-emoji">{wasCorrect?"✅":"❌"}</span>
            <div style={{fontSize:"1.35rem",fontWeight:700,color:wasCorrect?"var(--green)":"var(--coral)"}}>
              {wasCorrect?"Correct! +1000":"Not quite…"}
            </div>
            {!wasCorrect&&q&&<div className="op50 mt-2" style={{fontSize:"0.88rem"}}>Answer: <strong style={{color:"#fff"}}>{q.answer}</strong></div>}
            {q?.explanation&&<div className="op30 mt-1" style={{fontSize:"0.78rem",fontStyle:"italic"}}>{q.explanation}</div>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.78rem"}}>{name}</div>
          {myTeam&&<div style={{fontSize:"0.68rem",color:myTeam.color}}>{myTeam.emoji} {myTeam.name}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div className="text-gold" style={{fontFamily:"'Unbounded',sans-serif",fontWeight:700,fontSize:"1.05rem"}}>{myScore.toLocaleString()} pts</div>
          {myTeam&&<div style={{fontSize:"0.68rem",color:myTeam.color}}>Team: {(teamScores[myTeam.id]||0).toLocaleString()}</div>}
        </div>
      </div>

      {phase==="leaderboard"||phase==="end" ? (
        <StudentLeaderboard room={room} name={name} />
      ) : phase==="question"&&q ? (
        <StudentAnswer q={q} myAnswer={myAnswer} onAnswer={submitAnswer}
          rearranged={rearranged} setRearranged={setRearranged}
          usedIdx={usedIdx} setUsedIdx={setUsedIdx}
          typeVal={typeVal} setTypeVal={setTypeVal}
          storyOrder={storyOrder} setStoryOrder={setStoryOrder}
          matchState={matchState} setMatchState={setMatchState}
          room={room} />
      ) : phase==="reveal" ? (
        <div className="text-center mt-4">
          <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>{myAnswer!==null?(wasCorrect?"✅":"❌"):"⏱️"}</div>
          <p className="op50">{myAnswer!==null?"Waiting for next question…":"Time's up!"}</p>
          {q&&<div className="card mt-3"><span className="label">Correct Answer</span><div style={{fontWeight:700,fontSize:"1rem"}}>{q.answer}</div></div>}
        </div>
      ) : null}
    </div>
  );
}

// ─── STUDENT ANSWER ───────────────────────────────────────────────────────────
function StudentAnswer({ q, myAnswer, onAnswer, rearranged, setRearranged, usedIdx, setUsedIdx, typeVal, setTypeVal, storyOrder, setStoryOrder, matchState, setMatchState, room }) {
  const answered = myAnswer !== null;

  // Shuffle meanings once per question
  const shuffledMeanings = useRef([]);
  useEffect(() => {
    if (q.type==="word_match"&&q.pairs) {
      shuffledMeanings.current = [...q.pairs].sort(()=>Math.random()-0.5);
    }
  }, [q]);

  const submitTyped = () => { if (typeVal.trim()) onAnswer(typeVal.trim()); };
  const submitRearranged = () => { if (rearranged.length) onAnswer(rearranged.join(" ")); };
  const submitStory = () => { if (storyOrder.length===q.sentences?.length) onAnswer(storyOrder.join(",")); };

  const handleMatch = (type, val) => {
    if (answered) return;
    if (type==="word") {
      setMatchState(prev=>({...prev,sel:prev.sel===val?null:val}));
    } else {
      const { sel, matched } = matchState;
      if (!sel) return;
      const isCorrect = q.pairs?.find(p=>p.word===sel)?.meaning===val;
      const nm = { ...matched, [sel]:{meaning:val,correct:isCorrect} };
      setMatchState({sel:null,matched:nm});
      if (Object.keys(nm).length===q.pairs?.length) {
        onAnswer(Object.values(nm).every(m=>m.correct)?"match_all_correct":"match_wrong");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="badge">{q.type.replace(/_/g," ")}</span>
        <span className="op50" style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.72rem"}}>Q{(room?.qIndex||0)+1}/{room?.questions?.length||0}</span>
      </div>
      <h2 style={{fontSize:"1.05rem",lineHeight:1.5,marginBottom:"0.9rem"}}>{q.question}</h2>

      {/* Multiple choice / Odd one out */}
      {(q.type==="multiple_choice"||q.type==="odd_one_out")&&q.options&&(
        <div className="opt-grid">
          {q.options.map((opt,i)=>(
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i} ${myAnswer===opt?"opt-selected":""}`}
              onClick={()=>onAnswer(opt)}>
              <span className="opt-icon">{OPT_ICONS[i]}</span>{opt}
            </button>
          ))}
        </div>
      )}

      {/* True / False */}
      {q.type==="true_false"&&(
        <div className="flex gap-2 mt-2">
          {["True","False"].map(v=>(
            <button key={v} disabled={answered}
              className={`btn ${v==="True"?"btn-green":"btn-coral"} btn-full ${myAnswer===v?"op50":""}`}
              style={{fontSize:"1.05rem",padding:"1.1rem"}}
              onClick={()=>onAnswer(v)}>
              {v==="True"?"✅ True":"❌ False"}
            </button>
          ))}
        </div>
      )}

      {/* Error spotter */}
      {q.type==="error_spotter"&&q.sentence&&(
        <div>
          <p className="op50 mb-2" style={{fontSize:"0.82rem"}}>Tap the incorrect word in the sentence:</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",lineHeight:1.8}}>
            {q.sentence.split(" ").map((word,i)=>{
              const clean = word.replace(/[.,!?;:]/g,"");
              return (
                <button key={i} disabled={answered}
                  style={{padding:"0.42rem 0.8rem",fontFamily:"'DM Sans',sans-serif",fontSize:"0.95rem",border:`2px solid ${myAnswer===clean?"var(--coral)":"rgba(255,255,255,0.18)"}`,background:myAnswer===clean?"rgba(232,58,58,0.18)":"transparent",color:"#fff",cursor:answered?"default":"pointer",transition:"all 0.12s"}}
                  onClick={()=>onAnswer(clean)}>
                  {word}
                </button>
              );
            })}
          </div>
          {myAnswer&&<p className="op50 mt-2" style={{fontSize:"0.82rem"}}>You tapped: <strong style={{color:"var(--coral)"}}>{myAnswer}</strong></p>}
        </div>
      )}

      {/* Type answer / Fill idiom */}
      {(q.type==="type_answer"||q.type==="fill_idiom")&&(
        <div>
          {q.hint&&<p className="op50 mb-1" style={{fontSize:"0.8rem",fontStyle:"italic"}}>💡 {q.hint}</p>}
          <input className="input" placeholder="Type your answer…" value={typeVal} disabled={answered}
            onChange={e=>setTypeVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!answered&&submitTyped()} />
          <button className="btn btn-teal btn-full mt-2" disabled={answered||!typeVal.trim()} onClick={submitTyped}>
            {answered?"✓ Submitted":"Submit →"}
          </button>
        </div>
      )}

      {/* Rearrange */}
      {q.type==="rearrange"&&(
        <div>
          <span className="label">Your sentence:</span>
          <div className="tiles" style={{borderColor:"var(--teal)",minHeight:48}}>
            {rearranged.length===0&&<span className="op30" style={{fontSize:"0.8rem"}}>Tap words below to build the sentence…</span>}
            {rearranged.map((w,i)=>(
              <span key={i} className="tile placed" onClick={()=>{
                if (answered) return;
                setRearranged(p=>p.filter((_,pi)=>pi!==i));
                setUsedIdx(p=>p.filter((_,pi)=>pi!==i));
              }}>{w}</span>
            ))}
          </div>
          <span className="label mt-2">Word bank (tap to use):</span>
          <div className="tiles">
            {q.words?.map((w,i)=>(
              <span key={i} className={`tile ${usedIdx.includes(i)?"used":""}`}
                onClick={()=>{ if (answered||usedIdx.includes(i)) return; setRearranged(p=>[...p,w]); setUsedIdx(p=>[...p,i]); }}>
                {w}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" disabled={answered} onClick={()=>{setRearranged([]);setUsedIdx([]);}}>Clear</button>
            <button className="btn btn-teal" disabled={answered||!rearranged.length} onClick={submitRearranged}>
              {answered?"✓ Submitted":"Submit →"}
            </button>
          </div>
        </div>
      )}

      {/* Story builder */}
      {q.type==="story_builder"&&q.sentences&&(
        <div>
          {storyOrder.length>0&&(
            <>
              <span className="label">Your order (tap to remove):</span>
              <div className="mb-2">
                {storyOrder.map((idx,pos)=>(
                  <div key={pos} className="story-card placed" onClick={()=>{ if (!answered) setStoryOrder(p=>p.filter((_,pi)=>pi!==pos)); }}>
                    <span className="story-num">{pos+1}</span>{q.sentences[idx]}
                  </div>
                ))}
              </div>
            </>
          )}
          <span className="label">Tap sentences in the correct order:</span>
          {q.sentences.map((s,i)=>(
            <div key={i} className={`story-card ${storyOrder.includes(i)?"placed":""}`}
              onClick={()=>{
                if (answered) return;
                if (storyOrder.includes(i)) { setStoryOrder(p=>p.filter(x=>x!==i)); return; }
                setStoryOrder(p=>[...p,i]);
              }}>
              <span className="story-num">{storyOrder.includes(i)?`✓`:"·"}</span>{s}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button className="btn btn-sm btn-ghost" disabled={answered} onClick={()=>setStoryOrder([])}>Clear</button>
            <button className="btn btn-teal" disabled={answered||storyOrder.length!==q.sentences.length} onClick={submitStory}>
              {answered?"✓ Submitted":"Submit Order →"}
            </button>
          </div>
        </div>
      )}

      {/* Word match */}
      {q.type==="word_match"&&q.pairs&&(
        <div>
          <p className="op50 mb-2" style={{fontSize:"0.8rem"}}>Tap a word → tap its meaning to match them.</p>
          <div className="flex gap-2">
            <div style={{flex:1}}>
              <span className="label">Words</span>
              {q.pairs.map((p,i)=>{
                const m = matchState.matched[p.word];
                return (
                  <div key={i} className={`match-word ${matchState.sel===p.word?"selected":""} ${m?(m.correct?"matched-correct":"matched-wrong"):""}`}
                    onClick={()=>!m&&!answered&&handleMatch("word",p.word)}>
                    {p.word}
                  </div>
                );
              })}
            </div>
            <div style={{flex:1}}>
              <span className="label">Meanings</span>
              {shuffledMeanings.current.map((p,i)=>{
                const isMatched = Object.values(matchState.matched).some(m=>m.meaning===p.meaning);
                const entry = Object.entries(matchState.matched).find(([,m])=>m.meaning===p.meaning);
                return (
                  <div key={i} className={`match-word ${isMatched?(entry?.[1]?.correct?"matched-correct":"matched-wrong"):""}`}
                    onClick={()=>!isMatched&&!answered&&handleMatch("meaning",p.meaning)}>
                    {p.meaning}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {answered&&<p className="text-center op50 mt-3" style={{fontSize:"0.82rem"}}>✓ Answer submitted — waiting for others…</p>}
    </div>
  );
}

// ─── STUDENT LEADERBOARD ──────────────────────────────────────────────────────
function StudentLeaderboard({ room, name }) {
  const sorted = Object.entries(room?.players||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  const myPos = sorted.findIndex(([n])=>n===name);
  const teamScores = getTeamScores(room||{});
  const mode = room?.mode;

  if (mode==="teams") {
    const usedTeams = TEAMS.filter(t=>Object.values(room.players||{}).some(p=>p.team===t.id));
    const tSorted = [...usedTeams].sort((a,b)=>(teamScores[b.id]||0)-(teamScores[a.id]||0));
    const myTeam = room.players?.[name]?.team ? TEAMS.find(t=>t.id===room.players[name].team) : null;
    return (
      <div>
        <h2 className="text-center text-gold mb-3" style={{fontSize:"1.2rem"}}>{room.phase==="end"?"🏆 Final":"📊 Scores"}</h2>
        <span className="label">Teams</span>
        {tSorted.map((t,i)=>(
          <div key={t.id} className="lb-row" style={{borderLeftColor:t.color,animationDelay:`${i*0.08}s`}}>
            <span className="lb-rank">{MEDAL[i]||`#${i+1}`}</span>
            <span style={{fontSize:"1.2rem"}}>{t.emoji}</span>
            <span className="lb-name" style={{color:t.color}}>{t.name}</span>
            <span className="lb-score">{(teamScores[t.id]||0).toLocaleString()}</span>
          </div>
        ))}
        <span className="label mt-3">You</span>
        {myTeam&&<p style={{color:myTeam.color,fontFamily:"'Unbounded',sans-serif",fontSize:"0.85rem"}}>{myTeam.emoji} {myTeam.name}</p>}
        <p className="op50 mt-1" style={{fontSize:"0.82rem"}}>Your score: <strong style={{color:"var(--gold)"}}>{(room.players?.[name]?.score||0).toLocaleString()}</strong> pts (#{myPos+1})</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-gold mb-3" style={{fontSize:"1.2rem"}}>{room.phase==="end"?"🏆 Final":"📊 Scores"}</h2>
      {sorted.map(([n,p],i)=>(
        <div key={n} className="lb-row" style={{
          borderLeftColor:n===name?"var(--gold)":i===0?"var(--gold)":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.08)",
          background:n===name?"rgba(232,184,75,0.09)":"transparent",
          animationDelay:`${i*0.06}s`
        }}>
          <span className="lb-rank">{MEDAL[i]||`#${i+1}`}</span>
          <span className="lb-name">{n}{n===name&&<span className="text-gold"> ← you</span>}</span>
          {(p.streak||0)>1&&<span style={{fontSize:"0.82rem"}}>🔥</span>}
          <span className="lb-score">{(p.score||0).toLocaleString()}</span>
        </div>
      ))}
      {myPos>=0&&<p className="text-center op30 mt-2" style={{fontSize:"0.78rem"}}>#{myPos+1} of {sorted.length} players</p>}
    </div>
  );
}

// ─── QR CODE ──────────────────────────────────────────────────────────────────
function QRDisplay({ url }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=155x155&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0d0d0d&margin=6&format=png`;
  return (
    <div className="qr-wrap">
      <div className="qr-label">📱 Scan to Join</div>
      <img src={qr} alt="QR code to join" />
      <div className="qr-label" style={{opacity:1}}>Camera → scan → join!</div>
      <div className="qr-url">{url}</div>
    </div>
  );
}
