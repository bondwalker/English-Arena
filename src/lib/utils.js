export const TEAMS = [
  { id: "red",    name: "Red Wolves",    color: "#e14d39", icon: "wolf",  emoji: "🐺" },
  { id: "blue",   name: "Blue Sharks",   color: "#2e5bdb", icon: "shark", emoji: "🦈" },
  { id: "green",  name: "Green Tigers",  color: "#5b9b3d", icon: "tiger", emoji: "🐯" },
  { id: "purple", name: "Purple Eagles", color: "#7a4d9c", icon: "eagle", emoji: "🦅" },
];

export const OPT_ICONS = ["A", "B", "C", "D"];

// ── Per-topic visual theme: an accent (one of the 6 palette tokens) + an emoji.
// One table drives topic cards, the projector question/reveal accents, and badges.
export const TOPIC_THEME = {
  travel_holidays:       { accent: "var(--cobalt)", emoji: "✈️", label: "Travel & Holidays" },
  cities_travel:         { accent: "var(--cobalt)", emoji: "🏙️", label: "Cities & Travel" },
  technology_gadgets:    { accent: "var(--cobalt)", emoji: "📱", label: "Technology & Gadgets" },
  education_studying:    { accent: "var(--cobalt)", emoji: "🎓", label: "Education & Studying" },
  language_communication:{ accent: "var(--cobalt)", emoji: "💬", label: "Language & Communication" },
  jobs_interviews:       { accent: "var(--cobalt)", emoji: "🧑‍💼", label: "Jobs & Interviews" },
  cooking_recipes:       { accent: "var(--tomato)", emoji: "🍳", label: "Cooking & Recipes" },
  sports_fitness:        { accent: "var(--tomato)", emoji: "⚽", label: "Sports & Fitness" },
  films_tv:              { accent: "var(--tomato)", emoji: "🎬", label: "Films & TV" },
  food_restaurants:      { accent: "var(--tomato)", emoji: "🍽️", label: "Food & Restaurants" },
  emotions_feelings:     { accent: "var(--tomato)", emoji: "😊", label: "Emotions & Feelings" },
  health_wellbeing:      { accent: "var(--leaf)",   emoji: "🩺", label: "Health & Wellbeing" },
  the_environment:       { accent: "var(--leaf)",   emoji: "🌍", label: "The Environment" },
  money_banking:         { accent: "var(--leaf)",   emoji: "💰", label: "Money & Banking" },
  hobbies_free_time:     { accent: "var(--leaf)",   emoji: "🎨", label: "Hobbies & Free Time" },
  nature_animals:        { accent: "var(--leaf)",   emoji: "🦊", label: "Nature & Animals" },
  work_office:           { accent: "var(--plum)",   emoji: "💼", label: "Work & the Office" },
  family_life:           { accent: "var(--plum)",   emoji: "👪", label: "Family Life" },
  shopping_fashion:      { accent: "var(--plum)",   emoji: "🛍️", label: "Shopping & Fashion" },
  music:                 { accent: "var(--plum)",   emoji: "🎵", label: "Music" },
  celebrations_parties:  { accent: "var(--plum)",   emoji: "🎉", label: "Celebrations & Parties" },
  past_memories:         { accent: "var(--plum)",   emoji: "📸", label: "Past & Memories" },
  ambitions_goals:       { accent: "var(--sun)",    emoji: "🎯", label: "Ambitions & Goals" },
  culture_traditions:    { accent: "var(--sun)",    emoji: "🎭", label: "Culture & Traditions" },
  books_reading:         { accent: "var(--sun)",    emoji: "📚", label: "Books & Reading" },
  friendship:            { accent: "var(--sun)",    emoji: "🤝", label: "Friendship" },
  verb_tenses:           { accent: "var(--sun)",    emoji: "⏳", label: "Past & Present Habits" },
  social_media_internet: { accent: "var(--aqua)",   emoji: "📲", label: "Social Media & the Internet" },
  home_housing:          { accent: "var(--aqua)",   emoji: "🏠", label: "Home & Housing" },
  science_discovery:     { accent: "var(--aqua)",   emoji: "🔬", label: "Science & Discovery" },
  news_current_affairs:  { accent: "var(--aqua)",   emoji: "📰", label: "News & Current Affairs" },
  present_perfect:       { accent: "var(--aqua)",   emoji: "✅", label: "Present Perfect & Continuous" },
  past_continuous:       { accent: "var(--cobalt)", emoji: "🌧️", label: "Simple Past & Past Continuous" },
  emails:                { accent: "var(--aqua)",   emoji: "✉️", label: "Emails" },
  reports:               { accent: "var(--plum)",   emoji: "📝", label: "Reports" },
  song_waltzing_matilda: { accent: "var(--sun)",    emoji: "🎵", label: "Waltzing Matilda — Banjo Paterson" },
};
// End-game awards: fun badges derived from per-player stats tracked during
// scoring (score / maxStreak / firstCount / nCorrect / nAnswered). Spreads
// recognition — prefers a different winner for each badge when possible.
export function computeAwards(playersObj) {
  const players = Object.entries(playersObj || {}).map(([name, p]) => ({ name, ...p }));
  if (!players.length) return [];
  const used = new Set();
  const take = (val, threshold) => {
    const cands = players.map(p => ({ name: p.name, v: val(p) })).filter(c => c.v > threshold).sort((a, b) => b.v - a.v);
    if (!cands.length) return null;
    const chosen = cands.find(c => !used.has(c.name)) || cands[0];
    used.add(chosen.name);
    return chosen;
  };
  const awards = [];
  const champ = take(p => p.score || 0, 0);
  if (champ) awards.push({ key: "champion", emoji: "🏆", label: "Champion", winner: champ.name, detail: `${champ.v.toLocaleString()} pts` });
  const fire = take(p => (p.maxStreak || 0) >= 3 ? p.maxStreak : 0, 0);
  if (fire) awards.push({ key: "onfire", emoji: "🔥", label: "On Fire", winner: fire.name, detail: `${fire.v} in a row` });
  const speed = take(p => (p.firstCount || 0) >= 2 ? p.firstCount : 0, 0);
  if (speed) awards.push({ key: "speed", emoji: "⚡", label: "Speed Demon", winner: speed.name, detail: `${speed.v} fastest answers` });
  const sharp = take(p => (p.nAnswered || 0) >= 3 ? Math.round(100 * (p.nCorrect || 0) / p.nAnswered) : 0, 59);
  if (sharp) awards.push({ key: "sharp", emoji: "🎯", label: "Sharpshooter", winner: sharp.name, detail: `${sharp.v}% correct` });
  return awards;
}

