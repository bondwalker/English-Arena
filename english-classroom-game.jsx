import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

// ─── Firebase ─────────────────────────────────────────────────────────────────
// Add your Firebase config to Vercel env vars (or a local .env file):
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
//   VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID
// Get them from: https://console.firebase.google.com → Project Settings → Your apps
let db = null;
try {
  const cfg = {
    apiKey:      import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };
  if (cfg.apiKey && cfg.databaseURL) db = getDatabase(initializeApp(cfg));
} catch {}

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = "englishgame_v2";
const read = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; } };
const write = (v) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(v));
  if (db && v?.code) set(ref(db, `rooms/${v.code}`), v).catch(() => {});
};

const FAVES_KEY = "englishgame_faves";
const readFaves  = () => { try { return JSON.parse(localStorage.getItem(FAVES_KEY) || "[]"); } catch { return []; } };
const writeFaves = (v) => { try { localStorage.setItem(FAVES_KEY, JSON.stringify(v)); } catch {} };

const FONT_KEY  = "englishgame_font";
const readFont  = () => { try { return localStorage.getItem(FONT_KEY) === "large"; } catch { return false; } };
const writeFont = (v) => { try { localStorage.setItem(FONT_KEY, v ? "large" : "normal"); } catch {} };
const fetchRoom = async (code) => {
  if (!db) return null;
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000));
    const s = await Promise.race([get(ref(db, `rooms/${code}`)), timeout]);
    return s.exists() ? s.val() : null;
  } catch { return null; }
};
const listenRoom = (code, cb) => {
  if (!db) return () => {};
  return onValue(ref(db, `rooms/${code}`), (s) => { if (s.exists()) cb(s.val()); });
};

// ─── Teams ────────────────────────────────────────────────────────────────────
const TEAMS = [
  { id: "red",    name: "Red Wolves",    color: "#e14d39", icon: "wolf" },
  { id: "blue",   name: "Blue Sharks",   color: "#2e5bdb", icon: "shark" },
  { id: "green",  name: "Green Tigers",  color: "#5b9b3d", icon: "tiger" },
  { id: "purple", name: "Purple Eagles", color: "#7a4d9c", icon: "eagle" },
];

function TeamIcon({ icon, color = "currentColor", size = 18 }) {
  const icons = {
    wolf:  <path d="M4 8 L7 4 L9 7 L15 7 L17 4 L20 8 L20 15 Q20 20 16 21 L8 21 Q4 20 4 15 Z" fill={color} />,
    shark: <path d="M2 13 Q6 9 11 9 L18 6 L17 11 L21 12 L17 13 L18 17 L11 15 Q6 16 2 13 Z" fill={color} />,
    tiger: <React.Fragment><path d="M5 7 L4 4 L8 6 L16 6 L20 4 L19 7 Q21 9 21 13 Q21 19 16 21 L8 21 Q3 19 3 13 Q3 9 5 7 Z" fill={color}/><path d="M9 9 L9.5 12 M15 9 L14.5 12" stroke="white" strokeWidth="1.2" fill="none"/></React.Fragment>,
    eagle: <path d="M12 4 Q15 6 16 10 L20 8 L17 13 L21 14 L16 16 L18 21 L12 18 L6 21 L8 16 L3 14 L7 13 L4 8 L8 10 Q9 6 12 4 Z" fill={color} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"
      style={{display:"inline-block",verticalAlign:"middle",flexShrink:0}}>
      {icons[icon] || null}
    </svg>
  );
}

