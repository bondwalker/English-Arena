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

// The full corrected sentence for a "mistake" question:
//  - error_spotter: q.sentence with the wrong word swapped for the right one
//  - spot_sentence: the sentence that contains the mistake (correction is in the explanation)
export const correctedSentence = (q) => {
  if (q.type === "spot_sentence") return q.answer || "";
  if (q.type !== "error_spotter" || !q.sentence) return q.answer || "";
  let done = false;
  return q.sentence.split(/(\s+)/).map(tok => {
    if (done) return tok;
    const clean = tok.replace(/[.,!?;:]/g, "");
    if (clean && clean === q.errorWord) { done = true; return tok.replace(clean, q.answer); }
    return tok;
  }).join("");
};

// Review/summary line for a question — the prompt shown as the title
export const reviewPrompt = (q) =>
  q.type === "stress_battle" ? q.word : `${q.question}${q.sentence ? " " + q.sentence : ""}`;

// Review/summary line — the correct answer, human-readable per type
export const reviewAnswer = (q) =>
  q.type === "stress_battle"
    ? `stress on ${ordinal(q.stressed)} syllable${Array.isArray(q.syllables) ? ` (${stressBreakdown(q.syllables, q.stressed)})` : ""}`
    : q.type === "error_spotter" ? correctedSentence(q)
      : q.type === "story_builder" ? `Order: ${(q.correctOrder || []).filter(x => x < 3).map(x => x + 1).join(", ")}`
        : q.type === "word_match" ? "Match all pairs correctly"
          : q.answer;

// A selectable game mode can serve more than one underlying question type.
// "Find the Mistake" (error_spotter) also serves the sentence-picker (spot_sentence).
export const MODE_TYPES = { error_spotter: ["error_spotter", "spot_sentence"] };
export const typesForMode = (mode) => MODE_TYPES[mode] || [mode];

export const GAME_MODES = [
  { v: "mixed",          label: "🎲 Mixed",           desc: "All types" },
  { v: "multiple_choice",label: "📋 Multiple Choice",  desc: "Choose the answer" },
  { v: "true_false",     label: "✅ True / False",     desc: "Grammar judge" },
  { v: "error_spotter",  label: "🔍 Find the Mistake", desc: "Spot the wrong word or sentence" },
  { v: "type_answer",    label: "✏️ Type Answer",      desc: "Short text response" },
  { v: "rearrange",      label: "🔀 Word Order",       desc: "Build sentences" },
  { v: "story_builder",  label: "📖 Story Builder",    desc: "Arrange a story" },
  { v: "word_match",     label: "🃏 Word Match",       desc: "Vocab matching" },
  { v: "odd_one_out",    label: "🎯 Odd One Out",      desc: "The word that doesn't fit" },
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
  if (q.type === "spot_sentence") return 35;
  if (q.type === "odd_one_out") return 20;
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