const DEFAULT_THEME = { accent: "var(--sun)", emoji: "🎲", label: "" };
// Resolve a theme from either a topic key ("travel_holidays") or a display label
// ("Travel & Holidays", which may carry an emoji/prefix on the projector).
export function themeFor(keyOrLabel) {
  if (!keyOrLabel) return DEFAULT_THEME;
  if (TOPIC_THEME[keyOrLabel]) return TOPIC_THEME[keyOrLabel];
  const hit = Object.values(TOPIC_THEME).find(t => t.label && keyOrLabel.includes(t.label));
  return hit || DEFAULT_THEME;
}

// Fair Fisher-Yates shuffle. Returns a new array; does not mutate the input.
// (Array.prototype.sort(() => Math.random() - 0.5) is NOT a uniform shuffle —
// it heavily over-selects early items, which made the same questions recur.)
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

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
  q.type === "stress_battle" ? q.word
    : q.type === "song_words" ? `${q.verse}: tap the words you hear`
    : q.type === "hangman" ? (q.hint || "Guess the word")
      : `${q.question}${q.sentence ? " " + q.sentence : ""}`;

// "Find the mistake" answer screen: which words to highlight.
//  - sentence: the sentence shown big (corrected for error_spotter, the wrong one for spot_sentence)
//  - marks:    indexes of the words in `sentence` (split on spaces) to underline
//  - words:    lowercase words to bold inside the explanation's quotes
// spot_sentence compares the wrong sentence (q.answer) with its corrected version (q.fix).
// Anything else, or a question without the data, returns no marks.
const cleanWord = (w) => w.toLowerCase().replace(/^[^\w']+|[^\w']+$/g, "");
export function mistakeHighlight(q) {
  if (q.type === "error_spotter" && q.sentence) {
    const sentence = correctedSentence(q);
    const i = q.sentence.split(" ").findIndex(w => w.replace(/[.,!?;:]/g, "") === q.errorWord);
    return { sentence, marks: i >= 0 ? [i] : [], words: [q.errorWord, q.answer].map(cleanWord) };
  }
  if (q.type === "spot_sentence" && q.answer && q.fix) {
    const a = q.answer.split(" "), b = q.fix.split(" ");
    const an = a.map(cleanWord), bn = b.map(cleanWord);
    // longest common subsequence of the two word lists
    const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--)
        d[i][j] = an[i] === bn[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    const inA = new Set(), inB = new Set(), gaps = [];
    for (let i = 0, j = 0; i < a.length || j < b.length;) {
      if (i < a.length && j < b.length && an[i] === bn[j]) { inA.add(i); inB.add(j); i++; j++; }
      else if (j >= b.length || (i < a.length && d[i + 1][j] >= d[i][j + 1])) i++;
      else { gaps.push(i); j++; } // a word the wrong sentence is missing, just before a[i]
    }
    const marks = a.map((_, i) => i).filter(i => !inA.has(i));
    // a missing word has nothing to underline, so mark the words either side of the gap
    if (!marks.length) gaps.forEach(i => [i - 1, i].forEach(k => k >= 0 && k < a.length && !marks.includes(k) && marks.push(k)));
    const words = [...a.filter((_, i) => !inA.has(i)), ...b.filter((_, j) => !inB.has(j))].map(cleanWord).filter(Boolean);
    return { sentence: q.answer, marks: marks.sort((x, y) => x - y), words };
  }
  return { sentence: null, marks: [], words: [] };
}

