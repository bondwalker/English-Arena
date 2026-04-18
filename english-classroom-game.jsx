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

// ─── Question Bank ────────────────────────────────────────────────────────────
const QUESTION_BANK = {
  "travel_holidays": { label: "Travel & Holidays", questions: [
    {type:"multiple_choice",question:"Which phrase is correct when booking a hotel?",options:["I'd like to reserve a room.","I'd like to reserving a room.","I'd like reserve a room.","I'd like reserved a room."],answer:"I'd like to reserve a room.",explanation:"After 'would like' use 'to + infinitive'."},
    {type:"multiple_choice",question:"Choose the correct sentence about a past trip.",options:["We have visited Rome last summer.","We visited Rome last summer.","We are visiting Rome last summer.","We visit Rome last summer."],answer:"We visited Rome last summer.",explanation:"'Last summer' is finished, so use past simple."},
    {type:"multiple_choice",question:"Which question asks about flight departure time?",options:["What time does the plane departure?","What time does the plane depart?","What time is the plane departed?","What time did the plane departing?"],answer:"What time does the plane depart?",explanation:"With 'does', use the bare infinitive 'depart'."},
    {type:"true_false",question:"'She has been to Paris twice' means she is currently in Paris.",answer:"False",explanation:"'Has been to' means she visited and came back. 'Has gone to' means she is still there."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We arrived to the airport two hours early.",errorWord:"to",answer:"at",explanation:"'Arrive at' is used for specific places like airports."},
    {type:"type_answer",question:"Complete: By the time we ___ (reach) the gate, the flight had already boarded.",answer:"reached",explanation:"Past simple in a past perfect structure."},
    {type:"type_answer",question:"Complete: I always feel nervous when I ___ (fly), even on short trips.",answer:"fly",explanation:"Present simple for repeated habits."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["I","have","never","been","abroad","before"],answer:"I have never been abroad before",explanation:"Frequency adverbs go between the auxiliary and past participle."},
    {type:"story_builder",question:"Order these sentences into a story:",sentences:["They finally checked in and collapsed on the hotel beds.","Their flight was delayed by three hours.","Sara and Tom left home at five in the morning.","After landing, they waited an hour for their luggage."],correctOrder:[2,1,3,0],answer:"2,1,3,0",explanation:"Left home → delay → waited for luggage → checked in."},
    {type:"fill_idiom",question:"Complete: After the long journey I felt a bit under the ___.",answer:"weather",hint:"feeling slightly unwell",explanation:"'Under the weather' means feeling slightly unwell or tired."},
    {type:"word_match",question:"Match travel words with their meanings:",pairs:[{word:"itinerary",meaning:"a planned travel schedule"},{word:"layover",meaning:"a stop between flights"},{word:"passport",meaning:"an official travel document"},{word:"customs",meaning:"border control for goods"}],answer:"match_all",explanation:"Essential travel vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["Have you ever travelled to Asia?","She went to Greece last year.","They have visited Spain in 2019.","He has never been on a cruise."],answer:"They have visited Spain in 2019.",explanation:"Present perfect cannot be used with '2019'. Use past simple: 'They visited Spain in 2019.'"},
  ]},
  "work_office": { label: "Work & the Office", questions: [
    {type:"multiple_choice",question:"Which sentence correctly describes an ongoing project?",options:["I work on this report since Monday.","I am working on this report since Monday.","I have been working on this report since Monday.","I worked on this report since Monday."],answer:"I have been working on this report since Monday.",explanation:"Present perfect continuous + 'since' for ongoing actions that started in the past."},
    {type:"multiple_choice",question:"Your colleague asks: 'Can you cover ___ me on Friday?'",options:["to","for","with","of"],answer:"for",explanation:"'Cover for someone' means to do their work while they are absent."},
    {type:"multiple_choice",question:"Which is the most appropriate opening for a formal email?",options:["Hey, got your message!","Dear Ms Brown, I am writing to enquire about…","Yo, what's the update?","Hi, just checking in!"],answer:"Dear Ms Brown, I am writing to enquire about…",explanation:"Formal emails begin with a salutation and a clear statement of purpose."},
    {type:"true_false",question:"'Let's touch base later' is a formal farewell phrase used in business meetings.",answer:"False",explanation:"'Touch base' means to briefly check in. It is informal business jargon, not a farewell."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The manager told us to sending the report by Friday.",errorWord:"sending",answer:"send",explanation:"After 'tell someone to', use the bare infinitive."},
    {type:"type_answer",question:"Complete: She was promoted ___ senior manager after only two years.",answer:"to",explanation:"'Promoted to' is the correct collocation."},
    {type:"type_answer",question:"Complete: Could you please ___ (send) me the agenda before the meeting?",answer:"send",explanation:"'Could you please + bare infinitive' is a polite request."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","called","an","emergency","meeting"],answer:"she called an emergency meeting",explanation:"Subject + verb + article + adjective + noun."},
    {type:"story_builder",question:"Order these sentences to describe a job interview:",sentences:["He shook hands with the interviewer and thanked her.","David researched the company the night before.","She offered him the job two days later.","He answered questions about his experience confidently."],correctOrder:[1,3,0,2],answer:"1,3,0,2",explanation:"Preparation → answered questions → polite goodbye → job offer."},
    {type:"fill_idiom",question:"Complete: I have a lot on my ___ this week — three deadlines!",answer:"plate",hint:"very busy with many tasks",explanation:"'Have a lot on your plate' means to have many responsibilities to deal with."},
    {type:"word_match",question:"Match workplace terms with their meanings:",pairs:[{word:"deadline",meaning:"the latest time to finish a task"},{word:"agenda",meaning:"a list of topics for a meeting"},{word:"appraisal",meaning:"a formal review of performance"},{word:"delegate",meaning:"to give tasks to others"}],answer:"match_all",explanation:"Key office vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["We need to meet the deadline.","She has been promoted last month.","He works from home on Fridays.","They are reviewing the budget now."],answer:"She has been promoted last month.",explanation:"'Last month' is finished. Use past simple: 'She was promoted last month.'"},
  ]},
  "cooking_recipes": { label: "Cooking & Recipes", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'used to' correctly?",options:["I used to eating meat, but now I'm vegetarian.","I used to eat meat, but now I'm vegetarian.","I use to eat meat, but now I'm vegetarian.","I used eating meat, but now I'm vegetarian."],answer:"I used to eat meat, but now I'm vegetarian.",explanation:"'Used to + bare infinitive' describes a past habit that no longer happens."},
    {type:"multiple_choice",question:"What does 'fold in the egg whites' mean in a recipe?",options:["Whisk the egg whites vigorously.","Gently mix without losing air.","Boil the egg whites first.","Separate and discard the whites."],answer:"Gently mix without losing air.",explanation:"'Fold in' means to mix gently to preserve air in the mixture."},
    {type:"multiple_choice",question:"Which recipe instruction is grammatically correct?",options:["Simmer the sauce for 20 minutes with the lid on.","Simmering the sauce 20 minutes with the lid.","Simmer the sauce for 20 minutes with lid.","The sauce should simmered for 20 minutes."],answer:"Simmer the sauce for 20 minutes with the lid on.",explanation:"Recipe instructions use the imperative form."},
    {type:"true_false",question:"'Chop' and 'slice' mean exactly the same thing in cooking.",answer:"False",explanation:"'Chop' means to cut into rough pieces; 'slice' means to cut into thin, flat pieces."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"You need to add the eggs one by one and mix it well.",errorWord:"it",answer:"them",explanation:"'Eggs' is plural, so use 'them', not 'it'."},
    {type:"type_answer",question:"Complete: The vegetables should ___ (steam) for about five minutes.",answer:"be steamed",explanation:"Passive voice: 'should be + past participle'."},
    {type:"type_answer",question:"Complete: If you ___ (add) too much salt, the dish will be ruined.",answer:"add",explanation:"First conditional: if + present simple, will + bare infinitive."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","dough","needs","to","rest","for","an","hour"],answer:"the dough needs to rest for an hour",explanation:"Subject + needs to + infinitive + time phrase."},
    {type:"story_builder",question:"Order these sentences to describe making pasta:",sentences:["She served it with fresh basil and parmesan.","Maria boiled a large pot of salted water.","She added the pasta and cooked it for ten minutes.","While waiting, she prepared the tomato sauce."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Boil water → prepare sauce → cook pasta → serve."},
    {type:"fill_idiom",question:"Complete: Too many ___ spoil the broth.",answer:"cooks",hint:"too many people involved causes problems",explanation:"'Too many cooks spoil the broth' means too many people involved makes a task worse."},
    {type:"word_match",question:"Match cooking terms with their meanings:",pairs:[{word:"sauté",meaning:"fry quickly in a little oil"},{word:"marinate",meaning:"soak food in seasoned liquid"},{word:"blanch",meaning:"briefly boil then cool in cold water"},{word:"garnish",meaning:"decorate a dish before serving"}],answer:"match_all",explanation:"Key cooking technique vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The cake was baked for 30 minutes.","She has cooked dinner every night this week.","We used fresh herbs from the garden.","He have never tried sushi before."],answer:"He have never tried sushi before.",explanation:"Third person singular: 'He has never tried sushi before.'"},
  ]},
  "health_wellbeing": { label: "Health & Wellbeing", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'should' correctly?",options:["You should to exercise more regularly.","You should exercising more regularly.","You should exercise more regularly.","You should exercises more regularly."],answer:"You should exercise more regularly.",explanation:"Modal verbs like 'should' are followed by the bare infinitive."},
    {type:"multiple_choice",question:"What does 'cut down on' something mean?",options:["To stop doing it completely.","To reduce the amount you do or consume.","To increase it gradually.","To replace it with something else."],answer:"To reduce the amount you do or consume.",explanation:"'Cut down on' means to reduce, not stop entirely."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I have been feeling tired since a week.","I have been feeling tired for a week.","I am feeling tired since a week.","I felt tired since a week."],answer:"I have been feeling tired for a week.",explanation:"Use 'for' with a period of time; 'since' with a specific point in time."},
    {type:"true_false",question:"'Aerobic exercise' only refers to activities done inside a gym.",answer:"False",explanation:"Aerobic exercise includes any sustained activity raising your heart rate — walking, cycling, swimming."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The doctor advised her to takes regular breaks from the screen.",errorWord:"takes",answer:"take",explanation:"'Advise someone to' is followed by the bare infinitive."},
    {type:"type_answer",question:"Complete: Doctors recommend that people ___ (drink) at least eight glasses of water a day.",answer:"drink",explanation:"After 'recommend that', use the base form."},
    {type:"type_answer",question:"Complete: You shouldn't ___ (eat) a heavy meal just before bed.",answer:"eat",explanation:"'Shouldn't + bare infinitive' gives negative advice."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["getting","enough","sleep","is","essential","for","good","health"],answer:"getting enough sleep is essential for good health",explanation:"Gerund phrase as subject + is + adjective + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences to describe a lifestyle change:",sentences:["Now she feels more energetic and sleeps much better.","Anna decided to improve her lifestyle last January.","She also joined a yoga class and started meditating.","She began by cutting out sugary drinks and walking daily."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Decision → first changes → added more habits → result."},
    {type:"fill_idiom",question:"Complete: After the race, the runners were completely out of ___.",answer:"breath",hint:"struggling to breathe after exertion",explanation:"'Out of breath' means breathing with difficulty after physical effort."},
    {type:"word_match",question:"Match health words with their meanings:",pairs:[{word:"immune",meaning:"protected against disease"},{word:"chronic",meaning:"lasting a long time or recurring"},{word:"sedentary",meaning:"spending a lot of time sitting"},{word:"remedy",meaning:"a treatment for an illness"}],answer:"match_all",explanation:"Key health and wellbeing vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been going to the gym three times a week.","He feels better since he quit smoking.","They walk to work every morning.","She have lost five kilos this month."],answer:"She have lost five kilos this month.",explanation:"Third person singular: 'She has lost five kilos this month.'"},
  ]},
  "technology_gadgets": { label: "Technology & Gadgets", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses the present perfect?",options:["Smartphones have become essential in the last decade.","Smartphones became essential in the last decade.","Smartphones are becoming essential in the last decade.","Smartphones had become essential in the last decade."],answer:"Smartphones have become essential in the last decade.",explanation:"Present perfect with 'in the last decade' for a recent ongoing trend."},
    {type:"multiple_choice",question:"What does 'stream' mean in the context of technology?",options:["To download a file and save it permanently.","To watch or listen to content online without downloading.","To share a file with another user.","To delete files from the cloud."],answer:"To watch or listen to content online without downloading.",explanation:"Streaming means consuming media in real time from the internet."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I need to charge my phone — it's running out of battery.","I need to charge my phone — it's running out from battery.","I need to charge my phone — it's running out battery.","I need to charge my phone — it running out of battery."],answer:"I need to charge my phone — it's running out of battery.",explanation:"The correct phrasal verb is 'run out of' + noun."},
    {type:"true_false",question:"'Uploading' and 'downloading' mean the same thing.",answer:"False",explanation:"Uploading = sending data to the internet. Downloading = receiving data from the internet to your device."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She spends too many time on social media every day.",errorWord:"many",answer:"much",explanation:"'Time' is uncountable, so use 'much', not 'many'."},
    {type:"type_answer",question:"Complete: The new software ___ (release) next month.",answer:"will be released",explanation:"Passive future: 'will be + past participle'."},
    {type:"type_answer",question:"Complete: Have you ever ___ (lose) all your data because you forgot to back up?",answer:"lost",explanation:"Present perfect uses the past participle."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["you","should","back","up","your","files","regularly"],answer:"you should back up your files regularly",explanation:"Subject + modal + phrasal verb + object + adverb."},
    {type:"story_builder",question:"Order these sentences about getting a new laptop:",sentences:["Within a few days, it had become her favourite device.","She researched different models online for two weeks.","She set it up and transferred her files from the old laptop.","Finally, she ordered a laptop and it arrived the next day."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Research → order → set up → settled in."},
    {type:"fill_idiom",question:"Complete: Learning all these new apps can feel like information ___.",answer:"overload",hint:"too much data to process at once",explanation:"'Information overload' means having too much data to process comfortably."},
    {type:"word_match",question:"Match tech terms with their meanings:",pairs:[{word:"bandwidth",meaning:"the capacity for data transfer"},{word:"cursor",meaning:"the moving pointer on a screen"},{word:"encrypt",meaning:"to convert data into a secure code"},{word:"interface",meaning:"the way a user interacts with a device"}],answer:"match_all",explanation:"Key technology vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has updated her phone's software.","They launched the app last Tuesday.","He use his tablet for reading every evening.","We upgraded the network last year."],answer:"He use his tablet for reading every evening.",explanation:"Third person singular: 'He uses his tablet for reading.'"},
  ]},
  "the_environment": { label: "The Environment", questions: [
    {type:"multiple_choice",question:"Which word correctly completes: 'Carbon dioxide is one of the main gases responsible ___ climate change.'?",options:["of","for","about","with"],answer:"for",explanation:"'Responsible for' is the correct collocation."},
    {type:"multiple_choice",question:"What does 'carbon footprint' mean?",options:["The physical size of a factory.","The total greenhouse gases produced by a person or activity.","A type of renewable energy.","The area of land used for farming."],answer:"The total greenhouse gases produced by a person or activity.",explanation:"A carbon footprint measures environmental impact in terms of greenhouse gas emissions."},
    {type:"multiple_choice",question:"Which sentence is grammatically correct?",options:["Deforestation is causing many species to become extinct.","Deforestation is causing many species becoming extinct.","Deforestation causes many species become extinct.","Deforestation is cause many species to be extinct."],answer:"Deforestation is causing many species to become extinct.",explanation:"'Cause + object + to + infinitive' is the correct structure."},
    {type:"true_false",question:"Renewable energy sources include solar, wind, and nuclear power.",answer:"False",explanation:"Nuclear power is not renewable — it uses uranium, a finite resource. Solar, wind, and hydro are renewable."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The government should do more to reducing pollution in cities.",errorWord:"reducing",answer:"reduce",explanation:"After 'to' as part of an infinitive, use the bare infinitive: 'to reduce'."},
    {type:"type_answer",question:"Complete: Rainforests ___ (absorb) large amounts of carbon dioxide from the atmosphere.",answer:"absorb",explanation:"Present simple for general scientific facts."},
    {type:"type_answer",question:"Complete: The sea level has been ___ (rise) steadily for the past century.",answer:"rising",explanation:"Present perfect continuous: 'has been + -ing form'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["we","should","use","less","plastic","in","our","daily","lives"],answer:"we should use less plastic in our daily lives",explanation:"Subject + modal + verb + object + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about a recycling project:",sentences:["The amount of waste sent to landfill dropped by 40%.","A local school started a recycling programme three years ago.","Students collected paper, plastic, and glass separately.","Local businesses joined and donated recycling containers."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Programme starts → students collect → businesses join → results improve."},
    {type:"fill_idiom",question:"Complete: It is time to go ___ and reduce our impact on the planet.",answer:"green",hint:"becoming more environmentally friendly",explanation:"'Go green' means to adopt environmentally friendly practices."},
    {type:"word_match",question:"Match environment words with their meanings:",pairs:[{word:"emission",meaning:"gases released into the atmosphere"},{word:"biodegradable",meaning:"able to break down naturally"},{word:"sustainable",meaning:"able to continue without harming the environment"},{word:"drought",meaning:"a long period with little or no rain"}],answer:"match_all",explanation:"Key environmental vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["Pollution levels have fallen in the city centre.","Many animals are threatened by habitat loss.","The river have become much cleaner in recent years.","Scientists are studying the effects of climate change."],answer:"The river have become much cleaner in recent years.",explanation:"'River' is singular: 'The river has become much cleaner.'"},
  ]},
  "sports_fitness": { label: "Sports & Fitness", questions: [
    {type:"multiple_choice",question:"Which sentence correctly talks about a past score?",options:["The team wins 3-1 yesterday.","The team won 3-1 yesterday.","The team has won 3-1 yesterday.","The team winning 3-1 yesterday."],answer:"The team won 3-1 yesterday.",explanation:"'Yesterday' is a finished time reference, so use past simple."},
    {type:"multiple_choice",question:"What does 'personal best' (PB) mean in sport?",options:["A trophy given to the best player.","The fastest or best result a person has ever achieved.","A personal trainer's recommendation.","A record set at a national level."],answer:"The fastest or best result a person has ever achieved.",explanation:"A personal best refers to an individual's top performance in a sport."},
    {type:"multiple_choice",question:"Choose the correct sentence about training:",options:["She's been training for the marathon since six months.","She's been training for the marathon for six months.","She trains for the marathon since six months.","She trained for the marathon for six months ago."],answer:"She's been training for the marathon for six months.",explanation:"Present perfect continuous + 'for' + duration for an ongoing activity."},
    {type:"true_false",question:"In football (soccer), a 'hat-trick' means scoring three goals in one game.",answer:"True",explanation:"A hat-trick is when a player scores three goals in a single match."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He trains hardly every morning before work.",errorWord:"hardly",answer:"hard",explanation:"'Hard' is the correct adverb meaning 'with great effort'. 'Hardly' means 'almost not at all'."},
    {type:"type_answer",question:"Complete: The athlete ___ (break) the world record by two seconds.",answer:"broke",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: She ___ (play) tennis since childhood.",answer:"has played",explanation:"Present perfect + 'since' for an activity that started in the past and continues."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","has","played","tennis","since","childhood"],answer:"she has played tennis since childhood",explanation:"Subject + present perfect + object + since + time reference."},
    {type:"story_builder",question:"Order these sentences about preparing for a race:",sentences:["He crossed the finish line and raised his arms in celebration.","Tom signed up for a 10km race six months ago.","He trained three times a week and followed a strict diet.","On race day, he felt nervous but excited at the start line."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Sign up → train → race day nerves → finish line."},
    {type:"fill_idiom",question:"Complete: After the injury, he found it hard to get back on his ___.",answer:"feet",hint:"recovering and becoming active again",explanation:"'Get back on your feet' means to recover and return to normal after a setback."},
    {type:"word_match",question:"Match sports words with their meanings:",pairs:[{word:"stamina",meaning:"the ability to sustain effort for a long time"},{word:"opponent",meaning:"the person you compete against"},{word:"referee",meaning:"the official who enforces the rules"},{word:"tournament",meaning:"a series of competitions to find an overall winner"}],answer:"match_all",explanation:"Key sports vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The coach gave the team some useful advice.","She won a silver medal at the championships.","They has been playing football together for years.","He improved his technique after several weeks of training."],answer:"They has been playing football together for years.",explanation:"'They' takes 'have': 'They have been playing together for years.'"},
  ]},
  "family_life": { label: "Family Life", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'be used to' correctly?",options:["We are used to live in a smaller flat.","We are used to living in a smaller flat.","We used to living in a smaller flat.","We use to living in a smaller flat."],answer:"We are used to living in a smaller flat.",explanation:"'Be used to + gerund (-ing)' means to be accustomed to something."},
    {type:"multiple_choice",question:"What does 'keep in touch' mean?",options:["To argue with someone frequently.","To maintain regular contact with someone.","To take care of a younger family member.","To avoid contact with someone."],answer:"To maintain regular contact with someone.",explanation:"'Keep in touch' means to stay in regular communication."},
    {type:"multiple_choice",question:"Which sentence is correct?",options:["My parents have got married for 30 years.","My parents have been married for 30 years.","My parents are married since 30 years.","My parents married since 30 years."],answer:"My parents have been married for 30 years.",explanation:"State verbs like 'be married' use present perfect + 'for' to describe duration up to now."},
    {type:"true_false",question:"'My sister-in-law' is my brother's wife.",answer:"True",explanation:"Your sister-in-law is your brother's or sister's wife, or your spouse's sister."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"My grandmother used to tells us stories every evening.",errorWord:"tells",answer:"tell",explanation:"'Used to' is followed by the bare infinitive: 'used to tell'."},
    {type:"type_answer",question:"Complete: Despite growing up in different cities, the twins ___ (look) remarkably alike.",answer:"look",explanation:"Present simple for a current fact."},
    {type:"type_answer",question:"Complete: She ___ (bring up) by her grandparents after her parents moved abroad.",answer:"was brought up",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["my","parents","got","married","in","a","small","village","church"],answer:"my parents got married in a small village church",explanation:"Subject + verb + past participle + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about a family reunion:",sentences:["Everyone agreed it had been the best family gathering in years.","The family decided to hold a reunion for their grandmother's 80th birthday.","Relatives travelled from as far as Australia and Canada.","They spent the weekend sharing meals, stories, and old photographs."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → relatives arrive → weekend activities → final agreement."},
    {type:"fill_idiom",question:"Complete: Don't worry about the argument — it's just a storm in a ___.",answer:"teacup",hint:"a lot of fuss about something unimportant",explanation:"'A storm in a teacup' means a big reaction to a small or unimportant problem."},
    {type:"word_match",question:"Match family words with their meanings:",pairs:[{word:"sibling",meaning:"a brother or sister"},{word:"guardian",meaning:"a person legally responsible for a child"},{word:"estranged",meaning:"no longer in contact with family"},{word:"household",meaning:"all the people living together in a home"}],answer:"match_all",explanation:"Key family life vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has two younger brothers and one older sister.","They moved to a bigger house when their third child was born.","He look just like his father — same eyes and smile.","We get together for dinner every Sunday."],answer:"He look just like his father — same eyes and smile.",explanation:"Third person singular: 'He looks just like his father.'"},
  ]},
  "education_studying": { label: "Education & Studying", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'by' correctly?",options:["You need to submit the essay until Friday.","You need to submit the essay by Friday.","You need to submit the essay before to Friday.","You need to submit the essay on Friday before."],answer:"You need to submit the essay by Friday.",explanation:"'By' means no later than. 'Until' means up to a point in time and then it stops."},
    {type:"multiple_choice",question:"What does 'take notes' mean?",options:["To write down key points while listening or reading.","To copy an entire textbook chapter.","To send a message to a classmate.","To hand in an assignment."],answer:"To write down key points while listening or reading.",explanation:"'Take notes' means to record key information during a lesson or from a text."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's studying hard for her exam that will be next week.","She's studying hard for her exam next week.","She studies hard for her exam that it is next week.","She studied hard for her next week exam."],answer:"She's studying hard for her exam next week.",explanation:"'Next week' acts as a time adverbial without needing 'that will be'."},
    {type:"true_false",question:"A 'thesis' is the same as a short weekly homework assignment.",answer:"False",explanation:"A thesis is a long academic research document submitted for a university degree, not a short homework task."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The students were made to copied the text three times.",errorWord:"copied",answer:"copy",explanation:"After 'be made to', use the bare infinitive: 'were made to copy'."},
    {type:"type_answer",question:"Complete: If I had studied harder, I ___ (pass) the exam.",answer:"would have passed",explanation:"Third conditional: 'if + past perfect, would have + past participle'."},
    {type:"type_answer",question:"Complete: The lecture will be ___ (record) so you can watch it later online.",answer:"recorded",explanation:"Passive voice: 'will be + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["students","are","expected","to","hand","in","assignments","on","time"],answer:"students are expected to hand in assignments on time",explanation:"Passive + infinitive structure: 'are expected to + verb'."},
    {type:"story_builder",question:"Order these sentences about a student's first week at university:",sentences:["By the end of the week, she felt settled and excited about the year ahead.","Emma arrived at her new university on a sunny Monday morning.","She attended her first lectures and met her tutors.","In the evenings, she met her flatmates and explored the campus."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Arrival → lectures and tutors → evenings on campus → settled in."},
    {type:"fill_idiom",question:"Complete: Learning a language from scratch is no ___ in the park.",answer:"walk",hint:"not easy at all",explanation:"'No walk in the park' means something that is not easy or straightforward."},
    {type:"word_match",question:"Match education words with their meanings:",pairs:[{word:"curriculum",meaning:"the subjects included in a course of study"},{word:"tutor",meaning:"a teacher who works with students individually"},{word:"plagiarism",meaning:"copying someone else's work without permission"},{word:"semester",meaning:"half of an academic year"}],answer:"match_all",explanation:"Key academic vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She passed all her exams with distinction.","The students have been studying this topic since September.","He submitted his assignment two days before the deadline.","They has already learnt three programming languages."],answer:"They has already learnt three programming languages.",explanation:"'They' takes 'have': 'They have already learnt three programming languages.'"},
  ]},
  "money_banking": { label: "Money & Banking", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'afford' correctly?",options:["We can't afford buying a new car right now.","We can't afford to buy a new car right now.","We can't afford buy a new car right now.","We can't afford bought a new car right now."],answer:"We can't afford to buy a new car right now.",explanation:"'Afford' is followed by 'to + infinitive'."},
    {type:"multiple_choice",question:"What does 'go into debt' mean?",options:["To save a large amount of money.","To invest money wisely.","To owe more money than you have.","To earn a regular salary."],answer:"To owe more money than you have.",explanation:"'Go into debt' means to owe money, often to a bank or lender."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I've been saving money since three months to go on holiday.","I've been saving money for three months to go on holiday.","I save money since three months to go on holiday.","I saved money for three months ago to go on holiday."],answer:"I've been saving money for three months to go on holiday.",explanation:"Present perfect continuous + 'for' + duration for an ongoing action."},
    {type:"true_false",question:"An 'overdraft' means your bank account has more money than you expected.",answer:"False",explanation:"An overdraft means your balance has gone below zero — you owe money to the bank."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She borrowed her friend some money to pay the rent.",errorWord:"borrowed",answer:"lent",explanation:"'Borrow' means to take; 'lend' means to give. She gave money, so 'lent' is correct."},
    {type:"type_answer",question:"Complete: You should always ___ (compare) prices before making a big purchase.",answer:"compare",explanation:"After 'should', use the bare infinitive."},
    {type:"type_answer",question:"Complete: The mortgage ___ (pay) off in 25 years if we keep up the monthly payments.",answer:"will be paid",explanation:"Passive future: 'will be + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","decided","to","open","a","savings","account","last","year"],answer:"she decided to open a savings account last year",explanation:"Subject + decided to + infinitive + object + time expression."},
    {type:"story_builder",question:"Order these sentences about budgeting for a holiday:",sentences:["They booked the flights and hotel and celebrated that evening.","James and his partner decided to save for a two-week holiday.","They created a budget and set aside money each month.","After six months, they had saved enough for the trip."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → budget → save → book."},
    {type:"fill_idiom",question:"Complete: That restaurant is expensive — it costs an arm and a ___.",answer:"leg",hint:"very expensive",explanation:"'Cost an arm and a leg' means to be extremely expensive."},
    {type:"word_match",question:"Match financial terms with their meanings:",pairs:[{word:"interest",meaning:"money charged for borrowing"},{word:"receipt",meaning:"a document confirming payment"},{word:"budget",meaning:"a plan for spending money"},{word:"invoice",meaning:"a bill sent by a business for services"}],answer:"match_all",explanation:"Key financial vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He transferred money to his sister's account.","They have been saving for a deposit for two years.","The bank have approved her loan application.","She withdrew cash from the ATM."],answer:"The bank have approved her loan application.",explanation:"'Bank' is singular: 'The bank has approved her loan application.'"},
  ]},
  "shopping_fashion": { label: "Shopping & Fashion", questions: [
    {type:"multiple_choice",question:"Which question would you ask in a shop if you need a different size?",options:["Do you have this on a smaller?","Do you have this in a smaller size?","Have you got this with a smaller?","Do you have this for a smaller?"],answer:"Do you have this in a smaller size?",explanation:"The correct preposition is 'in' when talking about size or colour options."},
    {type:"multiple_choice",question:"What does 'window shopping' mean?",options:["Buying items online.","Looking at shop displays without intending to buy.","Shopping for curtains and blinds.","Getting a refund at a shop."],answer:"Looking at shop displays without intending to buy.",explanation:"'Window shopping' means browsing without making a purchase."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been looking for a new jacket since three weeks.","She's been looking for a new jacket for three weeks.","She looks for a new jacket since three weeks.","She looked for a new jacket for three weeks ago."],answer:"She's been looking for a new jacket for three weeks.",explanation:"Present perfect continuous + 'for' for an ongoing situation."},
    {type:"true_false",question:"'On sale' and 'for sale' mean exactly the same thing.",answer:"False",explanation:"'On sale' usually means at a reduced price. 'For sale' simply means available to buy."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He spends too much money buying things he doesn't needs.",errorWord:"needs",answer:"need",explanation:"After 'doesn't', use the bare infinitive: 'doesn't need'."},
    {type:"type_answer",question:"Complete: Could I ___ (try) these shoes on, please?",answer:"try",explanation:"'Could I + bare infinitive' is a polite request."},
    {type:"type_answer",question:"Complete: If I hadn't forgotten my wallet, I ___ (buy) those trousers.",answer:"would have bought",explanation:"Third conditional: 'if + past perfect, would have + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","always","checks","the","sale","section","before","buying","anything","full","price"],answer:"she always checks the sale section before buying anything full price",explanation:"Subject + frequency adverb + verb + object + before + gerund phrase."},
    {type:"story_builder",question:"Order these sentences about a shopping trip:",sentences:["She left the mall happy, having spent less than she planned.","Laura went to the shopping centre to find an outfit for a wedding.","She tried on several dresses but couldn't find the right one.","In the last shop, she found a perfect blue dress in the sale."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Goal → search → no luck → found it → happy ending."},
    {type:"fill_idiom",question:"Complete: Don't spend everything now — you should save for a ___ day.",answer:"rainy",hint:"an emergency or difficult time in the future",explanation:"'Save for a rainy day' means to keep money for a future time of need."},
    {type:"word_match",question:"Match shopping words with their meanings:",pairs:[{word:"bargain",meaning:"something bought at a lower price than usual"},{word:"receipt",meaning:"proof of purchase from a shop"},{word:"refund",meaning:"money returned after returning a product"},{word:"voucher",meaning:"a document exchangeable for goods or a discount"}],answer:"match_all",explanation:"Key shopping vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The shop assistant helped her find the right size.","They have been offering discounts on winter coats.","She returned the jacket because it have a broken zip.","He paid by card at the checkout."],answer:"She returned the jacket because it have a broken zip.",explanation:"'It' is singular: 'it had a broken zip'."},
  ]},
  "music": { label: "Music", questions: [
    {type:"multiple_choice",question:"Which sentence uses the past perfect correctly?",options:["By the time the concert started, we had already found our seats.","By the time the concert started, we already found our seats.","By the time the concert started, we have already found our seats.","By the time the concert started, we already find our seats."],answer:"By the time the concert started, we had already found our seats.",explanation:"Past perfect shows an action completed before another past action."},
    {type:"multiple_choice",question:"What does 'go platinum' mean?",options:["To win a prize at a music award ceremony.","To sell a very large number of copies of an album or single.","To start playing classical music.","To sign a record deal."],answer:"To sell a very large number of copies of an album or single.",explanation:"'Go platinum' means an album or song has reached a high sales milestone."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She has been learning the piano since she was five.","She has been learning the piano for she was five.","She learns the piano since she was five.","She had been learning the piano since five years."],answer:"She has been learning the piano since she was five.",explanation:"Present perfect continuous + 'since' + point in time for an ongoing activity."},
    {type:"true_false",question:"A 'cover song' is a song written and performed for the first time by a new artist.",answer:"False",explanation:"A cover song is a new recording of a song originally performed by someone else."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The band played very good last night — the crowd loved it.",errorWord:"good",answer:"well",explanation:"'Good' is an adjective. 'Well' is the adverb needed to modify the verb 'played'."},
    {type:"type_answer",question:"Complete: She ___ (sing) professionally for over ten years.",answer:"has been singing",explanation:"Present perfect continuous for an ongoing activity starting in the past."},
    {type:"type_answer",question:"Complete: The song was originally ___ (write) for a film soundtrack.",answer:"written",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["he","taught","himself","to","play","guitar","at","the","age","of","fourteen"],answer:"he taught himself to play guitar at the age of fourteen",explanation:"Subject + reflexive verb + to + infinitive + time phrase."},
    {type:"story_builder",question:"Order these sentences about a band's first live performance:",sentences:["The audience erupted in applause at the end of the set.","For two months, the band rehearsed every weekend in a garage.","The night arrived, and they were nervous but ready.","They stepped onto the small stage at a local café and played their first gig."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Rehearse → night arrives → step on stage → audience reaction."},
    {type:"fill_idiom",question:"Complete: That new album is brilliant — the singer really knocked it out of the ___.",answer:"park",hint:"did something outstandingly well",explanation:"'Knock it out of the park' means to do something exceptionally well."},
    {type:"word_match",question:"Match music words with their meanings:",pairs:[{word:"lyrics",meaning:"the words of a song"},{word:"tempo",meaning:"the speed of a piece of music"},{word:"genre",meaning:"a category of music style"},{word:"acoustic",meaning:"music played without electric amplification"}],answer:"match_all",explanation:"Key music vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The guitarist has been playing since she was twelve.","They released their third album last spring.","The drummer always keep perfect time during performances.","She writes all her own songs."],answer:"The drummer always keep perfect time during performances.",explanation:"Third person singular: 'The drummer always keeps perfect time.'"},
  ]},
  "social_media_internet": { label: "Social Media & the Internet", questions: [
    {type:"multiple_choice",question:"Which sentence is correct?",options:["She's been using social media for ten years.","She's using social media since ten years.","She uses social media since ten years.","She used social media for ten years ago."],answer:"She's been using social media for ten years.",explanation:"Present perfect continuous + 'for' for an ongoing activity."},
    {type:"multiple_choice",question:"What does 'go viral' mean?",options:["To get a computer virus from a website.","To spread rapidly and be shared widely online.","To delete your social media account.","To post something controversial."],answer:"To spread rapidly and be shared widely online.",explanation:"'Go viral' means content that spreads very quickly across the internet."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["He doesn't check his emails very often, does he?","He doesn't check his emails very often, doesn't he?","He doesn't check his emails very often, do he?","He doesn't check his emails very often, is he?"],answer:"He doesn't check his emails very often, does he?",explanation:"Negative statement + positive question tag: 'doesn't he?' becomes 'does he?'"},
    {type:"true_false",question:"A hashtag on social media is a word or phrase preceded by the # symbol used to categorise content.",answer:"True",explanation:"Hashtags (#) label and group content by topic on social media platforms."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She posted a photo of herself in the beach yesterday.",errorWord:"in",answer:"on",explanation:"Use 'on the beach', not 'in the beach'. Compare: 'in the sea' or 'in the water'."},
    {type:"type_answer",question:"Complete: The company's social media account ___ (manage) by a team of three people.",answer:"is managed",explanation:"Present passive: 'is + past participle'."},
    {type:"type_answer",question:"Complete: I ___ (not check) social media before bed — it affects my sleep.",answer:"don't check",explanation:"Negative present simple for habits: 'don't + bare infinitive'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","spends","too","much","time","scrolling","through","her","phone"],answer:"she spends too much time scrolling through her phone",explanation:"Subject + verb + too much + noun + gerund phrase."},
    {type:"story_builder",question:"Order these sentences about becoming a content creator:",sentences:["A year later, she had over 50,000 followers.","Maria decided to start a cooking channel on a video platform.","Her fourth video went viral and gained 200,000 views overnight.","She posted one video a week for six months with little response."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Decision → months of quiet posting → viral moment → large following."},
    {type:"fill_idiom",question:"Complete: His controversial post really opened a can of ___.",answer:"worms",hint:"caused a complicated set of new problems",explanation:"'Open a can of worms' means to create a situation that leads to many new problems."},
    {type:"word_match",question:"Match internet terms with their meanings:",pairs:[{word:"algorithm",meaning:"rules used to decide what content users see"},{word:"influencer",meaning:"a person who promotes products to their online followers"},{word:"engagement",meaning:"interaction with online content such as likes and comments"},{word:"thread",meaning:"a series of connected messages or posts"}],answer:"match_all",explanation:"Key social media vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He replied to all his comments within an hour.","The post received thousands of likes in one day.","She have been managing the company's account for two years.","They launched a new campaign on social media last week."],answer:"She have been managing the company's account for two years.",explanation:"Third person singular: 'She has been managing the company's account.'"},
  ]},
  "ambitions_goals": { label: "Ambitions & Goals", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'hope to' correctly?",options:["She hopes to becoming a doctor one day.","She hopes becoming a doctor one day.","She hopes to become a doctor one day.","She hope to become a doctor one day."],answer:"She hopes to become a doctor one day.",explanation:"'Hope to' is followed by the bare infinitive."},
    {type:"multiple_choice",question:"What does 'set a goal' mean?",options:["To achieve something by luck.","To decide on something you want to accomplish and work towards it.","To give up on a plan.","To change your mind about your future."],answer:"To decide on something you want to accomplish and work towards it.",explanation:"'Set a goal' means to establish a specific target and pursue it."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["By 2030, she will have been working in the company for ten years.","By 2030, she will have work in the company for ten years.","By 2030, she will be working in the company since ten years.","By 2030, she will worked in the company for ten years."],answer:"By 2030, she will have been working in the company for ten years.",explanation:"Future perfect continuous: 'will have been + -ing' for an ongoing action up to a future point."},
    {type:"true_false",question:"The word 'ambition' always has a negative meaning in English.",answer:"False",explanation:"'Ambition' is generally neutral or positive — it means a strong desire to achieve something."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He is determine to pass his driving test on the second attempt.",errorWord:"determine",answer:"determined",explanation:"After 'is', use the adjective form: 'is determined'."},
    {type:"type_answer",question:"Complete: She is working hard because she ___ (want) to study abroad next year.",answer:"wants",explanation:"Third person singular present simple: 'wants'."},
    {type:"type_answer",question:"Complete: If you set clear goals, you are more likely ___ (achieve) them.",answer:"to achieve",explanation:"'More likely + to + infinitive' is the correct structure."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","is","determined","to","make","a","difference","in","her","community"],answer:"she is determined to make a difference in her community",explanation:"Subject + is determined to + infinitive + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about following a dream:",sentences:["Ten years later, her fashion brand was sold in shops across Europe.","From a young age, Sofia dreamed of becoming a fashion designer.","She studied design, worked for free at fashion houses, and never gave up.","She launched her own brand at 28 with just a small loan."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Early dream → study and sacrifice → launch → success."},
    {type:"fill_idiom",question:"Complete: Don't be afraid — just go for it and reach for the ___.",answer:"stars",hint:"aim very high",explanation:"'Reach for the stars' means to aim very high and pursue great ambitions."},
    {type:"word_match",question:"Match ambition words with their meanings:",pairs:[{word:"perseverance",meaning:"continuing despite difficulties"},{word:"milestone",meaning:"an important event marking progress"},{word:"aspiration",meaning:"a hope or ambition to achieve something"},{word:"commitment",meaning:"dedication to a task or goal"}],answer:"match_all",explanation:"Key vocabulary for talking about ambitions and goals."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has already completed three of her five goals this year.","He is planning to apply for a promotion.","They works hard every day to improve their skills.","She enrolled in an evening course to develop new skills."],answer:"They works hard every day to improve their skills.",explanation:"'They' takes 'work' without 's': 'They work hard every day.'"},
  ]},
  "culture_traditions": { label: "Culture & Traditions", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'although' correctly?",options:["Although the food was unfamiliar, but she enjoyed it.","Although the food was unfamiliar, she enjoyed it.","Although the food was unfamiliar but she enjoyed it.","She enjoyed the food although but it was unfamiliar."],answer:"Although the food was unfamiliar, she enjoyed it.",explanation:"'Although' introduces a contrast without needing 'but'. Use one or the other, not both."},
    {type:"multiple_choice",question:"What does 'culture shock' describe?",options:["A feeling of excitement about travelling.","The discomfort felt when experiencing an unfamiliar culture.","A type of traditional festival.","A disagreement between two countries."],answer:"The discomfort felt when experiencing an unfamiliar culture.",explanation:"'Culture shock' is the confusion or disorientation felt when encountering a very different way of life."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Traditions are passed to down from generation to generation.","Traditions are passed down from generation to generation.","Traditions are pass down from generation to generation.","Traditions have passed down from generation to generation."],answer:"Traditions are passed down from generation to generation.",explanation:"Passive: 'are passed down'. The phrasal verb is 'pass down', not 'pass to down'."},
    {type:"true_false",question:"A 'taboo' is something that is encouraged or praised in a culture.",answer:"False",explanation:"A taboo is a social or cultural prohibition — something strongly forbidden or discouraged."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"In many countries, it is consider rude to point at strangers.",errorWord:"consider",answer:"considered",explanation:"Passive: 'it is considered rude' — use the past participle."},
    {type:"type_answer",question:"Complete: The festival ___ (hold) every year in August to celebrate the harvest.",answer:"is held",explanation:"Present passive for regular events: 'is + past participle'."},
    {type:"type_answer",question:"Complete: She ___ (grow up) speaking two languages because her parents were from different countries.",answer:"grew up",explanation:"Past simple for a completed past situation."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["learning","about","other","cultures","helps","us","understand","the","world","better"],answer:"learning about other cultures helps us understand the world better",explanation:"Gerund phrase as subject + verb + object + bare infinitive."},
    {type:"story_builder",question:"Order these sentences about attending a local festival:",sentences:["By the end of the evening, he felt like part of the community.","Marco visited a small Spanish town during its annual summer festival.","He watched the traditional dances and tried local food and wine.","A local family invited him to join their table and celebrate with them."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Visit → watch and taste → invited → feel part of community."},
    {type:"fill_idiom",question:"Complete: When visiting another country, it is best to do as the Romans ___.",answer:"do",hint:"follow local customs and behaviour",explanation:"'When in Rome, do as the Romans do' means to follow the customs of the place you are visiting."},
    {type:"word_match",question:"Match culture words with their meanings:",pairs:[{word:"ritual",meaning:"an action performed regularly as part of a ceremony"},{word:"heritage",meaning:"cultural traditions passed from earlier generations"},{word:"etiquette",meaning:"rules for polite behaviour in social situations"},{word:"dialect",meaning:"a regional variety of a language"}],answer:"match_all",explanation:"Key vocabulary for culture and traditions."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She always removes her shoes before entering the house.","They celebrated the festival with traditional food and music.","He has been studying the local customs since he arrived.","The ceremony was organise by the town council."],answer:"The ceremony was organise by the town council.",explanation:"Passive voice needs the past participle: 'was organised'."},
  ]},
  "films_tv": { label: "Films & TV", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'just' correctly in the present perfect?",options:["I just saw the new film — it was amazing!","I have just seen the new film — it was amazing!","I have just saw the new film — it was amazing!","I had just see the new film — it was amazing!"],answer:"I have just seen the new film — it was amazing!",explanation:"Present perfect with 'just': 'have + just + past participle' for a very recent action."},
    {type:"multiple_choice",question:"What does 'binge-watch' mean?",options:["To watch a film at the cinema.","To watch many episodes of a TV series in one session.","To review a film online.","To subscribe to a streaming service."],answer:"To watch many episodes of a TV series in one session.",explanation:"'Binge-watching' means watching multiple episodes back-to-back."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The film, that won the Oscar, was directed by a Spanish director.","The film which won the Oscar was directed by a Spanish director.","The film who won the Oscar was directed by a Spanish director.","The film, who won the Oscar, was directed by a Spanish director."],answer:"The film which won the Oscar was directed by a Spanish director.",explanation:"Use 'which' or 'that' for things. No commas needed for a defining relative clause."},
    {type:"true_false",question:"A 'documentary' is a type of fictional film with invented characters and a made-up story.",answer:"False",explanation:"A documentary is a non-fiction film presenting facts about real events, people, or topics."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The sequel was even more better than the original film.",errorWord:"more",answer:"much",explanation:"'Better' is already the comparative form of 'good'. Use 'much better' to intensify."},
    {type:"type_answer",question:"Complete: The film ___ (direct) by a first-time director who had never made a feature film before.",answer:"was directed",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Have you ever ___ (watch) a film in a foreign language without subtitles?",answer:"watched",explanation:"Present perfect uses the past participle."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","director","has","been","making","films","for","over","twenty","years"],answer:"the director has been making films for over twenty years",explanation:"Subject + present perfect continuous + object + for + duration."},
    {type:"story_builder",question:"Order these sentences about a film night:",sentences:["They stayed up until midnight discussing the ending.","Jake and his friends met at his flat for a film night.","They chose a critically acclaimed thriller that none of them had seen.","The film was so gripping that nobody spoke for two hours."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Gather → choose film → gripping silence → late-night discussion."},
    {type:"fill_idiom",question:"Complete: Nobody saw the ending coming — it was completely out of the ___.",answer:"blue",hint:"a complete surprise",explanation:"'Out of the blue' means unexpectedly, without any warning."},
    {type:"word_match",question:"Match film words with their meanings:",pairs:[{word:"screenplay",meaning:"the written script of a film"},{word:"sequel",meaning:"a film that continues the story of an earlier one"},{word:"protagonist",meaning:"the main character in a story"},{word:"soundtrack",meaning:"the music used in a film"}],answer:"match_all",explanation:"Key film vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The film received excellent reviews from critics.","She has watched every episode of that series.","He saw the film three times on the cinema.","The cast gave outstanding performances throughout."],answer:"He saw the film three times on the cinema.",explanation:"The correct preposition is 'at the cinema', not 'on'."},
  ]},
  "books_reading": { label: "Books & Reading", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses the passive voice?",options:["The novel was wrote by a first-time author.","The novel was written by a first-time author.","The novel written by a first-time author.","The novel is write by a first-time author."],answer:"The novel was written by a first-time author.",explanation:"Passive past simple: 'was + past participle' (written, not wrote)."},
    {type:"multiple_choice",question:"What is a 'plot twist'?",options:["A type of book binding.","The way characters speak in a novel.","An unexpected change or development in the story.","The final chapter of a book."],answer:"An unexpected change or development in the story.",explanation:"A plot twist is a surprising turn of events that changes what the reader expected."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She reads so many books that she joins a library.","She reads so many books that she has joined a library.","She read so many books that she joins a library.","She reads so many books what she joined a library."],answer:"She reads so many books that she has joined a library.",explanation:"'So + adjective + that' expresses result. Present perfect for a recent relevant action."},
    {type:"true_false",question:"A 'biography' is a book that an author writes about their own life.",answer:"False",explanation:"A biography is written about someone else's life. A book about your own life is an 'autobiography'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She has read the book twice but she still doesn't understood the ending.",errorWord:"understood",answer:"understand",explanation:"'Doesn't' is followed by the bare infinitive: 'doesn't understand'."},
    {type:"type_answer",question:"Complete: By the time she reached the final chapter, she ___ (already guess) who the killer was.",answer:"had already guessed",explanation:"Past perfect for an action completed before another past event."},
    {type:"type_answer",question:"Complete: The book ___ (translate) into more than 40 languages since it was published.",answer:"has been translated",explanation:"Present perfect passive: 'has been + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","always","reads","before","bed","to","help","her","relax"],answer:"she always reads before bed to help her relax",explanation:"Subject + frequency adverb + verb + time phrase + infinitive of purpose."},
    {type:"story_builder",question:"Order these sentences about discovering a favourite author:",sentences:["Now she reads every book this author publishes on the day it comes out.","A colleague recommended a thriller to her during their lunch break.","She read the whole thing in a single weekend and loved it.","She found more books by the same author at her local library."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Recommendation → read it → find more books → devoted reader."},
    {type:"fill_idiom",question:"Complete: Don't judge a ___ by its cover — the story inside was wonderful.",answer:"book",hint:"don't judge based on appearance",explanation:"'Don't judge a book by its cover' means don't judge something or someone by their appearance."},
    {type:"word_match",question:"Match literary words with their meanings:",pairs:[{word:"narrator",meaning:"the voice that tells a story"},{word:"genre",meaning:"the type or category of a book"},{word:"chapter",meaning:"a main division of a book"},{word:"metaphor",meaning:"a word or phrase used figuratively to describe something"}],answer:"match_all",explanation:"Key literary vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She borrowed three books from the library last week.","The author has written twelve novels in twenty years.","He always underline key passages when he reads.","The book was shortlisted for a major literary prize."],answer:"He always underline key passages when he reads.",explanation:"Third person singular: 'He always underlines key passages.'"},
  ]},
  "home_housing": { label: "Home & Housing", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'too' and 'enough' correctly?",options:["The flat is too small for us to living comfortably.","The flat is too small for us to live comfortably.","The flat is not big enough for us to living.","The flat is too small enough for us to live."],answer:"The flat is too small for us to live comfortably.",explanation:"'Too + adjective + for + object + to + infinitive' is the correct structure."},
    {type:"multiple_choice",question:"What does 'furnished' mean when describing a rental property?",options:["The property has been recently painted.","The property includes furniture as part of the rental.","The property has central heating.","The property is in a prime location."],answer:"The property includes furniture as part of the rental.",explanation:"A 'furnished' flat comes with furniture already provided."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["We've been living here since five years.","We've been living here for five years.","We live here since five years.","We lived here for five years ago."],answer:"We've been living here for five years.",explanation:"Present perfect continuous + 'for' + duration for an ongoing situation."},
    {type:"true_false",question:"A 'mortgage' is a loan taken out to buy a property.",answer:"True",explanation:"A mortgage is a long-term loan from a bank used specifically to purchase property."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The landlord agreed to risen the rent by only 5% this year.",errorWord:"risen",answer:"raise",explanation:"'Agree to' is followed by the bare infinitive: 'agreed to raise'. 'Risen' is the past participle of 'rise'."},
    {type:"type_answer",question:"Complete: The heating ___ (break down) last winter and the landlord took weeks to fix it.",answer:"broke down",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: She ___ (would prefer) to rent closer to work, but the prices are too high.",answer:"would prefer",explanation:"'Would prefer + to + infinitive' expresses preference."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["we","decided","to","move","to","a","bigger","house","when","our","second","child","was","born"],answer:"we decided to move to a bigger house when our second child was born",explanation:"Main clause + time clause with when + past simple."},
    {type:"story_builder",question:"Order these sentences about moving to a new city:",sentences:["Within a month, their new flat felt like home.","The company offered Tom a job in another city.","They found a flat near the city centre and signed the lease.","He and his partner spent two weekends viewing properties."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Job offer → view properties → sign lease → settle in."},
    {type:"fill_idiom",question:"Complete: Moving to a new city was hard at first, but she soon felt right ___ home.",answer:"at",hint:"comfortable and relaxed somewhere",explanation:"'Feel at home' means to feel comfortable and relaxed in a place."},
    {type:"word_match",question:"Match housing words with their meanings:",pairs:[{word:"tenant",meaning:"a person who rents a property"},{word:"deposit",meaning:"money paid in advance as security"},{word:"renovation",meaning:"the process of improving an old building"},{word:"utility",meaning:"a service such as electricity, gas, or water"}],answer:"match_all",explanation:"Key housing and renting vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been looking for a flat for the past three months.","The landlord repaired the boiler within 24 hours.","They moved into their new home last spring.","He have been living in the same flat for ten years."],answer:"He have been living in the same flat for ten years.",explanation:"Third person singular: 'He has been living in the same flat for ten years.'"},
  ]},
  "food_restaurants": { label: "Food & Restaurants", questions: [
    {type:"multiple_choice",question:"Which question is correct to ask a waiter?",options:["Could I have the menu, please?","Can I having the menu, please?","I would like having the menu, please?","Would I have the menu, please?"],answer:"Could I have the menu, please?",explanation:"'Could I have...?' is the correct polite structure for requesting something."},
    {type:"multiple_choice",question:"What does 'al dente' mean when describing pasta?",options:["Overcooked and very soft.","Cooked to be slightly firm when bitten.","Served with a cold sauce.","Made with fresh herbs."],answer:"Cooked to be slightly firm when bitten.",explanation:"'Al dente' is an Italian phrase used in English cooking to describe pasta with a slight firmness."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["I'm starving — I didn't have had breakfast this morning.","I'm starving — I didn't have breakfast this morning.","I'm starving — I haven't have breakfast this morning.","I'm starving — I hadn't breakfast this morning."],answer:"I'm starving — I didn't have breakfast this morning.",explanation:"Past simple negative: 'didn't + bare infinitive' for a specific past action."},
    {type:"true_false",question:"'Vegetarian' and 'vegan' mean the same dietary choice.",answer:"False",explanation:"Vegetarians avoid meat and fish but may eat dairy and eggs. Vegans avoid all animal products."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The waiter recommendation the daily special, which was grilled salmon.",errorWord:"recommendation",answer:"recommended",explanation:"'Recommendation' is a noun. The verb form needed here is 'recommended'."},
    {type:"type_answer",question:"Complete: By the time the dessert arrived, we ___ (already eat) too much.",answer:"had already eaten",explanation:"Past perfect: 'had + already + past participle'."},
    {type:"type_answer",question:"Complete: This dish ___ (season) with garlic, lemon, and fresh herbs.",answer:"is seasoned",explanation:"Present passive for describing a dish's ingredients: 'is + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","asked","the","waiter","to","bring","some","extra","bread"],answer:"she asked the waiter to bring some extra bread",explanation:"Subject + asked + object + to + infinitive."},
    {type:"story_builder",question:"Order these sentences about a special dinner:",sentences:["They both agreed it had been one of the best meals they had ever had.","David booked a table at a restaurant his colleague had recommended.","The food was exceptional — both the presentation and the flavour.","When they arrived, the manager led them to a table by the window."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Book table → arrive and seated → exceptional food → final verdict."},
    {type:"fill_idiom",question:"Complete: The argument during dinner was very tense — you could have ___ the atmosphere with a knife.",answer:"cut",hint:"very tense atmosphere",explanation:"'You could cut the atmosphere with a knife' means the tension in a room was very strong."},
    {type:"word_match",question:"Match restaurant words with their meanings:",pairs:[{word:"starter",meaning:"the first course of a meal"},{word:"portion",meaning:"the amount of food served to one person"},{word:"reservation",meaning:"a booking made in advance at a restaurant"},{word:"glutton",meaning:"a person who eats or drinks excessively"}],answer:"match_all",explanation:"Key restaurant and dining vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She ordered the chicken with roasted vegetables.","They have been coming to this restaurant for years.","He always leave a tip when the service is good.","The chef prepared a special menu for the occasion."],answer:"He always leave a tip when the service is good.",explanation:"Third person singular: 'He always leaves a tip when the service is good.'"},
  ]},
  "cities_travel": { label: "Cities & Travel", questions: [
    {type:"multiple_choice",question:"Which sentence correctly uses 'used to'?",options:["This area used to be a factory district, but now it's full of restaurants.","This area use to be a factory district, but now it's full of restaurants.","This area was used to be a factory district.","This area used to being a factory district."],answer:"This area used to be a factory district, but now it's full of restaurants.",explanation:"'Used to + bare infinitive' describes a past state no longer true."},
    {type:"multiple_choice",question:"What is a 'rush hour'?",options:["A period when shops are having a sale.","The busiest times of day when people travel to or from work.","A fast route between two cities.","A type of express train service."],answer:"The busiest times of day when people travel to or from work.",explanation:"'Rush hour' is typically morning and evening when commuters travel, causing heavy traffic."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been living in the city since she was 18 years old.","She's been living in the city for she was 18 years old.","She lives in the city since 18 years old.","She has lived in the city since 18 years."],answer:"She's been living in the city since she was 18 years old.",explanation:"Present perfect continuous + 'since' + a specific point in time."},
    {type:"true_false",question:"A 'suburb' is the busy central district of a city.",answer:"False",explanation:"A suburb is a residential area on the outer edge of a city, away from the busy centre."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The train was late, so we was delayed by 30 minutes.",errorWord:"was",answer:"were",explanation:"'We' requires 'were', not 'was': 'we were delayed'."},
    {type:"type_answer",question:"Complete: The city has ___ (change) dramatically since the 1990s.",answer:"changed",explanation:"Present perfect: 'has + past participle'."},
    {type:"type_answer",question:"Complete: If you want to avoid the crowds, you ___ (should visit) the old town early in the morning.",answer:"should visit",explanation:"'Should + bare infinitive' for advice."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","city","centre","has","been","transformed","by","new","investment","in","recent","years"],answer:"the city centre has been transformed by new investment in recent years",explanation:"Subject + present perfect passive + agent + time phrase."},
    {type:"story_builder",question:"Order these sentences about a day exploring a new city:",sentences:["By evening, they were exhausted but full of stories to tell.","Ana and her friend arrived in Prague on a Friday morning.","They picked up a city map and headed to the historic centre.","They visited three museums, tried local food, and got wonderfully lost."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Arrive → get map → explore → tired but happy."},
    {type:"fill_idiom",question:"Complete: Moving to a new city felt strange at first, but she soon found her ___ there.",answer:"feet",hint:"becoming comfortable and confident in a new place",explanation:"'Find your feet' means to become confident and familiar with a new place or situation."},
    {type:"word_match",question:"Match urban words with their meanings:",pairs:[{word:"commute",meaning:"the regular journey between home and work"},{word:"infrastructure",meaning:"the basic systems a city needs such as roads and water"},{word:"pedestrian",meaning:"a person travelling on foot"},{word:"district",meaning:"a defined area of a city with a particular character"}],answer:"match_all",explanation:"Key urban and city vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The new metro line has reduced traffic significantly.","She cycles to work every day to avoid the rush hour.","They moved to the suburbs for a quieter life.","The new policy were announced during a press conference."],answer:"The new policy were announced during a press conference.",explanation:"'Policy' is singular: 'The new policy was announced...'"},
  ]},
  "science_discovery": { label: "Science & Discovery", questions: [
    {type:"multiple_choice",question:"Which sentence uses the passive correctly?",options:["Penicillin was discover by Alexander Fleming in 1928.","Penicillin was discovered by Alexander Fleming in 1928.","Penicillin discovered by Alexander Fleming in 1928.","Penicillin has discover by Alexander Fleming in 1928."],answer:"Penicillin was discovered by Alexander Fleming in 1928.",explanation:"Passive past simple: 'was + past participle'."},
    {type:"multiple_choice",question:"What does 'hypothesis' mean in science?",options:["A proven scientific fact.","A guess that cannot be tested.","A proposed explanation that can be tested.","The final conclusion of an experiment."],answer:"A proposed explanation that can be tested.",explanation:"A hypothesis is an educated prediction that scientists test through experiments."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Scientists have been study this virus for decades.","Scientists are studying this virus for decades.","Scientists have been studying this virus for decades.","Scientists studied this virus for decades."],answer:"Scientists have been studying this virus for decades.",explanation:"Present perfect continuous for an ongoing activity that started in the past and continues now."},
    {type:"true_false",question:"DNA stands for 'Digital Network Access'.",answer:"False",explanation:"DNA stands for 'Deoxyribonucleic Acid' — the molecule that carries genetic information."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The results of the experiment was unexpected and surprised the researchers.",errorWord:"was",answer:"were",explanation:"'Results' is plural, so use 'were': 'the results were unexpected'."},
    {type:"type_answer",question:"Complete: The discovery ___ (announce) at an international conference last month.",answer:"was announced",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Scientists ___ (not yet find) a cure for this condition.",answer:"have not yet found",explanation:"Present perfect negative for a situation not yet completed."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","experiment","was","repeated","three","times","to","confirm","the","results"],answer:"the experiment was repeated three times to confirm the results",explanation:"Subject + passive verb + frequency + infinitive of purpose."},
    {type:"story_builder",question:"Order these sentences about a scientific breakthrough:",sentences:["The discovery was later used to develop a new cancer treatment.","A research team began studying an unusual protein found in deep-sea fish.","They ran hundreds of tests over three years and recorded their findings.","One experiment produced a completely unexpected result."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Begin study → run tests → unexpected result → breakthrough applied."},
    {type:"fill_idiom",question:"Complete: The new theory turned the world of physics ___ down.",answer:"upside",hint:"completely changed everything",explanation:"'Turn something upside down' means to change something completely or cause great disruption."},
    {type:"word_match",question:"Match science words with their meanings:",pairs:[{word:"gravity",meaning:"the force that pulls objects towards each other"},{word:"molecule",meaning:"the smallest unit of a chemical compound"},{word:"evolution",meaning:"the process by which species change over time"},{word:"microscope",meaning:"an instrument for viewing very small objects"}],answer:"match_all",explanation:"Key science vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The scientists published their findings in a peer-reviewed journal.","She has been researching climate patterns for fifteen years.","The lab results confirmed what the team had suspected.","He make a major breakthrough during his third year of research."],answer:"He make a major breakthrough during his third year of research.",explanation:"Past tense needed: 'He made a major breakthrough...'"},
  ]},
  "friendship": { label: "Friendship", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'get on with' correctly?",options:["She gets on with her colleagues very well at work.","She gets on with very well her colleagues at work.","She gets well on with her colleagues at work.","She well gets on with her colleagues at work."],answer:"She gets on with her colleagues very well at work.",explanation:"'Get on with someone' means to have a good relationship. Adverbs come after the object."},
    {type:"multiple_choice",question:"What does 'fall out with someone' mean?",options:["To become close friends with someone.","To have an argument and damage the friendship.","To meet someone unexpectedly.","To help a friend in a difficult situation."],answer:"To have an argument and damage the friendship.",explanation:"'Fall out with someone' means to have a serious disagreement that affects the relationship."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["We've known each other since we was at school.","We've known each other since we were at school.","We know each other since we were at school.","We've known each other from we were at school."],answer:"We've known each other since we were at school.",explanation:"Present perfect + 'since' + past simple clause for a situation starting in the past."},
    {type:"true_false",question:"A 'fair-weather friend' is someone who is always there for you in good times and bad.",answer:"False",explanation:"A 'fair-weather friend' only stays close during good times and disappears when things get difficult."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We haven't spoke since we had that argument last year.",errorWord:"spoke",answer:"spoken",explanation:"Present perfect requires the past participle: 'haven't spoken'."},
    {type:"type_answer",question:"Complete: She ___ (know) her best friend since they started primary school together.",answer:"has known",explanation:"Present perfect for a state that started in the past and continues now."},
    {type:"type_answer",question:"Complete: Good friends are people who ___ (support) each other through difficult times.",answer:"support",explanation:"Present simple for a general truth."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["a","true","friend","is","someone","who","tells","you","the","truth"],answer:"a true friend is someone who tells you the truth",explanation:"Subject + relative clause with 'who' + verb + object."},
    {type:"story_builder",question:"Order these sentences about reconnecting with an old friend:",sentences:["They talked for hours as if no time had passed at all.","Lena and her old school friend had not been in contact for six years.","One day, Lena found her friend's number and decided to call.","They met for coffee the following weekend."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Six years apart → decide to call → meet for coffee → talk for hours."},
    {type:"fill_idiom",question:"Complete: She's been there for her friends through thick and ___.",answer:"thin",hint:"in all situations, good and bad",explanation:"'Through thick and thin' means through all kinds of situations, both good and bad."},
    {type:"word_match",question:"Match friendship words with their meanings:",pairs:[{word:"bond",meaning:"a close connection between people"},{word:"loyalty",meaning:"being faithful and supportive to friends"},{word:"companion",meaning:"a person you spend time with"},{word:"reconcile",meaning:"to restore a friendly relationship after a disagreement"}],answer:"match_all",explanation:"Key vocabulary for describing friendship."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["They have been friends since they met at university.","She always supports her friends when they are struggling.","He forgave his friend after they talk things through.","We get along really well despite our different personalities."],answer:"He forgave his friend after they talk things through.",explanation:"Past simple needed after past simple: 'after they talked things through'."},
  ]},
  "celebrations_parties": { label: "Celebrations & Parties", questions: [
    {type:"multiple_choice",question:"Which sentence is correct?",options:["They are throwing a surprise party for her last Saturday.","They threw a surprise party for her last Saturday.","They have thrown a surprise party for her last Saturday.","They was throwing a surprise party for her last Saturday."],answer:"They threw a surprise party for her last Saturday.",explanation:"'Last Saturday' is a finished time reference, so use past simple."},
    {type:"multiple_choice",question:"What does 'raise a toast' mean at a celebration?",options:["To burn the bread accidentally.","To raise glasses and drink in honour of someone.","To serve food to guests.","To send invitations to a party."],answer:"To raise glasses and drink in honour of someone.",explanation:"'Raise a toast' at a party means raising your glass to celebrate or honour someone."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The party will be take place at the town hall on Saturday.","The party will take place at the town hall on Saturday.","The party will taking place at the town hall on Saturday.","The party will be taken place at the town hall on Saturday."],answer:"The party will take place at the town hall on Saturday.",explanation:"'Will + bare infinitive' for future plans. 'Take place' is intransitive — not passive."},
    {type:"true_false",question:"'RSVP' on an invitation comes from a Latin phrase.",answer:"False",explanation:"'RSVP' comes from the French phrase 'Répondez s'il vous plaît', meaning 'Please reply'."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"We've been planning this celebration since six months.",errorWord:"since",answer:"for",explanation:"Use 'for' with a period of time. Use 'since' with a specific point in time."},
    {type:"type_answer",question:"Complete: By the time the guests arrived, she ___ (already prepare) all the food.",answer:"had already prepared",explanation:"Past perfect: 'had + already + past participle'."},
    {type:"type_answer",question:"Complete: The venue ___ (decorate) with hundreds of flowers and fairy lights.",answer:"was decorated",explanation:"Passive past simple: 'was + past participle'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["everyone","agreed","it","was","the","best","party","they","had","ever","been","to"],answer:"everyone agreed it was the best party they had ever been to",explanation:"Main clause + embedded clause with superlative + 'ever'."},
    {type:"story_builder",question:"Order these sentences about planning a birthday party:",sentences:["Her friends arrived, and the look of surprise on her face was unforgettable.","Carlos spent weeks secretly planning a surprise party for his sister.","He booked a private room at her favourite restaurant.","He invited thirty of her closest friends and told them to keep it secret."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Secret planning → book venue → invite friends → the surprise moment."},
    {type:"fill_idiom",question:"Complete: After winning the award, she was on ___ nine for the rest of the week.",answer:"cloud",hint:"extremely happy",explanation:"'On cloud nine' means to be extremely happy and excited."},
    {type:"word_match",question:"Match celebration words with their meanings:",pairs:[{word:"venue",meaning:"the place where an event is held"},{word:"host",meaning:"a person who organises and welcomes guests"},{word:"anniversary",meaning:"the yearly return of a significant date"},{word:"reception",meaning:"a formal party held after a wedding"}],answer:"match_all",explanation:"Key celebration and event vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She sent invitations to all her friends two weeks in advance.","The caterers prepared food for over 100 guests.","Everyone have a wonderful time at the wedding reception.","The speeches were funny and heartfelt."],answer:"Everyone have a wonderful time at the wedding reception.",explanation:"'Everyone' is singular: 'Everyone had a wonderful time.'"},
  ]},
  "emotions_feelings": { label: "Emotions & Feelings", questions: [
    {type:"multiple_choice",question:"Which sentence correctly describes an emotion?",options:["She was so boring at the party that she left early.","She was so bored at the party that she left early.","She was so bore at the party that she left early.","She was so boredom at the party that she left early."],answer:"She was so bored at the party that she left early.",explanation:"'Bored' describes how a person feels; 'boring' describes the thing that causes the feeling."},
    {type:"multiple_choice",question:"What does 'mixed feelings' mean?",options:["Being very happy about something.","Having both positive and negative emotions about something.","Feeling confused about a fact.","Being unable to make a decision."],answer:"Having both positive and negative emotions about something.",explanation:"'Mixed feelings' means you feel both positive and negative about something at the same time."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She felt very frustrating when the train was delayed again.","She felt very frustrated when the train was delayed again.","She was very frustrate when the train was delayed again.","She felt frustratingly when the train was delayed again."],answer:"She felt very frustrated when the train was delayed again.",explanation:"Use the -ed adjective ('frustrated') for how a person feels; -ing adjective for what causes the feeling."},
    {type:"true_false",question:"'Anxious' and 'eager' are synonyms with the same meaning.",answer:"False",explanation:"'Anxious' means worried or nervous. 'Eager' means excited and enthusiastic. They have opposite connotations."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He was very embarrass when he forgot his colleague's name in front of everyone.",errorWord:"embarrass",answer:"embarrassed",explanation:"Use the adjective 'embarrassed' after 'was': 'was embarrassed'."},
    {type:"type_answer",question:"Complete: She ___ (feel) much more confident after practising the presentation several times.",answer:"felt",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: It's normal to feel ___ (overwhelm) when you start a new job.",answer:"overwhelmed",explanation:"Use the adjective 'overwhelmed' after 'feel'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","was","relieved","when","she","heard","she","had","passed","the","exam"],answer:"she was relieved when she heard she had passed the exam",explanation:"Main clause + when + past simple + past perfect for earlier event."},
    {type:"story_builder",question:"Order these sentences about overcoming nerves:",sentences:["She realised that nerves had actually helped her perform better.","Sophie was terrified about presenting her project to the whole department.","She rehearsed carefully and took deep breaths before walking in.","The presentation went smoothly, and her manager praised her work."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Terror → prepare → perform well → positive reflection."},
    {type:"fill_idiom",question:"Complete: When she heard the good news, she was over the ___.",answer:"moon",hint:"extremely happy",explanation:"'Over the moon' means extremely happy and excited."},
    {type:"word_match",question:"Match emotion words with their meanings:",pairs:[{word:"anxious",meaning:"feeling worried about something uncertain"},{word:"content",meaning:"feeling satisfied and at ease"},{word:"overwhelmed",meaning:"having too much to cope with"},{word:"relieved",meaning:"feeling glad that a worry or problem has ended"}],answer:"match_all",explanation:"Key vocabulary for describing emotions and feelings."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["He was delighted when he received the job offer.","She felt nervous about meeting her partner's family.","They was disappointed when the event was cancelled.","I felt a great sense of relief after finishing the project."],answer:"They was disappointed when the event was cancelled.",explanation:"'They' takes 'were': 'They were disappointed when the event was cancelled.'"},
  ]},
  "language_communication": { label: "Language & Communication", questions: [
    {type:"multiple_choice",question:"Which sentence uses reported speech correctly?",options:["She said that she is learning Spanish.","She said that she was learning Spanish.","She said that she were learning Spanish.","She said that she has been learning Spanish."],answer:"She said that she was learning Spanish.",explanation:"In reported speech, present continuous ('is learning') shifts back to past continuous ('was learning')."},
    {type:"multiple_choice",question:"What does 'body language' refer to?",options:["The specific vocabulary used in sport.","The way people communicate through physical movements and gestures.","A type of sign language.","The language used in medical contexts."],answer:"The way people communicate through physical movements and gestures.",explanation:"Body language includes facial expressions, posture, gestures, and eye contact."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["He asked me where did I come from.","He asked me where I came from.","He asked me where I come from.","He asked me where I was come from."],answer:"He asked me where I came from.",explanation:"In indirect questions, use statement word order (no inversion): 'where I came from'."},
    {type:"true_false",question:"'Fluent' means being able to speak a language perfectly without making any mistakes.",answer:"False",explanation:"'Fluent' means speaking naturally, smoothly, and confidently. Even fluent speakers make occasional errors."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"Could you speak more fastly? I can't quite hear you.",errorWord:"fastly",answer:"fast",explanation:"'Fast' is both an adjective and an adverb. 'Fastly' does not exist in English."},
    {type:"type_answer",question:"Complete: He ___ (ask) me if I had ever lived abroad.",answer:"asked",explanation:"Past simple for a completed past action."},
    {type:"type_answer",question:"Complete: The more you practise speaking, the more ___ (confident) you will become.",answer:"confident",explanation:"'The more... the more...' is a comparative structure using adjectives."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["learning","a","language","takes","time","and","a","lot","of","patience"],answer:"learning a language takes time and a lot of patience",explanation:"Gerund phrase as subject + verb + two objects joined by 'and'."},
    {type:"story_builder",question:"Order these sentences about learning a new language:",sentences:["A year later, he had his first full conversation in Japanese.","Ben decided to learn Japanese after watching a documentary about Tokyo.","He downloaded a language app and practised for 20 minutes every day.","After six months, he enrolled in an evening class at a local college."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → daily app practice → evening class → first real conversation."},
    {type:"fill_idiom",question:"Complete: She was so shocked by the news that she was at a loss for ___.",answer:"words",hint:"unable to speak because of shock or emotion",explanation:"'At a loss for words' means so overwhelmed that you cannot speak or respond."},
    {type:"word_match",question:"Match communication words with their meanings:",pairs:[{word:"bilingual",meaning:"able to speak two languages fluently"},{word:"idiom",meaning:"a phrase whose meaning differs from the individual words"},{word:"accent",meaning:"the way a person pronounces words from their region"},{word:"eloquent",meaning:"expressing ideas clearly and effectively"}],answer:"match_all",explanation:"Key vocabulary for language and communication."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She speaks three languages fluently.","He explained the rules clearly to the new students.","They communicated very effectively during the meeting.","She asked him where did he learn his English."],answer:"She asked him where did he learn his English.",explanation:"Indirect questions use statement word order: 'where he learned his English'."},
  ]},
  "news_current_affairs": { label: "News & Current Affairs", questions: [
    {type:"multiple_choice",question:"Which sentence uses the passive correctly?",options:["The new law was announce yesterday by the government.","The new law was announced yesterday by the government.","The new law announced yesterday by the government.","The new law is announcing yesterday by the government."],answer:"The new law was announced yesterday by the government.",explanation:"Passive past simple: 'was + past participle'."},
    {type:"multiple_choice",question:"What does 'breaking news' mean?",options:["Old news that has been updated.","News that is currently happening and being reported for the first time.","News about accidents and disasters only.","A correction to a previously reported story."],answer:"News that is currently happening and being reported for the first time.",explanation:"'Breaking news' refers to a major developing story being reported live."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["The journalist, who reports from the conflict zone, is very brave.","The journalist, that reports from the conflict zone, is very brave.","The journalist who reports from the conflict zone, is very brave.","The journalist which reports from the conflict zone, is very brave."],answer:"The journalist, who reports from the conflict zone, is very brave.",explanation:"'Who' is used for people. Commas indicate a non-defining relative clause providing extra information."},
    {type:"true_false",question:"A 'tabloid' newspaper is the same as a 'broadsheet' in terms of content and style.",answer:"False",explanation:"Tabloids are typically smaller and more sensational. Broadsheets are larger and cover serious news like politics and economics."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"According to recent reports, unemployment have fallen for the third month in a row.",errorWord:"have",answer:"has",explanation:"'Unemployment' is uncountable and singular: 'unemployment has fallen'."},
    {type:"type_answer",question:"Complete: The story ___ (report) by hundreds of news outlets around the world.",answer:"was reported",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: Journalists are expected ___ (check) their facts before publishing a story.",answer:"to check",explanation:"'Expected + to + infinitive' is the correct structure."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["the","prime","minister","announced","new","measures","to","tackle","rising","prices"],answer:"the prime minister announced new measures to tackle rising prices",explanation:"Subject + past simple + object + infinitive of purpose."},
    {type:"story_builder",question:"Order these sentences about a journalist's big story:",sentences:["The article won a national award for investigative journalism.","Elena received a tip about financial fraud at a major company.","She spent three months gathering evidence and interviewing sources.","She published the full story on the front page of her newspaper."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Receive tip → gather evidence → publish story → win award."},
    {type:"fill_idiom",question:"Complete: The politician tried to avoid the question — he was clearly beating around the ___.",answer:"bush",hint:"avoiding the main point",explanation:"'Beat around the bush' means to avoid getting to the main point of a topic."},
    {type:"word_match",question:"Match journalism words with their meanings:",pairs:[{word:"editorial",meaning:"an article expressing the newspaper's opinion"},{word:"correspondent",meaning:"a journalist reporting from a specific region"},{word:"bias",meaning:"favouring one side unfairly in reporting"},{word:"headline",meaning:"the title of a news article in large print"}],answer:"match_all",explanation:"Key journalism and media vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The report highlighted serious issues in the healthcare system.","Journalists must always protect their sources.","She has been covering international news for fifteen years.","The new policy were announced during a press conference."],answer:"The new policy were announced during a press conference.",explanation:"'Policy' is singular: 'The new policy was announced during a press conference.'"},
  ]},
  "hobbies_free_time": { label: "Hobbies & Free Time", questions: [
    {type:"multiple_choice",question:"Which sentence uses 'have been to' correctly?",options:["I have been to that pottery class before — it's great!","I have been at that pottery class before — it's great!","I have been in that pottery class before — it's great!","I had been to that pottery class before — it's great!"],answer:"I have been to that pottery class before — it's great!",explanation:"'Have been to' means you visited a place and came back."},
    {type:"multiple_choice",question:"What does 'take up a hobby' mean?",options:["To give up an activity you no longer enjoy.","To start doing a new activity for pleasure.","To become a professional in a sport.","To join a competitive club or team."],answer:"To start doing a new activity for pleasure.",explanation:"'Take up a hobby' means to begin doing a new leisure activity."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["She's been painting watercolours since two years.","She's been painting watercolours for two years.","She paints watercolours since two years.","She painted watercolours for two years ago."],answer:"She's been painting watercolours for two years.",explanation:"Present perfect continuous + 'for' for duration of an ongoing activity."},
    {type:"true_false",question:"'DIY' stands for 'Design It Yourself' and refers to professional building work.",answer:"False",explanation:"'DIY' stands for 'Do It Yourself' — making, building, or repairing things yourself."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"He finds gardening very relax, especially at the weekends.",errorWord:"relax",answer:"relaxing",explanation:"After 'find something +', use the adjective: 'finds gardening very relaxing'."},
    {type:"type_answer",question:"Complete: Since retiring, she ___ (take up) painting and is now selling her work online.",answer:"has taken up",explanation:"Present perfect for a recent change with current relevance."},
    {type:"type_answer",question:"Complete: He ___ (spend) every Saturday morning at the local chess club for years.",answer:"has been spending",explanation:"Present perfect continuous for an ongoing habit."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["learning","to","knit","has","given","her","a","wonderful","creative","outlet"],answer:"learning to knit has given her a wonderful creative outlet",explanation:"Gerund phrase as subject + present perfect + indirect object + direct object."},
    {type:"story_builder",question:"Order these sentences about discovering a new hobby:",sentences:["Six months later, he entered his first local photography competition.","Mark borrowed his friend's camera to photograph some local scenery.","He was so pleased with the results that he bought his own camera.","He began taking photographs every weekend and sharing them online."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Borrow camera → pleased with results → buy own camera → enter competition."},
    {type:"fill_idiom",question:"Complete: She loved painting so much that she put her heart and ___ into every piece.",answer:"soul",hint:"with complete effort and dedication",explanation:"'Put your heart and soul into something' means to do it with complete effort and passion."},
    {type:"word_match",question:"Match leisure words with their meanings:",pairs:[{word:"pastime",meaning:"an activity done for enjoyment in free time"},{word:"voluntary",meaning:"done by choice, without being paid"},{word:"keen",meaning:"very interested or enthusiastic"},{word:"leisure",meaning:"free time when you are not working"}],answer:"match_all",explanation:"Key vocabulary for hobbies and free time."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She has been collecting stamps since she was a child.","He joined a local hiking club last spring.","They spends their weekends renovating old furniture.","She finds cooking very therapeutic after a long day at work."],answer:"They spends their weekends renovating old furniture.",explanation:"'They' takes 'spend' without 's': 'They spend their weekends...'"},
  ]},
  "nature_animals": { label: "Nature & Animals", questions: [
    {type:"multiple_choice",question:"Which sentence uses the present perfect correctly?",options:["Many species of animals has become extinct in recent years.","Many species of animals have become extinct in recent years.","Many species of animals became extinct in recent years.","Many species of animals are become extinct in recent years."],answer:"Many species of animals have become extinct in recent years.",explanation:"'Many species' is plural, so use 'have'. Present perfect with 'in recent years' for a current trend."},
    {type:"multiple_choice",question:"What is 'migration' in the animal world?",options:["The process by which animals change colour in winter.","The seasonal movement of animals from one region to another.","The way animals communicate with each other.","The reproduction process of birds."],answer:"The seasonal movement of animals from one region to another.",explanation:"Migration is the regular seasonal travel between habitats in response to seasons."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["Wolves live in packs and are highly social animals.","Wolves lives in packs and are highly social animals.","Wolves living in packs and are highly social animals.","Wolves has lived in packs and are highly social animals."],answer:"Wolves live in packs and are highly social animals.",explanation:"Present simple for general facts. 'Wolves' is plural — no 's' on the verb."},
    {type:"true_false",question:"Dolphins are classified as fish because they live in the sea.",answer:"False",explanation:"Dolphins are mammals. They breathe air, give birth to live young, and feed them milk."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"The forest is home to a wide range of wildlife, include many rare birds.",errorWord:"include",answer:"including",explanation:"'Including' is a preposition used to introduce examples: 'including many rare birds'."},
    {type:"type_answer",question:"Complete: The whale ___ (spot) by researchers just three miles off the coast.",answer:"was spotted",explanation:"Passive past simple: 'was + past participle'."},
    {type:"type_answer",question:"Complete: If we ___ (not protect) natural habitats, many species will disappear.",answer:"don't protect",explanation:"First conditional: 'if + present simple negative, will + infinitive'."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["scientists","believe","that","thousands","of","species","are","at","risk","of","extinction"],answer:"scientists believe that thousands of species are at risk of extinction",explanation:"Main clause + 'that' clause with prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about a wildlife encounter:",sentences:["It was a moment she would never forget.","Clara was hiking through a national park when she stopped suddenly.","A large deer was standing just fifteen metres from the path.","She stood completely still and watched it for nearly five minutes."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Hiking → stop suddenly → see deer → watch in silence → memorable moment."},
    {type:"fill_idiom",question:"Complete: He's been working non-stop — he's been burning the midnight ___.",answer:"oil",hint:"working very late into the night",explanation:"'Burn the midnight oil' means to work or study very late into the night."},
    {type:"word_match",question:"Match nature words with their meanings:",pairs:[{word:"habitat",meaning:"the natural environment where an animal lives"},{word:"predator",meaning:"an animal that hunts other animals for food"},{word:"hibernate",meaning:"to spend winter in a sleeping state"},{word:"endangered",meaning:"at risk of becoming extinct"}],answer:"match_all",explanation:"Key nature and animal vocabulary."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["The river otters have returned to this area after many years.","Scientists are monitoring the bear population closely.","The conservation project have helped several species recover.","She photographed a rare butterfly in the meadow."],answer:"The conservation project have helped several species recover.",explanation:"'Project' is singular: 'The conservation project has helped several species recover.'"},
  ]},
  "jobs_interviews": { label: "Jobs & Interviews", questions: [
    {type:"multiple_choice",question:"Which phrase correctly completes a job interview answer?",options:["I am interest in this role because I enjoy working in teams.","I am interested in this role because I enjoy working in teams.","I have interest in this role because I enjoy working in teams.","I am interesting in this role because I enjoy working in teams."],answer:"I am interested in this role because I enjoy working in teams.",explanation:"'Interested in' is the correct adjective. 'Interesting' describes the thing that causes interest."},
    {type:"multiple_choice",question:"What does 'CV' stand for?",options:["Career Vision","Curriculum Vitae","Certified Vocation","Current Variables"],answer:"Curriculum Vitae",explanation:"CV stands for 'Curriculum Vitae', a Latin phrase meaning 'course of life'."},
    {type:"multiple_choice",question:"Choose the correct interview question:",options:["What your main responsibilities would be in this role?","What would be your main responsibilities in this role?","What would your main responsibilities be in this role?","What your main responsibilities in this role would be?"],answer:"What would your main responsibilities be in this role?",explanation:"Direct questions use subject-auxiliary inversion: 'What would [subject] be?'"},
    {type:"true_false",question:"A 'probation period' at a new job means you are being investigated by the police.",answer:"False",explanation:"A probation period is a trial period during which both employer and employee assess whether the role is a good fit."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She is very experience in project management and has led several large teams.",errorWord:"experience",answer:"experienced",explanation:"After 'is' or 'very', use the adjective 'experienced', not the noun 'experience'."},
    {type:"type_answer",question:"Complete: He ___ (work) in sales for eight years before moving into management.",answer:"had worked",explanation:"Past perfect for an action completed before another past action."},
    {type:"type_answer",question:"Complete: Could you tell me a little about ___ (you) experience in this field?",answer:"your",explanation:"Possessive adjective 'your' is needed before a noun."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","impressed","the","interviewers","with","her","confidence","and","preparation"],answer:"she impressed the interviewers with her confidence and preparation",explanation:"Subject + verb + object + prepositional phrase."},
    {type:"story_builder",question:"Order these sentences about getting a promotion:",sentences:["She began her new role as team leader the following month.","Sarah had been working as a junior analyst for three years.","Her manager called her in for a meeting and offered her a promotion.","She had consistently delivered excellent results and supported her colleagues."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Three years in role → consistent performance → manager offers promotion → new role begins."},
    {type:"fill_idiom",question:"Complete: She's brilliant at her job — she really knows the tricks of the ___.",answer:"trade",hint:"the practical skills used in a particular job",explanation:"'The tricks of the trade' refers to the practical skills and clever methods used in a particular job."},
    {type:"word_match",question:"Match workplace words with their meanings:",pairs:[{word:"probation",meaning:"a trial period in a new job"},{word:"redundant",meaning:"losing a job because the role is no longer needed"},{word:"referee",meaning:"a person who provides a job reference"},{word:"benefits",meaning:"non-salary perks given by an employer"}],answer:"match_all",explanation:"Key vocabulary for jobs and interviews."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She was offered the job after her second interview.","He has been working for the same company for twelve years.","They was impressed by her presentation skills.","The company provides excellent benefits and flexible working hours."],answer:"They was impressed by her presentation skills.",explanation:"'They' takes 'were': 'They were impressed by her presentation skills.'"},
  ]},
  "past_memories": { label: "Past & Memories", questions: [
    {type:"multiple_choice",question:"Which sentence uses the past perfect correctly?",options:["She had never seen the sea before she visited Brighton.","She never saw the sea before she had visited Brighton.","She has never seen the sea before she visited Brighton.","She was never seeing the sea before she visited Brighton."],answer:"She had never seen the sea before she visited Brighton.",explanation:"Past perfect ('had seen') for an action before another past action ('visited')."},
    {type:"multiple_choice",question:"What does 'reminisce' mean?",options:["To make plans for the future.","To forget important past events.","To talk or think about pleasant memories from the past.","To disagree with someone about what happened."],answer:"To talk or think about pleasant memories from the past.",explanation:"'Reminisce' means to remember and talk about pleasant past experiences."},
    {type:"multiple_choice",question:"Choose the correct sentence:",options:["When I was a child, I would play in the street until dark.","When I was a child, I will play in the street until dark.","When I was a child, I used to playing in the street until dark.","When I was a child, I would playing in the street until dark."],answer:"When I was a child, I would play in the street until dark.",explanation:"'Would + bare infinitive' describes repeated past habits, similar to 'used to'."},
    {type:"true_false",question:"'Once upon a time' is a typical phrase used to end a traditional story.",answer:"False",explanation:"'Once upon a time' is used to begin a story. Stories typically end with 'they lived happily ever after' or similar."},
    {type:"error_spotter",question:"Find the mistake:",sentence:"She remembered her first day at school very clear — it felt like yesterday.",errorWord:"clear",answer:"clearly",explanation:"An adverb is needed to modify the verb 'remembered': 'very clearly'."},
    {type:"type_answer",question:"Complete: By the time he retired, he ___ (work) for the same company for 35 years.",answer:"had worked",explanation:"Past perfect for an action completed before another past event."},
    {type:"type_answer",question:"Complete: We ___ (use to) spend every summer holiday at my grandmother's house.",answer:"used to",explanation:"'Used to + bare infinitive' for past habits that no longer happen."},
    {type:"rearrange",question:"Rearrange into a correct sentence:",words:["she","found","some","old","photographs","while","sorting","through","her","parents","belongings"],answer:"she found some old photographs while sorting through her parents belongings",explanation:"Main clause + while + gerund clause."},
    {type:"story_builder",question:"Order these sentences about returning to your hometown:",sentences:["She realised how much the place — and she herself — had changed.","After fifteen years abroad, Helen returned to her hometown for the first time.","She walked down streets she had played on as a child and visited her old school.","She met a few old friends for coffee and spent hours catching up."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Return after years → walk old streets → meet old friends → reflect on change."},
    {type:"fill_idiom",question:"Complete: Looking at those old photos really brought back a ___ of memories.",answer:"flood",hint:"a sudden strong rush of memories",explanation:"'A flood of memories' means a sudden and overwhelming rush of recollections."},
    {type:"word_match",question:"Match memory words with their meanings:",pairs:[{word:"nostalgia",meaning:"a sentimental longing for the past"},{word:"memoir",meaning:"a written account of personal memories"},{word:"decade",meaning:"a period of ten years"},{word:"heirloom",meaning:"an object passed down through generations"}],answer:"match_all",explanation:"Key vocabulary for talking about the past and memories."},
    {type:"odd_one_out",question:"Which sentence has a grammar mistake?",options:["She kept all her old letters in a box under the bed.","He remembered the day his daughter was born as if it were yesterday.","They has been sharing stories about the old days all evening.","The photographs brought back many happy memories."],answer:"They has been sharing stories about the old days all evening.",explanation:"'They' takes 'have': 'They have been sharing stories about the old days.'"},
  ]},
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#0d0d0d;--paper:#f5f0e8;--cream:#ede8dc;--gold:#e8b84b;--coral:#e85d3a;--teal:#2a9d8f;--violet:#a855f7;--sky:#4db8e8;--green:#3ab87a;--red:#e83a3a}
  body{background:var(--ink);color:#f5f0e8;font-family:'DM Sans',sans-serif}
  h1,h2,h3{font-family:'Unbounded',sans-serif;font-weight:700}

  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden}
  .hero::before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(-45deg,transparent,transparent 40px,rgba(232,184,75,0.04) 40px,rgba(232,184,75,0.041) 41px)}
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
  const joinCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("join") || "") : "";
  const [view, setView] = useState(joinCode ? "student" : "home");
  return (
    <>
      <style>{css}</style>
      {view==="home"    && <Home    onHost={()=>setView("host")} onJoin={()=>setView("student")} />}
      {view==="host"    && <HostView    onBack={()=>setView("home")} />}
      {view==="student" && <StudentView onBack={()=>setView("home")} initialCode={joinCode} />}
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
  const [room, setRoom] = useState(() => {
    const existing = read();
    if (existing) return existing;
    const fresh = defaultRoom();
    write(fresh); // save immediately so students can find the room before questions are loaded
    return fresh;
  });
  const [selectedTopic, setSelectedTopic] = useState("");
  const [gameType, setGameType] = useState("mixed");
  const [qCount, setQCount] = useState(6);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const upd = (fn) => setRoom(prev => {
    const next = typeof fn === "function" ? fn(prev) : { ...prev, ...fn };
    write(next); return next;
  });

  // Sync players & answers (Firebase real-time or localStorage fallback)
  useEffect(() => {
    if (db) {
      return listenRoom(room.code, (s) => {
        if (s.code === room.code) setRoom(prev => ({ ...prev, players: s.players, answers: s.answers }));
      });
    }
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

  const loadQuestions = () => {
    if (!selectedTopic) { setError("Select a topic first!"); return; }
    const bank = QUESTION_BANK[selectedTopic].questions;
    let pool = gameType === "mixed" ? bank : bank.filter(q => q.type === gameType);
    if (!pool.length) { setError("No questions of that type for this topic."); return; }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, Math.min(qCount, shuffled.length));
    setError("");
    upd(prev => ({ ...prev, questions: qs, topic: QUESTION_BANK[selectedTopic].label, gameType, phase: "lobby" }));
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

  const reset = () => { const r = defaultRoom(); write(r); setRoom(r); setSelectedTopic(""); setGameType("mixed"); };

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
        <QRDisplay url={typeof window!=="undefined"?`${window.location.origin}${window.location.pathname}?join=${room.code}`:"https://english-arena.vercel.app"} />
        <p className="op30 mt-1" style={{fontSize:"0.68rem"}}>Students scan QR → enter name → Join!</p>
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
                {[3,5,6,8,10].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-coral mb-1" style={{fontSize:"0.85rem"}}>{error}</p>}
          <div className="flex gap-2 wrap">
            <button className="btn btn-gold" onClick={loadQuestions} disabled={!selectedTopic}>
              Load Questions
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
function StudentView({ onBack, initialCode = "" }) {
  const [step, setStep] = useState("join");
  const [code, setCode] = useState(initialCode);
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
      const updated = { ...s, players: { ...s.players, [name]: { score:0, streak:0, team:s.players[name]?.team||null } } };
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
    if (db && room?.code) {
      set(ref(db, `rooms/${room.code}/answers/${name}`), ans).catch(() => {});
    }
    const s = read();
    if (s) write({ ...s, answers: { ...s.answers, [name]: ans } });
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
