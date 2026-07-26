export const TEAMS = [
  { id: "red",    name: "Red Wolves",    color: "#e14d39", icon: "wolf",  emoji: "🐺" },
  { id: "blue",   name: "Blue Sharks",   color: "#2e5bdb", icon: "shark", emoji: "🦈" },
  { id: "green",  name: "Green Tigers",  color: "#5b9b3d", icon: "tiger", emoji: "🐯" },
  { id: "purple", name: "Purple Eagles", color: "#7a4d9c", icon: "eagle", emoji: "🦅" },
];

export const OPT_ICONS = ["A", "B", "C", "D"];

// Shared answer-box colours (A/B/C/D) — used identically on host + student
export const OPT_COLORS = ["var(--tomato)", "var(--cobalt)", "var(--leaf)", "var(--plum)"];

// "2" -> "2nd", for "stress on Nth syllable"
export const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ["de","par","ture"], 2 -> "de-PAR-ture"
export const stressBreakdown = (syllables, stressed) =>
  (Array.isArray(syllables) ? syllables : []).map((s, i) => (i + 1 === stressed ? s.toUpperCase() : s)).join("-");

export const GAME_MODES = [
  { v: "mixed",          label: "🎲 Mixed",           desc: "All types" },
  { v: "multiple_choice",label: "📋 Multiple Choice",  desc: "Choose the answer" },
  { v: "true_false",     label: "✅ True / False",     desc: "Grammar judge" },
  { v: "error_spotter",  label: "🔍 Error Spotter",    desc: "Find the mistake" },
  { v: "type_answer",    label: "✏️ Type Answer",      desc: "Short text response" },
  { v: "rearrange",      label: "🔀 Word Order",       desc: "Build sentences" },
  { v: "story_builder",  label: "📖 Story Builder",    desc: "Arrange a story" },
  { v: "fill_idiom",     label: "🎭 Idioms",           desc: "Complete expressions" },
  { v: "word_match",     label: "🃏 Word Match",       desc: "Vocab matching" },
  { v: "odd_one_out",    label: "🎯 Odd One Out",      desc: "Spot the wrong one" },
  { v: "stress_battle",  label: "⚡ Stress Battle",   desc: "Word stress A/B" },
];

export function checkAnswer(given, q) {
  if (given === null || given === undefined) return false;
  const n = s => String(s).toLowerCase().trim().replace(/[.,!?'"]/g, "");
  if (q.type === "word_match") return given === "match_all_correct";
  if (q.type === "story_builder") {
    const count = Math.min((q.sentences || []).length, 3);
    const correct3 = (q.correctOrder || []).filter(i => i < count).join(",");
    return given.trim() === correct3;
  }
  if (q.type === "error_spotter") return n(given) === n(q.errorWord);
  return n(given) === n(q.answer);
}

export function getTimeLimit(q) {
  if (!q) return 25;
  if (q.type === "stress_battle") return 15;
  if (q.type === "story_builder") return 50;
  if (q.type === "rearrange") return 40;
  if (q.type === "odd_one_out") return 35;
  return 25;
}

export function getTeamScores(room) {
  const scores = {};
  TEAMS.forEach(t => { scores[t.id] = 0; });
  Object.values(room.players || {}).forEach(p => {
    if (p.team && scores[p.team] !== undefined) scores[p.team] += (p.score || 0);
  });
  return scores;
}

export const defaultRoom = () => ({
  code: Math.random().toString(36).slice(2, 6).toUpperCase(),
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
  warmup: true,
  warmupCount: 0,
  paused: false,
  firstCorrect: null,
});