// Word Order answer as shown to people: starts with a capital letter. The data
// keeps the original case because the word tiles are built from it, and a
// capitalised tile would give away which word goes first.
export const rearrangeAnswer = (q) => {
  const a = q.answer || "";
  return a.charAt(0).toUpperCase() + a.slice(1);
};

// Story Builder normally shows only the first 3 sentences of a story. Questions
// marked fullStory (the Emails topic) show every sentence as a card.
export const storyCardCount = (q) =>
  q.fullStory ? (q.sentences || []).length : Math.min((q.sentences || []).length, 3);
// The story's sentences in the correct order (only the cards that are shown).
export const storyInOrder = (q) =>
  (q.correctOrder || []).filter(x => x < storyCardCount(q)).map(x => (q.sentences || [])[x]);

// Review/summary line — the correct answer, human-readable per type
export const reviewAnswer = (q) =>
  q.type === "stress_battle"
    ? `${Array.isArray(q.parts) ? `${stressBreakdown(q.parts, q.stressed)} — ` : ""}stress on ${ordinal(q.stressed)} syllable`
    : q.type === "hangman" ? q.word
      : q.type === "error_spotter" ? correctedSentence(q)
        : q.type === "story_builder" ? storyInOrder(q).join(" ")
          : q.type === "word_match" ? (q.pairs || []).slice(0, 2).map(p => `${p.word} = ${p.meaning}`).join(" · ")
            : q.type === "rearrange" ? rearrangeAnswer(q)
              : q.type === "song_words" ? (q.real || []).join(" · ")
                : q.answer;