function FlameStreak({ count }) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",
      background:"rgba(247,181,56,0.15)",border:"1.5px solid var(--gold)",borderRadius:999,
      fontSize:"0.72rem",fontWeight:700,color:"var(--coral)"}}>
      <svg width="9" height="11" viewBox="0 0 9 11" style={{display:"block"}}>
        <path d="M4.5 10.5 Q0.5 8.5 0.5 5.5 Q0.5 3.5 2.5 1.5 Q2 4 4 4 Q4 1 5.5 0 Q5 3 7.5 3.5 Q8.5 4.5 8.5 6.5 Q8.5 8.5 4.5 10.5 Z" fill="var(--coral)" />
      </svg>
      ×{count}
    </span>
  );
}

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
  warmup: true,
  warmupCount: 0,
  paused: false,
  firstCorrect: null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkAnswer(given, q) {
  if (given === null || given === undefined) return false;
  const n = s => String(s).toLowerCase().trim().replace(/[.,!?'"]/g,"");
  if (q.type === "word_match") return given === "match_all_correct";
  if (q.type === "story_builder") {
    const count = Math.min((q.sentences||[]).length, 3);
    const correct3 = (q.correctOrder||[]).filter(i => i < count).join(",");
    return n(given) === correct3;
  }
  if (q.type === "error_spotter") return n(given) === n(q.errorWord);
  return n(given) === n(q.answer);
}

function getTimeLimit(q) {
  if (!q) return 25;
  if (q.type === "stress_battle") return 15;
  if (q.type === "story_builder") return 50;
  if (q.type === "rearrange") return 40;
  if (q.type === "odd_one_out") return 35;
  return 25;
}

function getTeamScores(room) {
  const scores = {};
  TEAMS.forEach(t => { scores[t.id] = 0; });
  Object.values(room.players || {}).forEach(p => {
    if (p.team && scores[p.team] !== undefined) scores[p.team] += (p.score || 0);
  });
  return scores;
}

// ─── Question Bank ────────────────────────────────────────────────────────────
const QUESTION_BANK = {
  "travel_holidays": { label: "Travel & Holidays", questions: [
    {type:"multiple_choice",question:"Which phrase is correct when booking a hotel?",options:["I'd like to reserve a room.","I'd like to reserving a room.","I'd like reserve a room."],answer:"I'd like to reserve a room.",explanation:"After 'would like' use 'to + infinitive'."},
    {type:"multiple_choice",question:"Choose the correct sentence about a past trip.",options:["We have visited Rome last summer.","We visited Rome last summer.","We are visiting Rome last summer."],answer:"We visited Rome last summer.",explanation:"'Last summer' is finished, so use past simple."},
    {type:"multiple_choice",question:"Which question asks about flight departure time?",options:["What time does the plane departure?","What time does the plane depart?","What time is the plane departed?"],answer:"What time does the plane depart?",explanation:"With 'does', use the bare infinitive 'depart'."},
    {type:"true_false",question:"'She has been to Paris twice' means she is currently in Paris.",answer:"False",explanation:"'Has been to' means she visited and came back. 'Has gone to' means she is still there."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We arrived to the airport two hours early.",errorWord:"to",answer:"at",explanation:"'Arrive at' is used for specific places like airports."},
    {type:"type_answer",question:"Complete: By the time we ___ (reach) the gate, the flight had already boarded.",answer:"reached",explanation:"Past simple in a past perfect structure."},
    {type:"type_answer",question:"Complete: I always feel nervous when I ___ (fly), even on short trips.",answer:"fly",explanation:"Present simple for repeated habits."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["She","packed","her","bags","early"],answer:"She packed her bags early",explanation:"Subject + past simple + object + time phrase."},
    {type:"story_builder",question:"Order these sentences into a story:",sentences:["Finally, they checked in and relaxed at the hotel.","First, they booked their flights and packed their bags.","Then, they took a taxi to the airport."],correctOrder:[1,2,0],answer:"1,2,0",explanation:"Book and pack → taxi → check in."},
    {type:"fill_idiom",question:"Complete: After the long journey I felt a bit under the ___.",answer:"weather",options:["weather","clouds","moon","rain"],hint:"feeling slightly unwell",explanation:"'Under the weather' means feeling slightly unwell or tired."},
    {type:"word_match",question:"Match travel words with their meanings:",pairs:[{word:"itinerary",meaning:"a planned travel schedule"},{word:"layover",meaning:"a stop between flights"},{word:"passport",meaning:"an official travel document"},{word:"customs",meaning:"border control for goods"}],answer:"match_all_correct",explanation:"Essential travel vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["Have you ever travelled to Asia?","She went to Greece last year.","They have visited Spain in 2019.","He has never been on a cruise."],answer:"They have visited Spain in 2019.",explanation:"Present perfect cannot be used with '2019'. Use past simple: 'They visited Spain in 2019.'"},
    {type:"true_false",question:"'We are looking forward to visit the coast' is a grammatically correct sentence.",answer:"False",explanation:"'Look forward to' is followed by a gerund, not an infinitive: 'We are looking forward to visiting the coast.'"},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The tour guide gave us some very useful informations about the old town.",errorWord:"informations",answer:"information",explanation:"'Information' is an uncountable noun — it has no plural form. Never add -s."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["they","booked","a","hotel","online"],answer:"they booked a hotel online",explanation:"Subject + past simple + object + adverb of manner."},
    {type:"story_builder",question:"Order these sentences about missing a flight:",sentences:["Then, they rushed to the gate but it had already closed.","First, the couple overslept and missed their alarm.","Finally, they rebooked on the next morning's flight and found a nearby hotel."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Oversleep → rush to gate too late → rebook and find accommodation."},
    {type:"fill_idiom",question:"Complete: After the twelve-hour flight, he was completely out of ___.",answer:"steam",options:["steam","breath","energy","order"],hint:"having no energy or motivation left",explanation:"'Out of steam' means to have run out of energy or the drive to continue."},
    {type:"word_match",question:"Match travel words with their meanings:",pairs:[{word:"departure",meaning:"the act of leaving a place"},{word:"boarding pass",meaning:"a document allowing you to board a plane"},{word:"turbulence",meaning:"rough, uneven movement during a flight"},{word:"excess baggage",meaning:"luggage that weighs more than the allowed limit"}],answer:"match_all_correct",explanation:"Key vocabulary for air travel."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She packed her suitcase the night before departure.","He always books an aisle seat on long flights.","We have visited Thailand in 2018.","They checked in two hours before the flight."],answer:"We have visited Thailand in 2018.",explanation:"'In 2018' is a finished past time. Use past simple: 'We visited Thailand in 2018.'"},
  ]},
  "work_office": { label: "Work & the Office", questions: [
    {type:"multiple_choice",question:"Which sentence correctly describes an ongoing project?",options:["I work on this report since Monday.","I am working on this report since Monday.","I have been working on this report since Monday."],answer:"I have been working on this report since Monday.",explanation:"Present perfect continuous + 'since' for ongoing actions that started in the past."},
    {type:"multiple_choice",question:"Your colleague asks: 'Can you cover ___ me on Friday?'",options:["to","for","with"],answer:"for",explanation:"'Cover for someone' means to do their work while they are absent."},
    {type:"multiple_choice",question:"Which is the most appropriate opening for a formal email?",options:["Hey, got your message!","Dear Ms Brown, I am writing to enquire about…","Yo, what's the update?"],answer:"Dear Ms Brown, I am writing to enquire about…",explanation:"Formal emails begin with a salutation and a clear statement of purpose."},
    {type:"true_false",question:"'Let's touch base later' is a formal farewell phrase used in business meetings.",answer:"False",explanation:"'Touch base' means to briefly check in. It is informal business jargon, not a farewell."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The manager told us to sending the report by Friday.",errorWord:"sending",answer:"send",explanation:"After 'tell someone to', use the bare infinitive."},
    {type:"type_answer",question:"Complete: She was promoted ___ senior manager after only two years.",answer:"to",explanation:"'Promoted to' is the correct collocation."},
    {type:"type_answer",question:"Complete: Could you please ___ (send) me the agenda before the meeting?",answer:"send",explanation:"'Could you please + bare infinitive' is a polite request."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","sent","the","report","early"],answer:"she sent the report early",explanation:"Subject + verb + object + time phrase."},
    {type:"story_builder",question:"Order these sentences to describe a job interview:",sentences:["Then, he answered questions about his experience.","First, David prepared for the interview the night before.","Finally, the manager offered him the job."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Prepare → answer questions → get the job."},
    {type:"fill_idiom",question:"Complete: I have a lot on my ___ this week — three deadlines!",answer:"plate",options:["plate","mind","hands","desk"],hint:"very busy with many tasks",explanation:"'Have a lot on your plate' means to have many responsibilities to deal with."},
    {type:"word_match",question:"Match workplace terms with their meanings:",pairs:[{word:"deadline",meaning:"the latest time to finish a task"},{word:"agenda",meaning:"a list of topics for a meeting"},{word:"appraisal",meaning:"a formal review of performance"},{word:"delegate",meaning:"to give tasks to others"}],answer:"match_all_correct",explanation:"Key office vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["We need to meet the deadline.","She has been promoted last month.","He works from home on Fridays.","They are reviewing the budget now."],answer:"She has been promoted last month.",explanation:"'Last month' is finished. Use past simple: 'She was promoted last month.'"},
  ]},
  "cooking_recipes": { label: "Cooking & Recipes", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'used to' correctly?",options:["I used to eating meat, but now I'm vegetarian.","I used to eat meat, but now I'm vegetarian.","I use to eat meat, but now I'm vegetarian."],answer:"I used to eat meat, but now I'm vegetarian.",explanation:"'Used to + bare infinitive' describes a past habit that no longer happens."},
    {type:"multiple_choice",question:"What does 'fold in the egg whites' mean in a recipe?",options:["Whisk the egg whites vigorously.","Gently mix without losing air.","Boil the egg whites first."],answer:"Gently mix without losing air.",explanation:"'Fold in' means to mix gently to preserve air in the mixture."},
    {type:"multiple_choice",question:"Which recipe instruction is grammatically correct?",options:["Simmer the sauce for 20 minutes with the lid on.","Simmering the sauce 20 minutes with the lid.","Simmer the sauce for 20 minutes with lid."],answer:"Simmer the sauce for 20 minutes with the lid on.",explanation:"Recipe instructions use the imperative form."},
    {type:"true_false",question:"'Chop' and 'slice' mean exactly the same thing in cooking.",answer:"False",explanation:"'Chop' means to cut into rough pieces; 'slice' means to cut into thin, flat pieces."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"You need to add the eggs one by one and mix it well.",errorWord:"it",answer:"them",explanation:"'Eggs' is plural, so use 'them', not 'it'."},
    {type:"type_answer",question:"Complete: The vegetables should ___ (steam) for about five minutes.",answer:"be steamed",explanation:"Passive voice: 'should be + past participle'."},
    {type:"type_answer",question:"Complete: If you ___ (add) too much salt, the dish will be ruined.",answer:"add",explanation:"First conditional: if + present simple, will + bare infinitive."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["add","the","eggs","slowly"],answer:"add the eggs slowly",explanation:"Imperative + object + adverbial phrase."},
    {type:"story_builder",question:"Order these sentences to describe making pasta:",sentences:["Finally, she served the pasta with fresh basil.","First, Maria boiled a large pot of salted water.","Then, she added the pasta and cooked it for ten minutes."],correctOrder:[1,2,0],answer:"1,2,0",explanation:"Boil water → cook pasta → serve."},
    {type:"fill_idiom",question:"Complete: Too many ___ spoil the broth.",answer:"cooks",options:["cooks","chefs","people","hands"],hint:"too many people involved causes problems",explanation:"'Too many cooks spoil the broth' means too many people involved makes a task worse."},
    {type:"word_match",question:"Match cooking terms with their meanings:",pairs:[{word:"sauté",meaning:"fry quickly in a little oil"},{word:"marinate",meaning:"soak food in seasoned liquid"},{word:"blanch",meaning:"briefly boil then cool in cold water"},{word:"garnish",meaning:"decorate a dish before serving"}],answer:"match_all_correct",explanation:"Key cooking technique vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The cake was baked for 30 minutes.","She has cooked dinner every night this week.","We used fresh herbs from the garden.","He have never tried sushi before."],answer:"He have never tried sushi before.",explanation:"Third person singular: 'He has never tried sushi before.'"},
  ]},
  "health_wellbeing": { label: "Health & Wellbeing", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'should' correctly?",options:["You should to exercise more regularly.","You should exercising more regularly.","You should exercise more regularly."],answer:"You should exercise more regularly.",explanation:"Modal verbs like 'should' are followed by the bare infinitive."},
    {type:"multiple_choice",question:"What does 'cut down on' something mean?",options:["To stop doing it completely.","To reduce the amount you do or consume.","To increase it gradually."],answer:"To reduce the amount you do or consume.",explanation:"'Cut down on' means to reduce, not stop entirely."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I have been feeling tired since a week.","I have been feeling tired for a week.","I am feeling tired since a week."],answer:"I have been feeling tired for a week.",explanation:"Use 'for' with a period of time; 'since' with a specific point in time."},
    {type:"true_false",question:"'Aerobic exercise' only refers to activities done inside a gym.",answer:"False",explanation:"Aerobic exercise includes any sustained activity raising your heart rate — walking, cycling, swimming."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The doctor advised her to takes regular breaks from the screen.",errorWord:"takes",answer:"take",explanation:"'Advise someone to' is followed by the bare infinitive."},
    {type:"type_answer",question:"Complete: Doctors recommend that people ___ (drink) at least eight glasses of water a day.",answer:"drink",explanation:"After 'recommend that', use the base form."},
    {type:"type_answer",question:"Complete: You shouldn't ___ (eat) a heavy meal just before bed.",answer:"eat",explanation:"'Shouldn't + bare infinitive' gives negative advice."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["sleep","is","very","important"],answer:"sleep is very important",explanation:"Subject + is + adjective + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences to describe a lifestyle change:",sentences:["Then, she started walking every day and eating better.","Finally, she felt much healthier and more energetic.","First, Anna decided to change her unhealthy habits."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Make a decision → change habits → feel better."},
    {type:"fill_idiom",question:"Complete: After the race, the runners were completely out of ___.",answer:"breath",options:["breath","time","steam","shape"],hint:"struggling to breathe after exertion",explanation:"'Out of breath' means breathing with difficulty after physical effort."},
    {type:"word_match",question:"Match health words with their meanings:",pairs:[{word:"immune",meaning:"protected against disease"},{word:"chronic",meaning:"lasting a long time or recurring"},{word:"sedentary",meaning:"spending a lot of time sitting"},{word:"remedy",meaning:"a treatment for an illness"}],answer:"match_all_correct",explanation:"Key health and wellbeing vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been going to the gym three times a week.","He feels better since he quit smoking.","They walk to work every morning.","She have lost five kilos this month."],answer:"She have lost five kilos this month.",explanation:"Third person singular: 'She has lost five kilos this month.'"},
  ]},
  "technology_gadgets": { label: "Technology & Gadgets", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses the present perfect?",options:["Smartphones have become essential in the last decade.","Smartphones became essential in the last decade.","Smartphones are becoming essential in the last decade."],answer:"Smartphones have become essential in the last decade.",explanation:"Present perfect with 'in the last decade' for a recent ongoing trend."},
    {type:"multiple_choice",question:"What does 'stream' mean in the context of technology?",options:["To download a file and save it permanently.","To watch or listen to content online without downloading.","To share a file with another user."],answer:"To watch or listen to content online without downloading.",explanation:"Streaming means consuming media in real time from the internet."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I need to charge my phone — it's running out of battery.","I need to charge my phone — it's running out from battery.","I need to charge my phone — it's running out battery."],answer:"I need to charge my phone — it's running out of battery.",explanation:"The correct phrasal verb is 'run out of' + noun."},
    {type:"true_false",question:"'Uploading' and 'downloading' mean the same thing.",answer:"False",explanation:"Uploading = sending data to the internet. Downloading = receiving data from the internet to your device."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She spends too many time on social media every day.",errorWord:"many",answer:"much",explanation:"'Time' is uncountable, so use 'much', not 'many'."},
    {type:"type_answer",question:"Complete: The new software ___ (release) next month.",answer:"will be released",explanation:"Passive future: 'will be + past participle'."},
    {type:"type_answer",question:"Complete: Have you ever ___ (lose) all your data because you forgot to back up?",answer:"lost",explanation:"Present perfect uses the past participle."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["back","up","your","files"],answer:"back up your files",explanation:"Subject + modal + phrasal verb + object."},
    {type:"story_builder",question:"Order these sentences about getting a new laptop:",sentences:["Then, she set it up and transferred all her files.","Finally, it became her favourite device within days.","First, she spent two weeks researching laptops online."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Research → set up → love it."},
    {type:"fill_idiom",question:"Complete: Learning all these new apps can feel like information ___.",answer:"overload",options:["overload","flood","cloud","storm"],hint:"too much data to process at once",explanation:"'Information overload' means having too much data to process comfortably."},
    {type:"word_match",question:"Match tech terms with their meanings:",pairs:[{word:"bandwidth",meaning:"the capacity for data transfer"},{word:"cursor",meaning:"the moving pointer on a screen"},{word:"encrypt",meaning:"to convert data into a secure code"},{word:"interface",meaning:"the way a user interacts with a device"}],answer:"match_all_correct",explanation:"Key technology vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has updated her phone's software.","They launched the app last Tuesday.","He use his tablet for reading every evening.","We upgraded the network last year."],answer:"He use his tablet for reading every evening.",explanation:"Third person singular: 'He uses his tablet for reading.'"},
    {type:"true_false",question:"'I have been using the same laptop since five years' is a grammatically correct sentence.",answer:"False",explanation:"Use 'for' with a period of time ('five years'). 'Since' is used with a specific point in time such as '2019'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"They been using the same router for over eight years without any problems.",errorWord:"been",answer:"have been",explanation:"The auxiliary 'have' is missing. The correct form is 'They have been using…'"},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["update","your","software","regularly"],answer:"update your software regularly",explanation:"Imperative form: verb + object + adverb. Used for instructions and advice."},
    {type:"story_builder",question:"Order these sentences about setting up a new phone:",sentences:["Then, she downloaded her apps and transferred her contacts.","First, Mei unboxed her new phone and charged it overnight.","Finally, she said it was the best phone she had ever owned."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Unbox and charge → customise and set up → enjoy the result."},
    {type:"fill_idiom",question:"Complete: Learning to use all the new features felt like a steep learning ___.",answer:"curve",options:["curve","path","line","slope"],hint:"a process requiring a lot of new learning in a short time",explanation:"'A steep learning curve' describes a situation where a great deal must be learned quickly."},
    {type:"word_match",question:"Match technology words with their meanings:",pairs:[{word:"algorithm",meaning:"a set of rules followed by a computer to solve a problem"},{word:"malware",meaning:"software designed to damage or disrupt a device"},{word:"cloud",meaning:"remote servers used to store and access data online"},{word:"pixel",meaning:"the smallest unit of a digital image"}],answer:"match_all_correct",explanation:"Key vocabulary for technology and gadgets."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She backed up all her files before the update.","The new model has twice as much storage as the old one.","He replaced his broken screen at a local repair shop.","The app have not been updated in over a year."],answer:"The app have not been updated in over a year.",explanation:"'App' is singular: 'The app has not been updated in over a year.'"},
  ]},
  "the_environment": { label: "The Environment", questions: [
    {type:"multiple_choice",question:"Which word correctly completes: 'Carbon dioxide is one of the main gases responsible ___ climate change.'?",options:["of","for","about"],answer:"for",explanation:"'Responsible for' is the correct collocation."},
    {type:"multiple_choice",question:"What does 'carbon footprint' mean?",options:["The physical size of a factory.","The total greenhouse gases produced by a person or activity.","A type of renewable energy."],answer:"The total greenhouse gases produced by a person or activity.",explanation:"A carbon footprint measures environmental impact in terms of greenhouse gas emissions."},
    {type:"multiple_choice",question:"Which sentence is grammatically correct?",options:["Deforestation is causing many species to become extinct.","Deforestation is causing many species becoming extinct.","Deforestation causes many species become extinct."],answer:"Deforestation is causing many species to become extinct.",explanation:"'Cause + object + to + infinitive' is the correct structure."},
    {type:"true_false",question:"Renewable energy sources include solar, wind, and nuclear power.",answer:"False",explanation:"Nuclear power is not renewable — it uses uranium, a finite resource. Solar, wind, and hydro are renewable."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The government should do more to reducing pollution in cities.",errorWord:"reducing",answer:"reduce",explanation:"After 'to' as part of an infinitive, use the bare infinitive: 'to reduce'."},
    {type:"type_answer",question:"Complete: Rainforests ___ (absorb) large amounts of carbon dioxide from the atmosphere.",answer:"absorb",explanation:"Present simple for general scientific facts."},
    {type:"type_answer",question:"Complete: The sea level has been ___ (rise) steadily for the past century.",answer:"rising",explanation:"Present perfect continuous: 'has been + -ing form'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["use","less","plastic","today"],answer:"use less plastic today",explanation:"Subject + modal + verb + object."},
    {type:"story_builder",question:"Order these sentences about a recycling project:",sentences:["Then, students began sorting paper, plastic, and glass.","Finally, the amount of waste dropped by 40 percent.","First, the school started a recycling programme."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Start programme → sort waste → see results."},
    {type:"fill_idiom",question:"Complete: It is time to go ___ and reduce our impact on the planet.",answer:"green",options:["green","clean","slow","blue"],hint:"becoming more environmentally friendly",explanation:"'Go green' means to adopt environmentally friendly practices."},
    {type:"word_match",question:"Match environment words with their meanings:",pairs:[{word:"emission",meaning:"gases released into the atmosphere"},{word:"biodegradable",meaning:"able to break down naturally"},{word:"sustainable",meaning:"able to continue without harming the environment"},{word:"drought",meaning:"a long period with little or no rain"}],answer:"match_all_correct",explanation:"Key environmental vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["Pollution levels have fallen in the city centre.","Many animals are threatened by habitat loss.","The river have become much cleaner in recent years.","Scientists are studying the effects of climate change."],answer:"The river have become much cleaner in recent years.",explanation:"'River' is singular: 'The river has become much cleaner.'"},
  ]},
  "sports_fitness": { label: "Sports & Fitness", questions: [
    {type:"multiple_choice",question:"Which sentence correctly talks about a past score?",options:["The team wins 3-1 yesterday.","The team won 3-1 yesterday.","The team has won 3-1 yesterday."],answer:"The team won 3-1 yesterday.",explanation:"'Yesterday' is a finished time reference, so use past simple."},
    {type:"multiple_choice",question:"Which sentence uses 'enough' correctly?",options:["She isn't strong enough to lift that weight.","She isn't enough strong to lift that weight.","She isn't strong to enough lift that weight."],answer:"She isn't strong enough to lift that weight.",explanation:"'Enough' always comes after the adjective: 'strong enough', not 'enough strong'."},
    {type:"multiple_choice",question:"Choose the correct sentence about training:",options:["She's been training for the marathon since six months.","She's been training for the marathon for six months.","She trains for the marathon since six months."],answer:"She's been training for the marathon for six months.",explanation:"Present perfect continuous + 'for' + duration for an ongoing activity."},
    {type:"true_false",question:"'She has been going to the gym' describes a completed action in the past.",answer:"False",explanation:"Present perfect continuous describes an ongoing action that started in the past and may still be continuing."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He trains hardly every morning before work.",errorWord:"hardly",answer:"hard",explanation:"'Hard' is the correct adverb meaning 'with great effort'. 'Hardly' means 'almost not at all'."},
    {type:"type_answer",question:"Complete: The athlete ___ (break) the world record by two seconds.",answer:"broke",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: She ___ (play) tennis since childhood.",answer:"has played",explanation:"Present perfect + 'since' for an activity that started in the past and continues."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","trains","every","day"],answer:"she trains every day",explanation:"Subject + verb + frequency + time phrase."},
    {type:"story_builder",question:"Order these sentences about preparing for a race:",sentences:["Then, he trained three times a week for six months.","Finally, he crossed the finish line and celebrated.","First, Tom signed up for a 10km race."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Sign up → train → finish the race."},
    {type:"fill_idiom",question:"Complete: After the injury, he found it hard to get back on his ___.",answer:"feet",options:["feet","legs","track","game"],hint:"recovering and becoming active again",explanation:"'Get back on your feet' means to recover and return to normal after a setback."},
    {type:"word_match",question:"Match fitness words with their meanings:",pairs:[{word:"fitness",meaning:"the state of being physically healthy and strong"},{word:"routine",meaning:"a set of activities done regularly"},{word:"progress",meaning:"gradual improvement over time"},{word:"goal",meaning:"something you aim to achieve"}],answer:"match_all_correct",explanation:"Key fitness and exercise vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The coach gave the team some useful advice.","She won a silver medal at the championships.","They has been playing football together for years.","He improved his technique after several weeks of training."],answer:"They has been playing football together for years.",explanation:"'They' takes 'have': 'They have been playing together for years.'"},
  ]},
  "family_life": { label: "Family Life", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'be used to' correctly?",options:["We are used to live in a smaller flat.","We are used to living in a smaller flat.","We used to living in a smaller flat."],answer:"We are used to living in a smaller flat.",explanation:"'Be used to + gerund (-ing)' means to be accustomed to something."},
    {type:"multiple_choice",question:"What does 'keep in touch' mean?",options:["To argue with someone frequently.","To maintain regular contact with someone.","To take care of a younger family member."],answer:"To maintain regular contact with someone.",explanation:"'Keep in touch' means to stay in regular communication."},
    {type:"multiple_choice",question:"Which sentence is correct?",options:["My parents have got married for 30 years.","My parents have been married for 30 years.","My parents are married since 30 years."],answer:"My parents have been married for 30 years.",explanation:"State verbs like 'be married' use present perfect + 'for' to describe duration up to now."},
    {type:"true_false",question:"'My sister-in-law' is my brother's wife.",answer:"True",explanation:"Your sister-in-law is your brother's or sister's wife, or your spouse's sister."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"My grandmother used to tells us stories every evening.",errorWord:"tells",answer:"tell",explanation:"'Used to' is followed by the bare infinitive: 'used to tell'."},
    {type:"type_answer",question:"Complete: Despite growing up in different cities, the twins ___ (look) remarkably alike.",answer:"look",explanation:"Present simple for a current fact."},
    {type:"type_answer",question:"Complete: She ___ (bring up) by her grandparents after her parents moved abroad.",answer:"was brought up",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["my","parents","got","married","young"],answer:"my parents got married young",explanation:"Subject + verb + past participle + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about a family reunion:",sentences:["Then, relatives travelled from as far as Australia.","First, the family planned a reunion for their grandmother.","Finally, everyone agreed it was the best gathering in years."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Plan the reunion → relatives arrive → a great success."},
    {type:"fill_idiom",question:"Complete: Don't worry about the argument — it's just a storm in a ___.",answer:"teacup",options:["teacup","bottle","glass","bucket"],hint:"a lot of fuss about something unimportant",explanation:"'A storm in a teacup' means a big reaction to a small or unimportant problem."},
    {type:"word_match",question:"Match family words with their meanings:",pairs:[{word:"sibling",meaning:"a brother or sister"},{word:"guardian",meaning:"a person legally responsible for a child"},{word:"estranged",meaning:"no longer in contact with family"},{word:"household",meaning:"all the people living together in a home"}],answer:"match_all_correct",explanation:"Key family life vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has two younger brothers and one older sister.","They moved to a bigger house when their third child was born.","He look just like his father — same eyes and smile.","We get together for dinner every Sunday."],answer:"He look just like his father — same eyes and smile.",explanation:"Third person singular: 'He looks just like his father.'"},
    {type:"true_false",question:"'My nephew' is my brother's or sister's son.",answer:"True",explanation:"A nephew is the son of your brother or sister. The female equivalent is a niece."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"My parents have lived in the same house since they got marry.",errorWord:"marry",answer:"married",explanation:"After 'got', use the past participle: 'got married'. 'Marry' is the base form of the verb."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["they","decided","to","adopt","a","child"],answer:"they decided to adopt a child",explanation:"Subject + decided + infinitive + object."},
    {type:"story_builder",question:"Order these sentences about a child leaving home:",sentences:["Then, she helped him pack and tried not to show how much she would miss him.","First, Maria's son announced he was moving abroad for work.","Finally, she video-called him every week and they stayed as close as ever."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Announcement → helping him leave → staying connected from a distance."},
    {type:"fill_idiom",question:"Complete: The children are the spitting ___ of their father — same eyes, same smile.",answer:"image",options:["image","copy","portrait","picture"],hint:"looks exactly like another person",explanation:"'The spitting image' means looking exactly like another person, especially a family member."},
    {type:"word_match",question:"Match family and upbringing words with their meanings:",pairs:[{word:"curfew",meaning:"a rule about what time someone must be home by"},{word:"breadwinner",meaning:"the family member who earns the main income"},{word:"only child",meaning:"a child with no brothers or sisters"},{word:"upbringing",meaning:"the way a child is raised and taught values"}],answer:"match_all_correct",explanation:"Key vocabulary related to family roles and raising children."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She calls her grandmother every Sunday without fail.","My brother and I share a flat in the city centre.","He have three children and lives in the countryside.","They moved back in with their parents to save money."],answer:"He have three children and lives in the countryside.",explanation:"Third person singular requires 'has': 'He has three children and lives in the countryside.'"},
  ]},
  "education_studying": { label: "Education & Studying", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'by' correctly?",options:["You need to submit the essay until Friday.","You need to submit the essay by Friday.","You need to submit the essay before to Friday."],answer:"You need to submit the essay by Friday.",explanation:"'By' means no later than. 'Until' means up to a point in time and then it stops."},
    {type:"multiple_choice",question:"What does 'take notes' mean?",options:["To write down key points while listening or reading.","To copy an entire textbook chapter.","To send a message to a classmate."],answer:"To write down key points while listening or reading.",explanation:"'Take notes' means to record key information during a lesson or from a text."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's studying hard for her exam that will be next week.","She's studying hard for her exam next week.","She studies hard for her exam that it is next week."],answer:"She's studying hard for her exam next week.",explanation:"'Next week' acts as a time adverbial without needing 'that will be'."},
    {type:"true_false",question:"A 'thesis' is the same as a short weekly homework assignment.",answer:"False",explanation:"A thesis is a long academic research document submitted for a university degree, not a short homework task."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The students were made to copied the text three times.",errorWord:"copied",answer:"copy",explanation:"After 'be made to', use the bare infinitive: 'were made to copy'."},
    {type:"type_answer",question:"Complete: If I had studied harder, I ___ (pass) the exam.",answer:"would have passed",explanation:"Third conditional: 'if + past perfect, would have + past participle'."},
    {type:"type_answer",question:"Complete: The lecture will be ___ (record) so you can watch it later online.",answer:"recorded",explanation:"Passive voice: 'will be + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["hand","in","your","work","today"],answer:"hand in your work today",explanation:"Subject + modal + phrasal verb + object + time phrase."},
    {type:"story_builder",question:"Order these sentences about a student's first week at university:",sentences:["Then, she attended her first lectures and met her tutors.","First, Emma arrived at university on a Monday morning.","Finally, she felt settled and excited by the weekend."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Arrive → attend lectures → feel settled."},
    {type:"fill_idiom",question:"Complete: Learning a language from scratch is no ___ in the park.",answer:"walk",options:["walk","run","game","ride"],hint:"not easy at all",explanation:"'No walk in the park' means something that is not easy or straightforward."},
    {type:"word_match",question:"Match education words with their meanings:",pairs:[{word:"curriculum",meaning:"the subjects included in a course of study"},{word:"tutor",meaning:"a teacher who works with students individually"},{word:"plagiarism",meaning:"copying someone else's work without permission"},{word:"semester",meaning:"half of an academic year"}],answer:"match_all_correct",explanation:"Key academic vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She passed all her exams with distinction.","The students have been studying this topic since September.","He submitted his assignment two days before the deadline.","They has already learnt three programming languages."],answer:"They has already learnt three programming languages.",explanation:"'They' takes 'have': 'They have already learnt three programming languages.'"},
  ]},
  "money_banking": { label: "Money & Banking", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'afford' correctly?",options:["We can't afford buying a new car right now.","We can't afford to buy a new car right now.","We can't afford buy a new car right now."],answer:"We can't afford to buy a new car right now.",explanation:"'Afford' is followed by 'to + infinitive'."},
    {type:"multiple_choice",question:"What does 'go into debt' mean?",options:["To save a large amount of money.","To invest money wisely.","To owe more money than you have."],answer:"To owe more money than you have.",explanation:"'Go into debt' means to owe money, often to a bank or lender."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I've been saving money since three months to go on holiday.","I've been saving money for three months to go on holiday.","I save money since three months to go on holiday."],answer:"I've been saving money for three months to go on holiday.",explanation:"Present perfect continuous + 'for' + duration for an ongoing action."},
    {type:"true_false",question:"An 'overdraft' means your bank account has more money than you expected.",answer:"False",explanation:"An overdraft means your balance has gone below zero — you owe money to the bank."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She borrowed her friend some money to pay the rent.",errorWord:"borrowed",answer:"lent",explanation:"'Borrow' means to take; 'lend' means to give. She gave money, so 'lent' is correct."},
    {type:"type_answer",question:"Complete: You should always ___ (compare) prices before making a big purchase.",answer:"compare",explanation:"After 'should', use the bare infinitive."},
    {type:"type_answer",question:"Complete: The mortgage ___ (pay) off in 25 years if we keep up the monthly payments.",answer:"will be paid",explanation:"Passive future: 'will be + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","opened","a","bank","account"],answer:"she opened a bank account",explanation:"Subject + past simple + object + time expression."},
    {type:"story_builder",question:"Order these sentences about budgeting for a holiday:",sentences:["Then, they saved money every month for six months.","Finally, they booked the flights and celebrated.","First, James and his partner decided to save for a holiday."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Decide to save → save each month → book the holiday."},
    {type:"fill_idiom",question:"Complete: That restaurant is expensive — it costs an arm and a ___.",answer:"leg",options:["leg","hand","finger","foot"],hint:"very expensive",explanation:"'Cost an arm and a leg' means to be extremely expensive."},
    {type:"word_match",question:"Match financial terms with their meanings:",pairs:[{word:"interest",meaning:"money charged for borrowing"},{word:"receipt",meaning:"a document confirming payment"},{word:"budget",meaning:"a plan for spending money"},{word:"invoice",meaning:"a bill sent by a business for services"}],answer:"match_all_correct",explanation:"Key financial vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He transferred money to his sister's account.","They have been saving for a deposit for two years.","The bank have approved her loan application.","She withdrew cash from the ATM."],answer:"The bank have approved her loan application.",explanation:"'Bank' is singular: 'The bank has approved her loan application.'"},
  ]},
  "shopping_fashion": { label: "Shopping & Fashion", questions: [
    {type:"multiple_choice",question:"Which question would you ask in a shop if you need a different size?",options:["Do you have this on a smaller?","Do you have this in a smaller size?","Have you got this with a smaller?"],answer:"Do you have this in a smaller size?",explanation:"The correct preposition is 'in' when talking about size or colour options."},
    {type:"multiple_choice",question:"What does 'window shopping' mean?",options:["Buying items online.","Looking at shop displays without intending to buy.","Shopping for curtains and blinds."],answer:"Looking at shop displays without intending to buy.",explanation:"'Window shopping' means browsing without making a purchase."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been looking for a new jacket since three weeks.","She's been looking for a new jacket for three weeks.","She looks for a new jacket since three weeks."],answer:"She's been looking for a new jacket for three weeks.",explanation:"Present perfect continuous + 'for' for an ongoing situation."},
    {type:"true_false",question:"'On sale' and 'for sale' mean exactly the same thing.",answer:"False",explanation:"'On sale' usually means at a reduced price. 'For sale' simply means available to buy."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He spends too much money buying things he doesn't needs.",errorWord:"needs",answer:"need",explanation:"After 'doesn't', use the bare infinitive: 'doesn't need'."},
    {type:"type_answer",question:"Complete: Could I ___ (try) these shoes on, please?",answer:"try",explanation:"'Could I + bare infinitive' is a polite request."},
    {type:"type_answer",question:"Complete: If I hadn't forgotten my wallet, I ___ (buy) those trousers.",answer:"would have bought",explanation:"Third conditional: 'if + past perfect, would have + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","always","checks","the","sales"],answer:"she always checks the sales",explanation:"Subject + frequency adverb + verb + object + adverb."},
    {type:"story_builder",question:"Order these sentences about a shopping trip:",sentences:["Then, she tried on several dresses but found nothing.","First, Laura went shopping to find an outfit for a wedding.","Finally, she found a perfect blue dress in the sale."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Go shopping → try dresses → find the perfect one."},
    {type:"fill_idiom",question:"Complete: Don't spend everything now — you should save for a ___ day.",answer:"rainy",options:["rainy","stormy","dark","bad"],hint:"an emergency or difficult time in the future",explanation:"'Save for a rainy day' means to keep money for a future time of need."},
    {type:"word_match",question:"Match shopping words with their meanings:",pairs:[{word:"bargain",meaning:"something bought at a lower price than usual"},{word:"receipt",meaning:"proof of purchase from a shop"},{word:"refund",meaning:"money returned after returning a product"},{word:"voucher",meaning:"a document exchangeable for goods or a discount"}],answer:"match_all_correct",explanation:"Key shopping vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The shop assistant helped her find the right size.","They have been offering discounts on winter coats.","She returned the jacket because it have a broken zip.","He paid by card at the checkout."],answer:"She returned the jacket because it have a broken zip.",explanation:"'It' is singular: 'it had a broken zip'."},
  ]},
  "music": { label: "Music", questions: [
    {type:"multiple_choice",question:"Which sentence uses the past perfect correctly?",options:["By the time the concert started, we had already found our seats.","By the time the concert started, we already found our seats.","By the time the concert started, we have already found our seats."],answer:"By the time the concert started, we had already found our seats.",explanation:"Past perfect shows an action completed before another past action."},
    {type:"multiple_choice",question:"What does 'go platinum' mean?",options:["To win a prize at a music award ceremony.","To sell a very large number of copies of an album or single.","To start playing classical music."],answer:"To sell a very large number of copies of an album or single.",explanation:"'Go platinum' means an album or song has reached a high sales milestone."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She has been learning the piano since she was five.","She has been learning the piano for she was five.","She learns the piano since she was five."],answer:"She has been learning the piano since she was five.",explanation:"Present perfect continuous + 'since' + point in time for an ongoing activity."},
    {type:"true_false",question:"A 'cover song' is a song written and performed for the first time by a new artist.",answer:"False",explanation:"A cover song is a new recording of a song originally performed by someone else."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The band played very good last night — the crowd loved it.",errorWord:"good",answer:"well",explanation:"'Good' is an adjective. 'Well' is the adverb needed to modify the verb 'played'."},
    {type:"type_answer",question:"Complete: She ___ (sing) professionally for over ten years.",answer:"has been singing",explanation:"Present perfect continuous for an ongoing activity starting in the past."},
    {type:"type_answer",question:"Complete: The song was originally ___ (write) for a film soundtrack.",answer:"written",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","plays","guitar","very","well"],answer:"he plays guitar very well",explanation:"Subject + reflexive verb + to + infinitive + object."},
    {type:"story_builder",question:"Order these sentences about a band's first live performance:",sentences:["Then, the night arrived and they were nervous but ready.","First, the band rehearsed every weekend for two months.","Finally, the audience clapped loudly at the end."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Rehearse → performance night → applause."},
    {type:"fill_idiom",question:"Complete: That new album is brilliant — the singer really knocked it out of the ___.",answer:"park",options:["park","stadium","box","field"],hint:"did something outstandingly well",explanation:"'Knock it out of the park' means to do something exceptionally well."},
    {type:"word_match",question:"Match music words with their meanings:",pairs:[{word:"lyrics",meaning:"the words of a song"},{word:"tempo",meaning:"the speed of a piece of music"},{word:"genre",meaning:"a category of music style"},{word:"acoustic",meaning:"music played without electric amplification"}],answer:"match_all_correct",explanation:"Key music vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The guitarist has been playing since she was twelve.","They released their third album last spring.","The drummer always keep perfect time during performances.","She writes all her own songs."],answer:"The drummer always keep perfect time during performances.",explanation:"Third person singular: 'The drummer always keeps perfect time.'"},
  ]},
  "social_media_internet": { label: "Social Media & the Internet", questions: [
    {type:"multiple_choice",question:"Which sentence is correct?",options:["She's been using social media for ten years.","She's using social media since ten years.","She uses social media since ten years."],answer:"She's been using social media for ten years.",explanation:"Present perfect continuous + 'for' for an ongoing activity."},
    {type:"multiple_choice",question:"What does 'go viral' mean?",options:["To get a computer virus from a website.","To spread rapidly and be shared widely online.","To delete your social media account."],answer:"To spread rapidly and be shared widely online.",explanation:"'Go viral' means content that spreads very quickly across the internet."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["He doesn't check his emails very often, does he?","He doesn't check his emails very often, doesn't he?","He doesn't check his emails very often, do he?"],answer:"He doesn't check his emails very often, does he?",explanation:"Negative statement + positive question tag: 'doesn't he?' becomes 'does he?'"},
    {type:"true_false",question:"A hashtag on social media is a word or phrase preceded by the # symbol used to categorise content.",answer:"True",explanation:"Hashtags (#) label and group content by topic on social media platforms."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She posted a photo of herself in the beach yesterday.",errorWord:"in",answer:"on",explanation:"Use 'on the beach', not 'in the beach'. Compare: 'in the sea' or 'in the water'."},
    {type:"type_answer",question:"Complete: The company's social media account ___ (manage) by a team of three people.",answer:"is managed",explanation:"Present passive: 'is + past participle'."},
    {type:"type_answer",question:"Complete: I ___ (not check) social media before bed — it affects my sleep.",answer:"don't check",explanation:"Negative present simple for habits: 'don't + bare infinitive'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","is","always","on","her","phone"],answer:"she is always on her phone",explanation:"Subject + verb + too much + noun + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about becoming a content creator:",sentences:["Then, she posted one video a week for six months.","First, Maria decided to start a cooking channel online.","Finally, one video went viral and she gained thousands of followers."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Start a channel → post regularly → go viral."},
    {type:"fill_idiom",question:"Complete: His controversial post really opened a can of ___.",answer:"worms",options:["worms","trouble","snakes","mess"],hint:"caused a complicated set of new problems",explanation:"'Open a can of worms' means to create a situation that leads to many new problems."},
    {type:"word_match",question:"Match internet terms with their meanings:",pairs:[{word:"algorithm",meaning:"rules used to decide what content users see"},{word:"influencer",meaning:"a person who promotes products to their online followers"},{word:"engagement",meaning:"interaction with online content such as likes and comments"},{word:"thread",meaning:"a series of connected messages or posts"}],answer:"match_all_correct",explanation:"Key social media vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He replied to all his comments within an hour.","The post received thousands of likes in one day.","She have been managing the company's account for two years.","They launched a new campaign on social media last week."],answer:"She have been managing the company's account for two years.",explanation:"Third person singular: 'She has been managing the company's account.'"},
    {type:"true_false",question:"'Phishing' is a type of online scam where criminals trick people into revealing personal information.",answer:"True",explanation:"Phishing involves fake emails, websites, or messages designed to steal passwords, bank details, or other personal data."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She has been scroll through her feed for over an hour.",errorWord:"scroll",answer:"scrolling",explanation:"Present perfect continuous: 'has been + verb-ing'. The correct form is 'has been scrolling'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","blocked","several","accounts","after","receiving","spam"],answer:"he blocked several accounts after receiving spam",explanation:"Subject + past simple + object + time clause with 'after + gerund'."},
    {type:"story_builder",question:"Order these sentences about an account being hacked:",sentences:["Then, she changed all her passwords and enabled two-factor authentication.","First, Lily noticed that her social media account had been accessed by someone else.","Finally, she warned her followers and reported the account to the platform."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Discover the hack → secure the account → warn others and report."},
    {type:"fill_idiom",question:"Complete: The negative comments really got under her ___ — she couldn't stop thinking about them.",answer:"skin",options:["skin","head","nerves","feet"],hint:"to annoy or upset someone deeply",explanation:"'Get under your skin' means to irritate or upset someone in a way that is hard to ignore or forget."},
    {type:"word_match",question:"Match social media terms with their meanings:",pairs:[{word:"troll",meaning:"a person who posts deliberately offensive content to provoke others"},{word:"DM",meaning:"a private message sent directly to someone on a platform"},{word:"caption",meaning:"text that accompanies a photo or video post"},{word:"verified",meaning:"confirmed as authentic with an official badge on a profile"}],answer:"match_all_correct",explanation:"Key vocabulary for describing social media behaviour and features."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She updated her profile picture for the first time in years.","The company's latest post received a lot of negative feedback.","He spend hours watching videos instead of doing his homework.","They decided to take a break from social media for a week."],answer:"He spend hours watching videos instead of doing his homework.",explanation:"Third person singular present simple: 'He spends hours watching videos instead of doing his homework.'"},
  ]},
  "ambitions_goals": { label: "Ambitions & Goals", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'hope to' correctly?",options:["She hopes to becoming a doctor one day.","She hopes becoming a doctor one day.","She hopes to become a doctor one day."],answer:"She hopes to become a doctor one day.",explanation:"'Hope to' is followed by the bare infinitive."},
    {type:"multiple_choice",question:"What does 'set a goal' mean?",options:["To achieve something by luck.","To decide on something you want to accomplish and work towards it.","To give up on a plan."],answer:"To decide on something you want to accomplish and work towards it.",explanation:"'Set a goal' means to establish a specific target and pursue it."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["By 2030, she will have been working in the company for ten years.","By 2030, she will have work in the company for ten years.","By 2030, she will be working in the company since ten years."],answer:"By 2030, she will have been working in the company for ten years.",explanation:"Future perfect continuous: 'will have been + -ing' for an ongoing action up to a future point."},
    {type:"true_false",question:"The word 'ambition' always has a negative meaning in English.",answer:"False",explanation:"'Ambition' is generally neutral or positive — it means a strong desire to achieve something."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He is determine to pass his driving test on the second attempt.",errorWord:"determine",answer:"determined",explanation:"After 'is', use the adjective form: 'is determined'."},
    {type:"type_answer",question:"Complete: She is working hard because she ___ (want) to study abroad next year.",answer:"wants",explanation:"Third person singular present simple: 'wants'."},
    {type:"type_answer",question:"Complete: If you set clear goals, you are more likely ___ (achieve) them.",answer:"to achieve",explanation:"'More likely + to + infinitive' is the correct structure."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","never","gives","up"],answer:"she never gives up",explanation:"Subject + is determined to + infinitive + object."},
    {type:"story_builder",question:"Order these sentences about following a dream:",sentences:["Then, she studied hard and worked at fashion houses for free.","First, Sofia dreamed of becoming a fashion designer.","Finally, she launched her own brand and became successful."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Dream big → work hard → achieve success."},
    {type:"fill_idiom",question:"Complete: Don't be afraid — just go for it and reach for the ___.",answer:"stars",options:["stars","top","sky","moon"],hint:"aim very high",explanation:"'Reach for the stars' means to aim very high and pursue great ambitions."},
    {type:"word_match",question:"Match ambition words with their meanings:",pairs:[{word:"perseverance",meaning:"continuing despite difficulties"},{word:"milestone",meaning:"an important event marking progress"},{word:"aspiration",meaning:"a hope or ambition to achieve something"},{word:"commitment",meaning:"dedication to a task or goal"}],answer:"match_all_correct",explanation:"Key vocabulary for talking about ambitions and goals."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has already completed three of her five goals this year.","He is planning to apply for a promotion.","They works hard every day to improve their skills.","She enrolled in an evening course to develop new skills."],answer:"They works hard every day to improve their skills.",explanation:"'They' takes 'work' without 's': 'They work hard every day.'"},
  ]},
  "culture_traditions": { label: "Culture & Traditions", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'although' correctly?",options:["Although the food was unfamiliar, but she enjoyed it.","Although the food was unfamiliar, she enjoyed it.","Although the food was unfamiliar but she enjoyed it."],answer:"Although the food was unfamiliar, she enjoyed it.",explanation:"'Although' introduces a contrast without needing 'but'. Use one or the other, not both."},
    {type:"multiple_choice",question:"What does 'culture shock' describe?",options:["A feeling of excitement about travelling.","The discomfort felt when experiencing an unfamiliar culture.","A type of traditional festival."],answer:"The discomfort felt when experiencing an unfamiliar culture.",explanation:"'Culture shock' is the confusion or disorientation felt when encountering a very different way of life."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Traditions are passed to down from generation to generation.","Traditions are passed down from generation to generation.","Traditions are pass down from generation to generation."],answer:"Traditions are passed down from generation to generation.",explanation:"Passive: 'are passed down'. The phrasal verb is 'pass down', not 'pass to down'."},
    {type:"true_false",question:"A 'taboo' is something that is encouraged or praised in a culture.",answer:"False",explanation:"A taboo is a social or cultural prohibition — something strongly forbidden or discouraged."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"In many countries, it is consider rude to point at strangers.",errorWord:"consider",answer:"considered",explanation:"Passive: 'it is considered rude' — use the past participle."},
    {type:"type_answer",question:"Complete: The festival ___ (hold) every year in August to celebrate the harvest.",answer:"is held",explanation:"Present passive for regular events: 'is + past participle'."},
    {type:"type_answer",question:"Complete: She ___ (grow up) speaking two languages because her parents were from different countries.",answer:"grew up",explanation:"Past simple for a completed past situation."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["respect","other","people's","traditions"],answer:"respect other people's traditions",explanation:"Gerund phrase as subject + verb + object."},
    {type:"story_builder",question:"Order these sentences about attending a local festival:",sentences:["Then, he watched the dances and tried the local food.","First, Marco visited a small Spanish town during its festival.","Finally, a local family invited him to join their celebration."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Visit the town → enjoy the festival → join the locals."},
    {type:"fill_idiom",question:"Complete: When visiting another country, it is best to do as the Romans ___.",answer:"do",options:["do","did","say","live"],hint:"follow local customs and behaviour",explanation:"'When in Rome, do as the Romans do' means to follow the customs of the place you are visiting."},
    {type:"word_match",question:"Match culture words with their meanings:",pairs:[{word:"ritual",meaning:"an action performed regularly as part of a ceremony"},{word:"heritage",meaning:"cultural traditions passed from earlier generations"},{word:"etiquette",meaning:"rules for polite behaviour in social situations"},{word:"dialect",meaning:"a regional variety of a language"}],answer:"match_all_correct",explanation:"Key vocabulary for culture and traditions."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She always removes her shoes before entering the house.","They celebrated the festival with traditional food and music.","He has been studying the local customs since he arrived.","The ceremony was organise by the town council."],answer:"The ceremony was organise by the town council.",explanation:"Passive voice needs the past participle: 'was organised'."},
  ]},
  "films_tv": { label: "Films & TV", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'just' correctly in the present perfect?",options:["I just saw the new film — it was amazing!","I have just seen the new film — it was amazing!","I have just saw the new film — it was amazing!"],answer:"I have just seen the new film — it was amazing!",explanation:"Present perfect with 'just': 'have + just + past participle' for a very recent action."},
    {type:"multiple_choice",question:"What does 'binge-watch' mean?",options:["To watch a film at the cinema.","To watch many episodes of a TV series in one session.","To review a film online."],answer:"To watch many episodes of a TV series in one session.",explanation:"'Binge-watching' means watching multiple episodes back-to-back."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The film, that won the Oscar, was directed by a Spanish director.","The film which won the Oscar was directed by a Spanish director.","The film who won the Oscar was directed by a Spanish director."],answer:"The film which won the Oscar was directed by a Spanish director.",explanation:"Use 'which' or 'that' for things. No commas needed for a defining relative clause."},
    {type:"true_false",question:"A 'documentary' is a type of fictional film with invented characters and a made-up story.",answer:"False",explanation:"A documentary is a non-fiction film presenting facts about real events, people, or topics."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The sequel was even more better than the original film.",errorWord:"more",answer:"much",explanation:"'Better' is already the comparative form of 'good'. Use 'much better' to intensify."},
    {type:"type_answer",question:"Complete: The film ___ (direct) by a first-time director who had never made a feature film before.",answer:"was directed",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Have you ever ___ (watch) a film in a foreign language without subtitles?",answer:"watched",explanation:"Present perfect uses the past participle."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","film","was","very","long"],answer:"the film was very long",explanation:"Subject + present perfect continuous + object + for + duration."},
    {type:"story_builder",question:"Order these sentences about a film night:",sentences:["Then, the film was so gripping that nobody spoke.","First, Jake and his friends chose a thriller to watch.","Finally, they stayed up until midnight discussing the ending."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Choose the film → watch in silence → discuss afterwards."},
    {type:"fill_idiom",question:"Complete: Nobody saw the ending coming — it was completely out of the ___.",answer:"blue",options:["blue","dark","sky","air"],hint:"a complete surprise",explanation:"'Out of the blue' means unexpectedly, without any warning."},
    {type:"word_match",question:"Match film words with their meanings:",pairs:[{word:"screenplay",meaning:"the written script of a film"},{word:"sequel",meaning:"a film that continues the story of an earlier one"},{word:"protagonist",meaning:"the main character in a story"},{word:"soundtrack",meaning:"the music used in a film"}],answer:"match_all_correct",explanation:"Key film vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The film received excellent reviews from critics.","She has watched every episode of that series.","He saw the film three times on the cinema.","The cast gave outstanding performances throughout."],answer:"He saw the film three times on the cinema.",explanation:"The correct preposition is 'at the cinema', not 'on'."},
  ]},
  "books_reading": { label: "Books & Reading", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses the passive voice?",options:["The novel was wrote by a first-time author.","The novel was written by a first-time author.","The novel written by a first-time author."],answer:"The novel was written by a first-time author.",explanation:"Passive past simple: 'was + past participle' (written, not wrote)."},
    {type:"multiple_choice",question:"What is a 'plot twist'?",options:["A type of book binding.","The way characters speak in a novel.","An unexpected change or development in the story."],answer:"An unexpected change or development in the story.",explanation:"A plot twist is a surprising turn of events that changes what the reader expected."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She reads so many books that she joins a library.","She reads so many books that she has joined a library.","She read so many books that she joins a library."],answer:"She reads so many books that she has joined a library.",explanation:"'So + adjective + that' expresses result. Present perfect for a recent relevant action."},
    {type:"true_false",question:"A 'biography' is a book that an author writes about their own life.",answer:"False",explanation:"A biography is written about someone else's life. A book about your own life is an 'autobiography'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She has read the book twice but she still doesn't understood the ending.",errorWord:"understood",answer:"understand",explanation:"'Doesn't' is followed by the bare infinitive: 'doesn't understand'."},
    {type:"type_answer",question:"Complete: By the time she reached the final chapter, she ___ (already guess) who the killer was.",answer:"had already guessed",explanation:"Past perfect for an action completed before another past event."},
    {type:"type_answer",question:"Complete: The book ___ (translate) into more than 40 languages since it was published.",answer:"has been translated",explanation:"Present perfect passive: 'has been + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","reads","every","single","day"],answer:"she reads every single day",explanation:"Subject + frequency adverb + verb + time phrase."},
    {type:"story_builder",question:"Order these sentences about discovering a favourite author:",sentences:["Then, she read the whole book in a single weekend.","First, a colleague recommended a thriller during lunch.","Finally, she borrowed more books by the same author."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Get a recommendation → read it → want more."},
    {type:"fill_idiom",question:"Complete: Don't judge a ___ by its cover — the story inside was wonderful.",answer:"book",options:["book","person","film","gift"],hint:"don't judge based on appearance",explanation:"'Don't judge a book by its cover' means don't judge something or someone by their appearance."},
    {type:"word_match",question:"Match literary words with their meanings:",pairs:[{word:"narrator",meaning:"the voice that tells a story"},{word:"genre",meaning:"the type or category of a book"},{word:"chapter",meaning:"a main division of a book"},{word:"metaphor",meaning:"a word or phrase used figuratively to describe something"}],answer:"match_all_correct",explanation:"Key literary vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She borrowed three books from the library last week.","The author has written twelve novels in twenty years.","He always underline key passages when he reads.","The book was shortlisted for a major literary prize."],answer:"He always underline key passages when he reads.",explanation:"Third person singular: 'He always underlines key passages.'"},
  ]},
  "home_housing": { label: "Home & Housing", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'too' and 'enough' correctly?",options:["The flat is too small for us to living comfortably.","The flat is too small for us to live comfortably.","The flat is not big enough for us to living."],answer:"The flat is too small for us to live comfortably.",explanation:"'Too + adjective + for + object + to + infinitive' is the correct structure."},
    {type:"multiple_choice",question:"What does 'furnished' mean when describing a rental property?",options:["The property has been recently painted.","The property includes furniture as part of the rental.","The property has central heating."],answer:"The property includes furniture as part of the rental.",explanation:"A 'furnished' flat comes with furniture already provided."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["We've been living here since five years.","We've been living here for five years.","We live here since five years."],answer:"We've been living here for five years.",explanation:"Present perfect continuous + 'for' + duration for an ongoing situation."},
    {type:"true_false",question:"A 'mortgage' is a loan taken out to buy a property.",answer:"True",explanation:"A mortgage is a long-term loan from a bank used specifically to purchase property."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The landlord agreed to risen the rent by only 5% this year.",errorWord:"risen",answer:"raise",explanation:"'Agree to' is followed by the bare infinitive: 'agreed to raise'. 'Risen' is the past participle of 'rise'."},
    {type:"type_answer",question:"Complete: The heating ___ (break down) last winter and the landlord took weeks to fix it.",answer:"broke down",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: She ___ (would prefer) to rent closer to work, but the prices are too high.",answer:"would prefer",explanation:"'Would prefer + to + infinitive' expresses preference."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["we","moved","house","last","year"],answer:"we moved house last year",explanation:"Subject + past simple + object + time phrase."},
    {type:"story_builder",question:"Order these sentences about moving to a new city:",sentences:["Then, they spent two weekends looking at flats.","First, a company offered Tom a job in a new city.","Finally, they signed the lease and felt settled within a month."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Get the job offer → search for a flat → move in."},
    {type:"fill_idiom",question:"Complete: Moving to a new city was hard at first, but she soon felt right ___ home.",answer:"at",options:["at","like","near","in"],hint:"comfortable and relaxed somewhere",explanation:"'Feel at home' means to feel comfortable and relaxed in a place."},
    {type:"word_match",question:"Match housing words with their meanings:",pairs:[{word:"tenant",meaning:"a person who rents a property"},{word:"deposit",meaning:"money paid in advance as security"},{word:"renovation",meaning:"the process of improving an old building"},{word:"utility",meaning:"a service such as electricity, gas, or water"}],answer:"match_all_correct",explanation:"Key housing and renting vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been looking for a flat for the past three months.","The landlord repaired the boiler within 24 hours.","They moved into their new home last spring.","He have been living in the same flat for ten years."],answer:"He have been living in the same flat for ten years.",explanation:"Third person singular: 'He has been living in the same flat for ten years.'"},
  ]},
  "food_restaurants": { label: "Food & Restaurants", questions: [
    {type:"multiple_choice",question:"Which question is correct to ask a waiter?",options:["Could I have the menu, please?","Can I having the menu, please?","I would like having the menu, please?"],answer:"Could I have the menu, please?",explanation:"'Could I have...?' is the correct polite structure for requesting something."},
    {type:"multiple_choice",question:"What does 'al dente' mean when describing pasta?",options:["Overcooked and very soft.","Cooked to be slightly firm when bitten.","Served with a cold sauce."],answer:"Cooked to be slightly firm when bitten.",explanation:"'Al dente' is an Italian phrase used in English cooking to describe pasta with a slight firmness."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I'm starving — I didn't have had breakfast this morning.","I'm starving — I didn't have breakfast this morning.","I'm starving — I haven't have breakfast this morning."],answer:"I'm starving — I didn't have breakfast this morning.",explanation:"Past simple negative: 'didn't + bare infinitive' for a specific past action."},
    {type:"true_false",question:"'Vegetarian' and 'vegan' mean the same dietary choice.",answer:"False",explanation:"Vegetarians avoid meat and fish but may eat dairy and eggs. Vegans avoid all animal products."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The waiter recommendation the daily special, which was grilled salmon.",errorWord:"recommendation",answer:"recommended",explanation:"'Recommendation' is a noun. The verb form needed here is 'recommended'."},
    {type:"type_answer",question:"Complete: By the time the dessert arrived, we ___ (already eat) too much.",answer:"had already eaten",explanation:"Past perfect: 'had + already + past participle'."},
    {type:"type_answer",question:"Complete: This dish ___ (season) with garlic, lemon, and fresh herbs.",answer:"is seasoned",explanation:"Present passive for describing a dish's ingredients: 'is + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","asked","for","the","bill"],answer:"she asked for the bill",explanation:"Subject + asked for + object."},
    {type:"story_builder",question:"Order these sentences about a special dinner:",sentences:["Then, they sat by the window and ordered their meal.","First, David booked a table at a restaurant his friend recommended.","Finally, they agreed it was one of the best meals they had ever had."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Book the table → arrive and eat → agree it was wonderful."},
    {type:"fill_idiom",question:"Complete: The argument during dinner was very tense — you could have ___ the atmosphere with a knife.",answer:"cut",options:["cut","sliced","felt","touched"],hint:"very tense atmosphere",explanation:"'You could cut the atmosphere with a knife' means the tension in a room was very strong."},
    {type:"word_match",question:"Match restaurant words with their meanings:",pairs:[{word:"starter",meaning:"the first course of a meal"},{word:"portion",meaning:"the amount of food served to one person"},{word:"reservation",meaning:"a booking made in advance at a restaurant"},{word:"glutton",meaning:"a person who eats or drinks excessively"}],answer:"match_all_correct",explanation:"Key restaurant and dining vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She ordered the chicken with roasted vegetables.","They have been coming to this restaurant for years.","He always leave a tip when the service is good.","The chef prepared a special menu for the occasion."],answer:"He always leave a tip when the service is good.",explanation:"Third person singular: 'He always leaves a tip when the service is good.'"},
    {type:"true_false",question:"'À la carte' means choosing individual dishes from a menu rather than ordering a fixed set meal.",answer:"True",explanation:"'À la carte' (from French) means each dish is individually priced and ordered separately, as opposed to a set or prix fixe menu."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The meal was wonderful but the service was a bit slowly.",errorWord:"slowly",answer:"slow",explanation:"After a linking verb such as 'was', use an adjective ('slow'), not an adverb ('slowly')."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","chef","has","won","several","awards"],answer:"the chef has won several awards",explanation:"Subject + has + past participle + object."},
    {type:"story_builder",question:"Order these sentences about a cooking disaster:",sentences:["Then, he followed the recipe carefully but forgot to add salt.","First, Tom decided to cook a three-course dinner for his family.","Finally, everyone laughed it off and they ordered a takeaway instead."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Decide to cook → follow the recipe but make a mistake → laugh and order takeaway."},
    {type:"fill_idiom",question:"Complete: Oysters are not everyone's cup of ___ — people either love them or hate them.",answer:"tea",options:["tea","soup","coffee","water"],hint:"not something everyone personally enjoys",explanation:"'Not everyone's cup of tea' means something that not everyone enjoys or finds appealing."},
    {type:"word_match",question:"Match food and cooking words with their meanings:",pairs:[{word:"mouthwatering",meaning:"making you want to eat something immediately"},{word:"bland",meaning:"lacking flavour or seasoning"},{word:"garnish",meaning:"a small decoration added to a dish before serving"},{word:"marinade",meaning:"a liquid in which food is soaked to add flavour before cooking"}],answer:"match_all_correct",explanation:"Useful vocabulary for describing food preparation and taste."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The menu changes every season to reflect fresh ingredients.","She has been a chef for over fifteen years.","He ordered a pasta dish and ask for extra cheese.","They sat outside on the terrace and enjoyed the view."],answer:"He ordered a pasta dish and ask for extra cheese.",explanation:"Parallel verb forms are required: 'He ordered a pasta dish and asked for extra cheese.'"},
  ]},
  "cities_travel": { label: "Cities & Travel", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses 'used to'?",options:["This area used to be a factory district, but now it's full of restaurants.","This area use to be a factory district, but now it's full of restaurants.","This area was used to be a factory district."],answer:"This area used to be a factory district, but now it's full of restaurants.",explanation:"'Used to + bare infinitive' describes a past state no longer true."},
    {type:"multiple_choice",question:"What is a 'rush hour'?",options:["A period when shops are having a sale.","The busiest times of day when people travel to or from work.","A fast route between two cities."],answer:"The busiest times of day when people travel to or from work.",explanation:"'Rush hour' is typically morning and evening when commuters travel, causing heavy traffic."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been living in the city since she was 18 years old.","She's been living in the city for she was 18 years old.","She lives in the city since 18 years old."],answer:"She's been living in the city since she was 18 years old.",explanation:"Present perfect continuous + 'since' + a specific point in time."},
    {type:"true_false",question:"A 'suburb' is the busy central district of a city.",answer:"False",explanation:"A suburb is a residential area on the outer edge of a city, away from the busy centre."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"Unfortunately, we was delayed at the station for over an hour.",errorWord:"was",answer:"were",explanation:"'We' requires 'were', not 'was': 'we were delayed'."},
    {type:"type_answer",question:"Complete: The city has ___ (change) dramatically since the 1990s.",answer:"changed",explanation:"Present perfect: 'has + past participle'."},
    {type:"type_answer",question:"Complete: If you want to avoid the crowds, you ___ (should visit) the old town early in the morning.",answer:"should visit",explanation:"'Should + bare infinitive' for advice."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","city","has","changed","completely"],answer:"the city has changed completely",explanation:"Subject + present perfect + object + adverb."},
    {type:"story_builder",question:"Order these sentences about a day exploring a new city:",sentences:["Then, they picked up a map and headed to the old town.","First, Ana and her friend arrived in Prague on Friday morning.","Finally, they were tired but full of stories by the evening."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Arrive → explore the city → end the day happy."},
    {type:"fill_idiom",question:"Complete: Moving to a new city felt strange at first, but she soon found her ___ there.",answer:"feet",options:["feet","legs","track","game"],hint:"becoming comfortable and confident in a new place",explanation:"'Find your feet' means to become confident and familiar with a new place or situation."},
    {type:"word_match",question:"Match urban words with their meanings:",pairs:[{word:"commute",meaning:"the regular journey between home and work"},{word:"infrastructure",meaning:"the basic systems a city needs such as roads and water"},{word:"pedestrian",meaning:"a person travelling on foot"},{word:"district",meaning:"a defined area of a city with a particular character"}],answer:"match_all_correct",explanation:"Key urban and city vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The new metro line has reduced traffic significantly.","She cycles to work every day to avoid the rush hour.","They moved to the suburbs for a quieter life.","The new policy were announced during a press conference."],answer:"The new policy were announced during a press conference.",explanation:"'Policy' is singular: 'The new policy was announced...'"},
  ]},
  "science_discovery": { label: "Science & Discovery", questions: [
    {type:"multiple_choice",question:"Which sentence uses the passive correctly?",options:["Penicillin was discover by Alexander Fleming in 1928.","Penicillin was discovered by Alexander Fleming in 1928.","Penicillin discovered by Alexander Fleming in 1928."],answer:"Penicillin was discovered by Alexander Fleming in 1928.",explanation:"Passive past simple: 'was + past participle'."},
    {type:"multiple_choice",question:"What does 'hypothesis' mean in science?",options:["A proven scientific fact.","A guess that cannot be tested.","A proposed explanation that can be tested."],answer:"A proposed explanation that can be tested.",explanation:"A hypothesis is an educated prediction that scientists test through experiments."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Scientists have been study this virus for decades.","Scientists are studying this virus for decades.","Scientists have been studying this virus for decades."],answer:"Scientists have been studying this virus for decades.",explanation:"Present perfect continuous for an ongoing activity that started in the past and continues now."},
    {type:"true_false",question:"DNA stands for 'Digital Network Access'.",answer:"False",explanation:"DNA stands for 'Deoxyribonucleic Acid' — the molecule that carries genetic information."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The results of the experiment was unexpected and surprised the researchers.",errorWord:"was",answer:"were",explanation:"'Results' is plural, so use 'were': 'the results were unexpected'."},
    {type:"type_answer",question:"Complete: The discovery ___ (announce) at an international conference last month.",answer:"was announced",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Scientists ___ (not yet find) a cure for this condition.",answer:"have not yet found",explanation:"Present perfect negative for a situation not yet completed."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","test","was","repeated","twice"],answer:"the test was repeated twice",explanation:"Subject + passive verb + frequency."},
    {type:"story_builder",question:"Order these sentences about a scientific breakthrough:",sentences:["Then, they ran hundreds of tests and recorded their results.","First, a research team began studying an unusual protein.","Finally, the discovery was used to develop a new treatment."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Begin the study → run tests → apply the discovery."},
    {type:"fill_idiom",question:"Complete: The new theory turned the world of physics ___ down.",answer:"upside",options:["upside","inside","topsy","back"],hint:"completely changed everything",explanation:"'Turn something upside down' means to change something completely or cause great disruption."},
    {type:"word_match",question:"Match science words with their meanings:",pairs:[{word:"gravity",meaning:"the force that pulls objects towards each other"},{word:"molecule",meaning:"the smallest unit of a chemical compound"},{word:"evolution",meaning:"the process by which species change over time"},{word:"microscope",meaning:"an instrument for viewing very small objects"}],answer:"match_all_correct",explanation:"Key science vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The scientists published their findings in a peer-reviewed journal.","She has been researching climate patterns for fifteen years.","The lab results confirmed what the team had suspected.","He make a major breakthrough during his third year of research."],answer:"He make a major breakthrough during his third year of research.",explanation:"Past tense needed: 'He made a major breakthrough...'"},
  ]},
  "friendship": { label: "Friendship", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'get on with' correctly?",options:["She gets on with her colleagues very well at work.","She gets on with very well her colleagues at work.","She gets well on with her colleagues at work."],answer:"She gets on with her colleagues very well at work.",explanation:"'Get on with someone' means to have a good relationship. Adverbs come after the object."},
    {type:"multiple_choice",question:"What does 'fall out with someone' mean?",options:["To become close friends with someone.","To have an argument and damage the friendship.","To meet someone unexpectedly."],answer:"To have an argument and damage the friendship.",explanation:"'Fall out with someone' means to have a serious disagreement that affects the relationship."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["We've known each other since we was at school.","We've known each other since we were at school.","We know each other since we were at school."],answer:"We've known each other since we were at school.",explanation:"Present perfect + 'since' + past simple clause for a situation starting in the past."},
    {type:"true_false",question:"A 'fair-weather friend' is someone who is always there for you in good times and bad.",answer:"False",explanation:"A 'fair-weather friend' only stays close during good times and disappears when things get difficult."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We haven't spoke since we had that argument last year.",errorWord:"spoke",answer:"spoken",explanation:"Present perfect requires the past participle: 'haven't spoken'."},
    {type:"type_answer",question:"Complete: She ___ (know) her best friend since they started primary school together.",answer:"has known",explanation:"Present perfect for a state that started in the past and continues now."},
    {type:"type_answer",question:"Complete: Good friends are people who ___ (support) each other through difficult times.",answer:"support",explanation:"Present simple for a general truth."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["friends","should","trust","each","other"],answer:"friends should trust each other",explanation:"Subject + frequency adverb + verb + object."},
    {type:"story_builder",question:"Order these sentences about reconnecting with an old friend:",sentences:["Then, Lena found her friend's number and decided to call.","First, Lena and her school friend had not spoken for six years.","Finally, they met for coffee and talked for hours."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Lose contact → decide to call → meet up and reconnect."},
    {type:"fill_idiom",question:"Complete: She's been there for her friends through thick and ___.",answer:"thin",options:["thin","thick","bad","dark"],hint:"in all situations, good and bad",explanation:"'Through thick and thin' means through all kinds of situations, both good and bad."},
    {type:"word_match",question:"Match friendship words with their meanings:",pairs:[{word:"bond",meaning:"a close connection between people"},{word:"loyalty",meaning:"being faithful and supportive to friends"},{word:"companion",meaning:"a person you spend time with"},{word:"reconcile",meaning:"to restore a friendly relationship after a disagreement"}],answer:"match_all_correct",explanation:"Key vocabulary for describing friendship."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["They have been friends since they met at university.","She always supports her friends when they are struggling.","He forgave his friend after they talk things through.","We get along really well despite our different personalities."],answer:"He forgave his friend after they talk things through.",explanation:"Past simple needed after past simple: 'after they talked things through'."},
  ]},
  "celebrations_parties": { label: "Celebrations & Parties", questions: [
    {type:"multiple_choice",question:"Which sentence is correct?",options:["They are throwing a surprise party for her last Saturday.","They threw a surprise party for her last Saturday.","They have thrown a surprise party for her last Saturday."],answer:"They threw a surprise party for her last Saturday.",explanation:"'Last Saturday' is a finished time reference, so use past simple."},
    {type:"multiple_choice",question:"What does 'raise a toast' mean at a celebration?",options:["To burn the bread accidentally.","To raise glasses and drink in honour of someone.","To serve food to guests."],answer:"To raise glasses and drink in honour of someone.",explanation:"'Raise a toast' at a party means raising your glass to celebrate or honour someone."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The party will be take place at the town hall on Saturday.","The party will take place at the town hall on Saturday.","The party will taking place at the town hall on Saturday."],answer:"The party will take place at the town hall on Saturday.",explanation:"'Will + bare infinitive' for future plans. 'Take place' is intransitive — not passive."},
    {type:"true_false",question:"'RSVP' on an invitation comes from a Latin phrase.",answer:"False",explanation:"'RSVP' comes from the French phrase 'Répondez s'il vous plaît', meaning 'Please reply'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We've been planning this celebration since six months.",errorWord:"since",answer:"for",explanation:"Use 'for' with a period of time. Use 'since' with a specific point in time."},
    {type:"type_answer",question:"Complete: By the time the guests arrived, she ___ (already prepare) all the food.",answer:"had already prepared",explanation:"Past perfect: 'had + already + past participle'."},
    {type:"type_answer",question:"Complete: The venue ___ (decorate) with hundreds of flowers and fairy lights.",answer:"was decorated",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["it","was","a","great","party"],answer:"it was a great party",explanation:"Main clause + embedded clause."},
    {type:"story_builder",question:"Order these sentences about planning a birthday party:",sentences:["Then, he booked a room and invited all her closest friends.","First, Carlos spent weeks secretly planning a surprise party.","Finally, her friends arrived and the surprise was unforgettable."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Plan in secret → book and invite → the big surprise."},
    {type:"fill_idiom",question:"Complete: After winning the award, she was on ___ nine for the rest of the week.",answer:"cloud",options:["cloud","level","floor","page"],hint:"extremely happy",explanation:"'On cloud nine' means to be extremely happy and excited."},
    {type:"word_match",question:"Match celebration words with their meanings:",pairs:[{word:"venue",meaning:"the place where an event is held"},{word:"host",meaning:"a person who organises and welcomes guests"},{word:"anniversary",meaning:"the yearly return of a significant date"},{word:"reception",meaning:"a formal party held after a wedding"}],answer:"match_all_correct",explanation:"Key celebration and event vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She sent invitations to all her friends two weeks in advance.","The caterers prepared food for over 100 guests.","Everyone have a wonderful time at the wedding reception.","The speeches were funny and heartfelt."],answer:"Everyone have a wonderful time at the wedding reception.",explanation:"'Everyone' is singular: 'Everyone had a wonderful time.'"},
  ]},
  "emotions_feelings": { label: "Emotions & Feelings", questions: [
    {type:"multiple_choice",question:"Which sentence correctly describes an emotion?",options:["She was so boring at the party that she left early.","She was so bored at the party that she left early.","She was so bore at the party that she left early."],answer:"She was so bored at the party that she left early.",explanation:"'Bored' describes how a person feels; 'boring' describes the thing that causes the feeling."},
    {type:"multiple_choice",question:"What does 'mixed feelings' mean?",options:["Being very happy about something.","Having both positive and negative emotions about something.","Feeling confused about a fact."],answer:"Having both positive and negative emotions about something.",explanation:"'Mixed feelings' means you feel both positive and negative about something at the same time."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She felt very frustrating when the train was delayed again.","She felt very frustrated when the train was delayed again.","She was very frustrate when the train was delayed again."],answer:"She felt very frustrated when the train was delayed again.",explanation:"Use the -ed adjective ('frustrated') for how a person feels; -ing adjective for what causes the feeling."},
    {type:"true_false",question:"'Anxious' and 'eager' are synonyms with the same meaning.",answer:"False",explanation:"'Anxious' means worried or nervous. 'Eager' means excited and enthusiastic. They have opposite connotations."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He was very embarrass when he forgot his colleague's name in front of everyone.",errorWord:"embarrass",answer:"embarrassed",explanation:"Use the adjective 'embarrassed' after 'was': 'was embarrassed'."},
    {type:"type_answer",question:"Complete: She ___ (feel) much more confident after practising the presentation several times.",answer:"felt",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: It's normal to feel ___ (overwhelm) when you start a new job.",answer:"overwhelmed",explanation:"Use the adjective 'overwhelmed' after 'feel'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","felt","very","relieved"],answer:"she felt very relieved",explanation:"Subject + adjective + infinitive + object."},
    {type:"story_builder",question:"Order these sentences about overcoming nerves:",sentences:["Then, she rehearsed carefully and took deep breaths.","First, Sophie felt terrified about presenting to the whole team.","Finally, the presentation went well and her manager praised her."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Feel nervous → prepare carefully → perform well."},
    {type:"fill_idiom",question:"Complete: When she heard the good news, she was over the ___.",answer:"moon",options:["moon","stars","top","world"],hint:"extremely happy",explanation:"'Over the moon' means extremely happy and excited."},
    {type:"word_match",question:"Match emotion words with their meanings:",pairs:[{word:"anxious",meaning:"feeling worried about something uncertain"},{word:"content",meaning:"feeling satisfied and at ease"},{word:"overwhelmed",meaning:"having too much to cope with"},{word:"relieved",meaning:"feeling glad that a worry or problem has ended"}],answer:"match_all_correct",explanation:"Key vocabulary for describing emotions and feelings."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He was delighted when he received the job offer.","She felt nervous about meeting her partner's family.","They was disappointed when the event was cancelled.","I felt a great sense of relief after finishing the project."],answer:"They was disappointed when the event was cancelled.",explanation:"'They' takes 'were': 'They were disappointed when the event was cancelled.'"},
    {type:"true_false",question:"'Furious' means slightly annoyed.",answer:"False",explanation:"'Furious' means extremely angry — it is a much stronger word than 'annoyed' or 'irritated'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"After hearing the news, she bursted into tears and couldn't stop crying.",errorWord:"bursted",answer:"burst",explanation:"'Burst' is an irregular verb. Its past tense is also 'burst', not 'bursted'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","seemed","nervous","about","the","interview"],answer:"he seemed nervous about the interview",explanation:"Subject + linking verb + adjective + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about dealing with disappointment:",sentences:["Then, he took some time to reflect and decided to try again.","First, James felt devastated when he was not given the promotion.","Finally, six months later, he was offered an even better position."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Feel devastated → reflect and regroup → achieve a better outcome."},
    {type:"fill_idiom",question:"Complete: After the stressful exam week, she really needed to let off ___.",answer:"steam",options:["steam","stress","energy","pressure"],hint:"release built-up frustration",explanation:"'Let off steam' means to release pent-up stress, energy, or anger in a harmless way."},
    {type:"word_match",question:"Match emotion words with their meanings:",pairs:[{word:"furious",meaning:"extremely angry"},{word:"melancholy",meaning:"a feeling of thoughtful, gentle sadness"},{word:"elated",meaning:"very happy and excited"},{word:"apprehensive",meaning:"slightly worried or nervous about something in the future"}],answer:"match_all_correct",explanation:"Vocabulary for describing a range of emotions with precision."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She was thrilled to hear that she had passed her exams.","He felt embarrassed when he spilt coffee on his shirt.","They were very exciting about the surprise party.","I was moved by the beautiful speech at the wedding."],answer:"They were very exciting about the surprise party.",explanation:"Use the -ed adjective for how people feel: 'They were very excited about the surprise party.' 'Exciting' describes the thing that causes the feeling."},
  ]},
  "language_communication": {
    label: "Language & Communication",
    intro: {
      sections: [
        {
          heading: "Reported Speech",
          form: "said (that) + past tense / asked + if/whether + statement order",
          examples: [
            "Direct: \"I am learning Spanish.\" → Reported: She said she was learning Spanish.",
            "Direct: \"Do you speak French?\" → Reported: He asked if I spoke French.",
            "Direct: \"Where do you live?\" → Reported: She asked where I lived."
          ],
          use: "When reporting what someone said, shift the verb tense back one step (present → past, past → past perfect). Never use question word order in reported questions."
        },
        {
          heading: "Indirect Questions",
          form: "ask/wonder/know + if/whether/wh-word + subject + verb",
          examples: [
            "Could you tell me where the station is? (NOT: where is the station?)",
            "I'd like to know whether she is coming.",
            "Do you know what time it starts?"
          ],
          use: "Use statement word order (no inversion) after question phrases like 'Can you tell me...', 'I wonder...', 'Do you know...'. Use 'if/whether' for yes/no questions."
        }
      ],
      tip: "In indirect questions, the verb does NOT invert: 'Could you tell me where the bank is?' — NOT 'where is the bank?'"
    },
    questions: [
    {type:"multiple_choice",question:"Which sentence uses reported speech correctly?",options:["She said that she is learning Spanish.","She said that she was learning Spanish.","She said that she were learning Spanish."],answer:"She said that she was learning Spanish.",explanation:"In reported speech, present continuous ('is learning') shifts back to past continuous ('was learning')."},
    {type:"multiple_choice",question:"What does 'body language' refer to?",options:["The specific vocabulary used in sport.","The way people communicate through physical movements and gestures.","A type of sign language."],answer:"The way people communicate through physical movements and gestures.",explanation:"Body language includes facial expressions, posture, gestures, and eye contact."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["He asked me where did I come from.","He asked me where I came from.","He asked me where I come from."],answer:"He asked me where I came from.",explanation:"In indirect questions, use statement word order (no inversion): 'where I came from'."},
    {type:"true_false",question:"'Fluent' means being able to speak a language perfectly without making any mistakes.",answer:"False",explanation:"'Fluent' means speaking naturally, smoothly, and confidently. Even fluent speakers make occasional errors."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"Could you speak more fastly? I can't quite hear you.",errorWord:"fastly",answer:"fast",explanation:"'Fast' is both an adjective and an adverb. 'Fastly' does not exist in English."},
    {type:"type_answer",question:"Complete: He ___ (ask) me if I had ever lived abroad.",answer:"asked",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: The more you practise speaking, the more ___ (confident) you will become.",answer:"confident",explanation:"'The more... the more...' is a comparative structure using adjectives."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["practise","speaking","every","day"],answer:"practise speaking every day",explanation:"Gerund phrase as subject + verb + object."},
    {type:"story_builder",question:"Order these sentences about learning a new language:",sentences:["Then, he downloaded an app and practised every day.","First, Ben decided to learn Japanese after watching a documentary.","Finally, a year later, he had his first full conversation."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Make a decision → practise daily → speak the language."},
    {type:"fill_idiom",question:"Complete: She was so shocked by the news that she was at a loss for ___.",answer:"words",options:["words","answers","ideas","thoughts"],hint:"unable to speak because of shock or emotion",explanation:"'At a loss for words' means so overwhelmed that you cannot speak or respond."},
    {type:"word_match",question:"Match communication words with their meanings:",pairs:[{word:"bilingual",meaning:"able to speak two languages fluently"},{word:"idiom",meaning:"a phrase whose meaning differs from the individual words"},{word:"accent",meaning:"the way a person pronounces words from their region"},{word:"eloquent",meaning:"expressing ideas clearly and effectively"}],answer:"match_all_correct",explanation:"Key vocabulary for language and communication."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She speaks three languages fluently.","He explained the rules clearly to the new students.","They communicated very effectively during the meeting.","She asked him where did he learn his English."],answer:"She asked him where did he learn his English.",explanation:"Indirect questions use statement word order: 'where he learned his English'."},
    {type:"true_false",question:"'I am agree with your point' is a grammatically correct English sentence.",answer:"False",explanation:"'Agree' is a verb, not an adjective. The correct form is 'I agree with your point' — no auxiliary 'am' needed."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He said me that the meeting had been rescheduled for the following week.",errorWord:"said",answer:"told",explanation:"'Say' cannot take an indirect object directly. Use 'tell': 'He told me that the meeting had been rescheduled.'"},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["could","you","speak","more","slowly"],answer:"could you speak more slowly",explanation:"Polite request: modal + subject + verb + comparative adverb phrase. No inversion for indirect questions."},
    {type:"story_builder",question:"Order these sentences about a communication mix-up:",sentences:["Then, he realised she had said 'sheet' not 'seat'.","First, Tom could not understand what his colleague meant at the meeting.","Finally, they both laughed about the misunderstanding for weeks afterwards."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Confusion → realisation → humorous resolution."},
    {type:"fill_idiom",question:"Complete: She knew exactly what to say, but the words were on the tip of her ___.",answer:"tongue",options:["tongue","lips","mind","teeth"],hint:"almost able to recall something but not quite",explanation:"'On the tip of your tongue' means a word or name you almost remember but cannot immediately say."},
    {type:"word_match",question:"Match communication words with their meanings:",pairs:[{word:"paraphrase",meaning:"to restate something in different words"},{word:"ambiguous",meaning:"having more than one possible meaning"},{word:"intonation",meaning:"the rise and fall of pitch when speaking"},{word:"fluent",meaning:"able to speak a language easily and accurately"}],answer:"match_all_correct",explanation:"Key vocabulary for language and communication."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She speaks three languages fluently.","He asked whether the library was open on Sundays.","We need to clarify a few things before we proceed.","They discussed about the new company strategy."],answer:"They discussed about the new company strategy.",explanation:"'Discuss' is a transitive verb and does not take 'about': 'They discussed the new company strategy.'"},
  ]},
  "news_current_affairs": { label: "News & Current Affairs", questions: [
    {type:"multiple_choice",question:"Which sentence uses the passive correctly?",options:["The new law was announce yesterday by the government.","The new law was announced yesterday by the government.","The new law announced yesterday by the government."],answer:"The new law was announced yesterday by the government.",explanation:"Passive past simple: 'was + past participle'."},
    {type:"multiple_choice",question:"What does 'breaking news' mean?",options:["Old news that has been updated.","News that is currently happening and being reported for the first time.","News about accidents and disasters only."],answer:"News that is currently happening and being reported for the first time.",explanation:"'Breaking news' refers to a major developing story being reported live."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The journalist, who reports from the conflict zone, is very brave.","The journalist, that reports from the conflict zone, is very brave.","The journalist who reports from the conflict zone, is very brave."],answer:"The journalist, who reports from the conflict zone, is very brave.",explanation:"'Who' is used for people. Commas indicate a non-defining relative clause providing extra information."},
    {type:"true_false",question:"A 'tabloid' newspaper is the same as a 'broadsheet' in terms of content and style.",answer:"False",explanation:"Tabloids are typically smaller and more sensational. Broadsheets are larger and cover serious news like politics and economics."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"According to recent reports, unemployment have fallen for the third month in a row.",errorWord:"have",answer:"has",explanation:"'Unemployment' is uncountable and singular: 'unemployment has fallen'."},
    {type:"type_answer",question:"Complete: The story ___ (report) by hundreds of news outlets around the world.",answer:"was reported",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Journalists are expected ___ (check) their facts before publishing a story.",answer:"to check",explanation:"'Expected + to + infinitive' is the correct structure."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","news","was","very","surprising"],answer:"the news was very surprising",explanation:"Subject + passive verb + time adverb."},
    {type:"story_builder",question:"Order these sentences about a journalist's big story:",sentences:["Then, she spent three months gathering evidence.","First, Elena received a tip about fraud at a large company.","Finally, she published the story and it won a national award."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Receive the tip → gather evidence → publish and win."},
    {type:"fill_idiom",question:"Complete: The politician tried to avoid the question — he was clearly beating around the ___.",answer:"bush",options:["bush","point","issue","subject"],hint:"avoiding the main point",explanation:"'Beat around the bush' means to avoid getting to the main point of a topic."},
    {type:"word_match",question:"Match journalism words with their meanings:",pairs:[{word:"editorial",meaning:"an article expressing the newspaper's opinion"},{word:"correspondent",meaning:"a journalist reporting from a specific region"},{word:"bias",meaning:"favouring one side unfairly in reporting"},{word:"headline",meaning:"the title of a news article in large print"}],answer:"match_all_correct",explanation:"Key journalism and media vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The report highlighted serious issues in the healthcare system.","Journalists must always protect their sources.","She has been covering international news for fifteen years.","The new policy were announced during a press conference."],answer:"The new policy were announced during a press conference.",explanation:"'Policy' is singular: 'The new policy was announced during a press conference.'"},
  ]},
  "hobbies_free_time": { label: "Hobbies & Free Time", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'have been to' correctly?",options:["I have been to that pottery class before — it's great!","I have been at that pottery class before — it's great!","I have been in that pottery class before — it's great!"],answer:"I have been to that pottery class before — it's great!",explanation:"'Have been to' means you visited a place and came back."},
    {type:"multiple_choice",question:"What does 'take up a hobby' mean?",options:["To give up an activity you no longer enjoy.","To start doing a new activity for pleasure.","To become a professional in a sport."],answer:"To start doing a new activity for pleasure.",explanation:"'Take up a hobby' means to begin doing a new leisure activity."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been painting watercolours since two years.","She's been painting watercolours for two years.","She paints watercolours since two years."],answer:"She's been painting watercolours for two years.",explanation:"Present perfect continuous + 'for' for duration of an ongoing activity."},
    {type:"true_false",question:"'DIY' stands for 'Design It Yourself' and refers to professional building work.",answer:"False",explanation:"'DIY' stands for 'Do It Yourself' — making, building, or repairing things yourself."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He finds gardening very relax, especially at the weekends.",errorWord:"relax",answer:"relaxing",explanation:"After 'find something +', use the adjective: 'finds gardening very relaxing'."},
    {type:"type_answer",question:"Complete: Since retiring, she ___ (take up) painting and is now selling her work online.",answer:"has taken up",explanation:"Present perfect for a recent change with current relevance."},
    {type:"type_answer",question:"Complete: He ___ (spend) every Saturday morning at the local chess club for years.",answer:"has been spending",explanation:"Present perfect continuous for an ongoing habit."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","loves","taking","photographs"],answer:"she loves taking photographs",explanation:"Subject + verb + object + time phrase."},
    {type:"story_builder",question:"Order these sentences about discovering a new hobby:",sentences:["Then, he was so pleased that he bought his own camera.","First, Mark borrowed his friend's camera to take some photos.","Finally, six months later, he entered his first competition."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Borrow a camera → love the results → buy your own."},
    {type:"fill_idiom",question:"Complete: She loved painting so much that she put her heart and ___ into every piece.",answer:"soul",options:["soul","mind","body","spirit"],hint:"with complete effort and dedication",explanation:"'Put your heart and soul into something' means to do it with complete effort and passion."},
    {type:"word_match",question:"Match leisure words with their meanings:",pairs:[{word:"pastime",meaning:"an activity done for enjoyment in free time"},{word:"voluntary",meaning:"done by choice, without being paid"},{word:"keen",meaning:"very interested or enthusiastic"},{word:"leisure",meaning:"free time when you are not working"}],answer:"match_all_correct",explanation:"Key vocabulary for hobbies and free time."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been collecting stamps since she was a child.","He joined a local hiking club last spring.","They spends their weekends renovating old furniture.","She finds cooking very therapeutic after a long day at work."],answer:"They spends their weekends renovating old furniture.",explanation:"'They' takes 'spend' without 's': 'They spend their weekends...'"},
    {type:"true_false",question:"'I am interesting in photography' is a correct English sentence.",answer:"False",explanation:"Use the past participle for personal feelings: 'I am interested in photography.' 'Interesting' describes the thing, not the person."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She has been doing yoga since three years and feels much better for it.",errorWord:"since",answer:"for",explanation:"Use 'for' with a period of time ('three years'). 'Since' is used with a specific point in time."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","took","up","painting","recently"],answer:"he took up painting recently",explanation:"Subject + phrasal verb (took up) + gerund object + time adverb."},
    {type:"story_builder",question:"Order these sentences about discovering a new hobby:",sentences:["Then, she signed up for a beginner's pottery class at the local centre.","First, Sofia was looking for something creative to do in her spare time.","Finally, she became so passionate that she set up a small studio at home."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Look for a hobby → join a class → become passionate."},
    {type:"fill_idiom",question:"Complete: He's been playing chess for years — he could do it with his eyes ___.",answer:"closed",options:["closed","open","shut","wide"],hint:"able to do something very easily from long practice",explanation:"'Do something with your eyes closed' means to do it so well it requires almost no effort."},
    {type:"word_match",question:"Match hobby-related words with their meanings:",pairs:[{word:"dedication",meaning:"committed effort and time given to an activity"},{word:"enthusiast",meaning:"a person who is very keen on a particular activity"},{word:"novice",meaning:"a person new to a skill or activity"},{word:"craftsmanship",meaning:"skill in making things by hand"}],answer:"match_all_correct",explanation:"Key vocabulary for hobbies and free time."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She enjoys hiking in the mountains at weekends.","He has been collecting stamps since he was a child.","They went cycling yesterday despite the rain.","We are very interesting in joining the book club."],answer:"We are very interesting in joining the book club.",explanation:"Use the past participle for personal feelings: 'We are very interested in joining the book club.'"},
  ]},
  "nature_animals": { label: "Nature & Animals", questions: [
    {type:"multiple_choice",question:"Which sentence uses the present perfect correctly?",options:["Many species of animals has become extinct in recent years.","Many species of animals have become extinct in recent years.","Many species of animals became extinct in recent years."],answer:"Many species of animals have become extinct in recent years.",explanation:"'Many species' is plural, so use 'have'. Present perfect with 'in recent years' for a current trend."},
    {type:"multiple_choice",question:"What is 'migration' in the animal world?",options:["The process by which animals change colour in winter.","The seasonal movement of animals from one region to another.","The way animals communicate with each other."],answer:"The seasonal movement of animals from one region to another.",explanation:"Migration is the regular seasonal travel between habitats in response to seasons."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Wolves live in packs and are highly social animals.","Wolves lives in packs and are highly social animals.","Wolves living in packs and are highly social animals."],answer:"Wolves live in packs and are highly social animals.",explanation:"Present simple for general facts. 'Wolves' is plural — no 's' on the verb."},
    {type:"true_false",question:"Dolphins are classified as fish because they live in the sea.",answer:"False",explanation:"Dolphins are mammals. They breathe air, give birth to live young, and feed them milk."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The forest is home to a wide range of wildlife, include many rare birds.",errorWord:"include",answer:"including",explanation:"'Including' is a preposition used to introduce examples: 'including many rare birds'."},
    {type:"type_answer",question:"Complete: The whale ___ (spot) by researchers just three miles off the coast.",answer:"was spotted",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: If we ___ (not protect) natural habitats, many species will disappear.",answer:"don't protect",explanation:"First conditional: 'if + present simple negative, will + infinitive'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["many","animals","are","endangered"],answer:"many animals are endangered",explanation:"Subject + verb + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about a wildlife encounter:",sentences:["Then, she saw a large deer just fifteen metres away.","First, Clara was hiking when she suddenly stopped.","Finally, she stood still and watched it for five minutes."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Hiking → spot the deer → watch in silence."},
    {type:"fill_idiom",question:"Complete: He's been working non-stop — he's been burning the midnight ___.",answer:"oil",options:["oil","candle","light","lamp"],hint:"working very late into the night",explanation:"'Burn the midnight oil' means to work or study very late into the night."},
    {type:"word_match",question:"Match nature words with their meanings:",pairs:[{word:"habitat",meaning:"the natural environment where an animal lives"},{word:"predator",meaning:"an animal that hunts other animals for food"},{word:"hibernate",meaning:"to spend winter in a sleeping state"},{word:"endangered",meaning:"at risk of becoming extinct"}],answer:"match_all_correct",explanation:"Key nature and animal vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The river otters have returned to this area after many years.","Scientists are monitoring the bear population closely.","The conservation project have helped several species recover.","She photographed a rare butterfly in the meadow."],answer:"The conservation project have helped several species recover.",explanation:"'Project' is singular: 'The conservation project has helped several species recover.'"},
  ]},
  "jobs_interviews": { label: "Jobs & Interviews", questions: [
    {type:"multiple_choice",question:"Which phrase correctly completes a job interview answer?",options:["I am interest in this role because I enjoy working in teams.","I am interested in this role because I enjoy working in teams.","I have interest in this role because I enjoy working in teams."],answer:"I am interested in this role because I enjoy working in teams.",explanation:"'Interested in' is the correct adjective. 'Interesting' describes the thing that causes interest."},
    {type:"multiple_choice",question:"What does 'CV' stand for?",options:["Career Vision","Curriculum Vitae","Certified Vocation"],answer:"Curriculum Vitae",explanation:"CV stands for 'Curriculum Vitae', a Latin phrase meaning 'course of life'."},
    {type:"multiple_choice",question:"Choose the correct interview question:",options:["What your main responsibilities would be in this role?","What would be your main responsibilities in this role?","What would your main responsibilities be in this role?"],answer:"What would your main responsibilities be in this role?",explanation:"Direct questions use subject-auxiliary inversion: 'What would [subject] be?'"},
    {type:"true_false",question:"A 'probation period' at a new job means you are being investigated by the police.",answer:"False",explanation:"A probation period is a trial period during which both employer and employee assess whether the role is a good fit."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She is very experience in project management and has led several large teams.",errorWord:"experience",answer:"experienced",explanation:"After 'is' or 'very', use the adjective 'experienced', not the noun 'experience'."},
    {type:"type_answer",question:"Complete: He ___ (work) in sales for eight years before moving into management.",answer:"had worked",explanation:"Past perfect for an action completed before another past action."},
    {type:"type_answer",question:"Complete: Could you tell me a little about ___ (you) experience in this field?",answer:"your",explanation:"Possessive adjective 'your' is needed before a noun."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","got","the","job","offer"],answer:"she got the job offer",explanation:"Subject + verb + object + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about getting a promotion:",sentences:["Then, she consistently delivered excellent results for three years.","First, Sarah started working as a junior analyst.","Finally, her manager offered her a promotion to team leader."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Start the job → work hard → earn a promotion."},
    {type:"fill_idiom",question:"Complete: She's brilliant at her job — she really knows the tricks of the ___.",answer:"trade",options:["trade","job","game","business"],hint:"the practical skills used in a particular job",explanation:"'The tricks of the trade' refers to the practical skills and clever methods used in a particular job."},
    {type:"word_match",question:"Match workplace words with their meanings:",pairs:[{word:"probation",meaning:"a trial period in a new job"},{word:"redundant",meaning:"losing a job because the role is no longer needed"},{word:"referee",meaning:"a person who provides a job reference"},{word:"benefits",meaning:"non-salary perks given by an employer"}],answer:"match_all_correct",explanation:"Key vocabulary for jobs and interviews."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She was offered the job after her second interview.","He has been working for the same company for twelve years.","They was impressed by her presentation skills.","The company provides excellent benefits and flexible working hours."],answer:"They was impressed by her presentation skills.",explanation:"'They' takes 'were': 'They were impressed by her presentation skills.'"},
    {type:"true_false",question:"'What is your current salary expectation?' is an appropriate question for a candidate to open with at the very start of a job interview.",answer:"False",explanation:"It is generally considered inappropriate to ask about salary at the very start of an interview. This is typically discussed later, often raised by the interviewer."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She is very experience in project management and has led several successful teams.",errorWord:"experience",answer:"experienced",explanation:"After 'is/very', use the adjective 'experienced', not the noun 'experience'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","got","the","job","offer"],answer:"she got the job offer",explanation:"Subject + past simple + object. 'Get the job offer' is a standard professional collocation."},
    {type:"story_builder",question:"Order these sentences about a job interview:",sentences:["Then, the interviewer asked about her strengths and management experience.","First, Priya arrived fifteen minutes early and introduced herself at reception.","Finally, she received a call the next day offering her the position."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Arrive early and make a good impression → answer interview questions → receive the offer."},
    {type:"fill_idiom",question:"Complete: He was nervous at first but then hit his ___ and answered every question confidently.",answer:"stride",options:["stride","pace","step","run"],hint:"finding your rhythm and performing well",explanation:"'Hit your stride' means to reach a point where you are performing confidently and effectively."},
    {type:"word_match",question:"Match job-search words with their meanings:",pairs:[{word:"shortlisted",meaning:"selected as one of the final candidates for a role"},{word:"probation",meaning:"a trial period at the start of a new job"},{word:"referee",meaning:"a person who provides a professional reference"},{word:"redundancy",meaning:"losing a job because the role is no longer needed"}],answer:"match_all_correct",explanation:"Key vocabulary for job applications and interviews."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She answered every question confidently and clearly.","The panel was impressed by his presentation skills.","They offered her the position at the end of the interview.","He has applied for the same role two years ago."],answer:"He has applied for the same role two years ago.",explanation:"'Two years ago' refers to a finished past time. Use past simple: 'He applied for the same role two years ago.'"},
  ]},
  "past_memories": {
    label: "Past & Memories",
    intro: {
      sections: [
        {
          heading: "Past Perfect",
          form: "had + past participle",
          examples: [
            "She had never seen the sea before she visited Brighton.",
            "By the time he retired, he had worked there for 35 years.",
            "I recognised her because we had met once before."
          ],
          use: "For an action completed before another past action. Use it to show which event happened first. Key words: before, by the time, already, never, after."
        },
        {
          heading: "Would — Past Habits",
          form: "would + bare infinitive",
          examples: [
            "When I was young, I would play outside until dark.",
            "Every summer, we would visit my grandmother in the countryside.",
            "He would always bring flowers when he came to visit."
          ],
          use: "For repeated actions or habits in the past (not states). Similar to 'used to' but more formal and nostalgic. Cannot be used for past states: say 'I used to live there' — not 'I would live there'."
        }
      ],
      tip: "'Would play' = repeated past action. 'Past perfect' = which event came first. They often appear together in storytelling."
    },
    questions: [
    {type:"multiple_choice",question:"Which sentence uses the past perfect correctly?",options:["She had never seen the sea before she visited Brighton.","She never saw the sea before she had visited Brighton.","She has never seen the sea before she visited Brighton."],answer:"She had never seen the sea before she visited Brighton.",explanation:"Past perfect ('had seen') for an action before another past action ('visited')."},
    {type:"multiple_choice",question:"What does 'reminisce' mean?",options:["To make plans for the future.","To forget important past events.","To talk or think about pleasant memories from the past."],answer:"To talk or think about pleasant memories from the past.",explanation:"'Reminisce' means to remember and talk about pleasant past experiences."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["When I was a child, I would play in the street until dark.","When I was a child, I will play in the street until dark.","When I was a child, I used to playing in the street until dark."],answer:"When I was a child, I would play in the street until dark.",explanation:"'Would + bare infinitive' describes repeated past habits, similar to 'used to'."},
    {type:"true_false",question:"'Once upon a time' is a typical phrase used to end a traditional story.",answer:"False",explanation:"'Once upon a time' is used to begin a story. Stories typically end with 'they lived happily ever after' or similar."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She remembered her first day at school very clear — it felt like yesterday.",errorWord:"clear",answer:"clearly",explanation:"An adverb is needed to modify the verb 'remembered': 'very clearly'."},
    {type:"type_answer",question:"Complete: By the time he retired, he ___ (work) for the same company for 35 years.",answer:"had worked",explanation:"Past perfect for an action completed before another past event."},
    {type:"type_answer",question:"Complete: We ___ (use to) spend every summer holiday at my grandmother's house.",answer:"used to",explanation:"'Used to + bare infinitive' for past habits that no longer happen."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","found","some","old","photos"],answer:"she found some old photos",explanation:"Main clause + while + gerund clause."},
    {type:"story_builder",question:"Order these sentences about returning to your hometown:",sentences:["Then, she walked down streets she had played on as a child.","First, Helen returned to her hometown after fifteen years abroad.","Finally, she met old friends for coffee and caught up."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Return home → revisit old places → catch up with friends."},
    {type:"fill_idiom",question:"Complete: Looking at those old photos really brought back a ___ of memories.",answer:"flood",options:["flood","rush","wave","stream"],hint:"a sudden strong rush of memories",explanation:"'A flood of memories' means a sudden and overwhelming rush of recollections."},
    {type:"word_match",question:"Match memory words with their meanings:",pairs:[{word:"nostalgia",meaning:"a sentimental longing for the past"},{word:"memoir",meaning:"a written account of personal memories"},{word:"decade",meaning:"a period of ten years"},{word:"heirloom",meaning:"an object passed down through generations"}],answer:"match_all_correct",explanation:"Key vocabulary for talking about the past and memories."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She kept all her old letters in a box under the bed.","He remembered the day his daughter was born as if it were yesterday.","They has been sharing stories about the old days all evening.","The photographs brought back many happy memories."],answer:"They has been sharing stories about the old days all evening.",explanation:"'They' takes 'have': 'They have been sharing stories about the old days.'"},
    {type:"true_false",question:"'We used to going to the seaside every August' is a grammatically correct English sentence.",answer:"False",explanation:"'Used to' is followed by the bare infinitive, not the gerund: 'We used to go to the seaside every August.'"},
    {type:"error_spotter",question:"Find the mistake:",sentence:"When I was young, we would always spending summers at my grandparents' farm.",errorWord:"spending",answer:"spend",explanation:"'Would + bare infinitive' describes repeated past habits: 'we would always spend'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["those","were","happy","times"],answer:"those were happy times",explanation:"Demonstrative pronoun + past simple + adjective + noun. A reflective statement about the past."},
    {type:"story_builder",question:"Order these sentences about a childhood memory:",sentences:["Then, we climbed the old oak tree and could see for miles.","First, my brother and I used to walk to the park every Saturday morning.","Finally, we always stopped for ice cream on the way home."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Regular walks to the park → climbing the tree → ice cream on the way home."},
    {type:"fill_idiom",question:"Complete: The old argument is ___ under the bridge — we've forgiven each other.",answer:"water",options:["water","blood","rain","mud"],hint:"something that happened in the past and can no longer be changed",explanation:"'Water under the bridge' means something that happened in the past and is no longer worth worrying about."},
    {type:"word_match",question:"Match memory-related words with their meanings:",pairs:[{word:"anecdote",meaning:"a short, amusing story about a real event"},{word:"flashback",meaning:"a sudden vivid memory of a past event"},{word:"bittersweet",meaning:"producing a mix of happiness and sadness"},{word:"keepsake",meaning:"an object kept as a reminder of a person or event"}],answer:"match_all_correct",explanation:"Key vocabulary for talking about memories and the past."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She used to walk to school when she was little.","He would often cook Sunday lunch for the whole family.","They didn't use to have a television when they were children.","We were use to going to church every Sunday morning."],answer:"We were use to going to church every Sunday morning.",explanation:"The correct form is 'were used to going' — 'used' must be the past participle in the adjective phrase 'used to'."},
  ]},
  "verb_tenses": {
    label: "Verb Tenses & Habits",
    intro: {
      sections: [
        {
          heading: "Simple Present",
          form: "verb (+ -s/-es for he/she/it)",
          examples: [
            "She goes to the gym every morning.",
            "They don't work on Sundays.",
            "Does he speak French?"
          ],
          use: "For habits, routines, and facts. Key words: always, usually, often, never, every day."
        },
        {
          heading: "Simple Past",
          form: "verb + -ed  (or irregular form)",
          examples: [
            "I visited Rome last summer.",
            "He didn't go to school yesterday.",
            "Where did you grow up?"
          ],
          use: "For completed actions in the past. Key words: yesterday, last week, in 2010, ago."
        },
        {
          heading: "Used to / Didn't use to",
          form: "used to + bare infinitive",
          examples: [
            "He used to swim every morning before work.",
            "She didn't use to like spicy food.",
            "Did you use to play football as a child?"
          ],
          use: "For past habits or states that no longer exist. Cannot be used for single past events."
        },
        {
          heading: "Getting used to",
          form: "get/be used to + noun or verb-ing",
          examples: [
            "She is getting used to driving on the left.",
            "I'm not used to waking up so early.",
            "He got used to the noise after a few weeks."
          ],
          use: "For becoming (or being) accustomed to something new or different. Always followed by -ing or a noun — NOT the bare infinitive."
        }
      ],
      tip: "'Used to swim' = past habit, no longer true.  'Getting used to swimming' = becoming accustomed to it (different meaning!)."
    },
    questions: [
    {type:"multiple_choice",question:"Choose the correct sentence about a daily habit.",options:["She go to the gym every morning.","She goes to the gym every morning.","She gone to the gym every morning."],answer:"She goes to the gym every morning.",explanation:"Present simple: add -s/-es for third person singular (he/she/it)."},
    {type:"multiple_choice",question:"Choose the correct sentence about a past habit.",options:["He used to cycling to work.","He used to cycle to work.","He uses to cycle to work."],answer:"He used to cycle to work.",explanation:"'Used to + bare infinitive' describes a past habit or state that no longer exists."},
    {type:"multiple_choice",question:"Choose the correct sentence about adjusting to something new.",options:["She is getting used to drive to work.","She is getting used to driving to work.","She is getting used to drove to work."],answer:"She is getting used to driving to work.",explanation:"'Get used to' is followed by a noun or -ing form, not the bare infinitive."},
    {type:"true_false",question:"'I used to live in Paris' means I still live there now.",answer:"False",explanation:"'Used to' describes a past state or habit that no longer exists. It implies the situation has changed."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He didn't went to school yesterday.",errorWord:"went",answer:"go",explanation:"After 'did/didn't', always use the bare infinitive: 'didn't go'."},
    {type:"type_answer",question:"Complete: When he moved abroad, he had to get used to ___ (drive) on the right.",answer:"driving",explanation:"'Get used to' + -ing form. The -ing form (gerund) always follows 'used to' when it means 'be accustomed to'."},
    {type:"type_answer",question:"Complete: She ___ (study) for three hours last night.",answer:"studied",explanation:"Past simple of 'study': drop -y, add -ied."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","used","to","cycle"],answer:"she used to cycle",explanation:"Subject + used to + bare infinitive for a past habit."},
    {type:"story_builder",question:"Order these sentences about starting a new job:",sentences:["Then, he slowly got used to the early starts.","First, Tom started a new job and found it very tiring.","Finally, he felt confident and began to enjoy his work."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Start new job → adjust → feel confident."},
    {type:"fill_idiom",question:"Complete: He works so hard that he often ___ the midnight oil.",answer:"burns",options:["burns","lights","uses","keeps"],hint:"works very late into the night",explanation:"'Burn the midnight oil' means to work or study very late at night."},
    {type:"word_match",question:"Match each phrase to its meaning:",pairs:[{word:"used to",meaning:"past habit that no longer continues"},{word:"be used to",meaning:"be accustomed to something"},{word:"get used to",meaning:"become accustomed to something"},{word:"didn't use to",meaning:"something that was not done in the past"}],answer:"match_all_correct",explanation:"These three phrases look similar but describe different relationships with habit and familiarity."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She didn't eat dinner last night.","They used to going to the beach every summer.","He is getting used to the new schedule.","I usually drink coffee in the morning."],answer:"They used to going to the beach every summer.",explanation:"'Used to' takes the bare infinitive: 'used to go'. Only 'get/be used to' takes the -ing form."},
    {type:"true_false",question:"'I am getting used to wake up early' is a grammatically correct English sentence.",answer:"False",explanation:"'Get used to' must be followed by a gerund: 'I am getting used to waking up early.'"},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She use to play the piano as a child, but gave it up when she started secondary school.",errorWord:"use",answer:"used",explanation:"In affirmative sentences, the correct form is 'used to' — the -d is required."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","usually","walks","to","work"],answer:"he usually walks to work",explanation:"Subject + frequency adverb + present simple verb + prepositional phrase. Frequency adverbs come before the main verb."},
    {type:"story_builder",question:"Order these sentences about adjusting to a new routine:",sentences:["Then, she struggled with the early starts for the first few weeks.","First, Yuki started a new job that required her to begin work at 7 a.m.","Finally, she got used to waking up early and even began to enjoy the mornings."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"New schedule → struggle to adapt → fully adjusted and happy."},
    {type:"fill_idiom",question:"Complete: Old habits die ___, and he still checks his phone first thing every morning.",answer:"hard",options:["hard","slow","long","fast"],hint:"habits are very difficult to change",explanation:"'Old habits die hard' means it is very difficult to stop doing things you have done for a long time."},
    {type:"word_match",question:"Match grammar terms with their meanings:",pairs:[{word:"habit",meaning:"something done regularly or repeatedly"},{word:"routine",meaning:"a fixed sequence of actions performed regularly"},{word:"frequency adverb",meaning:"a word describing how often something happens"},{word:"stative verb",meaning:"a verb describing a state rather than an action"}],answer:"match_all_correct",explanation:"Key grammar concepts for verb tenses and habits."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She always drinks coffee before she starts work.","He used to ride his bike to school every day.","They are getting used to living in a colder climate.","We getting used to the new system gradually."],answer:"We getting used to the new system gradually.",explanation:"The auxiliary 'are' is missing: 'We are getting used to the new system gradually.'"},
  ]},
  "present_perfect": {
    label: "Present Perfect & Continuous",
    intro: {
      sections: [
        {
          heading: "Present Perfect",
          form: "have / has + past participle",
          examples: [
            "I have never seen that film.",
            "She has lived here for ten years.",
            "Have you ever tried sushi?"
          ],
          use: "For past experiences, actions with a present result, and with: ever, never, just, already, yet, for, since."
        },
        {
          heading: "Present Perfect Continuous",
          form: "have / has + been + verb-ing",
          examples: [
            "I have been waiting for two hours.",
            "She has been studying all day.",
            "How long have you been learning English?"
          ],
          use: "For actions that started in the past and are still continuing. Emphasises duration — often with: for, since, how long, all day."
        }
      ],
      tip: "'I have read the book' = it is finished (result). 'I have been reading' = focus on the activity or how long it took."
    },
    questions: [
      {type:"multiple_choice",question:"Choose the correct sentence about a past experience.",options:["I have never seen that film.","I never saw that film yet.","I did never see that film."],answer:"I have never seen that film.",explanation:"Use present perfect + 'never' for life experiences: have/has + never + past participle."},
      {type:"multiple_choice",question:"Choose the correct sentence about an ongoing activity.",options:["She is studying for five hours.","She has been studying for five hours.","She has studied for five hours."],answer:"She has been studying for five hours.",explanation:"Present perfect continuous (has been + -ing) emphasises the duration of a still-ongoing activity."},
      {type:"multiple_choice",question:"Which sentence uses the correct tense?",options:["I have visited Paris in 2018.","I visited Paris in 2018.","I am visiting Paris in 2018."],answer:"I visited Paris in 2018.",explanation:"With a specific finished time ('in 2018'), use past simple. Present perfect cannot be used with a specific past date."},
      {type:"true_false",question:"'She has gone to the supermarket' means she is at the supermarket now or on her way.",answer:"True",explanation:"'Has gone to' = she went and is still there. 'Has been to' = she visited and came back."},
      {type:"error_spotter",question:"Find the mistake:",sentence:"She has went to the shop to get some milk.",errorWord:"went",answer:"gone",explanation:"Present perfect uses the past participle: 'has gone'. 'Went' is the past simple form, not the past participle."},
      {type:"type_answer",question:"Complete: How long ___ you been learning English?",answer:"have",explanation:"'How long have you been + -ing?' uses present perfect continuous for an action still in progress."},
      {type:"type_answer",question:"Complete: He has ___ (live) in this city for over ten years.",answer:"lived",explanation:"Present perfect: have/has + past participle. 'Live' is a regular verb — past participle is 'lived'."},
      {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","has","never","tried","sushi"],answer:"she has never tried sushi",explanation:"Present perfect with 'never': subject + have/has + never + past participle."},
      {type:"story_builder",question:"Order these sentences to tell a story:",sentences:["Then, he has been rehearsing every evening since.","First, he has just been offered a role in a local play.","Finally, he has already learnt all his lines and feels ready."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Get offered role → rehearse → learn lines and feel ready."},
      {type:"fill_idiom",question:"Complete: She has really hit her ___ — every performance gets better.",answer:"stride",options:["stride","peak","best","mark"],hint:"performing at your best and most confident",explanation:"'Hit your stride' means to reach the point where you are performing at your best and most confidently."},
      {type:"word_match",question:"Match each time expression to the tense it goes with:",pairs:[{word:"ever / never",meaning:"present perfect"},{word:"in 2010 / last year",meaning:"past simple"},{word:"for / since",meaning:"present perfect or continuous"},{word:"how long",meaning:"present perfect continuous"}],answer:"match_all_correct",explanation:"Time expressions are a key signal for choosing between past simple and present perfect."},
      {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["I have already finished my homework.","She has been waiting since two hours.","He has never tried sushi.","They have just arrived."],answer:"She has been waiting since two hours.",explanation:"Use 'for' with a period of time: 'for two hours'. Use 'since' with a point in time: 'since 2 o'clock'."},
      {type:"true_false",question:"'She has been knowing him for years' is a correct use of the present perfect continuous.",answer:"False",explanation:"'Know' is a stative verb and cannot be used in continuous tenses. The correct form is 'She has known him for years.'"},
      {type:"error_spotter",question:"Find the mistake:",sentence:"I have been waiting here since two hours and nobody has come.",errorWord:"since",answer:"for",explanation:"Use 'for' with a duration ('two hours'). 'Since' is used with a specific point in time such as 'two o'clock'."},
      {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","has","just","finished","her","report"],answer:"she has just finished her report",explanation:"Subject + has + just + past participle + object. 'Just' goes between the auxiliary and the past participle."},
      {type:"story_builder",question:"Order these sentences about a long project:",sentences:["Then, the team met every week and worked through the problems one by one.","First, the engineers had been tasked with designing a new bridge for the city.","Finally, they announced that they had been working on it for over three years."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Receive the task → work weekly → announce the duration of the project."},
      {type:"fill_idiom",question:"Complete: She has been burning the ___ at both ends — working days and studying at night.",answer:"candle",options:["candle","lamp","light","fire"],hint:"exhausting yourself by doing too much",explanation:"'Burn the candle at both ends' means to exhaust yourself by working or staying active for too long."},
      {type:"word_match",question:"Match present perfect concepts with their meanings:",pairs:[{word:"just",meaning:"a very short time ago"},{word:"yet",meaning:"used in questions and negatives to ask if something has happened"},{word:"already",meaning:"earlier than expected or before now"},{word:"ever",meaning:"at any time — used in questions about life experience"}],answer:"match_all_correct",explanation:"Key adverbs used with the present perfect tense."},
      {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["They have been renovating the kitchen for six weeks.","She has already submitted her application.","He has been lived in this city since 2018.","We have just heard the news about the merger."],answer:"He has been lived in this city since 2018.",explanation:"'Live' in a continuous form does not use the past participle: 'He has been living in this city since 2018.'"},
    ]
  },
  "stress_battle": { label: "⚡ Stress Battle", questions: [
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"APPLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TABLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"PENCIL",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"GARDEN",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"WINTER",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SUMMER",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DOCTOR",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TEACHER",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"HAPPY",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SIMPLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"PURPLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CIRCLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"LESSON",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CASTLE",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MUSIC",syllables:2,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CITY",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BODY",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BASIC",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TENNIS",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MARKET",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SUNNY",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"LUCKY",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EARLY",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"RIVER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SISTER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BROTHER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"FATHER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MOTHER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"OPEN",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"UPPER",syllables:2,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"HOTEL",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"POLICE",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TODAY",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ALONE",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BEHIND",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BECOME",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"RETURN",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INVITE",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CORRECT",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BELOW",syllables:2,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"REPEAT",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DEGREE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ADVICE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"REMOVE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ARRIVE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DECIDE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"FORGET",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INCLUDE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MISTAKE",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INSTEAD",syllables:2,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"HOSPITAL",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"BEAUTIFUL",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EXCELLENT",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"PERSONAL",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"NATURAL",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"POPULAR",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"POSSIBLE",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DIFFICULT",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"HISTORY",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MEMORY",syllables:3,stressed:1,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ANIMAL",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DANGEROUS",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DIFFERENT",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ENERGY",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SIMILAR",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TYPICAL",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"NATIONAL",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"PHYSICAL",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"GENERAL",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CENTURY",syllables:3,stressed:1,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TOMORROW",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TOGETHER",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"COMPUTER",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"REMEMBER",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"FANTASTIC",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"APARTMENT",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"UMBRELLA",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DISCOVER",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EXAMPLE",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EXPENSIVE",syllables:3,stressed:2,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EXCITING",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MUSEUM",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"POTATO",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DISASTER",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CONSIDER",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"CONTINUE",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"LOCATION",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DECEMBER",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"NOVEMBER",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"IMPORTANT",syllables:3,stressed:2,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"VOLUNTEER",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"UNDERSTAND",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"AFTERNOON",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ENTERTAIN",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"GUARANTEE",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"ENGINEER",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"RECOMMEND",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"REPRESENT",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INTERRUPT",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INTRODUCE",syllables:3,stressed:3,answer:"A"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"SEVENTEEN",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"MAGAZINE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"TANGERINE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"KANGAROO",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"OVERCOME",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"INTERFERE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"DISAGREE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"JAPANESE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"EMPLOYEE",syllables:3,stressed:3,answer:"B"},
    {type:"stress_battle",question:"Which stress pattern is correct?",word:"REFUGEE",syllables:3,stressed:3,answer:"B"},
  ]},
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;0,900;1,700;1,900&family=JetBrains+Mono:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --ink:#fdf3dd;--paper:#181d3a;--cream:#0f1226;
    --gold:#ffce47;--coral:#ff5c42;--teal:#42dac3;
    --cobalt:#5b8bff;--plum:#c87aff;--green:#7adc5a;--red:#ff5c42;
    --line:rgba(253,243,221,0.14);--ghost:rgba(253,243,221,0.28);--muted-c:rgba(253,243,221,0.5);
  }
  body{background:var(--cream);color:var(--ink);font-family:'DM Sans',sans-serif}
  h1,h2,h3{font-family:'Fraunces',Georgia,serif;font-weight:900}

  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden;background:var(--cream)}
  .hero::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(253,243,221,0.06) 1px,transparent 1px);background-size:14px 14px}
  .hero-title{font-family:'Fraunces',Georgia,serif;font-size:clamp(2.8rem,9vw,6.5rem);font-weight:900;font-style:italic;letter-spacing:-0.03em;text-align:center;line-height:0.95;position:relative;color:var(--ink)}
  .hero-title span{color:var(--coral)}
  .hero-sub{margin-top:1.2rem;font-size:1rem;opacity:0.55;text-align:center;max-width:400px;line-height:1.7}
  .hero-btns{display:flex;gap:1rem;margin-top:2.5rem;flex-wrap:wrap;justify-content:center}

  .btn{font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:700;padding:0.9rem 1.8rem;border:2px solid var(--ink);cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;background:var(--ink);color:var(--paper);border-radius:14px;box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .btn:active:not(:disabled){transform:translate(2px,2px);box-shadow:2px 2px 0 rgba(0,0,0,0.5);transition-duration:0.06s}
  .btn:disabled{opacity:0.35;cursor:not-allowed}
  .btn-gold{background:var(--gold);color:#0f1226;border-color:var(--gold);box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .btn-gold:hover:not(:disabled){box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .btn-teal{background:var(--teal);color:#0f1226;border-color:var(--teal);box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .btn-teal:hover:not(:disabled){box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .btn-coral{background:var(--coral);color:#fff;border-color:var(--coral);box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .btn-coral:hover:not(:disabled){box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .btn-green{background:var(--green);color:#0f1226;border-color:var(--green);box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .btn-green:hover:not(:disabled){box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .btn-ghost{background:transparent;border-color:var(--ghost);color:var(--muted-c);box-shadow:none}
  .btn-ghost:hover:not(:disabled){border-color:var(--ink);color:var(--ink);box-shadow:3px 3px 0 rgba(0,0,0,0.3);transform:translate(-1px,-1px)}
  .btn-sm{padding:0.45rem 0.9rem;font-size:0.75rem}
  .btn-full{width:100%}

  .panel{min-height:100vh;padding:1.5rem;max-width:860px;margin:0 auto;background:var(--cream)}
  .card{background:var(--paper);border:2px solid var(--line);padding:1.1rem;margin-bottom:0.65rem;border-radius:14px;box-shadow:3px 3px 0 rgba(0,0,0,0.3)}
  .card-gold{border-color:var(--gold);background:rgba(255,206,71,0.1)}

  .label{font-family:'JetBrains Mono',monospace;font-size:0.57rem;letter-spacing:0.14em;text-transform:uppercase;opacity:0.5;margin-bottom:0.3rem;display:block}
  .badge{display:inline-block;padding:0.18rem 0.65rem;font-family:'JetBrains Mono',monospace;font-size:0.54rem;letter-spacing:0.1em;text-transform:uppercase;background:var(--gold);color:#0f1226;border-radius:999px}

  .input{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:1rem;border:2px solid var(--line);background:var(--paper);color:var(--ink);outline:none;transition:border-color 0.15s;border-radius:10px}
  .input:focus{border-color:var(--ink)}
  .input::placeholder{opacity:0.35}
  .input-xl{font-size:2rem;text-align:center;font-family:'Fraunces',serif;letter-spacing:0.15em;font-weight:900}
  .select{width:100%;padding:0.8rem 1rem;font-family:'DM Sans',sans-serif;font-size:0.9rem;border:2px solid var(--line);background:var(--paper);color:var(--ink);outline:none;cursor:pointer;border-radius:10px}

  .code-badge{font-family:'Fraunces',Georgia,serif;font-size:clamp(2.5rem,8vw,4.5rem);font-weight:900;letter-spacing:0.12em;color:#0f1226;text-align:center;padding:1rem 1.5rem;border:3px solid var(--gold);display:inline-block;border-radius:12px;background:var(--gold)}

  .mode-toggle{display:flex;border:2px solid var(--line);overflow:hidden;margin-bottom:1rem;border-radius:12px}
  .mode-btn{flex:1;padding:0.7rem;font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;background:transparent;color:var(--muted-c)}
  .mode-btn.active{background:var(--ink);color:var(--paper)}

  .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.6rem;margin:0.6rem 0}
  .team-card{padding:0.9rem;border:2px solid var(--line);text-align:center;border-radius:12px;background:var(--paper);box-shadow:3px 3px 0 rgba(0,0,0,0.3)}
  .team-card-name{font-family:'Fraunces',serif;font-size:0.85rem;font-weight:700;margin-top:0.35rem;color:var(--ink)}
  .team-card-count{font-size:0.75rem;opacity:0.55;margin-top:0.15rem}
  .team-members{font-size:0.72rem;margin-top:0.4rem;opacity:0.6;line-height:1.7}

  .opt-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;margin-top:0.9rem}
  .opt-btn{padding:1.1rem 1rem;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:600;border:2px solid transparent;cursor:pointer;transition:all 0.13s;text-align:left;display:flex;align-items:flex-start;gap:0.55rem;min-height:76px;line-height:1.45;color:var(--ink);border-radius:14px}
  .opt-btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(0,0,0,0.35)}
  .opt-btn:disabled{cursor:not-allowed}
  .opt-0{background:rgba(255,92,66,0.18);border-color:var(--coral)}
  .opt-1{background:rgba(91,139,255,0.18);border-color:var(--cobalt)}
  .opt-2{background:rgba(122,220,90,0.18);border-color:var(--green)}
  .opt-3{background:rgba(200,122,255,0.18);border-color:var(--plum)}
  .opt-selected{box-shadow:inset 0 0 0 3px rgba(253,243,221,0.35)}
  .opt-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;font-family:'Fraunces',serif;font-size:14px;font-weight:900;color:#fff;flex-shrink:0;line-height:1}
  .opt-0 .opt-icon{background:var(--coral)}
  .opt-1 .opt-icon{background:var(--cobalt)}
  .opt-2 .opt-icon{background:var(--green);color:#0f1226}
  .opt-3 .opt-icon{background:var(--plum)}

  .tiles{display:flex;flex-wrap:wrap;gap:0.4rem;padding:0.65rem;border:2px dashed var(--line);min-height:50px;border-radius:10px}
  .tile{padding:0.38rem 0.85rem;background:var(--gold);color:#0f1226;font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:700;cursor:pointer;transition:all 0.11s;user-select:none;border-radius:8px;border:2px solid rgba(0,0,0,0.2)}
  .tile:hover{transform:translateY(-2px);box-shadow:2px 2px 0 rgba(0,0,0,0.3)}
  .tile.used{background:rgba(253,243,221,0.07);color:rgba(253,243,221,0.25);cursor:default;transform:none;border-color:transparent}
  .tile.placed{background:var(--teal);color:#0f1226;border-color:rgba(0,0,0,0.2)}

  .story-card{padding:0.8rem 1rem;border:2px solid var(--line);margin-bottom:0.4rem;cursor:pointer;transition:all 0.13s;display:flex;align-items:flex-start;gap:0.65rem;font-size:1.05rem;line-height:1.55;border-radius:10px;background:var(--paper)}
  .story-card:hover:not(.placed){border-color:var(--gold);background:rgba(255,206,71,0.08)}
  .story-card.placed{border-color:var(--teal);background:rgba(66,218,195,0.08)}
  .story-num{font-family:'Fraunces',serif;font-size:0.85rem;font-weight:700;color:var(--teal);width:1.4rem;flex-shrink:0;margin-top:0.1rem}

  .match-word{padding:0.65rem 0.9rem;border:2px solid var(--line);font-size:1rem;font-weight:500;cursor:pointer;transition:all 0.13s;text-align:center;margin-bottom:0.4rem;border-radius:10px;background:var(--paper);color:var(--ink)}
  .match-word:hover{border-color:var(--ink)}
  .match-word.selected{border-color:var(--gold);background:rgba(255,206,71,0.1)}
  .match-word.matched-correct{border-color:var(--green);background:rgba(122,220,90,0.12);cursor:default}
  .match-word.matched-wrong{border-color:var(--red);background:rgba(255,92,66,0.12);cursor:default}

  .timer-num{font-family:'Fraunces',Georgia,serif;font-size:3rem;font-weight:900;color:var(--gold);line-height:1}
  .timer-num.urgent{color:var(--coral);animation:timerPulse 0.5s ease-in-out infinite}
  @keyframes timerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
  @keyframes pulse{from{transform:scale(1)}to{transform:scale(1.1)}}
  @keyframes lockIn{0%{transform:scale(1)}35%{transform:scale(1.09);filter:brightness(1.2)}70%{transform:scale(0.97)}100%{transform:scale(1);filter:brightness(1)}}
  @keyframes streakPop{0%{transform:scale(0.4) translateY(16px);opacity:0}60%{transform:scale(1.18) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes podiumDrop{0%{transform:translateY(-30px) scale(0.9);opacity:0}70%{transform:translateY(4px) scale(1.02)}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes sa-pop-in{0%{transform:scale(0.6) rotate(-4deg);opacity:0}60%{transform:scale(1.06) rotate(1deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sa-slide-up{0%{transform:translateY(32px);opacity:0}100%{transform:translateY(0);opacity:1}}
  @keyframes sa-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @keyframes sa-confetti-fall{0%{transform:translateY(-20vh) rotate(0deg);opacity:1}100%{transform:translateY(120vh) rotate(720deg);opacity:0}}

  .lb-row{display:flex;align-items:center;gap:0.8rem;padding:0.75rem 0.9rem;margin-bottom:0.35rem;border-left:4px solid transparent;animation:slideIn 0.35s ease forwards;opacity:0;border-radius:10px;background:var(--paper);border:2px solid var(--line)}
  @keyframes slideIn{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
  .lb-rank{font-family:'Fraunces',serif;font-size:1.1rem;font-weight:900;width:1.9rem;opacity:0.45}
  .lb-name{flex:1;font-weight:600;font-size:0.95rem}
  .lb-score{font-family:'Fraunces',serif;font-size:1rem;font-weight:900;color:var(--gold)}

  .prog{height:5px;background:var(--line);margin-bottom:1.2rem;border-radius:99px}
  .prog-fill{height:100%;background:var(--gold);transition:width 0.5s;border-radius:99px}

  .result-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:200;animation:fadeIn 0.2s}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .result-box{text-align:center;padding:2.5rem;background:var(--paper);border:3px solid var(--line);border-radius:20px;box-shadow:6px 6px 0 rgba(0,0,0,0.5)}
  .result-emoji{font-size:5rem;display:block;animation:boing 0.45s cubic-bezier(0.175,0.885,0.32,1.275)}
  @keyframes boing{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}

  .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:0.55rem;padding:1.1rem;background:#fff;border:3px solid var(--gold);max-width:210px;margin:0.9rem auto 0;border-radius:14px;box-shadow:4px 4px 0 rgba(0,0,0,0.5)}
  .qr-wrap img{width:155px;height:155px;display:block}
  .qr-label{font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink);text-align:center}
  .qr-url{font-size:0.57rem;color:var(--ink);opacity:0.45;text-align:center;word-break:break-all;max-width:175px}

  .chip{display:inline-flex;align-items:center;gap:0.3rem;padding:0.28rem 0.65rem;font-family:'JetBrains Mono',monospace;font-size:0.56rem;font-weight:700;margin:0.18rem;animation:popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275);border-radius:999px;border:2px solid var(--ink)}
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

  @media(max-width:600px){
    .opt-grid{grid-template-columns:1fr}
    .opt-btn{min-height:72px;font-size:1.05rem;padding:1.1rem 1.1rem}
    .hero-btns{flex-direction:column;align-items:stretch}
  }

  .sa-pressable{transition:transform 0.12s,box-shadow 0.12s;cursor:pointer;user-select:none}
  .sa-pressable:hover{transform:translate(-2px,-2px)}
  .sa-pressable:active{transform:translate(2px,2px);transition-duration:0.06s}
  .sa-anim-pop{animation:sa-pop-in 0.5s cubic-bezier(0.2,0.8,0.3,1.2) both}
  .sa-anim-slide{animation:sa-slide-up 0.5s cubic-bezier(0.2,0.8,0.3,1) both}
  .sa-anim-fade{animation:sa-fade-in 0.4s ease both}
  .sa-anim-shake{animation:sa-shake 0.5s both}
  .sa-anim-pulse{animation:sa-pulse 1.4s ease-in-out infinite}
  .sa-anim-letter{animation:sa-letter-pop 0.7s cubic-bezier(0.2,0.8,0.3,1.3) both}
  .sa-anim-warn{animation:sa-timer-warn 0.5s ease-in-out infinite}
  .sa-stagger>*{animation-fill-mode:both}
  .sa-stagger>*:nth-child(1){animation-delay:0.05s}
  .sa-stagger>*:nth-child(2){animation-delay:0.15s}
  .sa-stagger>*:nth-child(3){animation-delay:0.25s}
  .sa-stagger>*:nth-child(4){animation-delay:0.35s}
  .sa-stagger>*:nth-child(5){animation-delay:0.45s}
  .sa-stagger>*:nth-child(6){animation-delay:0.55s}
  .sa-card{transition:transform 0.15s cubic-bezier(0.2,0.8,0.3,1)}
  .sa-card-interactive:hover{transform:translate(-2px,-2px) rotate(-0.4deg)}
  .sa-card-interactive:active{transform:translate(1px,1px)}
  @keyframes sa-fade-in{from{opacity:0}to{opacity:1}}
  @keyframes sa-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  @keyframes sa-letter-pop{0%{transform:scale(0) rotate(-15deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes sa-timer-warn{0%,100%{color:var(--coral);transform:scale(1)}50%{color:#ff6341;transform:scale(1.12)}}
  @keyframes sa-score-pop{0%{transform:translate(-50%,20px) scale(0.4);opacity:0}20%{transform:translate(-50%,0) scale(1.15);opacity:1}100%{transform:translate(-50%,-70px) scale(1);opacity:0}}
  @keyframes sa-spotlight-sweep{0%{transform:translateX(-100%) skewX(-20deg)}100%{transform:translateX(200%) skewX(-20deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
`;

const MEDAL = ["🥇","🥈","🥉"];
const OPT_ICONS = ["A","B","C","D"];
const GAME_MODES = [
  {v:"mixed",         label:"🎲 Mixed",            desc:"All types"},
  {v:"multiple_choice",label:"📋 Multiple Choice", desc:"Choose the answer"},
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
  const joinCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("join") || "") : "";
  const [view, setView] = useState(joinCode ? "student" : "home");
  return (
    <>
      <style>{css}</style>
      {view==="home"    && <Home    onHost={()=>setView("host")} onJoin={()=>setView("student")} onSolo={()=>setView("solo")} />}
      {view==="host"    && <HostView    onBack={()=>setView("home")} />}
      {view==="student" && <StudentView onBack={()=>setView("home")} initialCode={joinCode} />}
      {view==="solo"    && <SoloView    onBack={()=>setView("home")} />}
    </>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({ onHost, onJoin, onSolo }) {
  return (
    <div className="hero">
      <div style={{textAlign:"center",marginBottom:"0.6rem"}}>
        <svg width="56" height="56" viewBox="0 0 32 32" style={{display:"inline-block"}}>
          <path d="M5 6 H27 A4 4 0 0 1 31 10 V20 A4 4 0 0 1 27 24 H16.5 L10.5 30 V24 H5 A4 4 0 0 1 1 20 V10 A4 4 0 0 1 5 6 Z" fill="var(--coral)" />
          <rect x="8" y="16" width="3.5" height="4" rx="0.5" fill="var(--cream)" />
          <rect x="14" y="12" width="3.5" height="8" rx="0.5" fill="var(--cream)" />
          <rect x="20" y="9" width="3.5" height="11" rx="0.5" fill="var(--cream)" />
        </svg>
      </div>
      <h1 className="hero-title">English<br/><span>Arena</span></h1>
      <p className="hero-sub">Live classroom games to improve your English. No app needed.</p>

      <div style={{width:"100%",maxWidth:340,margin:"0 auto"}}>
        {/* Teacher */}
        <button className="btn btn-gold btn-full" onClick={onHost} style={{marginBottom:"1.4rem"}}>🎓 I'm the Teacher</button>

        {/* Student divider */}
        <div style={{display:"flex",alignItems:"center",gap:"0.7rem",marginBottom:"1rem",opacity:0.4}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.3)"}}/>
          <span style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase"}}>I'm a Student</span>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,0.3)"}}/>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
          <button className="btn btn-ghost btn-full" onClick={onJoin}>📱 Join a Teacher's Game</button>
          <button className="btn btn-ghost btn-full" onClick={onSolo} style={{opacity:0.7,fontSize:"0.88rem"}}>🎮 Practise on My Own</button>
        </div>
      </div>

      <p className="op30 text-center mt-4" style={{fontSize:"0.72rem",maxWidth:440,lineHeight:1.8}}>
        Multiple Choice · True/False · Error Spotter · Word Order · Story Builder · Idioms · Word Match · Odd One Out · Stress Battle
        <br/>Solo practice · Teams mode · Live leaderboard · 30 curated topic banks
      </p>
    </div>
  );
}

// ─── SOLO VIEW ────────────────────────────────────────────────────────────────
function SoloView({ onBack }) {
  const [phase, setPhase]           = useState("setup");   // setup | intro | question | reveal | done
  const [selectedTopic, setSelectedTopic] = useState("");
  const [gameType, setGameType]     = useState("mixed");
  const [qCount, setQCount]         = useState(10);
  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [myAnswer, setMyAnswer]     = useState(null);
  const [results, setResults]       = useState([]);        // {correct, q} per question
  const [streak, setStreak]         = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [faves, setFaves]           = useState(() => readFaves());
  const [topicFilter, setTopicFilter] = useState("all"); // "all" | "saved"

  // answer-type state (mirrors StudentView)
  const [rearranged, setRearranged]   = useState([]);
  const [usedIdx, setUsedIdx]         = useState([]);
  const [typeVal, setTypeVal]         = useState("");
  const [storyOrder, setStoryOrder]   = useState([]);
  const [matchState, setMatchState]   = useState({ sel:null, matched:{} });

  const q = questions[qIndex] || null;

  // ── reset per-question answer state when question changes ──
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
    const pool = gameType === "mixed" ? bank : bank.filter(q => q.type === gameType);
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

  // ── SETUP SCREEN ───────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.2rem"}}>
        <button className="btn btn-ghost btn-sm mb-3" onClick={onBack}>← Back</button>
        <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1.1rem",marginBottom:"0.2rem"}}>Practise on Your Own</h2>
        <p className="op50 mb-3" style={{fontSize:"0.82rem"}}>Pick a topic and start practising — no teacher needed.</p>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.35rem"}}>
          <span className="label" style={{marginBottom:0}}>Topic</span>
          <div className="flex gap-1">
            <button className={`btn btn-sm ${topicFilter==="all"?"btn-teal":"btn-ghost"}`} style={{fontSize:"0.72rem",padding:"0.18rem 0.55rem"}} onClick={()=>setTopicFilter("all")}>All</button>
            <button className={`btn btn-sm ${topicFilter==="saved"?"btn-gold":"btn-ghost"}`} style={{fontSize:"0.72rem",padding:"0.18rem 0.55rem"}} onClick={()=>setTopicFilter("saved")}>⭐ Saved{faves.length>0?` (${faves.length})`:""}</button>
          </div>
        </div>
        {topicFilter==="saved"&&faves.length===0&&(
          <p style={{fontSize:"0.78rem",opacity:0.45,marginBottom:"0.6rem"}}>No saved topics yet — tap ★ on any topic to save it.</p>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.4rem",marginBottom:"0.9rem",maxHeight:"260px",overflowY:"auto",padding:"0.5rem",border:"1px solid rgba(255,255,255,0.1)"}}>
          {Object.entries(QUESTION_BANK).filter(([k])=>(topicFilter==="all"||faves.includes(k))).map(([key,{label}])=>(
            <div key={key} style={{position:"relative",display:"flex"}}>
              <button onClick={()=>setSelectedTopic(key)} style={{flex:1,padding:"0.5rem 0.6rem",paddingRight:"1.6rem",fontSize:"0.78rem",fontWeight:selectedTopic===key?700:400,border:`2px solid ${selectedTopic===key?"var(--gold)":"rgba(255,255,255,0.15)"}`,background:selectedTopic===key?"rgba(232,184,75,0.15)":"transparent",color:selectedTopic===key?"var(--gold)":"rgba(255,255,255,0.7)",cursor:"pointer",textAlign:"left",transition:"all 0.12s"}}>{label}</button>
              <button onClick={(e)=>{e.stopPropagation();toggleFave(key);}} title={faves.includes(key)?"Remove from saved":"Save topic"} style={{position:"absolute",right:"0.3rem",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:faves.includes(key)?"var(--gold)":"rgba(255,255,255,0.25)",padding:"0.1rem",lineHeight:1}}>{faves.includes(key)?"★":"☆"}</button>
            </div>
          ))}
        </div>

        <span className="label">Question type</span>
        <div className="flex wrap gap-1 mb-3">
          {[["mixed","🎲 Mixed"],["multiple_choice","Multiple Choice"],["true_false","True / False"],["error_spotter","Error Spotter"],["rearrange","Word Order"],["story_builder","Story Builder"],["fill_idiom","Fill the Idiom"],["word_match","Word Match"],["odd_one_out","Odd One Out"],["type_answer","Type Answer"]].map(([v,l])=>(
            <button key={v} className={`btn btn-sm ${gameType===v?"btn-teal":"btn-ghost"}`} onClick={()=>setGameType(v)}>{l}</button>
          ))}
        </div>

        <span className="label">Number of questions</span>
        <div className="flex gap-1 mb-1">
          {[5,8,10,12,15].map(n=>(
            <button key={n} className={`btn btn-sm ${qCount===n?"btn-gold":"btn-ghost"}`} onClick={()=>setQCount(n)}>{n}</button>
          ))}
        </div>
        {selectedTopic && (() => {
          const bank = QUESTION_BANK[selectedTopic].questions;
          const available = gameType === "mixed" ? bank.length : bank.filter(q => q.type === gameType).length;
          const actual = Math.min(qCount, available);
          return available < qCount
            ? <p style={{fontSize:"0.78rem",color:"var(--gold)",marginBottom:"1rem",marginTop:"0.3rem"}}>⚠ Only {available} {gameType==="mixed"?"":"\""+gameType.replace(/_/g," ")+"\" "}question{available!==1?"s":""} available for this topic — you'll get {actual}.</p>
            : <p style={{fontSize:"0.75rem",opacity:0.4,marginBottom:"1rem",marginTop:"0.3rem"}}>{actual} questions ready</p>;
        })()}
        {!selectedTopic && <div style={{marginBottom:"1rem"}}/>}

        <button className="btn btn-teal btn-full" disabled={!selectedTopic} onClick={loadQuestions}>Start Practising →</button>
      </div>
    );
  }

  // ── INTRO SCREEN ───────────────────────────────────────────────────────────
  if (phase === "intro") {
    const intro = QUESTION_BANK[selectedTopic]?.intro;
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.5rem"}}>
        <button className="btn btn-ghost btn-sm mb-3" onClick={()=>setPhase("setup")}>← Back</button>
        <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1rem",marginBottom:"0.15rem"}}>Before You Start</h2>
        <p className="op50 mb-3" style={{fontSize:"0.82rem"}}>A quick grammar reminder for this topic.</p>
        {intro?.sections?.map((s, i) => (
          <div key={i} className="card mb-3">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.74rem",color:"var(--gold)",marginBottom:"0.45rem",letterSpacing:"0.04em"}}>{s.heading}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:"0.87rem",color:"var(--teal)",padding:"0.35rem 0.6rem",background:"rgba(64,192,170,0.08)",borderRadius:4,marginBottom:"0.6rem"}}>{s.form}</div>
            <div style={{marginBottom:"0.5rem"}}>
              {s.examples.map((ex, j) => (
                <p key={j} style={{fontSize:"0.85rem",marginBottom:"0.15rem",opacity:0.82,fontStyle:"italic"}}>"{ex}"</p>
              ))}
            </div>
            <p style={{fontSize:"0.79rem",opacity:0.55,lineHeight:1.55,marginTop:"0.3rem"}}>{s.use}</p>
          </div>
        ))}
        {intro?.tip && (
          <div className="card mb-4" style={{border:"1px solid rgba(232,184,75,0.4)",background:"rgba(232,184,75,0.06)"}}>
            <span style={{fontSize:"0.74rem",fontWeight:700,color:"var(--gold)"}}>💡 Key difference</span>
            <p style={{fontSize:"0.83rem",marginTop:"0.3rem",lineHeight:1.55,opacity:0.85}}>{intro.tip}</p>
          </div>
        )}
        <button className="btn btn-teal btn-full" onClick={()=>setPhase("question")}>
          Start Practising →
        </button>
      </div>
    );
  }

  // ── DONE SCREEN ────────────────────────────────────────────────────────────
  if (phase === "done") {
    const total   = results.length;
    const correct = results.filter(r => r.correct).length;
    const pct     = Math.round((correct / total) * 100);
    const grade   = pct >= 90 ? "🏆 Outstanding!" : pct >= 70 ? "🌟 Well done!" : pct >= 50 ? "💪 Keep practising!" : "📚 Review and try again!";
    return (
      <div style={{minHeight:"100vh",maxWidth:520,margin:"0 auto",padding:"1.5rem"}}>
        <div className="card card-gold" style={{textAlign:"center",marginBottom:"1.2rem"}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"2.8rem",fontWeight:900,marginBottom:"0.3rem"}}>{pct}%</div>
          <div style={{fontSize:"1.1rem",fontWeight:700,marginBottom:"0.2rem"}}>{grade}</div>
          <div className="op50" style={{fontSize:"0.85rem"}}>{correct} / {total} correct · {QUESTION_BANK[selectedTopic]?.label}</div>
          {bestStreak >= 2 && (
            <div style={{marginTop:"0.6rem",fontSize:"0.82rem",color:"var(--gold)"}}>Best streak: 🔥 {bestStreak} in a row!</div>
          )}
        </div>

        <div style={{marginBottom:"1.2rem"}}>
          {results.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:"0.6rem",alignItems:"flex-start",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{fontSize:"1rem",marginTop:"0.1rem"}}>{r.correct?"✅":"❌"}</span>
              <div>
                <div style={{fontSize:"0.83rem",opacity:0.8,lineHeight:1.4}}>{r.q.question}{r.q.sentence?" "+r.q.sentence:""}</div>
                {!r.correct&&<div style={{fontSize:"0.78rem",color:"var(--gold)",marginTop:"0.2rem"}}>
                  {r.q.type==="error_spotter"?`Error: ${r.q.errorWord} → ${r.q.answer}`:r.q.type==="story_builder"?`Order: ${(r.q.correctOrder||[]).filter(i=>i<3).join(",")}`:r.q.type==="word_match"?"Match all pairs correctly":`Answer: ${r.q.answer}`}
                </div>}
              </div>
            </div>
          ))}
        </div>

        {results.some(r => !r.correct) && (
          <button className="btn btn-full mb-2" style={{background:"rgba(232,88,58,0.18)",border:"1px solid var(--coral)",color:"var(--coral)"}} onClick={retryMissed}>
            🔁 Retry missed ({results.filter(r=>!r.correct).length})
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

  // ── QUESTION / REVEAL SCREEN ───────────────────────────────────────────────
  if (!q) return null;
  const isCorrect = phase === "reveal" && checkAnswer(myAnswer, q);
  const pendingStreak = isCorrect ? streak + 1 : 0;

  // Fake minimal room object for StudentAnswer
  const fakeRoom = { qIndex, questions, phase: phase === "question" ? "question" : "reveal" };

  return (
    <div style={{minHeight:"100vh",maxWidth:460,margin:"0 auto",padding:"1.2rem"}}>
      {/* Progress bar */}
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem"}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{padding:"0.3rem 0.7rem",fontSize:"0.75rem"}}>✕</button>
        <div style={{flex:1,height:6,background:"rgba(255,255,255,0.1)",borderRadius:3}}>
          <div style={{height:"100%",borderRadius:3,background:"var(--teal)",width:`${((qIndex)/questions.length)*100}%`,transition:"width 0.4s"}}/>
        </div>
        <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.72rem",opacity:0.5}}>{qIndex+1}/{questions.length}</span>
      </div>

      {/* Result flash */}
      {phase === "reveal" && (
        <div style={{textAlign:"center",padding:"0.7rem",marginBottom:"0.9rem",borderRadius:8,background:isCorrect?"rgba(46,204,113,0.12)":"rgba(232,58,58,0.12)",border:`1px solid ${isCorrect?"var(--green)":"var(--coral)"}`}}>
          <span style={{fontSize:"1.5rem"}}>{isCorrect?"✅":"❌"}</span>
          <div style={{fontWeight:700,marginTop:"0.2rem",color:isCorrect?"var(--green)":"var(--coral)"}}>{isCorrect?"Correct!":"Not quite."}</div>
          {pendingStreak >= 2 && (
            <div style={{fontSize:"0.8rem",color:"var(--gold)",fontWeight:700,marginTop:"0.25rem"}}>🔥 {pendingStreak} in a row!</div>
          )}
          {!isCorrect&&q.type==="error_spotter"&&<div className="op50" style={{fontSize:"0.82rem",marginTop:"0.2rem"}}>Error: <strong>{q.errorWord}</strong> → <strong>{q.answer}</strong></div>}
          {!isCorrect&&q.type==="stress_battle"&&<div className="op50" style={{fontSize:"0.82rem",marginTop:"0.2rem"}}>Correct pattern: <strong>{q.answer}</strong> — <strong>{q.word}</strong> is stressed on syllable {q.stressed}</div>}
          {!isCorrect&&q.type!=="error_spotter"&&q.type!=="word_match"&&q.type!=="story_builder"&&q.type!=="stress_battle"&&<div className="op50" style={{fontSize:"0.82rem",marginTop:"0.2rem"}}>Answer: <strong>{q.answer}</strong></div>}
          {!isCorrect&&q.type==="story_builder"&&<div className="op50" style={{fontSize:"0.82rem",marginTop:"0.2rem"}}>Order: <strong>{(q.correctOrder||[]).filter(i=>i<3).join(",")}</strong></div>}
          {q.explanation&&<div className="op50" style={{fontSize:"0.78rem",marginTop:"0.3rem",lineHeight:1.4}}>{q.explanation}</div>}
        </div>
      )}

      {/* Question */}
      <StudentAnswer q={q} myAnswer={myAnswer} onAnswer={handleAnswer}
        rearranged={rearranged} setRearranged={setRearranged}
        usedIdx={usedIdx} setUsedIdx={setUsedIdx}
        typeVal={typeVal} setTypeVal={setTypeVal}
        storyOrder={storyOrder} setStoryOrder={setStoryOrder}
        matchState={matchState} setMatchState={setMatchState}
        room={fakeRoom} />

      {/* Next button */}
      {phase === "reveal" && (
        <button className="btn btn-teal btn-full mt-3" onClick={handleNext}>
          {qIndex + 1 >= questions.length ? "See Results →" : "Next →"}
        </button>
      )}
    </div>
  );
}

// ─── HOST VIEW ────────────────────────────────────────────────────────────────
function HostView({ onBack }) {
  const [room, setRoom] = useState(() => defaultRoom());
  const [selectedTopic, setSelectedTopic] = useState("");
  const [gameType, setGameType] = useState("mixed");
  const [qCount, setQCount] = useState(8);
  const [error, setError] = useState("");
  const [bigText, setBigText] = useState(() => readFont());
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef(null);

  const upd = (fn) => setRoom(prev =>
    typeof fn === "function" ? fn(prev) : { ...prev, ...fn }
  );

  // Write room state to storage after every change
  useEffect(() => { try { write(room); } catch {} }, [room]);

  // Sync players & answers (Firebase real-time or localStorage fallback)
  useEffect(() => {
    if (db) {
      return listenRoom(room.code, (s) => {
        if (s.code === room.code) setRoom(prev => ({ ...prev, players: s.players||{}, answers: s.answers||{} }));
      });
    }
    const id = setInterval(() => {
      const s = read();
      if (s?.code === room.code) setRoom(prev => ({ ...prev, players: s.players||{}, answers: s.answers||{} }));
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
        if (prev.paused) return prev;
        if (prev.timeLeft <= 1) { clearInterval(timerRef.current); return { ...prev, phase:"reveal", timeLeft:0 }; }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
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
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, Math.min(qCount, shuffled.length));
    setError("");
    upd(prev => ({ ...prev, questions: qs, topic: QUESTION_BANK[selectedTopic].label, gameType, phase: "lobby" }));
  };

  const autoAssign = () => {
    const names = Object.keys(room.players||{});
    if (!names.length) return;
    upd(prev => {
      const updated = { ...prev, players: { ...prev.players }, teamsLocked:true };
      names.forEach((n,i) => { updated.players[n] = { ...updated.players[n], team: TEAMS[i % prev.teamCount].id }; });
      return updated;
    });
  };

  const startGame = () => {
    if (!room.questions.length) return;
    window.scrollTo(0, 0);
    upd(prev => {
      let qs = prev.questions;
      let warmupCount = 0;
      if (prev.warmup && selectedTopic && QUESTION_BANK[selectedTopic]) {
        const pool = QUESTION_BANK[selectedTopic].questions;
        const fastTypes = new Set(["multiple_choice","true_false"]);
        const fastPool = pool.filter(q => fastTypes.has(q.type));
        const warmupPool = fastPool.length >= 3 ? fastPool : pool;
        const warmupQs = [...warmupPool].sort(() => Math.random()-0.5).slice(0, 3).map(q => ({ ...q, _warmup: true }));
        qs = [...warmupQs, ...prev.questions];
        warmupCount = 3;
      }
      const q = qs[0];
      if (!q) return prev;
      return { ...prev, phase:"question", qIndex:0, currentQ:q, timeLeft:q._warmup?15:getTimeLimit(q), answers:{}, questions:qs, warmupCount, paused:false };
    });
  };

  const advance = () => {
    upd(prev => {
      const q = prev.currentQ;
      const isWarmupQ = !!q?._warmup;
      const players = { ...(prev.players||{}) };
      const answered = prev.answers || {};
      let firstCorrect = null;
      if (!isWarmupQ) {
        Object.entries(answered).forEach(([name, ans]) => {
          if (!players[name]) players[name] = { score:0, streak:0 };
          const val = ans?.v ?? ans;
          const correct = checkAnswer(val, q);
          const bonus = correct && (players[name].streak||0) >= 1 ? 250 : 0;
          players[name] = {
            ...players[name],
            score: (players[name].score||0) + (correct ? 1000+bonus : 0),
            streak: correct ? (players[name].streak||0)+1 : 0,
            correct, lastAnswer: val,
          };
        });
        Object.keys(players).forEach(name => {
          if (!answered[name]) players[name] = { ...players[name], streak: 0, correct: false };
        });
        const correctEntries = Object.entries(answered).filter(([,a]) => checkAnswer(a?.v ?? a, q));
        if (correctEntries.length > 0) {
          firstCorrect = correctEntries.sort(([,a],[,b]) => (a?.ts||0) - (b?.ts||0))[0][0];
        }
      }
      const nextIdx = prev.qIndex + 1;
      if (nextIdx >= prev.questions.length) return { ...prev, players, phase:"end", answers:{}, firstCorrect:null };
      const nextQ = prev.questions[nextIdx];
      if (isWarmupQ) {
        if (nextIdx < prev.warmupCount) {
          // mid-warmup: skip leaderboard, go straight to next warmup question
          return { ...prev, players, phase:"question", timeLeft:15, qIndex:nextIdx, currentQ:nextQ, answers:{}, paused:false, firstCorrect:null };
        }
        // last warmup question done
        return { ...prev, players, phase:"warmup_done", qIndex:nextIdx, currentQ:nextQ, answers:{}, firstCorrect:null };
      }
      // Go to intermediate leaderboard; pre-load next question so goNextQuestion just flips phase
      return { ...prev, players, phase:"leaderboard", qIndex:nextIdx, currentQ:nextQ, answers:{}, firstCorrect };
    });
  };

  const goNextQuestion = () => {
    window.scrollTo(0, 0);
    upd(prev => ({ ...prev, phase:"question", timeLeft:getTimeLimit(prev.currentQ), paused:false, firstCorrect:null }));
  };

  const replayQuestion = () => {
    upd(prev => ({ ...prev, phase:"question", timeLeft:getTimeLimit(prev.currentQ), answers:{}, paused:false, firstCorrect:null }));
  };

  const skipQuestion = () => {
    upd(prev => ({ ...prev, phase:"reveal", timeLeft:0, answers:{}, firstCorrect:null }));
  };

  const skipWarmup = () => {
    upd(prev => {
      const nextQ = prev.questions[prev.warmupCount];
      if (!nextQ) return prev;
      return { ...prev, phase:"warmup_done", qIndex:prev.warmupCount, currentQ:nextQ, answers:{}, firstCorrect:null };
    });
  };

  const endEarly = () => {
    clearInterval(timerRef.current);
    upd(prev => prev.phase==="question" ? { ...prev, phase:"reveal", timeLeft:0 } : prev);
  };

  // Auto-advance to reveal when every player has submitted
  const ansCount = Object.keys(room.answers||{}).length;
  const pCount = Object.keys(room.players||{}).length;
  useEffect(() => {
    if (room.phase !== "question" || pCount === 0 || ansCount < pCount || room.paused) return;
    const t = setTimeout(endEarly, 700);
    return () => clearTimeout(t);
  }, [ansCount, pCount, room.phase, room.paused]);

  const reset = () => { const r = defaultRoom(); write(r); setRoom(r); setSelectedTopic(""); setGameType("mixed"); };

  const players = Object.entries(room.players||{});
  const sorted = [...players].sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  const teamScores = getTeamScores(room);
  const activeTeams = TEAMS.slice(0, room.teamCount);

  const buildSummary = (questions, topic) => {
    const lines = [`=== English Arena · ${topic} ===\n`];
    questions.forEach((q, i) => {
      lines.push(`Q${i+1}. ${q.question}${q.sentence ? " " + q.sentence : ""}`);
      const ans = q.type==="error_spotter" ? `${q.errorWord} → ${q.answer}` :
                  q.type==="story_builder" ? `Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}` :
                  q.type==="word_match" ? "Match all pairs correctly" : q.answer;
      lines.push(`Answer: ${ans}`);
      if (q.explanation) lines.push(`Note: ${q.explanation}`);
      lines.push("");
    });
    return lines.join("\n");
  };

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

      {/* Code + QR + Players — lobby only (top) */}
      {room.phase==="lobby" && (() => {
        const qrUrl = typeof window!=="undefined"?`${window.location.origin}${window.location.pathname}?join=${room.code}`:"https://english-arena.vercel.app";
        return (
          <div className="text-center mt-2">
            <span className="label">Room Code</span>
            <div className="code-badge">{room.code}</div>
            <p className="op50 mt-1" style={{fontSize:"0.8rem"}}>{players.length} player{players.length!==1?"s":""} in lobby</p>
            <QRDisplay url={qrUrl} />
            <p className="op30 mt-1" style={{fontSize:"0.68rem"}}>Students scan QR → enter name → Join!</p>
            {players.length > 0 && (
              <div className="card mt-2" style={{textAlign:"left"}}>
                <span className="label">Players joined</span>
                <div className="flex wrap gap-1 mt-1">
                  {players.map(([name, p]) => {
                    const team = room.mode==="teams" ? TEAMS.find(t=>t.id===p.team) : null;
                    return (
                      <span key={name} className="chip" style={{background:team?team.color:"rgba(255,255,255,0.1)",color:team?"#fff":"var(--ink)"}}>
                        {team&&<TeamIcon icon={team.icon} color="#fff" size={13}/>} {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Code (bottom-left) + QR (bottom-right) — game only */}
      {room.phase!=="lobby" && (() => {
        const qrUrl = typeof window!=="undefined"?`${window.location.origin}${window.location.pathname}?join=${room.code}`:"https://english-arena.vercel.app";
        return (
          <>
            <div style={{position:"fixed",bottom:"1rem",left:"1rem",zIndex:50,background:"var(--paper)",border:"2px solid var(--ink)",padding:"0.4rem 0.85rem",borderRadius:10,boxShadow:"3px 3px 0 var(--gold)"}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.5rem",opacity:0.5,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"0.1rem"}}>Room</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:"1.05rem",fontWeight:900,color:"var(--ink)",letterSpacing:"0.1em"}}>{room.code}</div>
            </div>
            {(room.phase==="question"||room.phase==="reveal") && <InGameQR url={qrUrl} />}
          </>
        );
      })()}

      {/* ── LOBBY: START (after questions loaded) ── */}
      {room.phase === "lobby" && room.questions.length > 0 && (
        <div className="mt-3">
          <div className="card card-gold mb-2" style={{textAlign:"center"}}>
            <p style={{fontSize:"0.82rem",opacity:0.7,marginBottom:"0.6rem"}}>
              {room.questions.length} questions ready · Topic: <strong>{room.topic}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <label style={{fontSize:"0.79rem",opacity:0.75,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.4rem"}}>
                <input type="checkbox" checked={room.warmup} onChange={e=>upd(p=>({...p,warmup:e.target.checked}))} style={{accentColor:"var(--gold)",cursor:"pointer"}} />
                Warm-up round (3 quick questions)
              </label>
            </div>
            <button className="btn btn-green btn-full" style={{fontSize:"1rem"}} onClick={startGame}>▶ Start Game</button>
          </div>
          {/* Mode */}
          <span className="label">Game Mode</span>
          <div className="mode-toggle">
            <button className={`mode-btn ${room.mode==="solo"?"active":""}`} onClick={()=>upd(p=>({...p,mode:"solo"}))}>👤 Solo — Individual</button>
            <button className={`mode-btn ${room.mode==="teams"?"active":""}`} onClick={()=>upd(p=>({...p,mode:"teams"}))}>👥 Teams</button>
          </div>
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
          <button className="btn btn-ghost btn-sm" onClick={()=>upd(p=>({...p,questions:[],topic:"",phase:"lobby"}))}>← Change topic</button>
        </div>
      )}

      {/* ── LOBBY: SETUP (no questions yet) ── */}
      {room.phase === "lobby" && room.questions.length === 0 && (
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"0.4rem",marginBottom:"0.75rem",maxHeight:"260px",overflowY:"auto",padding:"0.5rem",border:"1px solid rgba(255,255,255,0.1)"}}>
            {Object.entries(QUESTION_BANK).map(([key,{label}])=>(
              <button key={key} onClick={()=>setSelectedTopic(key)} style={{padding:"0.55rem 0.6rem",fontFamily:"'DM Sans',sans-serif",fontSize:"0.78rem",fontWeight:selectedTopic===key?700:400,border:`2px solid ${selectedTopic===key?"var(--gold)":"rgba(255,255,255,0.15)"}`,background:selectedTopic===key?"rgba(232,184,75,0.15)":"transparent",color:selectedTopic===key?"var(--gold)":"rgba(255,255,255,0.7)",cursor:"pointer",textAlign:"left",transition:"all 0.12s"}}>{label}</button>
            ))}
          </div>

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
                {[8,10,12,15].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-coral mb-1" style={{fontSize:"0.85rem"}}>{error}</p>}
          <button className="btn btn-gold btn-full" onClick={loadQuestions} disabled={!selectedTopic}>
            Load Questions →
          </button>
          <p style={{fontSize:"0.75rem",opacity:0.4,marginTop:"0.4rem"}}>Students can join via the QR above while you set up</p>
        </div>
      )}

      {/* ── QUESTION PHASE ── */}
      {room.phase==="question" && room.currentQ && (
        <>
          <div style={{fontSize: bigText ? "1.2em" : "1em"}}>
            <HostQuestion q={room.currentQ} timeLeft={room.timeLeft} answers={room.answers||{}}
              players={room.players||{}} qIndex={room.qIndex} total={room.questions.length}
              mode={room.mode} teams={activeTeams} teamScores={teamScores} paused={room.paused} />
          </div>
          <div className="flex gap-1 justify-center mt-2 wrap">
            <button className={`btn btn-sm ${room.paused?"btn-gold":"btn-ghost"}`} onClick={()=>upd(p=>({...p,paused:!p.paused}))}>
              {room.paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            {ansCount > 0 && <button className="btn btn-sm btn-ghost" onClick={endEarly}>⏭ End Early</button>}
            <button className="btn btn-sm btn-ghost" onClick={skipQuestion} title="Skip — no one scores this question">⏭ Skip</button>
            {room.currentQ?._warmup && <button className="btn btn-sm btn-ghost" onClick={skipWarmup} title="Skip the rest of the warm-up">⏭ Skip Warm-Up</button>}
            <button className="btn btn-sm btn-ghost" onClick={()=>{ const n=!bigText; setBigText(n); writeFont(n); }} title="Toggle text size">
              {bigText ? "A−" : "A+"}
            </button>
          </div>
          <PlayersFooter players={players} mode={room.mode} />
        </>
      )}

      {/* ── REVEAL ── */}
      {room.phase==="reveal" && room.currentQ && (
        <div className="mt-3">
          <HostReveal q={room.currentQ} answers={room.answers||{}} players={room.players||{}} />
          <div className="flex gap-2 mt-3 wrap">
            <button className="btn btn-gold" style={{flex:1}} onClick={advance}>
              {room.currentQ?._warmup ? "Next →" : room.qIndex+1>=room.questions.length?"🏆 Final Results":"📊 Show Scores →"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={replayQuestion} title="Show this question again">🔁 Replay</button>
            {room.currentQ?._warmup && <button className="btn btn-ghost btn-sm" onClick={skipWarmup} title="Skip the rest of the warm-up">⏭ Skip Warm-Up</button>}
          </div>
          <PlayersFooter players={players} mode={room.mode} />
        </div>
      )}

      {/* ── WARM-UP DONE ── */}
      {room.phase==="warmup_done" && (
        <div className="card mt-4" style={{textAlign:"center",padding:"2rem 1.5rem"}}>
          <div style={{fontSize:"2.5rem",marginBottom:"0.6rem"}}>✅</div>
          <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1rem",marginBottom:"0.4rem"}}>Warm-Up Complete!</h2>
          <p className="op50" style={{fontSize:"0.85rem",marginBottom:"1.5rem"}}>Students are warmed up and ready. Main game starts now.</p>
          <button className="btn btn-green btn-full" style={{fontSize:"1rem"}} onClick={goNextQuestion}>🚀 Start Main Game →</button>
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
          {room.phase==="end" && (
            <>
              <button className="btn btn-ghost btn-full mt-3" onClick={()=>setShowReview(v=>!v)}>
                📚 {showReview ? "Hide" : "Review"} Questions
              </button>
              {showReview && (() => {
                const mainQs = room.questions.filter(q=>!q._warmup);
                return (
                  <div className="card mt-2" style={{maxHeight:"60vh",overflowY:"auto"}}>
                    <button className="btn btn-ghost btn-sm mb-3" onClick={()=>navigator.clipboard.writeText(buildSummary(mainQs, room.topic))}>
                      📋 Copy as text
                    </button>
                    {mainQs.map((q,i)=>(
                      <div key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.07)",paddingBottom:"0.7rem",marginBottom:"0.7rem"}}>
                        <div style={{fontWeight:700,fontSize:"0.85rem",lineHeight:1.4}}>Q{i+1}. {q.question}{q.sentence?" "+q.sentence:""}</div>
                        <div style={{color:"var(--teal)",fontSize:"0.8rem",marginTop:"0.2rem"}}>✔ {q.type==="error_spotter"?`${q.errorWord} → ${q.answer}`:q.type==="story_builder"?`Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}`:q.type==="word_match"?"Match all pairs":q.answer}</div>
                        {q.explanation&&<div className="op50" style={{fontSize:"0.76rem",marginTop:"0.15rem",lineHeight:1.4}}>{q.explanation}</div>}
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

function InGameQR({ url }) {
  const [failed, setFailed] = useState(false);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0d0d0d&margin=2&format=png`;
  return (
    <div style={{position:"fixed",bottom:"1rem",right:"1rem",zIndex:50,background:"#fff",padding:"0.4rem",borderRadius:8,border:"2px solid var(--ink)",boxShadow:"3px 3px 0 var(--ink)",lineHeight:failed?1.3:0}}>
      {failed
        ? <div style={{fontSize:"0.55rem",color:"#000",maxWidth:80,wordBreak:"break-all",padding:"0.1rem"}}>{url}</div>
        : <img src={src} alt="Join QR" width={80} height={80} onError={()=>setFailed(true)} />}
    </div>
  );
}

function PlayersFooter({ players, mode }) {
  if (!players.length) return null;
  return (
    <div style={{marginTop:"2rem",paddingTop:"0.75rem",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
      <span className="label">Players</span>
      <div className="flex wrap gap-1 mt-1">
        {players.map(([name, p]) => {
          const team = mode==="teams" ? TEAMS.find(t=>t.id===p.team) : null;
          return (
            <span key={name} className="chip" style={{background:team?team.color:"rgba(255,255,255,0.1)",color:team?"#fff":"var(--ink)"}}>
              {team&&<TeamIcon icon={team.icon} color="#fff" size={13}/>} {name}{p.score>0?` · ${p.score.toLocaleString()}`:""}{p.correct===true?"✓":p.correct===false?"✗":""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StressDots({ syllables, stressAt, size = "md" }) {
  const big = size === "lg" ? 32 : 24;
  const small = size === "lg" ? 20 : 15;
  return (
    <div style={{ display:"flex", gap: size==="lg"?"0.7rem":"0.5rem", justifyContent:"center", alignItems:"center" }}>
      {Array.from({ length: syllables }, (_, i) => {
        const isStressed = i + 1 === stressAt;
        return (
          <div key={i} style={{
            width: isStressed ? big : small,
            height: isStressed ? big : small,
            borderRadius: "50%",
            background: isStressed ? "#fff" : "transparent",
            border: `2.5px solid ${isStressed ? "#fff" : "rgba(255,255,255,0.55)"}`,
            transition: "all 0.15s",
            flexShrink: 0,
          }} />
        );
      })}
    </div>
  );
}

function HostQuestion({ q, timeLeft, answers, players, qIndex, total, mode, teams, teamScores, paused }) {
  const ansCount = Object.keys(answers).length;
  const pCount = Object.keys(players).length;
  const shuffledRearrange = useMemo(()=> q.type==="rearrange" ? [...(q.words||[])].sort(()=>Math.random()-0.5) : [], [q.question]);
  return (
    <div className="mt-3">
      <div className="prog"><div className="prog-fill" style={{width:`${((qIndex+1)/total)*100}%`}}/></div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1 items-center">
          {q._warmup && <span className="badge" style={{background:"rgba(232,184,75,0.2)",color:"var(--gold)",border:"1px solid rgba(232,184,75,0.4)"}}>WARM UP</span>}
          <span className="badge">{q.type.replace(/_/g," ")}</span>
        </div>
        <div className="flex gap-1 items-center">
          {paused && <span style={{fontSize:"0.68rem",color:"var(--coral)",fontWeight:700,letterSpacing:"0.05em"}}>⏸ PAUSED</span>}
          <span className="op50" style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.68rem"}}>Q{qIndex+1}/{total}</span>
        </div>
      </div>
      {mode==="teams" && (
        <div className="flex gap-1 wrap mb-2">
          {teams.map(t=><span key={t.id} style={{fontFamily:"'DM Sans',sans-serif",fontSize:"0.75rem",fontWeight:700,padding:"0.3rem 0.8rem",background:t.color,color:"#fff",borderRadius:999,display:"inline-flex",alignItems:"center",gap:"0.3rem"}}><TeamIcon icon={t.icon} color="#fff" size={14}/>{(teamScores[t.id]||0).toLocaleString()}</span>)}
        </div>
      )}
      <div className="text-center mb-2">
        <div className={`timer-num ${timeLeft<=5?"urgent":""}`}>{timeLeft}</div>
      </div>
      <h2 style={{fontSize:"clamp(1.1rem,2.6vw,1.6rem)",lineHeight:1.4,textAlign:"center",marginBottom:"1.2rem",maxWidth:680,margin:"0 auto 1.2rem"}}>{q.question}</h2>
      {q.type==="rearrange"&&<div className="tiles" style={{justifyContent:"center"}}>{shuffledRearrange.map((w,i)=><span key={i} className="tile">{w}</span>)}</div>}
      {q.type==="multiple_choice"&&q.options&&(
        <div className="opt-grid">{q.options.map((o,i)=><div key={i} className={`opt-btn opt-${i}`}><span className="opt-icon">{OPT_ICONS[i]}</span>{o}</div>)}</div>
      )}
      {q.type==="odd_one_out"&&q.options&&(()=>{
        const wrong = q.answer;
        const right = q.options.find(o=>o!==wrong);
        return <div className="opt-grid">{[wrong,right].map((o,i)=><div key={i} className={`opt-btn opt-${i}`}><span className="opt-icon">{OPT_ICONS[i]}</span>{o}</div>)}</div>;
      })()}
      {q.type==="true_false"&&<div className="flex gap-2 mt-2"><div className="opt-btn opt-2" style={{justifyContent:"center",flex:1,fontWeight:700}}>✓ True</div><div className="opt-btn opt-0" style={{justifyContent:"center",flex:1,fontWeight:700}}>✕ False</div></div>}
      {q.type==="story_builder"&&q.sentences&&<div className="mt-2">{q.sentences.slice(0,3).map((s,i)=><div key={i} className="story-card" style={{cursor:"default"}}><span className="story-num">{i+1}</span>{s}</div>)}</div>}
      {q.type==="word_match"&&q.pairs&&(
        <div className="flex gap-2 mt-2">
          <div style={{flex:1}}><span className="label">Words</span>{q.pairs.slice(0,2).map((p,i)=><div key={i} className="match-word" style={{cursor:"default"}}>{p.word}</div>)}</div>
          <div style={{flex:1}}><span className="label">Meanings</span>{q.pairs.slice(0,2).map((p,i)=><div key={i} className="match-word" style={{cursor:"default"}}>{p.meaning}</div>)}</div>
        </div>
      )}
      {q.type==="stress_battle"&&(
        <div style={{textAlign:"center",marginTop:"0.5rem"}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"clamp(2rem,6vw,3rem)",fontWeight:900,letterSpacing:"0.1em",color:"var(--gold)",marginBottom:"1.5rem"}}>{q.word}</div>
          <div style={{display:"flex",gap:"3rem",justifyContent:"center"}}>
            {["A","B"].map(label=>{
              const wrongStress = q.stressed===1?2:q.stressed===3?2:1;
              const stressAt = label===q.answer ? q.stressed : wrongStress;
              return (
                <div key={label} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1.1rem",marginBottom:"0.6rem",opacity:0.6}}>{label}</div>
                  <StressDots syllables={q.syllables} stressAt={stressAt} size="md" />
                </div>
              );
            })}
          </div>
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
  const correct = Object.entries(answers).filter(([,a])=>checkAnswer(a?.v??a,q));
  const wrong = Object.entries(answers).filter(([,a])=>!checkAnswer(a?.v??a,q));
  return (
    <div>
      <span className="label">{q.type==="odd_one_out"?"The sentence with the error":"Correct Answer"}</span>
      <div className="card card-gold">
        {q.type==="word_match" ? (
          <div>{q.pairs?.slice(0,2).map((p,i)=>(
            <div key={i} style={{display:"flex",gap:"0.5rem",marginBottom:"0.25rem",fontSize:"0.9rem"}}>
              <strong>{p.word}</strong><span className="op50">→</span><span>{p.meaning}</span>
            </div>))}</div>
        ) : q.type==="stress_battle" ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1.5rem",fontWeight:900,letterSpacing:"0.1em",marginBottom:"1rem"}}>{q.word}</div>
            <div style={{display:"flex",gap:"2.5rem",justifyContent:"center"}}>
              {["A","B"].map(label=>{
                const isCorrect = label===q.answer;
                const wrongStress = q.stressed===1?2:q.stressed===3?2:1;
                const stressAt = isCorrect?q.stressed:wrongStress;
                return (
                  <div key={label} style={{textAlign:"center",padding:"0.8rem 1.4rem",border:`2px solid ${isCorrect?"var(--gold)":"rgba(255,255,255,0.12)"}`,background:isCorrect?"rgba(232,184,75,0.1)":"transparent"}}>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1rem",marginBottom:"0.5rem",color:isCorrect?"var(--gold)":"rgba(255,255,255,0.4)"}}>{label}{isCorrect?" ✓":""}</div>
                    <StressDots syllables={q.syllables} stressAt={stressAt} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : q.type==="story_builder" ? (
          <div>{(q.correctOrder||[]).filter(i=>i<3).map((idx,pos)=>(
            <div key={idx} style={{fontSize:"0.88rem",marginBottom:"0.3rem"}}>
              <span style={{color:"var(--gold)",fontWeight:700,marginRight:"0.4rem"}}>{pos+1}.</span>{q.sentences[idx]}
            </div>
          ))}</div>
        ) : q.type==="error_spotter" ? (
          <div>
            <div style={{fontSize:"0.88rem",marginBottom:"0.4rem"}}>{q.sentence?.split(" ").map((w,i)=>{
              const clean = w.replace(/[.,!?;:]/g,"");
              const isErr = clean.toLowerCase()===q.errorWord?.toLowerCase();
              return <span key={i} style={{marginRight:"0.35rem",color:isErr?"var(--coral)":"#fff",textDecoration:isErr?"line-through":"none",fontWeight:isErr?700:400}}>{w}</span>;
            })}</div>
            <div style={{fontSize:"1rem",fontWeight:700}}>
              <span style={{color:"var(--coral)"}}>{q.errorWord}</span>
              <span className="op50" style={{margin:"0 0.4rem"}}>→</span>
              <span style={{color:"var(--gold)"}}>{q.answer}</span>
            </div>
          </div>
        ) : (
          <div style={{fontSize:"1.1rem",fontWeight:700}}>{q.answer}</div>
        )}
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

function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const colors = ["#e8b84b","#e85d3a","#2a9d8f","#a855f7","#4db8e8","#3ab87a","#fff","#f5f0e8"];
    const particles = Array.from({length:130}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*-window.innerHeight*0.5,
      w: Math.random()*11+5, h: Math.random()*5+3,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*Math.PI*2, vx:(Math.random()-0.5)*3.5,
      vy: Math.random()*3+1.5, vr:(Math.random()-0.5)*0.14,
    }));
    let raf; let t0 = null;
    const draw = (ts) => {
      if (!t0) t0 = ts;
      const elapsed = ts - t0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.055;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed/3600);
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3600) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:100}} />;
}

function Leaderboard({ sorted, mode, teams, teamScores, isEnd }) {
  const title = isEnd ? "🏆 FINAL RESULTS" : "📊 LEADERBOARD";
  // Podium delay: for isEnd, reveal 3rd→2nd→1st (most dramatic last)
  const rowDelay = (i) => isEnd ? [`1.8s`,`1.0s`,`0.2s`][i] ?? `2.4s` : `${i*0.07}s`;
  const podiumStyle = (i) => isEnd && i < 3 ? {
    animation:`podiumDrop 0.55s cubic-bezier(0.175,0.885,0.32,1.275) forwards`,
    animationDelay: rowDelay(i),
    padding: i===0 ? "1rem 0.9rem" : undefined,
    borderLeftWidth: i===0 ? 6 : 4,
    background: i===0 ? "rgba(232,184,75,0.08)" : undefined,
    marginBottom: i===0 ? "0.5rem" : undefined,
  } : {};

  if (mode === "teams") {
    const tSorted = [...teams].sort((a,b)=>(teamScores[b.id]||0)-(teamScores[a.id]||0));
    return (
      <div className="mt-3">
        {isEnd && <Confetti />}
        <h2 className="text-center text-gold mb-3" style={{fontSize:"1.35rem"}}>{title}</h2>
        <span className="label">Team standings</span>
        {tSorted.map((t,i)=>(
          <div key={t.id} className="lb-row" style={{borderLeftColor:t.color,animationDelay:rowDelay(i),...podiumStyle(i)}}>
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
              {team&&<TeamIcon icon={team.icon} color={team.color} size={18}/>}
              <span className="lb-name">{name}</span>
              {(p.streak||0)>1&&<FlameStreak count={p.streak}/>}
              <span className="lb-score">{(p.score||0).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="mt-3">
      {isEnd && <Confetti />}
      <h2 className="text-center text-gold mb-3" style={{fontSize:"1.35rem"}}>{title}</h2>
      {sorted.map(([name,p],i)=>(
        <div key={name} className="lb-row" style={{
          borderLeftColor:i===0?"var(--gold)":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.08)",
          animationDelay: rowDelay(i), ...podiumStyle(i),
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
function StudentView({ onBack, initialCode = "" }) {
  const [step, setStep] = useState("join");
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [room, setRoom] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [bigText, setBigText] = useState(() => readFont());
  const [showReview, setShowReview] = useState(false);
  // answer-type state
  const [rearranged, setRearranged] = useState([]);
  const [usedIdx, setUsedIdx] = useState([]);
  const [typeVal, setTypeVal] = useState("");
  const [storyOrder, setStoryOrder] = useState([]);
  const [matchState, setMatchState] = useState({ sel:null, matched:{} });
  const lastQRef = useRef(-1);
  const lastPhaseRef = useRef("");

  const [joining, setJoining] = useState(false);

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
      const updated = { ...s, players: { ...(s.players||{}), [name]: { score:0, streak:0, team:(s.players||{})[name]?.team||null } } };
      write(updated);
      setRoom(updated);
      setStep("waiting");
    } catch (e) {
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
        setStoryOrder([]); setMatchState({sel:null, matched:{}});
      }
      if (s.phase === "reveal" && lastPhaseRef.current !== "reveal") {
        setShowResult(true);
        setTimeout(() => setShowResult(false), 2800);
      }
      lastPhaseRef.current = s.phase;
      setRoom(s);
      if (["question","reveal","leaderboard","end"].includes(s.phase)) setStep("playing");
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
      return; // don't do a full room write — it would overwrite teacher's state
    }
    const s = read();
    if (s) write({ ...s, answers: { ...(s.answers||{}), [name]: entry } });
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
      <button className="btn btn-gold btn-full mt-3" onClick={join} disabled={joining}>
        {joining ? "Joining…" : "Join →"}
      </button>
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
              {wasCorrect?((myData.streak||0)>=2?"Correct! +1250":"Correct! +1000"):"Not quite…"}
            </div>
            {wasCorrect&&(myData.streak||0)>=2&&(
              <div style={{marginTop:"0.8rem",fontFamily:"'Fraunces',Georgia,serif",fontSize:"1.3rem",fontWeight:900,color:"var(--gold)",animation:"streakPop 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}>
                <svg width="22" height="26" viewBox="0 0 9 11" style={{display:"block"}}>
                  <path d="M4.5 10.5 Q0.5 8.5 0.5 5.5 Q0.5 3.5 2.5 1.5 Q2 4 4 4 Q4 1 5.5 0 Q5 3 7.5 3.5 Q8.5 4.5 8.5 6.5 Q8.5 8.5 4.5 10.5 Z" fill="var(--gold)" />
                </svg>
                On fire! ×{myData.streak||0}
              </div>
            )}
            {!wasCorrect&&q&&<div className="op50 mt-2" style={{fontSize:"0.88rem"}}>{q.type==="stress_battle"?`Correct: ${q.answer}`:q.type==="error_spotter"?<span>Error: <strong style={{color:"var(--coral)"}}>{q.errorWord}</strong> → <strong style={{color:"#fff"}}>{q.answer}</strong></span>:<span>Answer: <strong style={{color:"#fff"}}>{q.type==="story_builder"?q.correctOrder?.filter(i=>i<3).join(","):q.answer}</strong></span>}</div>}
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
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <button onClick={()=>{const n=!bigText;setBigText(n);writeFont(n);}} style={{background:"none",border:"1px solid rgba(255,255,255,0.18)",borderRadius:4,color:"rgba(255,255,255,0.55)",fontSize:"0.7rem",padding:"0.18rem 0.45rem",cursor:"pointer",lineHeight:1}} title="Toggle text size">{bigText?"A−":"A+"}</button>
          <div style={{textAlign:"right"}}>
            <div className="text-gold" style={{fontFamily:"'Unbounded',sans-serif",fontWeight:700,fontSize:"1.05rem"}}>{myScore.toLocaleString()} pts</div>
            {myTeam&&<div style={{fontSize:"0.68rem",color:myTeam.color}}>Team: {(teamScores[myTeam.id]||0).toLocaleString()}</div>}
          </div>
        </div>
      </div>

      {phase==="leaderboard"||phase==="end" ? (
        <StudentLeaderboard room={room} name={name} showReview={showReview} setShowReview={setShowReview} />
      ) : phase==="warmup_done" ? (
        <div style={{textAlign:"center",padding:"3rem 1rem"}}>
          <div style={{fontSize:"3rem",marginBottom:"0.8rem"}}>⏳</div>
          <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.95rem",marginBottom:"0.4rem"}}>Get ready!</h2>
          <p className="op50">Main game starting soon…</p>
          <div className="dots mt-3"><span/><span/><span/></div>
        </div>
      ) : phase==="question"&&q ? (
        <div style={{fontSize: bigText ? "1.2em" : "1em"}}>
          {/* Countdown bar */}
          {(() => {
            const total = getTimeLimit(q);
            const pct = Math.max(0, (room.timeLeft / total) * 100);
            const urgent = room.timeLeft <= 5 && !room.paused;
            return (
              <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2,marginBottom:"0.9rem",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:2,background:urgent?"var(--coral)":"var(--teal)",width:`${pct}%`,transition:"width 1s linear"}}/>
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
      ) : phase==="reveal" ? (
        <div className="text-center mt-4">
          <div style={{fontSize:"2.5rem",marginBottom:"0.8rem"}}>{myAnswer!==null?(wasCorrect?"✅":"❌"):"⏱️"}</div>
          <p className="op50">{myAnswer!==null?"Waiting for next question…":"Time's up!"}</p>
          {q&&<div className="card mt-3">
            <span className="label">Correct Answer</span>
            {q.type==="word_match" ? (
              q.pairs?.slice(0,2).map((p,i)=>(
                <div key={i} style={{display:"flex",gap:"0.5rem",marginTop:"0.28rem",fontSize:"0.88rem"}}>
                  <strong style={{color:"var(--gold)"}}>{p.word}</strong>
                  <span className="op50">→</span><span>{p.meaning}</span>
                </div>
              ))
            ) : q.type==="stress_battle" ? (
              <div style={{textAlign:"center",marginTop:"0.5rem"}}>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontWeight:900,fontSize:"1.3rem",letterSpacing:"0.08em",marginBottom:"0.8rem"}}>{q.word}</div>
                <div style={{display:"flex",gap:"1.5rem",justifyContent:"center"}}>
                  {["A","B"].map(label=>{
                    const isCorrect = label===q.answer;
                    const wrongStress = q.stressed===1?2:q.stressed===3?2:1;
                    const stressAt = isCorrect?q.stressed:wrongStress;
                    return (
                      <div key={label} style={{textAlign:"center",padding:"0.6rem 1rem",border:`2px solid ${isCorrect?"var(--gold)":"rgba(255,255,255,0.1)"}`,background:isCorrect?"rgba(232,184,75,0.1)":"transparent"}}>
                        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:"0.85rem",color:isCorrect?"var(--gold)":"rgba(255,255,255,0.35)",marginBottom:"0.4rem"}}>{label}{isCorrect?" ✓":""}</div>
                        <StressDots syllables={q.syllables} stressAt={stressAt} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : q.type==="story_builder" ? (
              <div>{(q.correctOrder||[]).filter(i=>i<3).map((idx,pos)=>(
                <div key={idx} style={{fontSize:"0.82rem",marginTop:"0.25rem"}}>
                  <span style={{color:"var(--gold)",fontWeight:700,marginRight:"0.35rem"}}>{pos+1}.</span>{q.sentences[idx]}
                </div>
              ))}</div>
            ) : (
              <div style={{fontWeight:700,fontSize:"1rem"}}>{q.answer}</div>
            )}
          </div>}
        </div>
      ) : null}
    </div>
  );
}

// ─── STUDENT ANSWER ───────────────────────────────────────────────────────────
function StudentAnswer({ q, myAnswer, onAnswer, rearranged, setRearranged, usedIdx, setUsedIdx, typeVal, setTypeVal, storyOrder, setStoryOrder, matchState, setMatchState, room }) {
  const answered = myAnswer !== null;

  // Stable shuffled meanings — only reshuffle when the actual words change
  const pairsKey = q.type==="word_match" ? (q.pairs||[]).slice(0,2).map(p=>p.word).join("|") : "";
  const [shuffledMeanings, setShuffledMeanings] = useState([]);
  useEffect(() => {
    if (q.type==="word_match" && q.pairs) setShuffledMeanings([...q.pairs.slice(0,2)].sort(()=>Math.random()-0.5));
  }, [pairsKey]);

  const [shuffledWords, setShuffledWords] = useState([]);
  useEffect(() => {
    if (q.type==="rearrange" && q.words) setShuffledWords([...q.words].sort(()=>Math.random()-0.5));
  }, [q.words?.join("|")]);

  const [twoOptions, setTwoOptions] = useState([]);
  useEffect(() => {
    if (q.type==="odd_one_out" && q.options) {
      const wrong = q.answer;
      const right = q.options.find(o=>o!==wrong);
      setTwoOptions([wrong, right].sort(()=>Math.random()-0.5));
    }
  }, [q.question]);

  const submitTyped = () => { if (typeVal.trim()) onAnswer(typeVal.trim()); };
  const submitRearranged = () => { if (rearranged.length) onAnswer(rearranged.join(" ")); };
  const submitStory = () => { if (storyOrder.length===3) onAnswer(storyOrder.join(",")); };

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
      if (Object.keys(nm).length===2) {
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
      <h2 style={{fontSize:"1.18rem",lineHeight:1.5,marginBottom:"0.9rem"}}>{q.question}</h2>

      {/* Multiple choice */}
      {q.type==="multiple_choice"&&q.options&&(
        <div className="opt-grid">
          {q.options.map((opt,i)=>(
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i}`}
              style={{opacity:answered&&myAnswer!==opt?0.28:1,outline:answered&&myAnswer===opt?"4px solid rgba(0,0,0,0.45)":"none",transition:"opacity 0.18s",animation:answered&&myAnswer===opt?"lockIn 0.38s ease":"none"}}
              onClick={()=>onAnswer(opt)}>
              <span className="opt-icon">{OPT_ICONS[i]}</span>{opt}
            </button>
          ))}
        </div>
      )}

      {/* Odd one out — 2 options */}
      {q.type==="odd_one_out"&&twoOptions.length===2&&(
        <div className="opt-grid">
          {twoOptions.map((opt,i)=>(
            <button key={i} disabled={answered}
              className={`opt-btn opt-${i}`}
              style={{opacity:answered&&myAnswer!==opt?0.28:1,outline:answered&&myAnswer===opt?"4px solid rgba(0,0,0,0.45)":"none",transition:"opacity 0.18s",animation:answered&&myAnswer===opt?"lockIn 0.38s ease":"none"}}
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
              className={`btn ${v==="True"?"btn-green":"btn-coral"} btn-full`}
              style={{
                fontSize:"1.15rem", padding:"1.2rem", flex:1,
                opacity: answered && myAnswer!==v ? 0.28 : 1,
                outline: answered && myAnswer===v ? "4px solid rgba(255,255,255,0.7)" : "none",
                animation: answered && myAnswer===v ? "lockIn 0.38s ease" : "none",
                transition:"opacity 0.18s"
              }}
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

      {/* Fill idiom — multiple choice */}
      {q.type==="fill_idiom"&&(
        <div>
          {q.hint&&<p className="op50 mb-1" style={{fontSize:"0.82rem",fontStyle:"italic"}}>💡 {q.hint}</p>}
          <div className="opt-grid">
            {(q.options||[]).map((opt,i)=>(
              <button key={i} disabled={answered}
                className={`opt-btn opt-${i}`}
                style={{
                  opacity: answered && myAnswer!==opt ? 0.28 : 1,
                  outline: answered && myAnswer===opt ? "4px solid rgba(0,0,0,0.45)" : "none",
                  animation: answered && myAnswer===opt ? "lockIn 0.38s ease" : "none",
                  transition:"opacity 0.18s"
                }}
                onClick={()=>onAnswer(opt)}>
                <span className="opt-icon">{OPT_ICONS[i]}</span>{opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type answer */}
      {q.type==="type_answer"&&(
        <div>
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
            {(shuffledWords.length?shuffledWords:q.words||[]).map((w,i)=>(
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
          {q.sentences.slice(0,3).map((s,i)=>(
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
            <button className="btn btn-teal" disabled={answered||storyOrder.length!==3} onClick={submitStory}>
              {answered?"✓ Submitted":"Submit Order →"}
            </button>
          </div>
        </div>
      )}

      {/* Word match */}
      {q.type==="word_match"&&q.pairs&&(
        <div>
          <p className="op50 mb-2" style={{fontSize:"0.82rem"}}>Tap a word, then tap its meaning.</p>
          <div className="flex gap-2">
            <div style={{flex:1}}>
              <span className="label">Words</span>
              {q.pairs.slice(0,2).map((p,i)=>{
                const m = matchState.matched[p.word];
                return (
                  <div key={i} className={`match-word ${matchState.sel===p.word?"selected":""} ${m?(m.correct?"matched-correct":"matched-wrong"):""}`}
                    style={{minHeight:52,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.95rem",fontWeight:600}}
                    onClick={()=>!m&&!answered&&handleMatch("word",p.word)}>
                    {p.word}
                  </div>
                );
              })}
            </div>
            <div style={{flex:1}}>
              <span className="label">Meanings</span>
              {shuffledMeanings.map((p,i)=>{
                const isMatched = Object.values(matchState.matched).some(m=>m.meaning===p.meaning);
                const entry = Object.entries(matchState.matched).find(([,m])=>m.meaning===p.meaning);
                return (
                  <div key={p.meaning} className={`match-word ${isMatched?(entry?.[1]?.correct?"matched-correct":"matched-wrong"):""}`}
                    style={{minHeight:52,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.82rem"}}
                    onClick={()=>!isMatched&&!answered&&handleMatch("meaning",p.meaning)}>
                    {p.meaning}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stress battle */}
      {q.type==="stress_battle"&&(
        <div>
          <div style={{textAlign:"center",fontFamily:"'Unbounded',sans-serif",fontSize:"clamp(2rem,10vw,3.5rem)",fontWeight:900,letterSpacing:"0.1em",color:"var(--gold)",marginBottom:"2rem"}}>{q.word}</div>
          <div style={{display:"flex",gap:"1rem"}}>
            {["A","B"].map(label=>{
              const wrongStress = q.stressed===1?2:q.stressed===3?2:1;
              const stressAt = label===q.answer?q.stressed:wrongStress;
              return (
                <button key={label} disabled={answered}
                  style={{
                    flex:1, padding:"1.5rem 1rem",
                    border:`3px solid ${myAnswer===label?"var(--gold)":"rgba(255,255,255,0.2)"}`,
                    background:myAnswer===label?"rgba(232,184,75,0.15)":"rgba(255,255,255,0.04)",
                    color:"#fff", cursor:answered?"default":"pointer",
                    opacity:answered&&myAnswer!==label?0.28:1,
                    animation:answered&&myAnswer===label?"lockIn 0.38s ease":"none",
                    transition:"all 0.15s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:"0.9rem"
                  }}
                  onClick={()=>onAnswer(label)}>
                  <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:"1.5rem",fontWeight:700}}>{label}</span>
                  <StressDots syllables={q.syllables} stressAt={stressAt} size="lg" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {answered&&<p className="text-center op50 mt-3" style={{fontSize:"0.82rem"}}>✓ Answer submitted — waiting for others…</p>}
    </div>
  );
}

// ─── STUDENT LEADERBOARD ──────────────────────────────────────────────────────
function StudentLeaderboard({ room, name, showReview, setShowReview }) {
  const sorted = Object.entries(room?.players||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  const myPos = sorted.findIndex(([n])=>n===name);
  const teamScores = getTeamScores(room||{});
  const mode = room?.mode;
  const isEnd = room?.phase === "end";

  const buildSummary = (questions, topic) => {
    const lines = [`=== English Arena · ${topic} ===\n`];
    questions.forEach((q, i) => {
      lines.push(`Q${i+1}. ${q.question}${q.sentence ? " " + q.sentence : ""}`);
      const ans = q.type==="error_spotter" ? `${q.errorWord} → ${q.answer}` :
                  q.type==="story_builder" ? `Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}` :
                  q.type==="word_match" ? "Match all pairs correctly" : q.answer;
      lines.push(`Answer: ${ans}`);
      if (q.explanation) lines.push(`Note: ${q.explanation}`);
      lines.push("");
    });
    return lines.join("\n");
  };

  const reviewSection = isEnd && setShowReview ? (
    <>
      <button className="btn btn-ghost btn-full mt-3" onClick={()=>setShowReview(v=>!v)}>
        📚 {showReview ? "Hide" : "Review"} Questions
      </button>
      {showReview && (() => {
        const mainQs = (room.questions||[]).filter(q=>!q._warmup);
        return (
          <div className="card mt-2" style={{maxHeight:"55vh",overflowY:"auto"}}>
            <button className="btn btn-ghost btn-sm mb-3" onClick={()=>navigator.clipboard.writeText(buildSummary(mainQs, room.topic||""))}>
              📋 Copy as text
            </button>
            {mainQs.map((q,i)=>(
              <div key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.07)",paddingBottom:"0.7rem",marginBottom:"0.7rem"}}>
                <div style={{fontWeight:700,fontSize:"0.83rem",lineHeight:1.4}}>Q{i+1}. {q.question}{q.sentence?" "+q.sentence:""}</div>
                <div style={{color:"var(--teal)",fontSize:"0.78rem",marginTop:"0.2rem"}}>✔ {q.type==="error_spotter"?`${q.errorWord} → ${q.answer}`:q.type==="story_builder"?`Order: ${(q.correctOrder||[]).filter(x=>x<3).join(",")}`:q.type==="word_match"?"Match all pairs":q.answer}</div>
                {q.explanation&&<div className="op50" style={{fontSize:"0.74rem",marginTop:"0.15rem",lineHeight:1.4}}>{q.explanation}</div>}
              </div>
            ))}
          </div>
        );
      })()}
    </>
  ) : null;

  if (mode==="teams") {
    const usedTeams = TEAMS.filter(t=>Object.values(room.players||{}).some(p=>p.team===t.id));
    const tSorted = [...usedTeams].sort((a,b)=>(teamScores[b.id]||0)-(teamScores[a.id]||0));
    const myTeam = room.players?.[name]?.team ? TEAMS.find(t=>t.id===room.players[name].team) : null;
    return (
      <div>
        <h2 className="text-center text-gold mb-3" style={{fontSize:"1.2rem"}}>{isEnd?"🏆 Final":"📊 Scores"}</h2>
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
        {reviewSection}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-gold mb-3" style={{fontSize:"1.2rem"}}>{isEnd?"🏆 Final":"📊 Scores"}</h2>
      {sorted.map(([n,p],i)=>(
        <div key={n} className="lb-row" style={{
          borderLeftColor:n===name?"var(--gold)":i===0?"var(--gold)":i===1?"#c0c0c0":i===2?"#cd7f32":"rgba(255,255,255,0.08)",
          background:n===name?"rgba(232,184,75,0.09)":"transparent",
          animationDelay:`${i*0.06}s`
        }}>
          <span className="lb-rank">{MEDAL[i]||`#${i+1}`}</span>
          <span className="lb-name">{n}{n===name&&<span className="text-gold"> ← you</span>}</span>
          {n===room?.firstCorrect&&<span title="First correct answer!" style={{fontSize:"0.8rem"}}>⚡</span>}
          {(p.streak||0)>1&&<span style={{fontSize:"0.82rem"}}>🔥</span>}
          <span className="lb-score">{(p.score||0).toLocaleString()}</span>
        </div>
      ))}
      {myPos>=0&&<p className="text-center op30 mt-2" style={{fontSize:"0.78rem"}}>#{myPos+1} of {sorted.length} players</p>}
      {reviewSection}
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