// A selectable game mode can serve more than one underlying question type.
// "Find the Mistake" (error_spotter) also serves the sentence-picker (spot_sentence).
export const MODE_TYPES = { error_spotter: ["error_spotter", "spot_sentence"] };
export const typesForMode = (mode) => MODE_TYPES[mode] || [mode];
// Does this topic's question list have anything for the chosen game mode?
// Used to fade out question types a topic doesn't have (e.g. Emails only has
// Story Builder and True/False).
export const hasQuestionsFor = (bank, mode) =>
  mode === "mixed" ? bank.length > 0 : bank.some(q => typesForMode(mode).includes(q.type));

export const GAME_MODES = [
  { v: "mixed",          label: "🎲 Mixed",           desc: "All types" },
  { v: "multiple_choice",label: "📋 Multiple Choice",  desc: "Choose the answer" },
  { v: "true_false",     label: "✅ True / False",     desc: "Grammar judge" },
  { v: "error_spotter",  label: "🔍 Find the Mistake", desc: "Spot the wrong word or sentence" },
  { v: "hangman",        label: "🔤 Hangman",          desc: "Guess the spelling" },
  { v: "rearrange",      label: "🔀 Word Order",       desc: "Build sentences" },
  { v: "story_builder",  label: "📖 Story Builder",    desc: "Arrange a story" },
  { v: "word_match",     label: "🃏 Word Match",       desc: "Vocab matching" },
  { v: "odd_one_out",    label: "🎯 Odd One Out",      desc: "The word that doesn't fit" },
  { v: "song_words",     label: "🎵 Song Words",       desc: "Tap the words you hear" },
  { v: "stress_battle",  label: "⚡ Stress Battle",   desc: "Word stress A/B" },
];

// Song Words: each verse shows real words from the song plus sound-alike fakes.
// Students tap what they hear: +100 per real word, -50 per fake, never below 0.
export const songTiles = (q) => [...(q.real || []), ...(q.fake || [])];
export function songTally(q, tapped) {
  const t = new Set(Array.isArray(tapped) ? tapped : []);
  const real = (q.real || []).filter(w => t.has(w)).length;
  const fake = (q.fake || []).filter(w => t.has(w)).length;
  return { real, fake, points: Math.max(0, real * 100 - fake * 50) };
}

export function checkAnswer(given, q) {
  if (given === null || given === undefined) return false;
  if (q.type === "song_words") { const t = songTally(q, given); return t.real === (q.real || []).length && t.fake === 0; }
  const n = s => String(s).toLowerCase().trim().replace(/[.,!?'"]/g, "");
  if (q.type === "word_match") return given === "match_all_correct";
  if (q.type === "story_builder") {
    const count = storyCardCount(q);
    const correct3 = (q.correctOrder || []).filter(i => i < count).join(",");
    return given.trim() === correct3;
  }
  if (q.type === "error_spotter") return n(given) === n(q.errorWord);
  if (q.type === "hangman") return n(given) === n(q.word);
  return n(given) === n(q.answer);
}

// "Find the mistake" (spot_sentence) shows only TWO options — the sentence
// with the mistake plus one correct sentence — rather than four, so it's less
// to read. Deterministic (pure function of the question) so the host projector
// and every student device always display the same pair; each side may then
// shuffle the display order independently.
export function spotOptions(q) {
  if (q.type !== "spot_sentence" || !Array.isArray(q.options) || q.options.length <= 2) return q.options || [];
  const correct = q.options.find(o => o !== q.answer);
  return q.options.filter(o => o === q.answer || o === correct); // keep original order
}

export function getTimeLimit(q) {
  if (!q) return 25;
  if (q.type === "stress_battle") return 15;
  if (q.type === "song_words") return 180; // the teacher usually presses Reveal when the verse ends
  if (q.type === "hangman") return 45;
  if (q.type === "story_builder") return q.fullStory ? (storyCardCount(q) >= 6 ? 90 : 60) : 50;
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

// Room codes use letters only, leaving out ones that are easy to misread when
// typing the code from the screen: no O (0), I (1) or L, and no numbers at all.
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";
export const makeRoomCode = () =>
  Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join("");

export const defaultRoom = () => ({
  code: makeRoomCode(),
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
